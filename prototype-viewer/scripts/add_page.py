#!/usr/bin/env python3
"""新增一个原型页面并同步 nav.json / nav.js / desc/<id>.html。

用法:
    python add_page.py <project_dir> --id user-profile --title "用户画像" \
        --parent user --template detail --order 3 \
        [--create-parent]  # 父节点不存在时自动创建空分组

--template 支持多种写法：
    list / form / detail / dashboard       # 向后兼容，默认 templates/pc/*
    pc/list / pc/form / pc/detail / pc/dashboard
    mobile/list / mobile/form / mobile/detail / mobile/dashboard
    mobile-list / mobile-form / mobile-detail / mobile-dashboard  # 别名写法

解析后会把 nav.json 节点的 templateType 写成：
    list / form / detail / dashboard         ← 对应 templates/pc/<name>.html
    mobile-list / mobile-form / mobile-detail / mobile-dashboard  ← 对应 templates/mobile/<name>.html
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from page_ops import find_node, iter_nodes, load_manual_nav, load_nav, manual_file, save_manual_nav  # type: ignore
from sync_nav import sync_nav  # type: ignore


# === scaffold 资源定位：脚本位于 scaffold/scripts/，templates/ 直接挂在 scaffold 根下 ===
TEMPLATES_DIR = SCRIPT_DIR.parent / "templates"
PC_TEMPLATE_NAMES = ("list", "form", "detail", "dashboard")


def resolve_template(template_arg: str):
    """解析 ``--template`` 参数，返回 ``(src_path_or_None, templateType)``。

    解析规则：
        list / form / detail / dashboard           → ``templates/pc/<name>.html``，templateType=<name>
        pc/<name>                                   → 同上
        mobile/<name>                               → ``templates/mobile/<name>.html``，templateType=mobile-<name>
        mobile-<name>                               → 同 mobile/<name>
        custom / 其它                               → ``(None, "custom")``

    返回的 src_path 如果指向不存在的文件（如老项目里没拷 templates/），仍会返回路径但调用方需自己判断。
    """
    if not template_arg or template_arg == "custom":
        return None, "custom"

    # mobile-<name> 别名
    if template_arg.startswith("mobile-"):
        base = template_arg[len("mobile-"):]
        if base in PC_TEMPLATE_NAMES:
            return TEMPLATES_DIR / "mobile" / f"{base}.html", template_arg
        return None, "custom"

    # pc/<name> 或 mobile/<name> 限定写法
    if "/" in template_arg:
        subdir, _, name = template_arg.partition("/")
        if subdir in ("pc", "mobile") and name in PC_TEMPLATE_NAMES:
            template_type = f"mobile-{name}" if subdir == "mobile" else name
            return TEMPLATES_DIR / subdir / f"{name}.html", template_type
        return None, "custom"

    # bare 名字（向后兼容 → pc/）
    if template_arg in PC_TEMPLATE_NAMES:
        return TEMPLATES_DIR / "pc" / f"{template_arg}.html", template_arg

    # 其它未命名的字符串：统一归一化为 custom，避免把任意值写进 nav.templateType
    return None, "custom"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir")
    parser.add_argument("--id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--parent", default="", help="父节点 id，留空表示顶层")
    parser.add_argument("--template", default="custom",
                        help="模板路径：list/form/detail/dashboard（=pc/*），pc/*，mobile/*，mobile-*")
    parser.add_argument("--order", type=int, default=999)
    parser.add_argument("--html", default=None)
    parser.add_argument("--md", default=None)
    parser.add_argument("--create-parent", action="store_true",
                        help="父节点不存在时自动创建空分组节点")
    parser.add_argument("--parent-order", type=int, default=999,
                        help="自动创建父节点时的 order（默认追加到末尾）")
    parser.add_argument("--parent-title", default=None,
                        help="自动创建父节点时的 title（默认等于 parent id）")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project = Path(args.project_dir).resolve()
    data = load_manual_nav(project)
    combined = load_nav(project)
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.id):
        print(f"❌ id=`{args.id}` 不合法：仅允许小写字母/数字/连字符，且以字母或数字开头", file=sys.stderr)
        return 1
    if any(n["id"] == args.id for n in iter_nodes(combined["tree"])) or find_node(data["tree"], args.id):
        print(f"❌ id={args.id} 已存在", file=sys.stderr)
        return 1

    html_path = args.html or f"pages/{args.id}.html"
    md_path = args.md or f"desc/{args.id}.md"
    try:
        html_file = manual_file(project, html_path, "pages", ".html")
        md_file = manual_file(project, md_path, "desc", ".md")
    except ValueError as error:
        print(f"❌ {error}", file=sys.stderr)
        return 1
    html_path = html_file.relative_to(project).as_posix()
    md_path = md_file.relative_to(project).as_posix()
    for node in [*iter_nodes(combined["tree"]), *iter_nodes(data["tree"])]:
        if node.get("htmlPath") == html_path or node.get("mdPath") == md_path:
            print(f"❌ 文件路径已被节点 {node['id']} 使用", file=sys.stderr)
            return 1

    # 解析 --template，写入节点 templateType，并拿到模板源文件
    template_src, template_type = resolve_template(args.template)
    new_node = {
        "id": args.id,
        "title": args.title,
        "htmlPath": html_path,
        "mdPath": md_path,
        "templateType": template_type,
        "order": args.order,
        "children": [],
    }

    target_tree = data["tree"]
    if args.parent:
        parent = find_node(data["tree"], args.parent)
        if not parent:
            if not args.create_parent:
                print(f"❌ 手动目录中没有父节点 {args.parent}（加 --create-parent 可自动创建）", file=sys.stderr)
                return 1
            if find_node(combined["tree"], args.parent):
                print(f"❌ 父节点 {args.parent} 属于发布源，不能作为手动分组", file=sys.stderr)
                return 1
            # 自动创建分组节点
            group = {
                "id": args.parent,
                "title": args.parent_title or args.parent,
                "order": args.parent_order,
                "children": [],
            }
            target_tree.append(group)
            parent = group
            print(f"➕ 已自动创建父分组 {args.parent}（title={group['title']!r}）")
        parent.setdefault("children", []).append(new_node)
    else:
        target_tree.append(new_node)

    if args.dry_run:
        print("DRY-RUN: 将新增节点：", new_node)
        if template_src:
            print(f"DRY-RUN: 模板来源 {template_src}（templateType={template_type}）")
        return 0

    # 创建空白 html/md 模板（若不存在）。
    html_file.parent.mkdir(parents=True, exist_ok=True)
    md_file.parent.mkdir(parents=True, exist_ok=True)
    if not html_file.exists():
        if template_src and template_src.exists():
            # 从模板拷贝，替换 {{PAGE_TITLE}} 占位符；其它占位符（{{CONTENT}} / {{TABBAR}} 等）保留由 PM 后续填写
            content = template_src.read_text(encoding="utf-8")
            content = content.replace("{{PAGE_TITLE}}", args.title)
            html_file.write_text(content, encoding="utf-8")
            print(f"📄 已从模板 {template_src.name} 拷贝 → {html_file}")
        else:
            if template_src:
                print(f"⚠ 模板 {template_src} 不存在，已回退为占位 HTML（请检查 templates/ 是否完整）", file=sys.stderr)
            # custom / 模板不存在：回退到默认占位 HTML（向后兼容）
            html_file.write_text(
                "<!DOCTYPE html>\n<html lang='zh-CN'><head><meta charset='UTF-8'>"
                f"<title>{args.title}</title>"
                "<link rel='stylesheet' href='../assets/element-plus.css'>"
                "<script src='../assets/vue.global.prod.js'></script>"
                "<script src='../assets/element-plus.full.min.js'></script>"
                "<script src='../assets/icons-vue.iife.min.js'></script>"
                "<script src='../assets/viewer-bridge.js'></script>"
                "<style>body{margin:0;background:#f5f7fa;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif}.page{padding:16px}"
                ".card{background:#fff;padding:16px 24px;border-radius:4px;margin:12px 0}</style>"
                "</head><body><div id='app' class='page'>"
                f"<h2 style='margin:0 0 12px'>{args.title}</h2>"
                "<div class='card'>在此编辑原型内容（Element Plus / Vue 3 + viewer 自动注入的 ElMessage / ElMessageBox / gotoNode）。</div>"
                "</div>\n"
                "<script>\n"
                "  const { createApp } = Vue;\n"
                "  createApp({ setup() {\n"
                "    const onGreet = () => ElMessage.success('viewer 已自动注入 ElMessage 短 API');\n"
                "    return { onGreet };\n"
                "  } }).use(ElementPlus).mount('#app');\n"
                "</script></body></html>\n",
                encoding="utf-8",
            )
    if not md_file.exists():
        md_file.write_text(f"# {args.title}\n\n请补充此页面的原型说明。\n", encoding="utf-8")

    save_manual_nav(project, data)
    # sync_nav 会自动调用 build_desc 渲染新节点的 desc/<id>.html
    if sync_nav(project, verbose=True) != 0:
        return 1
    print(f"✅ 新增节点 {args.id} 完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())
