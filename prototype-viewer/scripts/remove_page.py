#!/usr/bin/env python3
"""删除一个原型页面（html + md + desc/<id>.html + 旧 desc.js + nav 节点）。

用法:
    python remove_page.py <project_dir> --id user-form [--keep-empty-group]
"""
from __future__ import annotations

import argparse
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
from page_ops import find_node, load_manual_nav, manual_file, save_manual_nav  # type: ignore
from sync_nav import sync_nav  # type: ignore


def remove_node(tree, node_id):
    for i, n in enumerate(tree):
        if n["id"] == node_id:
            return tree.pop(i)
        if n.get("children"):
            hit = remove_node(n["children"], node_id)
            if hit is not None:
                return hit
    return None


def collect_leaf_files(project, node, out):
    """递归收集节点及其所有后代的 html/md/desc 文件（删除带子节点的分组时一并清理）。"""
    for p in (
        manual_file(project, node["htmlPath"], "pages", ".html") if node.get("htmlPath") else None,
        manual_file(project, node["mdPath"], "desc", ".md") if node.get("mdPath") else None,
        project / "desc" / f"{node['id']}.html",
        project / "desc" / f"{node['id']}.desc.js",  # 历史遗留
    ):
        if p and p.exists():
            out.append(p)
    for child in node.get("children") or []:
        collect_leaf_files(project, child, out)


def prune_empty_groups(nodes, dry_run=False):
    keep = []
    for n in nodes:
        if n.get("children"):
            n["children"] = prune_empty_groups(n["children"], dry_run)
        if n.get("htmlPath") or n.get("children"):
            keep.append(n)
        else:
            print(f"  - {'将清理' if dry_run else '清理'}空分组 {n['id']}")
    return keep


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir")
    parser.add_argument("--id", required=True)
    parser.add_argument("--keep-empty-group", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project = Path(args.project_dir).resolve()
    data = load_manual_nav(project)
    target = find_node(data["tree"], args.id)
    if not target:
        print(f"❌ 手动目录中没有节点 {args.id}；发布页面请在原型项目修改", file=sys.stderr)
        return 1

    files = []
    try:
        collect_leaf_files(project, target, files)
    except ValueError as error:
        print(f"❌ {error}", file=sys.stderr)
        return 1

    if args.dry_run:
        print(f"DRY-RUN: 将删除节点（含子节点）：{target['id']}")
        for f in files:
            print(f"  - 删除 {f.relative_to(project)}")
        if not args.keep_empty_group:
            prune_empty_groups(data["tree"], dry_run=True)
        return 0

    remove_node(data["tree"], args.id)
    for f in files:
        f.unlink()
        print(f"  - 删除 {f.relative_to(project)}")

    # 清理空分组
    if not args.keep_empty_group:
        data["tree"] = prune_empty_groups(data["tree"])

    save_manual_nav(project, data)
    if sync_nav(project, verbose=True) != 0:
        return 1
    print(f"✅ 节点 {args.id} 已删除")
    return 0


if __name__ == "__main__":
    sys.exit(main())
