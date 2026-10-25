import { DownloadOutlined, DownOutlined, ProfileFilled, ReloadOutlined, SearchOutlined, UpOutlined, DollarCircleFilled } from '@ant-design/icons';
import { App, Button, DatePicker, Drawer, Input, Rate, Select, Space, Statistic, Table, Tabs, Tag } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { moneyText, tagColor } from '../mock/constants';
import type { Order } from '../mock/types';
import { OrderDetailSections } from './OrderDetailSections';
import { FlightTaskDetailDrawer } from './FlightTaskDetail';
import type { FlightTask } from './FlightTaskDetail';

const { RangePicker } = DatePicker;
const { useApp } = App;
type OrderTab = '' | '待付款' | '待使用' | '已使用' | '退款中' | '退款失败' | '已完成' | '已退款' | '已取消';

const ORDER_STATUS_TABS: OrderTab[] = ['', '待付款', '待使用', '已使用', '退款中', '退款失败', '已完成', '已退款', '已取消'];
const DEFAULT_RANGE: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs('2026-10-01'), dayjs('2026-10-31')];

export default function PremiumOrderListPage({ orders, initialOrderId, lockDetail = false }: { orders: Order[]; initialOrderId?: string; lockDetail?: boolean }) {
  const { message } = useApp();
  const [activeStatus, setActiveStatus] = useState<OrderTab>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(DEFAULT_RANGE);
  const [point, setPoint] = useState('');
  const [orderType, setOrderType] = useState('');
  const [accountId, setAccountId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(() => orders.find((order) => order.id === initialOrderId) || null);
  const [selectedFlightTask, setSelectedFlightTask] = useState<FlightTask | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  const options = (values: string[]) => Array.from(new Set(values.filter(Boolean))).map((value) => ({ value, label: value }));
  const pointOptions = useMemo(() => options(orders.map((order) => order.point)), [orders]);
  const accountOptions = useMemo(() => Array.from(new Map(orders.map((order) => [order.accountId, { value: order.accountId, label: `${order.accountId}（${order.accountName}）` }])).values()), [orders]);
  const orderTypeOptions = useMemo(() => options(orders.map((order) => order.orderType)), [orders]);
  const [tagFilter, setTagFilter] = useState('');
  const inDateRange = (order: Order) => {
    if (!dateRange) return true;
    const date = dayjs(order.createdAt);
    return (date.isSame(dateRange[0], 'day') || date.isAfter(dateRange[0], 'day'))
      && (date.isSame(dateRange[1], 'day') || date.isBefore(dateRange[1], 'day'));
  };
  const filteredOrders = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return orders.filter((order) => {
      const keywordMatch = !query || [order.orderNo, order.user, order.phone, order.theme, order.point].some((value) => value.toLowerCase().includes(query));
      return inDateRange(order) && (!activeStatus || order.status === activeStatus)
        && (!point || order.point === point)
        && (!orderType || order.orderType === orderType) && (!accountId || order.accountId === accountId)
        && (!tagFilter || order.orderType === tagFilter) && keywordMatch;
    });
  }, [orders, dateRange, activeStatus, point, orderType, accountId, keyword, tagFilter]);
  const summaryOrders = useMemo(() => orders.filter(inDateRange), [orders, dateRange]);
  const paidOrders = summaryOrders.filter((order) => !['待付款', '已取消'].includes(order.status));
  const paidAmount = paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const refundAmount = summaryOrders.filter((order) => order.status === '已退款').reduce((sum, order) => sum + Number(order.refundAmount || order.amount || 0), 0);
  const resetFilters = () => { setDateRange(DEFAULT_RANGE); setPoint(''); setOrderType(''); setAccountId(''); setKeyword(''); setActiveStatus(''); setTagFilter(''); };
  const statusCounts = (status: OrderTab) => status ? summaryOrders.filter((order) => order.status === status).length : summaryOrders.length;
  const orderStatus = (order: Order) => <Tag color={tagColor(order.status)}>{order.status}</Tag>;
  const canRefund = (order: Order) => ['待使用', '已使用', '已完成'].includes(order.status);
  const openOrderDetail = (order: Order) => {
    setSelectedFlightTask(null);
    setSelectedOrder(order);
  };

  const columns: TableProps<Order>['columns'] = [
    { title: '订单号', key: 'orderNo', width: 190, dataIndex: 'orderNo', ellipsis: true },
    { title: '订单主题', key: 'theme', width: 180, dataIndex: 'theme', ellipsis: true },
    { title: '订单用户', key: 'user', width: 120, dataIndex: 'user' },
    { title: '手机号', key: 'phone', width: 120, dataIndex: 'phone' },
    { title: '拍摄点', key: 'point', width: 150, dataIndex: 'point', ellipsis: true },
    { title: '应付金额（元）', key: 'expectedAmount', width: 130, align: 'right', render: (_: unknown, order: Order) => <span className="money-text">￥{moneyText(order.expectedAmount)}</span> },
    { title: '优惠金额（元）', key: 'couponDiscountAmount', width: 130, align: 'right', render: (_: unknown, order: Order) => <span className="money-text">￥{moneyText(order.couponDiscountAmount || 0)}</span> },
    { title: '实付金额（元）', key: 'paidAmount', width: 130, align: 'right', render: (_: unknown, order: Order) => <span className="money-text">￥{moneyText(order.paidAmount)}</span> },
    { title: '订单类型', key: 'orderType', width: 110, dataIndex: 'orderType' },
    { title: '订单状态', key: 'status', width: 100, render: (_: unknown, order: Order) => orderStatus(order) },
    { title: '评分', key: 'rating', width: 100, align: 'center', render: (_: unknown, order: Order) => <Rate disabled value={order.rating || 0} /> },
    { title: '所属账号', key: 'accountName', width: 150, dataIndex: 'accountName', ellipsis: true },
    { title: '操作', key: 'action', width: 150, fixed: 'right', render: (_: unknown, order: Order) => <Space size={4}><Button type="link" size="small" onClick={() => openOrderDetail(order)}>详情</Button><Button type="link" danger size="small" disabled={!canRefund(order)} onClick={() => message.info('退款流程属订单售后模块，本演示仅保留入口')}>退款</Button></Space> },
  ];

  // 抽屉按 id 读 store 里的实时订单：重试后状态流转能直接反映，不需要本地打补丁
  const detail = selectedOrder ? orders.find((order) => order.id === selectedOrder.id) ?? selectedOrder : null;
  const openFlightTask = (task: FlightTask) => {
    setSelectedFlightTask(task);
  };
  const closeOrderDetail = () => {
    if (lockDetail) return;
    setSelectedOrder(null);
    setSelectedFlightTask(null);
  };

  return (
    <div className="admin-page order-list-page">
      <section className="white-card order-filter-card"><div className="order-filter-row order-reference-filters"><RangePicker value={dateRange} onChange={(value) => setDateRange(value as [dayjs.Dayjs, dayjs.Dayjs] | null)} allowClear={false} /><Select allowClear placeholder="拍摄点" value={point || undefined} onChange={(value) => setPoint(value || '')} options={pointOptions} /><Select allowClear showSearch optionFilterProp="label" placeholder="所属账号" value={accountId || undefined} onChange={(value) => setAccountId(value || '')} options={accountOptions} /><Select allowClear placeholder="订单类型" value={orderType || undefined} onChange={(value) => setOrderType(value || '')} options={orderTypeOptions} /><Space className="order-filter-actions"><Button type="link" icon={<DownloadOutlined />} onClick={() => message.success('订单明细已导出')}>导出</Button><Button type="link" icon={<ReloadOutlined />} onClick={resetFilters}>重置</Button></Space></div></section>
      <section className={`white-card order-summary-card ${summaryExpanded ? '' : 'is-collapsed'}`}>
        <Button className="order-summary-toggle" type="link" onClick={() => setSummaryExpanded((expanded) => !expanded)}>
          {summaryExpanded ? '收起' : '展开'} {summaryExpanded ? <UpOutlined /> : <DownOutlined />}
        </Button>
        {summaryExpanded ? <div className="order-summary-body">
          <div className="order-summary-overview"><div className="order-summary-icon"><ProfileFilled /></div><div className="order-summary-stat order-summary-stat-primary"><Statistic title="订单总数" value={summaryOrders.length} /></div><span className="order-summary-chevron">››</span><div className="order-summary-stat order-summary-stat-success"><Statistic title="已完成单数" value={summaryOrders.filter((order) => order.status === '已完成').length} /></div><div className="order-summary-stat order-summary-stat-warning"><Statistic title="已取消单数" value={summaryOrders.filter((order) => order.status === '已取消').length} /></div><div className="order-summary-stat order-summary-stat-danger"><Statistic title="已退款单数" value={summaryOrders.filter((order) => order.status === '已退款').length} /></div></div>
          <div className="order-summary-divider" />
          <div className="order-summary-finance"><div className="order-summary-icon"><DollarCircleFilled /></div><div className="order-summary-stat order-summary-money"><Statistic title="月度净流水(元)" value={Math.max(0, paidAmount - refundAmount)} precision={2} prefix="￥" /></div><span className="order-summary-equals">=</span><div className="order-summary-stat order-summary-money"><Statistic title="总支付金额(元)" value={paidAmount} precision={2} prefix="￥" /></div><span className="order-summary-equals">−</span><div className="order-summary-stat order-summary-money order-summary-stat-danger"><Statistic title="总退款金额(元)" value={refundAmount} precision={2} prefix="￥" /></div></div>
        </div> : null}
      </section>
      <section className="white-card order-table-card"><div className="order-table-toolbar order-reference-toolbar"><Tabs activeKey={activeStatus} onChange={(key) => setActiveStatus(key as OrderTab)} items={ORDER_STATUS_TABS.map((status) => ({ key: status, label: status || '全部订单' }))} /><div className="order-table-actions"><Select allowClear placeholder="标签筛选" value={tagFilter || undefined} onChange={(value) => setTagFilter(value || '')} options={orderTypeOptions} /><Input allowClear placeholder="搜索订单号、手机号、主题名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} /><Button type="primary" icon={<SearchOutlined />} aria-label="搜索订单" /></div></div><Table className="order-list-table" rowKey="id" columns={columns} dataSource={filteredOrders} scroll={{ x: 2140, y: 'calc(100vh - 500px)' }} pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showQuickJumper: true, showTotal: (total) => `共 ${total} 条` }} locale={{ emptyText: '暂无订单数据' }} /></section>
      <Drawer className="order-detail-drawer" title="订单详情" open={Boolean(detail)} onClose={closeOrderDetail} closable={!lockDetail} maskClosable={!lockDetail} keyboard={!lockDetail} width={800} destroyOnClose footer={detail ? <div className="order-drawer-footer"><Button type="primary" danger disabled={!canRefund(detail)} onClick={() => message.info('退款流程属订单售后模块，本演示仅保留入口')}>退款</Button></div> : null}>
        {detail ? <OrderDetailSections order={detail} onOpenFlightTask={openFlightTask} /> : null}
      </Drawer>
      <FlightTaskDetailDrawer task={selectedFlightTask} open={Boolean(selectedFlightTask)} onClose={() => setSelectedFlightTask(null)} />
    </div>
  );
}
