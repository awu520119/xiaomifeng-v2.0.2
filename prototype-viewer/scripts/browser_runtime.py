"""Shared browser selection; importing this module does not require Playwright."""
import os
import sys

def launch_browser(playwright):
    return playwright.chromium.launch(headless=True, timeout=20000,
        channel=os.environ.get('PROTOTYPE_BROWSER_CHANNEL') or 'chrome')

def browser_help():
    return (f'请先运行 {sys.executable} -m pip install -r requirements-browser.txt。'
            '默认使用本机 Google Chrome；没有 Chrome 时设置 '
            'PROTOTYPE_BROWSER_CHANNEL=chromium，并执行 '
            f'{sys.executable} -m playwright install chromium')
