"""One-time ownership migration; legacy scripts are backed up."""
import argparse
import json
import shutil
import tempfile
from pathlib import Path
from page_ops import load_nav, iter_leaf_nodes
from project_lock import locked_cli

@locked_cli
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project_dir')
    args = parser.parse_args()
    project = Path(args.project_dir).resolve()
    manifest = project / '.generated-desc.json'
    if not manifest.exists():
        owned = [f"desc/{node['id']}.html" for node in iter_leaf_nodes(load_nav(project)['tree'])
                 if node.get('mdPath') and (project / 'desc' / f"{node['id']}.html").is_file()]
        manifest.write_text(json.dumps(owned, ensure_ascii=False, indent=2) + '\n')
    old = list((project / 'desc').glob('*.desc.js'))
    if old:
        backup = Path(tempfile.mkdtemp(prefix='legacy-backup-', dir=project))
        for path in old:
            shutil.move(str(path), backup / path.name)
        print(f'旧说明脚本已备份到 {backup}')
    print('说明归属迁移完成；运行 update.sh 验证后再更新工具版本。')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
