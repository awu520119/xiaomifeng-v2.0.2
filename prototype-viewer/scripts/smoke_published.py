#!/usr/bin/env python3
"""在替换查看器内容前，用浏览器检查待发布的自包含页面。"""
from __future__ import annotations

import argparse
from browser_runtime import launch_browser, browser_help
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="检查发布包中的页面实际渲染")
    parser.add_argument("stage_dir")
    args = parser.parse_args()
    stage = Path(args.stage_dir).resolve()
    fragment = json.loads((stage / "nav.fragment.json").read_text(encoding="utf-8"))
    source_id = fragment["sourceId"]

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print(browser_help(), file=sys.stderr)
        return 1

    pages = [page for group in fragment["tree"] for page in group.get("children", [])]
    try:
        with sync_playwright() as playwright:
            browser = launch_browser(playwright)
            try:
                for item in pages:
                    page_id = item["id"].removeprefix(f"{source_id}--")
                    path = stage / "pages" / f"{page_id}.html"
                    page = browser.new_page(viewport={"width": 1440, "height": 900})
                    errors: list[str] = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.goto(path.as_uri(), wait_until="load")
                    page.wait_for_function("(expected) => location.hash === expected", arg=item["routeHash"], timeout=15000)
                    ready = item.get("ready")
                    if ready:
                        locator = page.locator(ready["selector"])
                        if ready.get("text"):
                            locator = locator.filter(has_text=ready["text"])
                        locator.first.wait_for(state="visible", timeout=15000)
                    elif item.get("templateType") == "drawer":
                        page.locator(".ant-drawer-content-wrapper").wait_for(state="visible", timeout=15000)
                        page.locator(".ant-drawer-mask").wait_for(state="visible", timeout=15000)
                    else:
                        page.wait_for_function("document.querySelector('#root')?.textContent?.trim().length > 0", timeout=15000)
                    sidebars = page.locator(".app-sider")
                    if sidebars.count() and not sidebars.first.evaluate("(node) => getComputedStyle(node).display === 'none'"):
                        raise RuntimeError(f"{page_id} 的业务侧栏未隐藏")
                    if errors:
                        raise RuntimeError(f"{page_id} 页面报错：{errors[0]}")
                    print(f"✅ 页面渲染：{page_id}")
                    page.close()
            finally:
                browser.close()
    except Exception as error:
        print(f"❌ 浏览器校验失败：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
