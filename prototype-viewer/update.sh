#!/usr/bin/env bash
# Rebuild navigation, descriptions and the offline share after editing source files.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$#" -ne 0 ]; then
  echo "用法：bash $PROJECT_DIR/update.sh"
  exit 2
fi

if [ -x "$PROJECT_DIR/.venv/bin/python" ]; then
  VIEWER_PYTHON="$PROJECT_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  VIEWER_PYTHON="$(command -v python3)"
else
  echo "需要 Python 3.10+；请先按首次使用步骤创建 .venv 并安装 requirements.txt。" >&2
  exit 1
fi

exec "$VIEWER_PYTHON" "$PROJECT_DIR/scripts/export_single_file.py" "$PROJECT_DIR" --force
