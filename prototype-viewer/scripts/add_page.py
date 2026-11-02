#!/usr/bin/env python3
"""新增最小 HTML 和 Markdown 页面，并同步目录与说明。"""
from __future__ import annotations

import argparse
import os
from html import escape
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from page_ops import find_node, iter_nodes, load_manual_nav, load_nav, manual_file, save_manual_nav  # type: ignore
from page_ops import project_transaction
from sync_project import sync


from project_lock import locked_cli


@locked_cli
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir")
    parser.add_argument("--id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--parent", default="", help="父节点 id，留空表示顶层")
    parser.add_argument("--order", type=int, default=999)
    parser.add_argument("--html", default=None)
    parser.add_argument("--md", default=None)
    parser.add_argument("--create-parent", action="store_true",
                        help="父节点不存在时自动创建空分组节点")
    parser.add_argument("--parent-order", type=int, default=999,
                        help="自动创建父节点时的 order（默认追加到末尾）")
    parser.add_argument("--parent-title", default=None,
                        help="自动创建父节点时的 title（默认等于 parent id）")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project = Path(args.project_dir).resolve()
    data = load_manual_nav(project)
    combined = load_nav(project)
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.id):
        print(f"❌ id=`{args.id}` 不合法：仅允许小写字母/数字/连字符，且以字母或数字开头", file=sys.stderr)
        return 1
    if any(n["id"] == args.id for n in iter_nodes(combined["tree"])) or find_node(data["tree"], args.id):
        print(f"❌ id={args.id} 已存在", file=sys.stderr)
        return 1

    html_path = args.html or f"pages/{args.id}.html"
    md_path = args.md or f"desc/{args.id}.md"
    try:
        html_file = manual_file(project, html_path, "pages", ".html")
        md_file = manual_file(project, md_path, "desc", ".md")
    except ValueError as error:
        print(f"❌ {error}", file=sys.stderr)
        return 1
    html_path = html_file.relative_to(project).as_posix()
    md_path = md_file.relative_to(project).as_posix()
    for node in [*iter_nodes(combined["tree"]), *iter_nodes(data["tree"])]:
        if node.get("htmlPath") == html_path:
            print(f"❌ 文件路径已被节点 {node['id']} 使用", file=sys.stderr)
            return 1

    new_node = {
        "id": args.id,
        "title": args.title,
        "htmlPath": html_path,
        "mdPath": md_path,
        "order": args.order,
        "children": [],
    }

    target_tree = data["tree"]
    if args.parent:
        parent = find_node(data["tree"], args.parent)
        if not parent:
            if not args.create_parent:
                print(f"❌ 手动目录中没有父节点 {args.parent}（加 --create-parent 可自动创建）", file=sys.stderr)
                return 1
            if find_node(combined["tree"], args.parent):
                print(f"❌ 父节点 {args.parent} 属于发布源，不能作为手动分组", file=sys.stderr)
                return 1
            # 自动创建分组节点
            group = {
                "id": args.parent,
                "title": args.parent_title or args.parent,
                "order": args.parent_order,
                "children": [],
            }
            target_tree.append(group)
            parent = group
            print(f"➕ 已自动创建父分组 {args.parent}（title={group['title']!r}）")
        parent.setdefault("children", []).append(new_node)
    else:
        target_tree.append(new_node)

    if args.dry_run:
        print("DRY-RUN: 将新增节点：", new_node)
        return 0

    try:
        with project_transaction(project, manual=True):
            # 创建空白 html/md 模板（若不存在）。
            html_file.parent.mkdir(parents=True, exist_ok=True)
            md_file.parent.mkdir(parents=True, exist_ok=True)
            bridge = escape(Path(os.path.relpath(project / "assets/viewer-bridge.js", html_file.parent)).as_posix())
            if not html_file.exists():
                html_file.write_text(
                    '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8">'
                    '<meta name="viewport" content="width=device-width, initial-scale=1">'
                    '<meta name="device" content="pc">'
                    f'<title>{escape(args.title)}</title>'
                    f'<script src="{bridge}"></script>'
                    '</head><body>'
                    f'<main><h1>{escape(args.title)}</h1></main>'
                    '</body></html>\n', encoding='utf-8')
            if not md_file.exists():
                md_file.write_text(f"# {args.title}\n\n请补充此页面的原型说明。\n", encoding="utf-8")

            save_manual_nav(project, data)
            sync(project, verbose=True)
            print(f"✅ 新增节点 {args.id} 完成")
    except (ValueError, OSError) as error:
        print(f'❌ 操作已恢复：{error}', file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
