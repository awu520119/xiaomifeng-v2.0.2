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
                        if page_id != "order-list":
                            page.locator(".prototype-stage-mask").wait_for(state="visible", timeout=15000)
                        mask = page.locator(".ant-drawer-mask, .ant-modal-mask").first
                        mask.wait_for(state="visible", timeout=15000)
                        if not mask.evaluate("node => getComputedStyle(node).opacity === '1' && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0.6)'"):
                            raise RuntimeError(f"{page_id} 的遮罩不是黑色 60%")
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
                            if not page.get_by_role("button", name="返回", exact=True).is_disabled():
                                raise RuntimeError("领取页返回按钮未禁用")
                            page.get_by_role("button", name="立即领取").click()
                            page.get_by_text("领取成功", exact=True).wait_for(state="visible", timeout=15000)
                        elif page_id == "mini-redeem":
                            if not page.get_by_role("button", name="返回", exact=True).is_disabled():
                                raise RuntimeError("兑换页返回按钮未禁用")
                            if not page.get_by_placeholder("请输入体验券兑换码").input_value():
                                raise RuntimeError("兑换页缺少可试用的演示兑换码")
                            page.get_by_role("button", name="立即兑换").click()
                            page.get_by_role("button", name="确认兑换").click()
                            page.get_by_text("兑换成功", exact=True).wait_for(state="visible", timeout=15000)
                            page.get_by_role("button", name="查看我的券包", exact=True).click()
                            if page.locator(".mini-root").get_by_text("兑换成功", exact=True).count() != 1:
                                raise RuntimeError("兑换结果中的查看券包操作发生跳转")
                        elif page_id == "mini-wallet":
                            if not page.get_by_role("button", name="返回", exact=True).is_disabled():
                                raise RuntimeError("券包页返回按钮未禁用")
                            page.locator(".mini-ticket").first.wait_for(state="visible", timeout=15000)
                            for kind in ["满减券", "折扣券", "体验券"]:
                                if not page.locator(".mini-ticket-kind").filter(has_text=kind).count():
                                    raise RuntimeError(f"券包缺少{kind}演示券")
                            experience = page.locator(".mini-ticket-hero.experience").first
                            box = experience.bounding_box()
                            if not box or box["x"] + box["width"] > page.locator(".mini-ticket").first.bounding_box()["x"] + page.locator(".mini-ticket").first.bounding_box()["width"]:
                                raise RuntimeError("体验权益文案超出券卡")
                        elif page_id == "mini-checkout":
                            if not page.get_by_role("button", name="返回", exact=True).is_disabled():
                                raise RuntimeError("确认订单页返回按钮未禁用")
                            page.locator(".mini-footer-coupon").click()
                            page.get_by_role("dialog", name="选择优惠券").wait_for(state="visible", timeout=15000)
                            if page.locator(".mini-choice").count() < 2:
                                raise RuntimeError("确认订单缺少可选券")
                            page.get_by_role("button", name="确定", exact=True).click()
                            page.get_by_role("button", name=re.compile(r"确认支付|确认下单")).click()
                            page.get_by_text("待拍摄", exact=True).wait_for(state="visible", timeout=15000)
                            page.get_by_role("button", name="返回", exact=True).click()
                            page.locator(".mini-header strong").get_by_text("确认订单", exact=True).wait_for(state="visible", timeout=15000)
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
                        tabs = page.locator(".issuer-tabs")
                        if not tabs.is_visible() or tabs.locator(".ant-segmented-item").count() != 2:
                            raise RuntimeError(f"{page_id} 未展示两个页签")
                        disabled = tabs.locator(".ant-segmented-item-disabled")
                        if disabled.count() != 1 or not disabled.locator("input").is_disabled():
                            raise RuntimeError(f"{page_id} 非当前页签未禁用")
                        disabled.click(force=True)
                        if selected.inner_text().strip() != expected_tab:
                            raise RuntimeError(f"{page_id} 可切换到其他 PRD 页签")
                        if page_id == "issuer-center":
                            cards = page.locator(".issuer-coupon-card")
                            if page.get_by_text("选择优惠券", exact=True).count() or page.locator(".prototype-issuer-header").count():
                                raise RuntimeError("发券页仍展示重复标题或查看器身份信息")
                            if cards.count() != 3 or [card.locator(".issuer-kind-tag").inner_text() for card in cards.all()] != ["体验券", "满减券", "折扣券"]:
                                raise RuntimeError("发券列表未展示三类券各一张")
                            if any(card.locator(".issuer-benefit-panel").count() != 1 for card in cards.all()):
                                raise RuntimeError("发券卡片缺少独立权益区域")
                            if any(card.locator(".issuer-coupon-extra").count() for card in cards.all()):
                                raise RuntimeError("发券列表卡片仍展示适用范围或使用规则")
                            if cards.first.get_by_role("button").count() != 1 or cards.first.get_by_role("button", name="查看券码").count() != 1:
                                raise RuntimeError("体验券未使用查看券码入口")
                            button_width = cards.first.get_by_role("button", name="查看券码").bounding_box()["width"]
                            card_width = cards.first.bounding_box()["width"]
                            if button_width < card_width - 40:
                                raise RuntimeError("体验券查看券码按钮未铺满卡片内容宽度")
                            cards.first.get_by_role("button", name="查看券码").click()
                            filters = page.locator(".issuer-code-filters")
                            if [item.inner_text().strip() for item in filters.locator(".ant-segmented-item").all()] != ["未领取", "已领取"]:
                                raise RuntimeError("体验券编号列表未收敛为领券状态双筛选")
                            if page.locator(".issuer-code-benefit .issuer-benefit-value").count() != 1:
                                raise RuntimeError("体验券编号列表未展示券权益")
                            if not page.locator(".issuer-code-row").first.get_by_text("未领取", exact=True).is_visible():
                                raise RuntimeError("未领取编号缺少统一领取状态")
                            filters.get_by_text("已领取", exact=True).click()
                            if not page.locator(".issuer-code-row").first.locator("small").is_visible():
                                raise RuntimeError("已领取编号缺少领取手机号")
                            if not page.locator(".issuer-code-row").first.get_by_text("已领取", exact=True).is_visible():
                                raise RuntimeError("已领取编号仍展示使用状态")
                            page.locator(".issuer-code-row").first.click()
                            claimed_hero = page.locator(".issuer-code-hero")
                            if not claimed_hero.get_by_text("已领取", exact=True).is_visible():
                                raise RuntimeError("已领取编号详情未使用统一领取状态")
                            if not claimed_hero.locator(".issuer-code-coupon-name").is_visible() or not claimed_hero.locator(".issuer-code-serial strong").is_visible():
                                raise RuntimeError("已领取券码详情未突出券名称和编号")
                            if page.locator(".issuer-code-credential").count() or not claimed_hero.get_by_role("button", name="复制编号").is_visible():
                                raise RuntimeError("已领取且编号与券码相同的详情仍重复展示券码")
                            page.get_by_role("button", name="返回券码列表").click()
                            filters.get_by_text("未领取", exact=True).click()
                            if page.locator(".issuer-code-row small").count() or page.get_by_text("领取后开始计算有效期").count():
                                raise RuntimeError("未领取券码列表仍展示重复说明")
                            page.locator(".issuer-code-row").first.click()
                            if page.locator(".issuer-code-facts").count() or page.locator(".issuer-code-validity").count() != 1:
                                raise RuntimeError("未领取券码详情仍展示空领取字段")
                            open_hero = page.locator(".issuer-code-hero")
                            if not open_hero.locator(".issuer-code-coupon-name").is_visible() or not open_hero.locator(".issuer-code-serial strong").is_visible():
                                raise RuntimeError("未领取券码详情未突出券名称和编号")
                            code_modes = page.locator(".issuer-code-mode .ant-segmented-item")
                            if [item.inner_text().strip() for item in code_modes.all()] != ["定向发放", "扫码领取"] or code_modes.nth(0).get_attribute("class").find("ant-segmented-item-selected") < 0:
                                raise RuntimeError("体验券发放方式顺序或默认选中异常")
                            if page.get_by_text("该编号此前已分享，定向发放前需再次确认。").count():
                                raise RuntimeError("定向发放表单仍展示已分享提示")
                            if page.locator("#issuer-experience-code-qr").count():
                                raise RuntimeError("进入未领取编号详情时提前展示二维码")
                            page.locator(".issuer-code-mode").get_by_text("扫码领取", exact=True).click()
                            if page.get_by_role("button", name="展示领取二维码").count():
                                raise RuntimeError("未领取券码详情仍要求额外点击展示二维码")
                            page.locator("#issuer-experience-code-qr canvas").wait_for(state="visible", timeout=15000)
                            page.get_by_text("用户扫码领取后，体验券进入用户券包").wait_for(state="visible", timeout=15000)
                            page.wait_for_function("() => JSON.parse(localStorage.getItem('xingying-coupon-demo-v3') || '{}').tickets?.some(ticket => ticket.distributedById === 'current-admin' && !ticket.phoneDigits)", timeout=15000)
                            page.get_by_role("button", name="返回券码列表").click()
                            if not page.locator(".issuer-code-row").first.get_by_text("未领取", exact=True).is_visible() or page.get_by_text(re.compile(r"未分享|已分享")).count():
                                raise RuntimeError("分享后的编号仍显示分享状态")
                            page.locator(".issuer-code-row").nth(1).click()
                            page.locator(".issuer-code-mode").get_by_text("定向发放", exact=True).click()
                            if page.locator(".issuer-action-info .issuer-info-block").count() != 2:
                                raise RuntimeError("体验券定向发放缺少范围或规则")
                            direct_form_y = page.locator(".issuer-code-direct-form").bounding_box()["y"]
                            direct_info_y = page.locator(".issuer-action-info").bounding_box()["y"]
                            if direct_form_y >= direct_info_y:
                                raise RuntimeError("体验券定向发放未将手机号操作置于范围和规则之前")
                            code_rules = page.locator(".issuer-info-rules")
                            if code_rules.locator("p").is_visible():
                                raise RuntimeError("体验券定向发放规则未默认收起")
                            code_rules.locator("summary").click()
                            if not code_rules.locator("p").is_visible():
                                raise RuntimeError("体验券定向发放规则无法展开")
                            code_rules.locator("summary").click()
                            page.get_by_placeholder("请输入 11 位手机号").fill("13800000519")
                            page.get_by_role("button", name="确认发放").click()
                            page.get_by_text("发放成功", exact=True).wait_for(state="visible", timeout=15000)
                            if not page.get_by_text("已发给 138****0519").is_visible():
                                raise RuntimeError("单张体验券定向发放结果异常")
                            experience_card = page.locator(".issuer-result-card")
                            if experience_card.locator(".issuer-result-name").bounding_box()["width"] < experience_card.bounding_box()["width"] - 50:
                                raise RuntimeError("体验券发放成功页券名仍被挤在窄列")
                            page.get_by_role("button", name="继续发券").click()
                            cards.nth(1).get_by_role("button", name="定向发放").click()
                            if page.locator(".issuer-detail-box").count() or page.get_by_text("发放后，优惠券将绑定到该手机号账户。").count():
                                raise RuntimeError("定向发放页仍展示重复摘要或解释")
                            if page.locator(".issuer-action-heading .issuer-benefit-panel").count() != 1:
                                raise RuntimeError("定向发放页缺少独立权益区域")
                            if page.locator(".issuer-action-info .issuer-info-block").count() != 2:
                                raise RuntimeError("定向发放页缺少范围或规则")
                            direct_rules = page.locator(".issuer-info-rules")
                            if direct_rules.locator("p").is_visible():
                                raise RuntimeError("定向发放规则未默认收起")
                            direct_rules.locator("summary").click()
                            if not direct_rules.locator("p").is_visible():
                                raise RuntimeError("定向发放规则无法展开")
                            direct_rules.locator("summary").click()
                            page.get_by_placeholder("请输入 11 位手机号").fill("13800000520")
                            page.get_by_role("button", name="确认发放").click()
                            page.get_by_text("发放成功", exact=True).wait_for(state="visible", timeout=15000)
                            if page.locator(".issuer-result-code").count():
                                raise RuntimeError("满减券发放结果仍展示内部券码")
                            result_card = page.locator(".issuer-result-card")
                            name_box = result_card.locator(".issuer-result-name").bounding_box()
                            expiry_box = result_card.locator(".issuer-result-expiry").bounding_box()
                            if not name_box or not expiry_box or name_box["width"] < result_card.bounding_box()["width"] - 50 or expiry_box["y"] <= name_box["y"]:
                                raise RuntimeError("发放成功页券名与有效期仍被挤在窄列")
                            page.get_by_role("button", name="继续发券").click()
                            cards = page.locator(".issuer-coupon-card")
                            cards.nth(1).get_by_role("button", name="公开发放").click()
                            if page.get_by_text("公开领取入口已创建").count() or page.get_by_role("button", name="查看发放记录").count():
                                raise RuntimeError("公开领取页仍有旧文案或按钮")
                            if page.locator(".issuer-public-facts").count() or page.locator(".issuer-action-heading .ant-tag").count():
                                raise RuntimeError("公开领取页仍展示重复状态或券概况")
                            if page.locator(".issuer-action-heading .issuer-benefit-panel").count() != 1:
                                raise RuntimeError("公开领取页缺少独立权益区域")
                            if page.locator(".issuer-action-info .issuer-info-block").count() != 2:
                                raise RuntimeError("公开领取页缺少范围或规则")
                            public_rules = page.locator(".issuer-info-rules")
                            if public_rules.locator("p").is_visible():
                                raise RuntimeError("公开领取规则未默认收起")
                            public_rules.locator("summary").click()
                            if not public_rules.locator("p").is_visible():
                                raise RuntimeError("公开领取规则无法展开")
                            public_rules.locator("summary").click()
                            if public_rules.locator("p").is_visible():
                                raise RuntimeError("公开领取规则无法收起")
                        else:
                            filters = page.locator(".issuer-record-filters")
                            if filters.locator(".ant-segmented-item").count() != 4:
                                raise RuntimeError("发放记录缺少券码领取筛选")
                            times = page.locator(".issuer-activity-meta time").all_inner_texts()
                            if times != sorted(times, reverse=True):
                                raise RuntimeError("全部发放记录未按最近活动倒序展示")
                            if page.locator(".issuer-activity-card .issuer-benefit-panel").count() != page.locator(".issuer-activity-card").count():
                                raise RuntimeError("发放记录未统一展示独立权益区域")
                            if page.locator(".issuer-public-record .issuer-activity-main .ant-tag").count() or page.locator(".issuer-public-record .issuer-record-details summary .ant-tag").count():
                                raise RuntimeError("公开领取记录仍重复展示模板状态或明细数量")
                            if page.get_by_text("已领取 0 张").count():
                                raise RuntimeError("未发生领取的公开入口进入发放记录")
                            for coupon_name in ["拍摄满100减20", "拍摄满100元享8折"]:
                                price_record = page.locator(".issuer-public-record").filter(has_text=coupon_name).first
                                price_record.locator(".issuer-record-details summary").click()
                                if price_record.locator(".issuer-history-code").count():
                                    raise RuntimeError(f"{coupon_name}公开领取明细仍展示内部券码")
                            public_count = page.locator(".issuer-public-record").count()
                            page.evaluate("""() => {
                                const key = 'xingying-coupon-demo-v3';
                                const store = JSON.parse(localStorage.getItem(key));
                                store.plans.unshift({ id: 'CL-SMOKE-UNCLAIMED', couponId: 'CP-REDUCTION', allowedPhones: [],
                                    createdAt: '2026-10-26 12:00:00', operatorId: 'current-admin', operatorName: '系统管理员' });
                                localStorage.setItem(key, JSON.stringify(store));
                            }""")
                            page.reload(wait_until="load")
                            page.locator(".issuer-public-record").first.wait_for(state="visible", timeout=15000)
                            if page.locator(".issuer-public-record").count() != public_count:
                                raise RuntimeError("未有人领取的公开入口仍进入发放记录")
                            filters.get_by_text("券码领取", exact=True).click()
                            if page.locator(".issuer-ticket-record").count() < 1:
                                raise RuntimeError("券码领取缺少演示记录")
                            ticket_record = page.locator(".issuer-ticket-record").first
                            if ticket_record.get_by_text("体验券编号").is_visible():
                                raise RuntimeError("券码领取默认态仍展开追溯信息")
                            ticket_record.locator(".issuer-ticket-details summary").click()
                            if not ticket_record.get_by_text("体验券编号").is_visible():
                                raise RuntimeError("券码领取详情缺少体验券编号")
                        page.set_viewport_size({"width": 375, "height": 812})
                        frame = page.locator(".issuer-app-frame").bounding_box()
                        if page.evaluate("document.documentElement.scrollWidth > window.innerWidth") or not frame or frame["x"] < 0 or frame["x"] + frame["width"] > 375:
                            raise RuntimeError(f"{page_id} 在 375px 下横向溢出")
                    if page_id == "order-list":
                        dialog = page.get_by_role("dialog", name="订单详情", exact=True)
                        if not page.locator(".order-table-card").is_visible() or dialog.locator(".ant-drawer-close").count():
                            raise RuntimeError("订单列表背景或抽屉关闭限制异常")
                        page.locator(".ant-drawer-mask").first.click(position={"x": 10, "y": 100})
                        page.keyboard.press("Escape")
                        if not dialog.is_visible():
                            raise RuntimeError("订单详情可被遮罩或 Esc 关闭")
                        required = ["媒体交付", "订单信息", "优惠信息", "收款信息", "主题信息", "流程日志", "起飞任务 ID"]
                        if any(text not in dialog.inner_text() for text in required):
                            raise RuntimeError("订单详情缺少项目原型中的完整信息")
                        dialog.get_by_role("tab", name="照片(8)", exact=True).click()
                        if dialog.locator(".media-photo-card").count() != 8:
                            raise RuntimeError("订单详情照片切换异常")
                        dialog.locator(".order-flight-task-link").first.click()
                        task_dialog = page.get_by_role("dialog", name="起飞任务详情", exact=True)
                        task_dialog.wait_for(state="visible", timeout=15000)
                        task_dialog.locator(".ant-drawer-close").click()
                        task_dialog.wait_for(state="hidden", timeout=15000)
                        dialog.wait_for(state="visible", timeout=15000)
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
