#!/usr/bin/env python3
"""add_page.py / remove_page.py / rename_page.py / sync_desc.py 共享的工具。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterable

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass


def load_nav(project_dir: Path) -> dict:
    """读取 nav.json；缺失或解析失败时给出友好提示而非裸 traceback。"""
    p = project_dir / "nav.json"
    if not p.exists():
        print(f"❌ 找不到 {p}（请确认当前目录是原型项目根目录）", file=sys.stderr)
        sys.exit(1)
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"❌ {p} 解析失败：{e}", file=sys.stderr)
        sys.exit(1)


def save_nav(project_dir: Path, data: dict) -> None:
    (project_dir / "nav.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def load_manual_nav(project_dir: Path) -> dict:
    """手动页面的唯一目录源；辅助脚本不能改合并后的 nav.json。"""
    path = project_dir / "nav.manual.json"
    if not path.is_file():
        print(f"❌ 找不到 {path}", file=sys.stderr)
        sys.exit(1)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        print(f"❌ {path} 解析失败：{error}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(data, dict) or not isinstance(data.get("tree"), list):
        print(f"❌ {path} 必须包含 tree 数组", file=sys.stderr)
        sys.exit(1)
    seen: set[str] = set()
    for node in iter_nodes(data["tree"]):
        node_id = node.get("id")
        if not isinstance(node_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", node_id) or node_id in seen:
            print(f"❌ {path} 包含非法或重复 id：{node_id}", file=sys.stderr)
            sys.exit(1)
        seen.add(node_id)
    return data


def save_manual_nav(project_dir: Path, data: dict) -> None:
    (project_dir / "nav.manual.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def manual_file(project_dir: Path, value: str, folder: str, suffix: str) -> Path:
    """限定手动页面的文件读写范围，避免误改 .published/ 或项目外文件。"""
    base = (project_dir / folder).resolve()
    target = (project_dir / value).resolve()
    if base not in target.parents or target.suffix.lower() != suffix:
        raise ValueError(f"手动文件必须是 {folder}/ 下的 {suffix} 文件：{value}")
    return target


def find_node(tree, node_id):
    for n in tree:
        if n["id"] == node_id:
            return n
        if n.get("children"):
            hit = find_node(n["children"], node_id)
            if hit:
                return hit
    return None


def iter_nodes(tree) -> Iterable[dict]:
    for n in tree:
        yield n
        if n.get("children"):
            yield from iter_nodes(n["children"])


def iter_leaf_nodes(tree) -> Iterable[dict]:
    """只迭代同时拥有 ``htmlPath`` 与 ``mdPath`` 的叶子节点（描述页面）。"""
    for n in iter_nodes(tree):
        if n.get("htmlPath") and n.get("mdPath"):
            yield n
