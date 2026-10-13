/*!
 * zh-cn-locale.js —— Element Plus 简体中文语言包（离线自包含）
 *
 * 背景：scaffold 自带的 assets/element-plus.full.min.js 是**只打了英文**的构建
 * （实测：包内搜不到任何中文串，也没有 zhCn 导出）。不配 locale 的话，分页器会
 * 显示 "Total 100 / Go to"、日期选择器显示 "Mon Tue Wed"、确认弹窗按钮是
 * "OK / Cancel"，原型给干系人看时非常出戏。
 *
 * 用法（PC 页三步）：
 *   1. <head> 里在 element-plus.full.min.js 之后引入本文件：
 *        <script src="../assets/zh-cn-locale.js"></script>
 *   2. setup() 里取出：const zhCnLocale = window.ZH_CN_LOCALE;  并 return 出去
 *   3. 模板根节点包一层：<el-config-provider :locale="zhCnLocale"> ... </el-config-provider>
 *
 * 为什么抽成共享文件：这份对象有 20 个组件命名空间、100+ 个 key，且 key 名并不直觉
 * （月份是 month1..month12 而不是 months.jan；表格清空筛选是 clearFilter 而不是
 * resetFilter）。四个 PC 模板各存一份副本的话，漏一个 key 就漏一句英文，且修正要改
 * 四处。单副本 = 改一次，四个模板同时生效。
 *
 * 内容对齐 Element Plus 官方 zh-cn 语言包。
 */
(function (global) {
  'use strict';

  var ZH_CN_LOCALE = {
    name: 'zh-cn',
    el: {
      breadcrumb: {
        label: '面包屑',
      },
      colorpicker: {
        confirm: '确定',
        clear: '清空',
        defaultLabel: '颜色选择器',
        description: '当前颜色 {color}，按 Enter 键选择新颜色',
        alphaLabel: '选择透明度的值',
      },
      datepicker: {
        now: '此刻',
        today: '今天',
        cancel: '取消',
        clear: '清空',
        confirm: '确定',
        dateTablePrompt: '使用方向键与 Enter 键可选择日期',
        monthTablePrompt: '使用方向键与 Enter 键可选择月份',
        yearTablePrompt: '使用方向键与 Enter 键可选择年份',
        selectedDate: '已选日期',
        selectDate: '选择日期',
        selectTime: '选择时间',
        startDate: '开始日期',
        startTime: '开始时间',
        endDate: '结束日期',
        endTime: '结束时间',
        prevYear: '前一年',
        nextYear: '后一年',
        prevMonth: '上个月',
        nextMonth: '下个月',
        year: '年',
        // 注意：Element Plus 用 month1..month12 这种扁平 key，不是 months.jan
        month1: '一月',
        month2: '二月',
        month3: '三月',
        month4: '四月',
        month5: '五月',
        month6: '六月',
        month7: '七月',
        month8: '八月',
        month9: '九月',
        month10: '十月',
        month11: '十一月',
        month12: '十二月',
        week: '周次',
        weeks: {
          sun: '日', mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六',
        },
        weeksFull: {
          sun: '星期日', mon: '星期一', tue: '星期二', wed: '星期三',
          thu: '星期四', fri: '星期五', sat: '星期六',
        },
        months: {
          jan: '一月', feb: '二月', mar: '三月', apr: '四月', may: '五月', jun: '六月',
          jul: '七月', aug: '八月', sep: '九月', oct: '十月', nov: '十一月', dec: '十二月',
        },
      },
      inputNumber: {
        decrease: '减少数值',
        increase: '增加数值',
      },
      select: {
        loading: '加载中',
        noMatch: '无匹配数据',
        noData: '无数据',
        placeholder: '请选择',
      },
      mention: {
        loading: '加载中',
      },
      dropdown: {
        toggleDropdown: '切换下拉选项',
      },
      cascader: {
        noMatch: '无匹配数据',
        loading: '加载中',
        placeholder: '请选择',
        noData: '暂无数据',
      },
      pagination: {
        goto: '前往',
        pagesize: '条/页',
        total: '共 {total} 条',
        pageClassifier: '页',
        page: '页',
        prev: '上一页',
        next: '下一页',
        currentPage: '第 {pager} 页',
        prevPages: '向前 {pager} 页',
        nextPages: '向后 {pager} 页',
        deprecationWarning: '你使用了一些已被废弃的用法，请参考 el-pagination 官方文档',
      },
      dialog: {
        close: '关闭此对话框',
      },
      drawer: {
        close: '关闭此对话框',
      },
      messagebox: {
        title: '提示',
        confirm: '确定',
        cancel: '取消',
        error: '输入的数据不合法!',
        close: '关闭此对话框',
      },
      upload: {
        deleteTip: '按 delete 键可删除',
        delete: '删除',
        preview: '查看图片',
        continue: '继续上传',
      },
      slider: {
        defaultLabel: '滑块介于 {min} 至 {max}',
        defaultRangeStartLabel: '选择起始值',
        defaultRangeEndLabel: '选择结束值',
      },
      table: {
        emptyText: '暂无数据',
        confirmFilter: '筛选',
        resetFilter: '重置',
        clearFilter: '全部',
        sumText: '合计',
      },
      tour: {
        next: '下一步',
        previous: '上一步',
        finish: '结束导览',
      },
      tree: {
        emptyText: '暂无数据',
      },
      transfer: {
        noMatch: '无匹配数据',
        noData: '无数据',
        titles: ['列表 1', '列表 2'],
        filterPlaceholder: '请输入搜索内容',
        noCheckedFormat: '共 {total} 项',
        hasCheckedFormat: '已选 {checked}/{total} 项',
      },
      image: {
        error: '加载失败',
      },
      pageHeader: {
        title: '返回',
      },
      popconfirm: {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      },
      carousel: {
        leftArrow: '上一张幻灯片',
        rightArrow: '下一张幻灯片',
        indicator: '幻灯片切换至索引 {index}',
      },
      empty: {
        description: '暂无数据',
      },
    },
  };

  global.ZH_CN_LOCALE = ZH_CN_LOCALE;
})(typeof window !== 'undefined' ? window : this);
