"""Viewer-owned package replacement, synchronization and rollback."""
import argparse
import shutil
import subprocess
import sys
import tempfile
import re
from pathlib import Path
from page_ops import read_json, project_transaction
from project_lock import locked_cli, locked_project
from sync_project import sync

@locked_project
def receive(project, package):
    if read_json(project / '.prototype-viewer.json').get('toolkitVersion') != 5:
        raise ValueError('请先升级查看器到工具版本 5')
    source = read_json(package / 'nav.fragment.json').get('sourceId')
    if not isinstance(source, str) or not re.fullmatch(r'[a-z][a-z0-9-]*', source):
        raise ValueError('发布 sourceId 无效')
    published = project / '.published'
    published.mkdir(exist_ok=True)
    target = published / source
    if target.is_symlink() or any(path.is_symlink() for path in package.rglob('*')):
        raise ValueError('发布目标和包内资源不能是符号链接')
    temp = Path(tempfile.mkdtemp(prefix='.receive-', dir=published))
    preserve = False
    try:
        stage, backup = temp / 'stage', temp / 'backup'
        shutil.copytree(package, stage)
        subprocess.run([sys.executable, str(project / 'scripts/smoke_published.py'), str(stage)], check=True)
        original = target.exists()
        with project_transaction(project):
            if original:
                target.rename(backup)
            try:
                stage.rename(target)
                sync(project, verbose=True)
            except BaseException:
                try:
                    if target.exists():
                        shutil.rmtree(target)
                    if original:
                        backup.rename(target)
                except OSError as error:
                    preserve = True
                    raise ValueError(f'发布回滚失败，原包保留在 {backup}：{error}') from error
                raise
    finally:
        if not preserve:
            shutil.rmtree(temp)

@locked_cli
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project_dir')
    parser.add_argument('package_dir')
    args = parser.parse_args()
    try:
        receive(Path(args.project_dir).resolve(), Path(args.package_dir).resolve())
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'❌ 发布未完成：{error}', file=sys.stderr)
        return 1
    print('✅ 发布接收完成')
    return 0

if __name__ == '__main__':
    sys.exit(main())
