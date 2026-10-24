#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="python3"
if [[ -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
  PYTHON="$SCRIPT_DIR/.venv/bin/python"
fi

cd "$SCRIPT_DIR"
"$PYTHON" scripts/sync_project.py .
"$PYTHON" scripts/export_single_file.py . --force
echo "✅ 查看器已同步并导出：$SCRIPT_DIR/share/prototype-viewer.html"
