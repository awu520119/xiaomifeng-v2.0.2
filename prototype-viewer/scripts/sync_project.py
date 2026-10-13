#!/usr/bin/env python3
"""合并手动目录与外部发布片段，生成查看器最终产物。

手动内容维护在 ``nav.manual.json``、``pages/`` 和 ``desc/``；外部项目只可
写入 ``.published/<source-id>/``。本脚本是唯一生成 ``nav.json`` / ``nav.js``
及说明 HTML 的入口。
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import build_desc  # type: ignore  # noqa: E402


def fail(message: str) -> None:
    raise ValueError(message)


def read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"找不到 {path}")
    except json.JSONDecodeError as error:
        fail(f"{path} 不是合法 JSON：{error}")
    if not isinstance(value, dict):
        fail(f"{path} 必须是 JSON 对象")
    return value


def iter_nodes(nodes: list[dict]):
    for node in nodes:
        yield node
        children = node.get("children", [])
        if not isinstance(children, list):
            fail(f"节点 {node.get('id')} 的 children 必须是数组")
        yield from iter_nodes(children)


def validate_tree(tree: list[dict], source: str, ids: set[str], paths: set[str]) -> None:
    for node in iter_nodes(tree):
        node_id = node.get("id")
        if not isinstance(node_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", node_id):
            fail(f"{source} 包含非法 id：{node_id}")
        if node_id in ids:
            fail(f"节点 id 冲突：{node_id}（来源：{source}）")
        ids.add(node_id)
        for key in ("htmlPath", "mdPath"):
            value = node.get(key)
            if value is None:
                continue
            if not isinstance(value, str) or not value or value.startswith("/") or ".." in Path(value).parts:
                fail(f"节点 {node_id} 的 {key} 非法")
            if source == "手动目录":
                expected = "pages/" if key == "htmlPath" else "desc/"
                if not value.startswith(expected):
                    fail(f"手动节点 {node_id} 的 {key} 必须位于 {expected}")
            if value in paths:
                fail(f"内容路径冲突：{value}（来源：{source}）")
            paths.add(value)


def sort_tree(tree: list[dict]) -> None:
    for node in tree:
        if node.get("children"):
            sort_tree(node["children"])
    tree.sort(key=lambda node: (node.get("order", 999), node.get("title", "")))


def sync(project: Path, verbose: bool = False) -> None:
    marker = project / ".prototype-viewer.json"
    if not marker.exists():
        fail(f"{project} 不是受控原型查看器（缺少 {marker.name}）")

    manual_path = project / "nav.manual.json"
    # 兼容旧查看器：首次同步前以已有 nav.json 作为手动目录。
    manual = read_json(manual_path if manual_path.exists() else project / "nav.json")
    tree = manual.get("tree", [])
    if not isinstance(tree, list):
        fail("nav.manual.json 的 tree 必须是数组")

    ids: set[str] = set()
    paths: set[str] = set()
    validate_tree(tree, "手动目录", ids, paths)
    combined = list(tree)
    published = project / ".published"
    if published.exists():
        for source_dir in sorted(path for path in published.iterdir() if path.is_dir() and not path.name.startswith(".")):
            fragment_path = source_dir / "nav.fragment.json"
            if not fragment_path.exists():
                continue
            fragment = read_json(fragment_path)
            fragment_tree = fragment.get("tree", [])
            if not isinstance(fragment_tree, list):
                fail(f"{fragment_path} 的 tree 必须是数组")
            validate_tree(fragment_tree, f"发布源 {source_dir.name}", ids, paths)
            combined.extend(fragment_tree)

    sort_tree(combined)
    for node in iter_nodes(combined):
        for key in ("htmlPath", "mdPath"):
            value = node.get(key)
            if value and not (project / value).is_file():
                fail(f"节点 {node['id']} 的 {key} 文件不存在：{value}")
    data = {
        "projectName": manual.get("projectName", "原型查看器"),
        "lastSyncAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tree": combined,
    }
    (project / "nav.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (project / "nav.js").write_text(
        "// 由 sync_project.py 自动生成；不要手改。\nwindow.NAV_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    # 说明 HTML 统一放在 desc/<节点 id>.html；不清理手动文件，发布器只清理自己记录的产物。
    build_desc.build_all(project, clean=False, quiet=not verbose)
    result = subprocess.run([sys.executable, str(SCRIPT_DIR / "validate.py"), str(project), "--strict"], check=False)
    if result.returncode != 0:
        fail("同步后的严格校验未通过")
    if verbose:
        print(f"✅ 已合并 {len(combined)} 个顶级目录节点")


def main() -> int:
    parser = argparse.ArgumentParser(description="同步手动内容与外部发布内容")
    parser.add_argument("project_dir")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    try:
        sync(Path(args.project_dir).resolve(), args.verbose)
    except ValueError as error:
        print(f"❌ 同步失败：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
