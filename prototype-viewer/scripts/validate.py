#!/usr/bin/env python3
"""校验原型项目的一致性。

用法:
    python validate.py <project_dir>

检查项:
- nav.json 是合法 JSON
- 节点 id 全局唯一
- 叶子节点 htmlPath / mdPath 指向的文件存在
- pages/ 下所有 HTML 都被 nav.json 引用（无孤儿）
- desc/ 下所有 .md 都被 nav.json 引用（无孤儿）
- 每个 .md 都已渲染出对应的 desc/<id>.html（build_desc.py 产物）
- nav.js 与 nav.json 内容一致
- 必填字段（id/title/order）齐全
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass


from page_ops import iter_leaf_nodes, validate_tree


def main() -> int:
    parser = argparse.ArgumentParser(description="校验原型项目一致性")
    parser.add_argument("project_dir")
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--strict", action="store_true", help="将警告也视为校验失败")
    args = parser.parse_args()

    project = Path(args.project_dir).resolve()
    failures: list[str] = []
    warnings: list[str] = []
    log = (lambda *a: None) if args.quiet else print

    nav_json = project / "nav.json"
    if not nav_json.exists():
        print(f"❌ 找不到 {nav_json}", file=sys.stderr)
        return 1
    try:
        data = json.loads(nav_json.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        failures.append(f"nav.json 解析失败: {e}")
        print(f"❌ {failures[-1]}")
        return 1
    log(f"✅ nav.json 是合法 JSON")

    tree = data.get('tree', [])
    try:
        validate_tree(tree, '合并目录', project=project)
    except ValueError as error:
        print(f'❌ {error}', file=sys.stderr)
        return 1

    # 5. 手动 pages/ 与 nav 一致：发布内容放在 .published/，不纳入此检查
    pages_dir = project / "pages"
    declared = {(project / n["htmlPath"]).resolve() for n in iter_leaf_nodes(tree) if n.get("htmlPath")}
    if pages_dir.exists():
        for html in pages_dir.rglob("*.html"):
            if html.resolve() not in declared:
                warnings.append(f"pages/{html.name} 未在 nav.json 中注册")

    # 6. 手动 desc/ .md 与 nav 一致；所有叶子节点都必须有生成说明 HTML
    desc_dir = project / "desc"
    declared_md = {(project / n["mdPath"]).resolve() for n in iter_leaf_nodes(tree) if n.get("mdPath")}
    if desc_dir.exists():
        for md in desc_dir.rglob("*.md"):
            if md.resolve() not in declared_md:
                warnings.append(f"desc/{md.name} 未在 nav.json 中注册")
    for node in iter_leaf_nodes(tree):
        if node.get("mdPath") and not (desc_dir / f"{node['id']}.html").exists():
            failures.append(f"节点 {node['id']} 缺少生成说明 desc/{node['id']}.html，请运行 sync_project.py")

    # 8. nav.js 与 nav.json 一致
    nav_js = project / "nav.js"
    if not nav_js.is_file():
        failures.append("缺少 nav.js，请运行 sync_project.py")
    else:
        try:
            js_data = json.loads(nav_js.read_text(encoding="utf-8").split("=", 1)[1].rstrip(";\n "))
            if js_data.get("lastSyncAt") != data.get("lastSyncAt") or js_data.get("tree") != tree:
                warnings.append("nav.js 与 nav.json 不同步，建议运行 sync_project.py")
        except Exception as e:  # noqa: BLE001
            warnings.append(f"nav.js 解析失败: {e}")

    # 汇总
    if warnings:
        log("\n⚠️ 警告：")
        for w in warnings:
            log(f"  - {w}")
    if failures:
        log("\n❌ 失败：")
        for f in failures:
            log(f"  - {f}")
        log(f"\n共 {len(failures)} 处失败")
        return 1
    if args.strict and warnings:
        print(f"❌ 严格校验失败：{len(warnings)} 条警告", file=sys.stderr)
        return 1

    log("\n🎉 全部通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
