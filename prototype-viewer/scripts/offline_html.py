"""Inline a viewer page's packaged resources before embedding it in srcdoc.

No network access. References resolve against their source file, never the caller's cwd.
"""
from __future__ import annotations

import base64
import mimetypes
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
from resource_paths import image_file


def inline_page_assets(html: str, source: Path, project: Path, *, allowed_roots=None) -> str:
    project = project.resolve()

    def attr(tag, name):
        match = re.search(rf'\b{name}\s*=\s*([\'\"])(.*?)\1', tag, re.I | re.S)
        return match[2] if match else None

    def local(value, parent):
        url = urlsplit(value)
        if url.scheme or url.netloc or value.startswith('/'):
            raise ValueError(f'离线导出不读取外部资源：{value}（{parent.name}）')
        path = (parent.parent / unquote(url.path)).resolve()
        if project not in path.parents or not path.is_file() or (allowed_roots and not any(root.resolve() in path.parents for root in allowed_roots)):
            raise ValueError(f'资源缺失或不在查看器包内：{value}（{parent.name}）')
        return path

    def data_uri(value, parent):
        if value.startswith(('data:', '#')):
            return value
        path = local(value, parent)
        mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        return f'data:{mime};base64,{base64.b64encode(path.read_bytes()).decode("ascii")}'

    def css(path, ancestors=()):
        if path in ancestors:
            raise ValueError(f'样式循环引用：{path.name}')
        content = path.read_text(encoding='utf-8')
        content = re.sub(r'@import\s+([\'\"])(.*?)\1\s*;', lambda m: css(local(m[2], path), (*ancestors, path)), content)
        content = re.sub(r'url\(\s*([\'\"]?)([^)\'\"\s]+)\1\s*\)', lambda m: f'url("{data_uri(m[2], path)}")', content)
        return re.sub(r'</style', r'<\\/style', content, flags=re.I)

    def link(match):
        tag = match[0]
        href = attr(tag, 'href')
        if not href or href.startswith('data:'):
            return tag
        if attr(tag, 'rel') == 'stylesheet':
            return f'<style>{css(local(href, source))}</style>'
        if 'icon' in (attr(tag, 'rel') or ''):
            return tag.replace(href, data_uri(href, source))
        if attr(tag, 'rel') == 'modulepreload':
            raise ValueError('页面包含模块分包，请先生成自包含 HTML')
        return tag

    def reject_imports(code):
        # Remove comments and string contents so vendor error messages do not
        # look like executable import statements. Preserve quote tokens.
        tokens = r"(?P<string>'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`)|(?P<comment>//[^\n]*|/\*.*?\*/)"
        def mask(match):
            if match.group('string'):
                if match[0].startswith('`') and '${' in match[0] and re.search(r'\bimport\s*\(', match[0]):
                    raise ValueError('模板表达式包含模块依赖，请先生成自包含 HTML')
                return '\"\"'
            return ' '
        masked = re.sub(tokens, mask, code, flags=re.S)
        if re.search(r"(?<![.\w$])import\b\s*(?:[\"']|\(|[\w*{])|\bexport\s+(?:\*|\{)[^;]*\bfrom\s*[\"']", masked):
            raise ValueError('页面包含模块依赖，请先生成自包含 HTML 后再导出')

    def script(match):
        tag = match[0]
        opening = tag.split('>', 1)[0] + '>'
        src = attr(opening, 'src')
        if not src:
            if attr(opening, 'type') in (None, 'module', 'text/javascript', 'application/javascript'):
                reject_imports(re.sub(r"^<script\b[^>]*>|</script>$", "", tag, flags=re.I))
            return tag
        code = local(src, source).read_text(encoding='utf-8')
        reject_imports(code)
        code = re.sub(r'</script', r'<\\/script', code, flags=re.I)
        module = ' type="module"' if attr(opening, 'type') == 'module' else ''
        return f'<script{module}>{code}</script>'

    def media(match):
        tag = match[0]
        value = attr(tag, 'src')
        if attr(tag, 'srcset'):
            raise ValueError('请先内联 srcset 资源再导出')
        if value and allowed_roots and re.match(r'<img\b', tag, re.I):
            image_file(value, source, allowed_roots)
        return tag.replace(value, data_uri(value, source)) if value else tag

    html = re.sub(r'<link\b[^>]*>', link, html, flags=re.I)
    html = re.sub(r'<script\b[^>]*>.*?</script>', script, html, flags=re.I | re.S)
    return re.sub(r'<(?:img|source|video|audio)\b[^>]*>', media, html, flags=re.I)
