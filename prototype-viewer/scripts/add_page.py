#!/usr/bin/env python3
"""新增一个原型页面并同步 nav.json / nav.js / desc/<id>.html。

用法:
    python add_page.py <project_dir> --id user-profile --title "用户画像" \
        --parent user --order 3 \
        [--create-parent]  # 父节点不存在时自动创建空分组
"""
from __future__ import annotations

import argparse
import html
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
from sync_nav import sync_nav  # type: ignore


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
        if node.get("htmlPath") == html_path or node.get("mdPath") == md_path:
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

    # 创建最小独立 HTML/Markdown 源文件，不预设业务 UI 框架。
    html_file.parent.mkdir(parents=True, exist_ok=True)
    md_file.parent.mkdir(parents=True, exist_ok=True)
    if not html_file.exists():
        title = html.escape(args.title, quote=True)
        html_file.write_text(
            "<!doctype html>\n<html lang=\"zh-CN\">\n<head>\n"
            "  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
            f"  <title>{title}</title>\n</head>\n<body>\n  <main>\n    <h1>{title}</h1>\n"
            "    <p>在此编写页面原型。</p>\n  </main>\n</body>\n</html>\n",
            encoding="utf-8",
        )
    if not md_file.exists():
        md_file.write_text(f"# {args.title}\n\n请补充此页面的原型说明。\n", encoding="utf-8")

    save_manual_nav(project, data)
    # sync_nav 会自动调用 build_desc 渲染新节点的 desc/<id>.html
    if sync_nav(project, verbose=True) != 0:
        return 1
    print(f"✅ 新增节点 {args.id} 完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())
