"""Resolve image resources without reading outside explicitly allowed roots."""
from pathlib import Path
import mimetypes
from urllib.parse import unquote, urlsplit


def image_file(value: str, source: Path, roots: list[Path]) -> Path | None:
    if value.startswith('data:image/'):
        return None
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path or Path(unquote(url.path)).is_absolute() or '\\' in value:
        raise ValueError(f'图片必须是包内相对路径或内嵌图片：{value}')
    path = (source.parent / unquote(url.path)).resolve()
    if not any(root.resolve() in path.parents for root in roots):
        raise ValueError(f'图片资源越界：{value}')
    if not path.is_file():
        raise ValueError(f'图片资源缺失：{value}')
    mime = mimetypes.guess_type(path.name)[0] or ''
    if not mime.startswith('image/'):
        raise ValueError(f'不支持的图片类型：{value}')
    return path


def description_roots(project: Path, source: Path) -> list[Path]:
    parts = source.relative_to(project).parts
    if len(parts) >= 4 and parts[0] == '.published':
        return [project / '.published' / parts[1] / 'desc']
    return [project / 'desc', project / 'assets']
