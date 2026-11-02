#!/usr/bin/env python3
"""导出可双击打开的单文件原型查看器。

用法：python3 scripts/export_single_file.py . [--output share/prototype-viewer.html] [--force]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import os
import tempfile
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from offline_html import inline_page_assets
from page_ops import iter_leaf_nodes, load_nav  # type: ignore
from sync_project import sync


def read(path: Path) -> str:
    if not path.is_file():
        raise FileNotFoundError(f"缺少必需文件：{path}")
    return path.read_text(encoding="utf-8")


def inline_tag(html: str, tag: str, source: str, content: str) -> str:
    if tag == "style":
        pattern = rf'<link rel="stylesheet" href="{re.escape(source)}"\s*/?>'
        replacement = f"<style>\n{content}\n</style>"
    else:
        pattern = rf'<script src="{re.escape(source)}"></script>'
        replacement = f"<script>\n{content}\n</script>"
    html, count = re.subn(pattern, lambda _: replacement, html, count=1)
    if count != 1:
        raise ValueError(f"入口页未找到资源引用：{source}")
    return html


def safe_json(value: object) -> str:
    # 防止内嵌 HTML 中的 </script> 提前结束承载数据的 script 标签。
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def pack_pages(pages: dict[str, dict[str, str]]) -> tuple[dict, list[str]]:
    """Share only identical large inline script bodies; preserve original HTML exactly."""
    matches = {}
    for path, page in pages.items():
        match = re.search(r'<script\b(?![^>]*\bsrc\s*=)[^>]*>(.*?)</script\s*>', page['srcdoc'], re.I | re.S)
        if match and len(match.group(1)) >= 1024:
            matches[path] = match
    counts = Counter(match.group(1) for match in matches.values())
    shared: list[str] = []
    indices: dict[str, int] = {}
    packed = {}
    for path, page in pages.items():
        match = matches.get(path)
        if not match or counts[match.group(1)] < 2:
            packed[path] = page
            continue
        script = match.group(1)
        if script not in indices:
            indices[script] = len(shared)
            shared.append(script)
        html = page['srcdoc']
        packed[path] = {'parts': [html[:match.start(1)], html[match.end(1):]], 'shared': indices[script]}
        assert packed[path]['parts'][0] + script + packed[path]['parts'][1] == html
    return packed, shared


from project_lock import locked_cli


@locked_cli
def main() -> int:
    parser = argparse.ArgumentParser(description="导出单个、可 file:// 离线打开的原型查看器 HTML")
    parser.add_argument("project_dir")
    parser.add_argument("--output", default="share/prototype-viewer.html")
    parser.add_argument("--force", action="store_true", help="允许覆盖已有输出文件")
    args = parser.parse_args()

    project = Path(args.project_dir).resolve()
    output = (project / args.output).resolve()
    if project not in output.parents:
        parser.error("--output 必须位于项目目录内")
    if output.exists() and not args.force:
        parser.error(f"输出已存在：{output}；确认覆盖请加 --force")

    sync(project)
    data = load_nav(project)
    pages: dict[str, dict[str, str]] = {}
    descs: dict[str, str] = {}

    for node in iter_leaf_nodes(data["tree"]):
        html_path = node.get("htmlPath")
        if html_path:
            page_html = read(project / html_path)
            pages[html_path] = {"srcdoc": inline_page_assets(page_html, project / html_path, project)}
        if node.get("mdPath"):
            descs[node["id"]] = read(project / "desc" / f"{node['id']}.html")

    packed_pages, shared_scripts = pack_pages(pages)
    html = read(project / "index.html")
    html = inline_tag(html, "style", "assets/viewer.css", read(project / "assets/viewer.css"))
    html = inline_tag(html, "script", "nav.js", f"window.NAV_DATA = {safe_json(data)};")
    embedded = (
        "window.PROTOTYPE_EMBEDDED_PAGES = (() => { const shared = " + safe_json(shared_scripts) + ";\n"
        "const pages = " + safe_json(packed_pages) + ";\n"
        "for (const page of Object.values(pages)) if (page.parts) "
        "page.srcdoc = page.parts[0] + shared[page.shared] + page.parts[1];\n"
        "return pages; })();\n"
        "window.PROTOTYPE_EMBEDDED_DESCS = " + safe_json(descs) + ";"
    )
    html = inline_tag(html, "script", "assets/viewer.js", f"{embedded}\n{read(project / 'assets/viewer.js')}")

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(html)
        os.replace(temporary, output)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
    print(f"✅ 已导出 {output.relative_to(project)}（{output.stat().st_size / 1024 / 1024:.2f} MB）")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        print(f"❌ 导出失败：{error}", file=sys.stderr)
        raise SystemExit(1)
