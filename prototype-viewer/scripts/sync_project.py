#!/usr/bin/env python3
"""合并手动目录与外部发布片段，生成查看器最终产物。

手动内容维护在 ``nav.manual.json``、``pages/`` 和 ``desc/``；外部项目只可
写入 ``.published/<source-id>/``。本脚本是唯一生成 ``nav.json`` / ``nav.js``
及说明 HTML 的入口。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import build_desc  # type: ignore  # noqa: E402
from page_ops import read_json, validate_tree, project_transaction


def fail(message: str) -> None:
    raise ValueError(message)


def sort_tree(tree: list[dict]) -> None:
    for node in tree:
        if node.get("children"):
            sort_tree(node["children"])
    tree.sort(key=lambda node: (node.get("order", 999), node.get("title", "")))


from project_lock import locked_project


@locked_project
def sync(project: Path, verbose: bool = False) -> None:
    marker = project / ".prototype-viewer.json"
    if not marker.exists():
        fail(f"{project} 不是受控原型查看器（缺少 {marker.name}）")

    manual_path = project / "nav.manual.json"
    manual = read_json(manual_path)
    tree = manual.get("tree", [])
    if not isinstance(tree, list):
        fail("nav.manual.json 的 tree 必须是数组")

    ids: set[str] = set()
    paths: set[str] = set()
    validate_tree(tree, "手动目录", ids, paths, project=project)
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
            if fragment.get('sourceId') != source_dir.name:
                fail(f'{fragment_path} 的 sourceId 与目录不一致')
            validate_tree(fragment_tree, f"发布源 {source_dir.name}", ids, paths, project=project, prefix=source_dir.name)
            combined.extend(fragment_tree)

    sort_tree(combined)
    data = {
        "projectName": manual.get("projectName", "原型查看器"),
        "lastSyncAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tree": combined,
    }
    with project_transaction(project):
        (project / "nav.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (project / "nav.js").write_text(
            "// 由 sync_project.py 自动生成；不要手改。\nwindow.NAV_DATA = "
            + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
            encoding="utf-8",
        )
        # 说明 HTML 统一放在 desc/<节点 id>.html；不清理手动文件，发布器只清理自己记录的产物。
        build_desc.build_all(project, quiet=not verbose)
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
