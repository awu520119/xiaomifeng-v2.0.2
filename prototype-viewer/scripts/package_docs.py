#!/usr/bin/env python3
"""Copy selected PRDs and their local images into a publication package."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import argparse
import json
import posixpath
import shutil
import sys
from markdown import markdown
from resource_paths import image_file


class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'img':
            value = dict(attrs).get('src')
            if value:
                self.sources.append(value)


def package(docs: Path, destination: Path, names: list[str]) -> None:
    docs = docs.resolve()
    files = {}
    for name in set(names):
        relative = Path(name)
        source = (docs / relative).resolve()
        if relative.is_absolute() or '..' in relative.parts or '\\' in name or source.suffix != '.md' or docs not in source.parents or not source.is_file():
            raise ValueError(f'PRD 路径不存在或越界：{name}')
        files[relative] = source
        parser = Images()
        parser.feed(markdown(source.read_text(encoding='utf-8'), extensions=['fenced_code', 'tables']))
        for value in parser.sources:
            image = image_file(value, docs / relative, [docs])
            if image is None:
                continue
            target = Path(posixpath.normpath((relative.parent / unquote(urlsplit(value).path)).as_posix()))
            if target.is_absolute() or '..' in target.parts:
                raise ValueError(f'图片目标路径越界：{value}')
            files[target] = image
    # Validate every reference before writing anything.
    for relative, source in files.items():
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('docs_dir')
    parser.add_argument('destination')
    parser.add_argument('names_json')
    args = parser.parse_args()
    package(Path(args.docs_dir), Path(args.destination), json.loads(args.names_json))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError) as error:
        print(f'❌ PRD 打包失败：{error}', file=sys.stderr)
        sys.exit(1)
