#!/usr/bin/env python3
"""检查查看器的 Python 版本、Markdown 依赖和可选浏览器。"""
from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true', help='尝试启动浏览器')
    args = parser.parse_args()
    problems = []
    if sys.version_info < (3, 10):
        problems.append('需要 Python 3.10 或更新版本')
    if importlib.util.find_spec('markdown') is None:
        problems.append(f'缺少 Markdown：{sys.executable} -m pip install -r requirements.txt')
    if args.browser:
        chrome = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        browser = str(chrome) if chrome.is_file() else (shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser'))
        use_playwright = os.environ.get('PROTOTYPE_BROWSER_CHANNEL') == 'chromium'
        if browser and not use_playwright:
            try:
                subprocess.run([browser, '--headless', '--disable-gpu', '--no-sandbox', '--dump-dom', 'about:blank'], check=True, capture_output=True, timeout=20)
            except Exception as chrome_error:  # noqa: BLE001
                if importlib.util.find_spec('playwright') is None:
                    problems.append(f'浏览器不可启动：{chrome_error}')
                else:
                    use_playwright = True
        if use_playwright:
            if importlib.util.find_spec('playwright') is None:
                problems.append('PROTOTYPE_BROWSER_CHANNEL=chromium 需要安装 Playwright')
            else:
                try:
                    from playwright.sync_api import sync_playwright
                    with sync_playwright() as playwright:
                        instance = playwright.chromium.launch(headless=True)
                        instance.close()
                except Exception as error:  # noqa: BLE001
                    problems.append(f'Playwright Chromium 不可用：{error}')
        elif not browser:
            problems.append('未发现 Chrome、Chromium 或 Playwright 浏览器')
    if problems:
        for problem in problems:
            print(f'❌ {problem}', file=sys.stderr)
        return 1
    print('✅ Python 和 Markdown 可用' + ('，浏览器可启动' if args.browser else ''))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
