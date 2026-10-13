#!/usr/bin/env python3
"""兼容入口：同步手动目录与外部发布内容。

用法:
    python sync_nav.py <project_dir> [--verbose]

行为:
新项目请使用 ``sync_project.py``。保留该入口以兼容已有项目和文档。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure stdout can print emojis on Windows GBK terminals
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass


SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from sync_project import sync  # type: ignore  # noqa: E402


def sync_nav(project_dir: Path, verbose: bool = False, *,
             skip_existing: bool = False) -> int:
    del skip_existing
    try:
        sync(project_dir.resolve(), verbose)
    except ValueError as error:
        print(f"❌ 同步失败：{error}", file=sys.stderr)
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="同步手动目录与外部发布内容")
    parser.add_argument("project_dir")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    return sync_nav(Path(args.project_dir), args.verbose)


if __name__ == "__main__":
    sys.exit(main())
