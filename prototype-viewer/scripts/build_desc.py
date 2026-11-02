#!/usr/bin/env python3
"""build_desc.py — 把 ``desc/<id>.md`` 离线渲染成 ``desc/<id>.html``。

- Markdown → HTML（python-markdown，extensions: fenced_code / tables / sane_lists / nl2br）
- ``mermaid`` 代码块 → 嵌入式 SVG（调用 ``mmdc``）
- ``![alt](path)`` 图片引用 → ``data:image/...;base64,...``（图片相对 md 文件解析）

用法:
    python build_desc.py <project_dir> [--id <node_id>] [--quiet]

产物:
    <project_dir>/desc/<id>.html   每个带 mdPath 的节点对应一份

依赖:
    python3 -m pip install -r requirements.txt  # 本技能声明的 Python 依赖
    npm i -g @mermaid-js/mermaid-cli    # mmdc；缺则降级为 <pre> 源码
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable
from resource_paths import description_roots
from offline_html import inline_page_assets

try:
    from markdown import markdown as _md_render  # type: ignore[import]
except ImportError:  # pragma: no cover - 容错
    sys.stderr.write("缺少依赖 markdown，请在查看器根目录运行 `python3 -m pip install -r requirements.txt`\n")
    sys.exit(1)


SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from page_ops import iter_leaf_nodes, load_nav, project_transaction  # type: ignore  # noqa: E402


# ---------------------------------------------------------------------------
# desc 增强层（复制按钮 + 放大层）
#   build_desc.py 把这两个文件读出并内联到 desc/<id>.html，保证每份
#   描述都自包含，双击 desc/<id>.html 也能完整使用。
# ---------------------------------------------------------------------------

_ENHANCE_DIR = Path(__file__).resolve().parent.parent / "assets"


def _read_enhance(filename: str) -> str:
    p = _ENHANCE_DIR / filename
    if not p.is_file():
        # 缺资源时降级：返回空字符串，不让整份 desc 渲染失败
        print(f"  ⚠ 描述增强资源缺失：{p}", file=sys.stderr)
        return ""
    return p.read_text(encoding="utf-8")


def render_description_template(**values: str) -> str:
    """UI markup stays in the bundled template; substitutions happen only once."""
    template = SCRIPT_DIR.parent / "templates" / "description.html"
    source = template.read_text(encoding="utf-8")
    return re.sub(r"@@([A-Z_]+)@@", lambda match: values[match[1].lower()], source)



# ---------------------------------------------------------------------------
# Markdown 预处理
# ---------------------------------------------------------------------------

# 匹配 ```mermaid ... ```；DOTALL；非贪婪
_MERMAID_FENCE_RE = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL)


def split_mermaid_blocks(md_text: str) -> tuple[str, list[str]]:
    """把 ``mermaid`` 代码块替换成占位符，返回 (剩余 md, mermaid 源码列表)。"""
    blocks: list[str] = []

    def _replace(match: re.Match[str]) -> str:
        idx = len(blocks)
        blocks.append(match.group(1).rstrip("\n"))
        return f"@@MERMAID_{idx}@@"

    return _MERMAID_FENCE_RE.sub(_replace, md_text), blocks


# ---------------------------------------------------------------------------
# Mermaid → SVG
# ---------------------------------------------------------------------------

_MMDC = shutil.which("mmdc")
if _MMDC is None:
    # Windows npm 全局路径
    npm_global = Path.home() / "AppData" / "Roaming" / "npm" / "mmdc.cmd"
    _MMDC = str(npm_global) if npm_global.exists() else None


def _mmdc_launcher() -> list[str]:
    """Windows 下 .cmd/.bat 无法被 CreateProcess 直接执行，需经 ``cmd /c`` 启动。"""
    if not _MMDC:
        return []
    if _MMDC.lower().endswith((".cmd", ".bat")):
        return ["cmd", "/c"]
    return []


def render_mermaid_svg(source: str) -> str:
    """调用 mmdc 把 mermaid 源码渲染成 SVG。

    失败时回退为 ``<pre>``，避免整个 desc 渲染挂掉。
    """
    if not _MMDC:
        return f'<pre class="mermaid-fallback"><code>{escape_html(source)}</code></pre>'

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        in_file = tmp_dir / "diagram.mmd"
        out_file = tmp_dir / "diagram.svg"
        in_file.write_text(source, encoding="utf-8")
        cmd = _mmdc_launcher() + [
            _MMDC, "-i", str(in_file), "-o", str(out_file),
            "-b", "transparent", "-q",
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=60)
        except subprocess.CalledProcessError as exc:
            err = exc.stderr.decode("utf-8", "replace").strip()
            print(f"  ⚠ mmdc 失败: {err[:200]}", file=sys.stderr)
            return f'<pre class="mermaid-fallback"><code>{escape_html(source)}</code></pre>'
        except subprocess.TimeoutExpired:
            print("  ⚠ mmdc 超时", file=sys.stderr)
            return f'<pre class="mermaid-fallback"><code>{escape_html(source)}</code></pre>'
        except FileNotFoundError:
            print(f"  ⚠ 无法启动 mmdc（{_MMDC}）：未安装或不可执行，请先 `npm i -g @mermaid-js/mermaid-cli`", file=sys.stderr)
            return f'<pre class="mermaid-fallback"><code>{escape_html(source)}</code></pre>'

        if not out_file.exists():
            return f'<pre class="mermaid-fallback"><code>{escape_html(source)}</code></pre>'
        return out_file.read_text(encoding="utf-8")


_P_WRAP_MERMAID = re.compile(r"<p>\s*(<div class=\"mermaid\">.*?</div>)\s*</p>", re.DOTALL)


def merge_mermaid_into_html(html: str, svgs: list[str]) -> str:
    """把占位符 ``@@MERMAID_<i>@@`` 替换成 ``<div class="mermaid">…</div>``。

    同时把 mmdc 默认的 ``my-svg`` id 重命名，避免同一份 HTML 多张图 CSS 冲突；
    并去掉 python-markdown 给块级元素强加的 ``<p>...</p>`` 包裹。
    """
    for idx, raw_svg in enumerate(svgs):
        unique = f"mermaid-svg-{idx}"
        # mmdc 默认生成 <svg id="my-svg" ...>，内部还有 id="my-svg_xxx" 与
        # 对应的 url(#my-svg_xxx) / CSS #my-svg 选择器；整体替换即可。
        svg = raw_svg.replace("my-svg", unique)
        wrapped = f'<div class="mermaid">{svg}</div>'
        html = html.replace(f"@@MERMAID_{idx}@@", wrapped)
    return _P_WRAP_MERMAID.sub(r"\1", html)


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
    )


# ---------------------------------------------------------------------------
# 目录（TOC）：从渲染后的 HTML 提取 H1–H6，生成稳定锚点 + 嵌套 <ul>
# ---------------------------------------------------------------------------

# 匹配 h1-h6 的开标签（可带属性）：<h1>, <h2 class="...">, <h3 id="...">
_HEADING_TAG_RE = re.compile(r"<(h[1-6])(?:\s[^>]*)?>", re.IGNORECASE)
# 匹配整段 heading：<h1>...</h1>
_HEADING_FULL_RE = re.compile(r"<(h[1-6])(?:\s[^>]*)?>(.*?)</\1>", re.IGNORECASE | re.DOTALL)
# 匹配开始标签属性串（用于保留 markdown 给的 id 等）
_HEADING_ATTR_RE = re.compile(r"<(h[1-6])(\s[^>]*)?>", re.IGNORECASE)
# 移除 HTML 标签（提取纯文本做 TOC 显示）
_HTML_TAG_RE = re.compile(r"<[^>]+>")
# HTML 实体反转义
_HTML_ENTITIES = (
    ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
    ("&quot;", '"'), ("&#39;", "'"), ("&apos;", "'"),
)


def _unescape_html(text: str) -> str:
    for ent, ch in _HTML_ENTITIES:
        text = text.replace(ent, ch)
    return text


def slugify(text: str) -> str:
    """把标题文本转成 URL 片段可用的 slug。

    - 空白 → 连字符
    - 移除非字母数字 / 中文 / 连字符的字符
    - 空串兜底为 'heading'
    """
    text = text.strip()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^\w一-鿿\-]", "", text, flags=re.UNICODE)
    return text or "heading"


def extract_html_headings(html: str) -> list[tuple[int, str]]:
    """从渲染后的 HTML 中按顺序提取 (level, text)。

    text 已经反转义 + 去标签。
    """
    out: list[tuple[int, str]] = []
    for m in _HEADING_FULL_RE.finditer(html):
        level = int(m.group(1)[1])
        raw = m.group(2)
        text = _unescape_html(_HTML_TAG_RE.sub("", raw)).strip()
        out.append((level, text))
    return out


def deduplicate_ids(headings: list[tuple[int, str]]) -> list[tuple[int, str, str]]:
    """为每个 heading 生成全文档唯一 id，重复时追加 -2/-3/..."""
    seen: dict[str, int] = {}
    out: list[tuple[int, str, str]] = []
    for level, text in headings:
        base = slugify(text)
        if base in seen:
            seen[base] += 1
            uid = f"{base}-{seen[base]}"
        else:
            seen[base] = 1
            uid = base
        out.append((level, text, uid))
    return out


def inject_heading_ids(html: str, headings: list[tuple[int, str, str]]) -> str:
    """把每个 heading 的开标签加上 id="..."，保留原属性。"""
    it = iter(headings)
    pattern = _HEADING_TAG_RE

    def replace(match: re.Match[str]) -> str:
        try:
            level, _text, anchor_id = next(it)
        except StopIteration:
            return match.group(0)
        tag = match.group(1)
        if int(tag[1]) != level:
            return match.group(0)
        # 保留原有属性（如果有）
        rest = match.group(0)[len(f"<{tag}"):-1]  # 去掉 <tag 和 >
        return f'<{tag} id="{anchor_id}"{rest}>'

    return pattern.sub(replace, html)


class _TocNode:
    """TOC 节点：递归构建嵌套 ul。"""

    __slots__ = ("level", "text", "anchor_id", "children")

    def __init__(self, level: int, text: str, anchor_id: str) -> None:
        self.level = level
        self.text = text
        self.anchor_id = anchor_id
        self.children: list[_TocNode] = []

    def render(self) -> str:
        has_children = bool(self.children)
        # 默认：H1 展开（露出 H2），H2+ 折叠（隐藏 H3+）。chevron 单击可切换。
        expanded_class = " is-expanded" if self.level == 1 else ""
        chevron = (
            '<span class="toc-chevron" data-toc-chevron role="button" tabindex="-1" aria-label="折叠/展开"></span>'
        ) if has_children else ""
        link = (
            f'<a href="#{self.anchor_id}" data-toc-id="{self.anchor_id}">'
            f'{escape_html(self.text)}</a>'
        )
        # 关键：无论有无子项，链接都包在 <span class="toc-row"> 里 —— 否则叶子节点的 <a>
        # 直接挂在 <li> 上，CSS .toc-row > a 选不到，仍会落入浏览器默认 <a> 样式（蓝下划线）。
        inner = "".join(c.render() for c in self.children)
        children_html = f'<ul class="toc-list">{inner}</ul>' if has_children else ''
        return (
            f'<li class="toc-item toc-h{self.level}{expanded_class}">'
            f'<span class="toc-row">{chevron}{link}</span>'
            f'{children_html}'
            f'</li>'
        )


def build_toc_html(headings: list[tuple[int, str, str]]) -> str:
    """从扁平 heading 列表构建嵌套 TOC HTML。无标题时返回空串。"""
    if not headings:
        return ""
    root = _TocNode(0, "", "")
    stack: list[_TocNode] = [root]
    for level, text, anchor_id in headings:
        node = _TocNode(level, text, anchor_id)
        # 弹出 level >= 当前的所有父节点
        while stack and stack[-1].level >= level:
            stack.pop()
        stack[-1].children.append(node)
        stack.append(node)
    if not root.children:
        return ""
    items = "".join(c.render() for c in root.children)
    return (
        '<nav class="toc-nav" aria-label="大纲">'
        '<div class="toc-header">'
        '<span class="toc-title">大纲</span>'
        '<button class="toc-action toc-toggle-all" type="button" title="展开/折叠全部">全部展开</button>'
        '</div>'
        f'<ul class="toc-list">{items}</ul>'
        '</nav>'
    )


# ---------------------------------------------------------------------------
# Markdown → HTML
# ---------------------------------------------------------------------------

_MD_EXTENSIONS = ["fenced_code", "tables", "sane_lists", "nl2br"]


def markdown_to_html_fragment(md_text: str) -> str:
    return _md_render(
        md_text,
        extensions=_MD_EXTENSIONS,
        output_format="html",
    )


# 进程级缓存：单次 sync 跑多份 desc，避免重复读盘
_ENHANCE_JS_CACHE: str | None = None
_ENHANCE_CSS_CACHE: str | None = None


def _get_enhance_js() -> str:
    global _ENHANCE_JS_CACHE
    if _ENHANCE_JS_CACHE is None:
        _ENHANCE_JS_CACHE = _read_enhance("desc-enhance.js")
    return _ENHANCE_JS_CACHE


def _get_enhance_css() -> str:
    global _ENHANCE_CSS_CACHE
    if _ENHANCE_CSS_CACHE is None:
        _ENHANCE_CSS_CACHE = _read_enhance("desc-enhance.css")
    return _ENHANCE_CSS_CACHE


# ---------------------------------------------------------------------------
# 原"第一行 TOC 切换按钮"已迁到 viewer 顶栏：viewer 端通过 postMessage 控制
# desc iframe 内的 toc-collapsed 状态。这里不再生成内嵌切换按钮 DOM。
# ---------------------------------------------------------------------------


def md_to_html(md_text: str, title: str) -> str:
    preprocessed, mermaid_blocks = split_mermaid_blocks(md_text)
    body_md = markdown_to_html_fragment(preprocessed)
    body_with_mermaid = merge_mermaid_into_html(body_md, [
        render_mermaid_svg(src) for src in mermaid_blocks
    ])
    # 提取 heading → 生成稳定 id → 注入到 HTML → 构建 TOC
    headings = deduplicate_ids(extract_html_headings(body_with_mermaid))
    body_with_ids = inject_heading_ids(body_with_mermaid, headings)
    toc_html = build_toc_html(headings)
    has_toc_class = "has-toc" if toc_html else "no-toc"
    # 开关按钮已迁到 viewer 顶栏；desc iframe 内不再注入 toc-toggle 按钮 DOM
    return render_description_template(
        title=escape_html(title),
        body=body_with_ids,
        toc=toc_html,
        has_toc_class=has_toc_class,
        enhance_css=_get_enhance_css(),
        enhance_js=_get_enhance_js(),
    )


# ---------------------------------------------------------------------------
# 主流程：导出 API 供其它脚本调用
# ---------------------------------------------------------------------------

def build_one(
    project_dir: Path,
    node: dict,
    *,
    quiet: bool = False,
) -> Path | None:
    """渲染单个节点，产物写到 desc/<id>.html。"""
    md_path = project_dir / node["mdPath"]
    if not md_path.exists():
        if not quiet:
            print(f"⚠ 跳过 {node['id']}: 描述缺失 {md_path}", file=sys.stderr)
        return None

    out_path = project_dir / "desc" / f"{node['id']}.html"
    md_text = md_path.read_text(encoding="utf-8")
    roots = description_roots(project_dir, md_path)
    html = md_to_html(md_text, node.get("title", node["id"]))
    html = inline_page_assets(html, md_path, project_dir, allowed_roots=roots)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    if not quiet:
        print(f"  ✓ {out_path.relative_to(project_dir)}")
    return out_path


from project_lock import locked_project, locked_cli


@locked_project
def build_all(project_dir: Path, *, target_id: str | None = None,
              quiet: bool = False) -> list[Path]:
    """批量渲染最新说明，供项目同步和单独渲染使用。"""
    with project_transaction(project_dir):
        nav = load_nav(project_dir)
        nodes = [n for n in iter_leaf_nodes(nav["tree"]) if n.get("mdPath")]
        if target_id:
            nodes = [n for n in nodes if n["id"] == target_id]
            if not nodes:
                if not quiet:
                    print(f"❌ 找不到 id={target_id} 的节点", file=sys.stderr)
                return []

        manifest = project_dir / '.generated-desc.json'
        previous = json.loads(manifest.read_text()) if manifest.exists() else []
        if not isinstance(previous, list) or any(not isinstance(x, str) or not re.fullmatch(r'desc/[a-z0-9][a-z0-9-]*\.html', x) for x in previous):
            raise ValueError('生成文件清单无效')
        kept = set(previous) if target_id else set()
        outs: list[Path] = []
        for n in nodes:
            relative = f"desc/{n['id']}.html"
            if (project_dir / relative).exists() and relative not in previous:
                raise ValueError(f'说明目标已有未登记文件：{relative}；旧项目请先执行 migrate_legacy.py')
            out = build_one(project_dir, n, quiet=quiet)
            if out:
                kept.add(relative)
                outs.append(out)

        for stale in set(previous) - kept:
            (project_dir / stale).unlink(missing_ok=True)
        manifest.write_text(json.dumps(sorted(kept), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

        return outs


@locked_cli
def main() -> int:
    parser = argparse.ArgumentParser(description="把 desc/*.md 渲染成 desc/*.html")
    parser.add_argument("project_dir")
    parser.add_argument("--id", default=None, help="只渲染指定节点")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    project_dir = Path(args.project_dir).resolve()
    if not args.quiet:
        print(f"📝 渲染描述 → {project_dir / 'desc'}")
    build_all(
        project_dir,
        target_id=args.id,
        quiet=args.quiet,
    )
    if not args.quiet:
        print("✅ 完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())