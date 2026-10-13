#!/usr/bin/env bash
# 初始化可手动维护、也可接收外部发布的原型查看器。
# 用法: init-viewer.sh <destination>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DESTINATION="${1:-}"

if [ -z "$DESTINATION" ]; then
  echo "用法: init-viewer.sh <destination>"
  exit 1
fi
if [ -e "$DESTINATION" ]; then
  echo "目标目录已存在，已停止以避免覆盖: $DESTINATION"
  exit 1
fi

mkdir -p "$DESTINATION"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude .DS_Store --exclude SKILL.md --exclude agents --exclude __pycache__ --exclude node_modules "$SOURCE_DIR/" "$DESTINATION/"
else
  (cd "$SOURCE_DIR" && find . \( -path './agents' -o -path './node_modules' -o -path './**/__pycache__' \) -prune -o -type f ! -name SKILL.md ! -name .DS_Store -print | while IFS= read -r file; do mkdir -p "$DESTINATION/$(dirname "$file")"; cp "$file" "$DESTINATION/$file"; done)
fi

echo "初始化完成: $DESTINATION"
echo "手动内容：pages/、desc/、nav.manual.json"
echo "同步命令：python3 scripts/sync_project.py ."
