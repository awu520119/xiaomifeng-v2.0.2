#!/usr/bin/env python3
"""重命名或移动一个原型页面。

用法:
    python rename_page.py <project_dir> --id user-form --new-id user-create \
        --new-title "创建用户" --new-parent user
"""
from __future__ import annotations

import argparse
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
from page_ops import find_node, load_manual_nav, load_nav, manual_file, save_manual_nav  # type: ignore
from sync_nav import sync_nav  # type: ignore


def detach(tree, node_id):
    for i, n in enumerate(tree):
        if n["id"] == node_id:
            return tree.pop(i)
        if n.get("children"):
            hit = detach(n["children"], node_id)
            if hit is not None:
                return hit
    return None


def attach(tree, parent_id, node):
    if not parent_id:
        tree.append(node)
        return True
    for n in tree:
        if n["id"] == parent_id:
            n.setdefault("children", []).append(node)
            return True
        if n.get("children") and attach(n["children"], parent_id, node):
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir")
    parser.add_argument("--id", required=True, help="当前节点 id")
    parser.add_argument("--new-id", default=None)
    parser.add_argument("--new-title", default=None)
    parser.add_argument("--new-parent", default=None, help="新父节点 id，留空表示顶层不变")
    parser.add_argument("--new-order", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project = Path(args.project_dir).resolve()
    data = load_manual_nav(project)
    node = find_node(data["tree"], args.id)
    if not node:
        print(f"❌ 手动目录中没有节点 {args.id}；发布页面请在原型项目修改", file=sys.stderr)
        return 1

    new_id = args.new_id or node["id"]
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", new_id):
        print(f"❌ new-id 不合法：{new_id}", file=sys.stderr)
        return 1
    try:
        old_html = manual_file(project, node["htmlPath"], "pages", ".html") if node.get("htmlPath") else None
        old_md = manual_file(project, node["mdPath"], "desc", ".md") if node.get("mdPath") else None
    except ValueError as error:
        print(f"❌ {error}", file=sys.stderr)
        return 1
    old_desc_html = project / "desc" / f"{node['id']}.html"
    old_desc_js = project / "desc" / f"{node['id']}.desc.js"  # 历史遗留

    if args.dry_run:
        print("DRY-RUN 计划：")
        print(f"  id:    {node['id']} -> {new_id}")
        if args.new_title:
            print(f"  title: {node.get('title')} -> {args.new_title}")
        if args.new_parent is not None:
            print(f"  parent: -> {args.new_parent or '顶层'}")
        return 0

    # ===== 前置校验：全部通过前不修改任何文件/数据，避免失败时项目处于损坏状态 =====
    if new_id != node["id"]:
        if find_node(load_nav(project)["tree"], new_id) or find_node(data["tree"], new_id):
            print(f"❌ new-id `{new_id}` 与树中已有节点冲突", file=sys.stderr)
            return 1
        # 目标文件若已存在则中止（Windows Path.rename 会抛 FileExistsError）
        for t in (
            old_html.with_name(new_id + ".html") if old_html else None,
            old_md.with_name(new_id + ".md") if old_md else None,
            project / "desc" / f"{new_id}.html",
            project / "desc" / f"{new_id}.desc.js",
        ):
            if t and t.exists():
                print(f"❌ 目标文件已存在：{t}", file=sys.stderr)
                return 1
    if args.new_parent is not None and args.new_parent != "" and not find_node(data["tree"], args.new_parent):
        print(f"❌ 新父节点 {args.new_parent} 不存在", file=sys.stderr)
        return 1
    # 环检测：不能把节点移到自身或其后代下（否则 attach 在新树里找不到父级，
    # 错误分支会把节点静默挪到顶层并 save_nav，破坏树结构）
    if args.new_parent is not None and args.new_parent != "":
        if args.new_parent == node["id"]:
            print(f"❌ 新父节点不能是节点自身", file=sys.stderr)
            return 1
        if find_node(node.get("children", []), args.new_parent):
            print(f"❌ 新父节点 {args.new_parent} 是该节点的后代，会造成循环引用", file=sys.stderr)
            return 1

    # ===== 树结构变更（先移动成功，再动文件）=====
    # new_parent 传空串表示移动到顶层（attach 支持 parent_id=""）
    if args.new_parent is not None:
        detached = detach(data["tree"], node["id"])
        if not attach(data["tree"], args.new_parent, detached):
            # 前置已校验 new_parent 存在，理论不会走到；回滚到根兜底
            print(f"❌ 新父节点 {args.new_parent} 不存在", file=sys.stderr)
            data["tree"].append(detached)
            save_manual_nav(project, data)
            return 1
    if args.new_title:
        node["title"] = args.new_title
    if args.new_order is not None:
        node["order"] = args.new_order

    # ===== 物理重命名（目标文件已校验不存在）=====
    if new_id != node["id"]:
        if old_html and old_html.exists():
            new_html = old_html.with_name(new_id + ".html")
            old_html.rename(new_html)
            node["htmlPath"] = new_html.relative_to(project).as_posix()
        if old_md and old_md.exists():
            new_md = old_md.with_name(new_id + ".md")
            old_md.rename(new_md)
            node["mdPath"] = new_md.relative_to(project).as_posix()
        if old_desc_html.exists():
            old_desc_html.rename(old_desc_html.with_name(new_id + ".html"))
        if old_desc_js.exists():
            old_desc_js.rename(old_desc_js.with_name(new_id + ".desc.js"))

    node["id"] = new_id
    save_manual_nav(project, data)
    if sync_nav(project, verbose=True) != 0:
        return 1
    print(f"✅ 已重命名/移动 {args.id} -> {new_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
