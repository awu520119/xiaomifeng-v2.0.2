"""Plan exact manual-page references before renaming; never edit published sources."""
from pathlib import Path
import os
import re
from urllib.parse import quote, unquote, urlsplit, urlunsplit


def plan_references(project: Path, old_id: str, new_id: str, moves: dict[Path, Path]) -> dict[Path, str]:
    changed = {}
    files = [*project.joinpath('pages').rglob('*.html'), *project.joinpath('desc').rglob('*.md'), *project.joinpath('assets').rglob('*.js')]
    for source in files:
        if source.parent == project / 'assets' and source.name in {'viewer.js', 'viewer-bridge.js', 'desc-enhance.js'}:
            continue
        if project not in source.resolve().parents:
            raise ValueError(f'引用文件越界：{source}')
        content = source.read_text(encoding='utf-8')
        updated = re.sub(r'(\bgotoNode\s*\(\s*)([\'"])' + re.escape(old_id) + r'\2', lambda m: m[1] + m[2] + new_id + m[2], content)
        def replace_url(match):
            value = match[2]
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path or value.startswith('/'):
                return match[0]
            old_target = (source.parent / unquote(url.path)).resolve()
            if old_target not in moves:
                return match[0]
            new_source = moves.get(source, source)
            path = quote(Path(os.path.relpath(moves[old_target], new_source.parent)).as_posix(), safe='/.-_~')
            value = urlunsplit(('', '', path, url.query, url.fragment))
            return match[1] + value + match[3]
        if source.suffix == '.html':
            updated = re.sub(r'(\bhref\s*=\s*[\'"])([^\'"]+)([\'"])', replace_url, updated, flags=re.I)
        elif source.suffix == '.md':
            updated = re.sub(r'(\]\()([^\s)]+)(\))', replace_url, updated)
        if updated != content:
            changed[source] = updated
    return changed


def unresolved_references(project: Path, old_id: str, updates: dict[Path, str]) -> list[str]:
    warnings = []
    for folder, pattern in [('pages', '*.html'), ('desc', '*.md'), ('assets', '*.js')]:
        for source in (project / folder).rglob(pattern):
            if folder == 'assets' and source.name in {'viewer.js', 'viewer-bridge.js', 'desc-enhance.js'}:
                continue
            if project not in source.resolve().parents:
                continue
            content = updates.get(source, source.read_text(encoding='utf-8'))
            for number, line in enumerate(content.splitlines(), 1):
                if re.search(r'\bgotoNode\s*\(\s*[^\s\"\']', line) or (old_id in line and ('gotoNode' in line or old_id + '.html' in line)):
                    warnings.append(f'{source.relative_to(project)}:{number} 含动态或未识别引用，请人工复核')
    return warnings
