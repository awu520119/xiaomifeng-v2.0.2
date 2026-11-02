#!/usr/bin/env python3
"""add_page.py / remove_page.py / rename_page.py 共享的工具。"""
from __future__ import annotations

import json
from contextlib import contextmanager
from tempfile import TemporaryDirectory
import shutil
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
    try:
        validate_tree(data['tree'], '手动目录')
    except ValueError as error:
        print(f'❌ {error}', file=sys.stderr)
        sys.exit(1)
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
    if not isinstance(tree, list):
        raise ValueError('导航 children 必须是数组')
    for n in tree:
        if not isinstance(n, dict):
            raise ValueError('导航节点必须是对象')
        if not isinstance(n.get('children', []), list):
            raise ValueError(f"节点 {n.get('id')} 的 children 必须是数组")
        yield n
        yield from iter_nodes(n.get('children', []))


def iter_leaf_nodes(tree) -> Iterable[dict]:
    """迭代拥有 htmlPath 的页面；说明可选，页面也可有子节点。"""
    for n in iter_nodes(tree):
        if n.get("htmlPath"):
            yield n


def read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f'无法读取 {path.name}：{error}') from error
    if not isinstance(data, dict):
        raise ValueError(f'{path.name} 必须是 JSON 对象')
    return data


def validate_tree(tree, source: str, ids=None, paths=None, *, project=None, prefix=None):
    """One schema for manual content, published fragments and merged navigation."""
    if not isinstance(tree, list):
        raise ValueError(f'{source} 的 tree 必须是数组')
    ids = ids if ids is not None else set()
    paths = paths if paths is not None else set()
    for node in iter_nodes(tree):
        node_id = node.get('id')
        if not isinstance(node_id, str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]*', node_id):
            raise ValueError(f'{source} 包含非法 id：{node_id}')
        if node_id in ids:
            raise ValueError(f'节点 id 冲突：{node_id}（{source}）')
        if not isinstance(node.get('title'), str) or not node['title'].strip():
            raise ValueError(f'节点 {node_id} 缺少有效标题')
        if type(node.get('order')) is not int:
            raise ValueError(f'节点 {node_id} 的 order 必须是整数')
        if prefix and not node_id.startswith(f'{prefix}--'):
            raise ValueError(f'发布节点 {node_id} 不属于 {prefix}')
        ids.add(node_id)
        for key, suffix, folder in [('htmlPath', '.html', 'pages'), ('mdPath', '.md', 'desc')]:
            value = node.get(key)
            if value is None:
                continue
            if not isinstance(value, str) or not value or Path(value).is_absolute() or '..' in Path(value).parts or '\\' in value or Path(value).suffix != suffix:
                raise ValueError(f'节点 {node_id} 的 {key} 非法：{value}')
            expected = f'.published/{prefix}/{folder}/' if prefix else f'{folder}/' if source == '手动目录' else None
            if expected and not value.startswith(expected):
                raise ValueError(f'节点 {node_id} 的 {key} 必须位于 {expected}')
            if key == 'htmlPath' and value in paths:
                raise ValueError(f'内容路径冲突：{value}')
            paths.add(value)
            if project is not None:
                full = (project / value).resolve()
                if project.resolve() not in full.parents or not full.is_file():
                    raise ValueError(f'节点 {node_id} 的资源不存在或越界：{value}')


_transactions = set()

@contextmanager
def project_transaction(project: Path, *, manual: bool = False, extra_files=()):
    """Restore only files owned by this operation when rendering or validation fails."""
    project = project.resolve()
    if project in _transactions:
        yield
        return
    def owned():
        result = {project / 'nav.json', project / 'nav.js', project / '.generated-desc.json', *extra_files}
        desc = project / 'desc'
        if desc.exists():
            result.update(desc.rglob('*.html'))
            if manual:
                result.update(desc.rglob('*.md'))
        if manual:
            result.add(project / 'nav.manual.json')
            result.update((project / 'pages').rglob('*.html'))
        return {path for path in result if path.is_file()}

    with TemporaryDirectory(prefix='viewer-transaction-') as temp:
        backup = Path(temp)
        original = owned()
        for path in original:
            target = backup / path.relative_to(project)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
        try:
            _transactions.add(project)
            yield
        except BaseException:
            for path in owned() - original:
                path.unlink()
            for path in original:
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backup / path.relative_to(project), path)
            raise
        finally:
            _transactions.discard(project)
