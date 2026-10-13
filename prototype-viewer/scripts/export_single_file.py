#!/usr/bin/env python3
"""导出可双击打开的单文件原型查看器。

用法：python3 scripts/export_single_file.py . [--output share/prototype-viewer.html] [--force]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from page_ops import iter_leaf_nodes, load_nav  # type: ignore


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


def inline_desc_assets(html: str, project: Path) -> str:
    """说明页由旧版构建器生成时可能仍外链增强层，单文件导出时一并内联。"""
    replacements = (
        ("<link rel=\"stylesheet\" href=\"../assets/desc-enhance.css\">", "style", "desc-enhance.css"),
        ("<script src=\"../assets/desc-enhance.js\"></script>", "script", "desc-enhance.js"),
    )
    for tag, kind, filename in replacements:
        if tag not in html:
            continue
        content = read(project / "assets" / filename)
        replacement = f"<{kind}>\\n{content}\\n</{kind}>"
        html = html.replace(tag, replacement)
    return html


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

    data = load_nav(project)
    app_path = project / "react-app/dist/index.html"
    app_html = read(app_path) if app_path.is_file() else ""
    pages: dict[str, dict[str, str]] = {}
    descs: dict[str, str] = {}
    redirect_pattern = re.compile(r"location\.replace\(['\"]\.\./react-app/dist/index\.html(#[-\w/]+)?['\"]\)")

    for node in iter_leaf_nodes(data["tree"]):
        html_path = node.get("htmlPath")
        if html_path:
            page_html = read(project / html_path)
            match = redirect_pattern.search(page_html)
            if match and not app_html:
                raise FileNotFoundError(f"页面 {node['id']} 依赖 React 示例，请先构建 react-app")
            pages[html_path] = {"reactHash": match.group(1) or ""} if match else {"srcdoc": page_html}
        if node.get("mdPath"):
            descs[node["id"]] = inline_desc_assets(
                read(project / "desc" / f"{node['id']}.html"), project
            )

    html = read(project / "index.html")
    html = inline_tag(html, "style", "assets/viewer.css", read(project / "assets/viewer.css"))
    html = inline_tag(html, "script", "assets/vue.global.prod.js", read(project / "assets/vue.global.prod.js"))
    html = inline_tag(html, "script", "nav.js", f"window.NAV_DATA = {safe_json(data)};")
    embedded = (
        "window.PROTOTYPE_EMBEDDED_REACT_APP_HTML = " + safe_json(app_html) + ";\n"
        "window.PROTOTYPE_EMBEDDED_PAGES = " + safe_json(pages) + ";\n"
        "window.PROTOTYPE_EMBEDDED_DESCS = " + safe_json(descs) + ";"
    )
    html = inline_tag(html, "script", "assets/viewer.js", f"{embedded}\n{read(project / 'assets/viewer.js')}")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(f"✅ 已导出 {output.relative_to(project)}（{output.stat().st_size / 1024 / 1024:.2f} MB）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
