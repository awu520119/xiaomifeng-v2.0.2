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
- index.html 不再注入旧 desc.js 引用（确认已切换到 iframe 渲染）
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


def iter_nodes(nodes):
    for n in nodes:
        yield n
        if n.get("children"):
            yield from iter_nodes(n["children"])


def collect_leaves(nodes):
    return [n for n in iter_nodes(nodes) if n.get("htmlPath")]


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

    tree = data.get("tree", [])
    all_nodes = list(iter_nodes(tree))

    # 1. 必填字段
    for n in all_nodes:
        if not n.get("id"):
            failures.append(f"节点缺少 id: {n}")
        if not n.get("title"):
            warnings.append(f"节点 {n.get('id')} 缺少 title")
        if "order" not in n:
            warnings.append(f"节点 {n.get('id')} 缺少 order")

    # 2. id 唯一
    ids = [n.get("id") for n in all_nodes]
    dup = {x for x in ids if ids.count(x) > 1}
    if dup:
        failures.append(f"节点 id 重复: {dup}")

    # 3. 叶子节点路径指向的文件存在
    for n in all_nodes:
        for k in ("htmlPath", "mdPath"):
            p = n.get(k)
            if not p:
                continue
            full = project / p
            if not full.exists():
                failures.append(f"节点 {n['id']} 的 {k}={p} 指向不存在的文件")

    # 4. 分组节点不能同时缺 htmlPath 和 children
    for n in all_nodes:
        if not n.get("htmlPath") and not n.get("children"):
            failures.append(f"节点 {n['id']} 既无 htmlPath 又无 children，是孤立节点")

    # 5. 手动 pages/ 与 nav 一致：发布内容放在 .published/，不纳入此检查
    pages_dir = project / "pages"
    declared = {(project / n["htmlPath"]).resolve() for n in collect_leaves(tree) if n.get("htmlPath")}
    if pages_dir.exists():
        for html in pages_dir.glob("*.html"):
            if html.resolve() not in declared:
                warnings.append(f"pages/{html.name} 未在 nav.json 中注册")

    # 6. 手动 desc/ .md 与 nav 一致；所有叶子节点都必须有生成说明 HTML
    desc_dir = project / "desc"
    declared_md = {(project / n["mdPath"]).resolve() for n in collect_leaves(tree) if n.get("mdPath")}
    if desc_dir.exists():
        for md in desc_dir.glob("*.md"):
            if md.resolve() not in declared_md:
                warnings.append(f"desc/{md.name} 未在 nav.json 中注册")
    for node in collect_leaves(tree):
        if node.get("mdPath") and not (desc_dir / f"{node['id']}.html").exists():
            failures.append(f"节点 {node['id']} 缺少生成说明 desc/{node['id']}.html，请运行 sync_project.py")

    # 7. 旧 desc.js 残留提示（不阻塞）
    if desc_dir.exists():
        stale = list(desc_dir.glob("*.desc.js"))
        if stale:
            warnings.append(f"desc/ 下存在 {len(stale)} 个旧 desc.js 残留，运行 sync_nav.py 会自动清理")

    # 8. nav.js 与 nav.json 一致
    nav_js = project / "nav.js"
    if nav_js.exists():
        try:
            js_data = json.loads(nav_js.read_text(encoding="utf-8").split("=", 1)[1].rstrip(";\n "))
            if js_data.get("lastSyncAt") != data.get("lastSyncAt") or js_data.get("tree") != tree:
                warnings.append("nav.js 与 nav.json 不同步，建议运行 sync_nav.py")
        except Exception as e:  # noqa: BLE001
            warnings.append(f"nav.js 解析失败: {e}")

    # 9. index.html 不再注入旧 desc.js 引用
    index_html = project / "index.html"
    if index_html.exists():
        text = index_html.read_text(encoding="utf-8")
        if 'data-page-desc="' in text:
            warnings.append("index.html 仍包含旧 data-page-desc 注入，建议运行 init_project.py 刷新查看器")
        if 'marked.min.js' in text:
            warnings.append("index.html 仍引用 marked.min.js，建议运行 init_project.py 刷新查看器")

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
