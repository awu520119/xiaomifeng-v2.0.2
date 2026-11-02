"""One reentrant process lock for all viewer mutations (macOS/Linux/WSL)."""
from contextlib import contextmanager
from functools import wraps
from pathlib import Path
import fcntl
import sys

_held = set()

@contextmanager
def project_lock(project):
    project = Path(project).resolve()
    if project in _held:
        yield
        return
    with (project / '.viewer.lock').open('a+') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('查看器有其他更新任务运行，请稍后重试') from None
        _held.add(project)
        try:
            yield
        finally:
            _held.remove(project)
            fcntl.flock(handle, fcntl.LOCK_UN)

def locked_project(function):
    @wraps(function)
    def wrapped(project, *args, **kwargs):
        with project_lock(project):
            return function(project, *args, **kwargs)
    return wrapped

def locked_cli(function):
    @wraps(function)
    def wrapped():
        if len(sys.argv) < 2 or sys.argv[1].startswith('-'):
            return function()
        try:
            with project_lock(Path(sys.argv[1])):
                return function()
        except (ValueError, OSError) as error:
            print(f'❌ {error}', file=sys.stderr)
            return 1
    return wrapped
