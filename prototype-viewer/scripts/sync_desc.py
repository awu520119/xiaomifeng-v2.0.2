#!/usr/bin/env python3
"""根据对应 ``.md`` 重新渲染 ``desc/<id>.html``。

用法:
    python sync_desc.py <project_dir> [--id <node_id>]
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
import build_desc  # type: ignore  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="同步 desc/<id>.html")
    parser.add_argument("project_dir")
    parser.add_argument("--id", default=None, help="只渲染指定节点")
    parser.add_argument("--no-clean", action="store_true")
    args = parser.parse_args()

    project = Path(args.project_dir).resolve()
    print(f"📝 渲染描述 → {project / 'desc'}")
    outs = build_desc.build_all(
        project,
        target_id=args.id,
        clean=not args.no_clean,
        quiet=False,
    )
    if not outs and args.id:
        return 1
    print("✅ 完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())
