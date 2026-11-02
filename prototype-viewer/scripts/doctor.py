#!/usr/bin/env python3
"""Check only the dependencies required by the requested viewer operation."""
import argparse
from browser_runtime import launch_browser, browser_help
import importlib.util
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true', help='Check actual browser launch before publishing')
    args = parser.parse_args()
    failures = []
    if sys.version_info < (3, 10):
        failures.append('需要 Python 3.10 或更新版本')
    if importlib.util.find_spec('markdown') is None:
        failures.append(f'缺少 Markdown：{sys.executable} -m pip install -r requirements.txt')
    if args.browser:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = launch_browser(p)
                browser.close()
        except Exception as error:
            failures.append(f'浏览器不可用：{error}\n{browser_help()}')
    for failure in failures:
        print('❌ ' + failure, file=sys.stderr)
    if failures:
        return 1
    print('✅ Python、Markdown' + ('、浏览器' if args.browser else '') + '检查通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
