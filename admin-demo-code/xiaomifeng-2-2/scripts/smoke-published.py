#!/usr/bin/env python3
"""在替换查看器内容前，用浏览器检查待发布的自包含页面。"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="检查发布包中的页面实际渲染")
    parser.add_argument("stage_dir")
    args = parser.parse_args()
    stage = Path(args.stage_dir).resolve()
    fragment = json.loads((stage / "nav.fragment.json").read_text(encoding="utf-8"))
    source_id = fragment["sourceId"]
    config = json.loads((Path(__file__).resolve().parent.parent / "prototype-pages.json").read_text(encoding="utf-8"))
    expectations = {item["id"]: item for item in config["pages"]}

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("缺少浏览器校验依赖：请执行 python3 -m pip install playwright && python3 -m playwright install chromium", file=sys.stderr)
        return 1

    pages = [page for group in fragment["tree"] for page in group.get("children", [])]
    try:
        with sync_playwright() as playwright:
            # 可指定已安装浏览器；macOS 优先复用 Chrome，其他环境使用 Playwright Chromium。
            executable = os.environ.get("PROTOTYPE_BROWSER_EXECUTABLE")
            local_chrome = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
            if not executable and local_chrome.is_file():
                executable = str(local_chrome)
            browser = playwright.chromium.launch(headless=True, executable_path=executable)
            try:
                for item in pages:
                    page_id = item["id"].removeprefix(f"{source_id}--")
                    path = stage / "pages" / f"{page_id}.html"
                    is_mobile = expectations[page_id].get("device") == "mobile"
                    page = browser.new_page(viewport={"width": 375, "height": 812} if is_mobile else {"width": 1440, "height": 900})
                    errors: list[str] = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.goto(path.as_uri(), wait_until="load")
                    page.wait_for_function("(expected) => location.hash === expected", arg=item["routeHash"], timeout=15000)
                    expected_dialog = expectations[page_id].get("dialogTitle")
                    if expected_dialog:
                        page.get_by_role("dialog", name=expected_dialog, exact=True).wait_for(state="visible", timeout=15000)
                        page.locator(".prototype-stage-mask").wait_for(state="visible", timeout=15000)
                        mask = page.locator(".ant-drawer-mask, .ant-modal-mask").first
                        mask.wait_for(state="visible", timeout=15000)
                        if not mask.evaluate("node => getComputedStyle(node).opacity === '1' && getComputedStyle(node).backgroundColor === 'rgb(233, 235, 240)'"):
                            raise RuntimeError(f"{page_id} 的遮罩仍会露出背景")
                    if item.get("templateType") == "drawer":
                        page.get_by_role("dialog").wait_for(state="visible", timeout=15000)
                        page.locator(".ant-drawer-mask").wait_for(state="visible", timeout=15000)
                    else:
                        page.wait_for_function("document.querySelector('#root')?.textContent?.trim().length > 0", timeout=15000)
                        sidebars = page.locator(".app-sider")
                        if sidebars.count() and sidebars.first.evaluate("(node) => getComputedStyle(node).display !== 'none'"):
                            raise RuntimeError(f"{page_id} 仍显示业务侧栏")
                    if is_mobile:
                        page.locator(".mini-root").wait_for(state="visible", timeout=15000)
                        if page.evaluate("document.documentElement.scrollWidth > window.innerWidth"):
                            raise RuntimeError(f"{page_id} 移动端发生横向溢出")
                        if page_id == "mini-receive":
                            page.get_by_role("button", name="立即领取").click()
                            page.get_by_text("领取成功", exact=True).wait_for(state="visible", timeout=15000)
                        elif page_id == "mini-redeem":
                            if not page.get_by_placeholder("请输入体验券兑换码").input_value():
                                raise RuntimeError("兑换页缺少可试用的演示兑换码")
                            page.get_by_role("button", name="查询").click()
                            page.get_by_role("button", name="确认兑换").click()
                            page.get_by_text("兑换成功", exact=True).wait_for(state="visible", timeout=15000)
                        elif page_id == "mini-wallet":
                            page.locator(".mini-ticket").first.wait_for(state="visible", timeout=15000)
                        elif page_id == "mini-detail":
                            page.get_by_text("适用范围", exact=True).wait_for(state="visible", timeout=15000)
                        elif page_id == "mini-checkout":
                            page.locator(".mini-coupon-entry").click()
                            page.get_by_role("dialog", name="选择优惠券").wait_for(state="visible", timeout=15000)
                            if page.locator(".mini-choice").count() < 3:
                                raise RuntimeError("确认订单未展示两张可选价格券")
                            page.get_by_role("button", name=re.compile(r"确定使用")).click()
                            page.get_by_role("button", name="提交订单").click()
                            page.get_by_role("button", name=re.compile(r"确认支付")).click()
                            page.get_by_text("支付成功，优惠信息已记录在订单中。", exact=True).wait_for(state="visible", timeout=15000)
                    if page_id == "coupon-create":
                        page.get_by_placeholder("请输入优惠券名称", exact=True).fill("原型创建验证券")
                        page.get_by_placeholder("请输入使用规则，说明使用条件、适用范围等", exact=True).fill("满 100 元减 20 元，仅限适用主题。")
                        page.get_by_role("button", name=re.compile(r"^保\s*存$")).click()
                        page.get_by_role("dialog", name="创建优惠券", exact=True).wait_for(state="hidden", timeout=15000)
                        page.get_by_text("原型创建验证券", exact=True).wait_for(state="attached", timeout=15000)
                        if page.locator(".coupon-page").is_visible():
                            raise RuntimeError("创建后露出无关优惠券列表")
                    if page_id in {"issuer-center", "issuer-records"}:
                        expected_tab = "发放记录" if page_id == "issuer-records" else "发券"
                        selected = page.locator(".issuer-tabs .ant-segmented-item-selected")
                        selected.wait_for(state="attached", timeout=15000)
                        if selected.evaluate("node => node.textContent.trim()") != expected_tab:
                            raise RuntimeError(f"{page_id} 未默认打开 {expected_tab}")
                        if page.locator(".issuer-tabs").is_visible():
                            raise RuntimeError(f"{page_id} 仍可切换到其他 PRD 页签")
                    if page_id in {"coupon-records", "coupon-issued-records"} and page.locator(".coupon-records-tabs").count():
                        raise RuntimeError(f"{page_id} 仍包含其他记录页签")
                    if page_id == "order-list":
                        dialog = page.get_by_role("dialog", name="订单详情", exact=True)
                        if "优惠信息" not in dialog.inner_text() or any(text in dialog.inner_text() for text in ["退款", "分账", "起飞任务", "拍摄流程"]):
                            raise RuntimeError("订单优惠原型仍包含无关业务")
                    if page_id == "coupon-detail":
                        page.locator(".coupon-detail-drawer .ant-drawer-close").click()
                        page.get_by_role("dialog", name="优惠券详情", exact=True).wait_for(state="hidden", timeout=15000)
                        page.locator(".prototype-stage-mask").wait_for(state="visible", timeout=15000)
                        if page.locator(".coupon-page").is_visible():
                            raise RuntimeError("关闭详情后露出无关列表")
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
