import { RedoOutlined, SearchOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Pagination, Popconfirm, Select, Space, Table, Tabs, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialOrders, scenicAreaOptions } from '../mock/orders';
import type { Order, OrderStatus } from '../mock/orders';
import { gotoViewerNode } from '../viewer';

type QueryValues = { keyword?: string; scenicArea?: string; account?: string };

const statusColors: Record<OrderStatus, string> = {
  待付款: 'red', 待使用: 'orange', 已使用: 'green', 已取消: 'default', 已退款: 'volcano',
};

const tabs = ['全部订单', '待付款', '待使用', '已使用', '已退款', '已取消']
  .map((label) => ({ key: label, label }));

export default function OrderListPage() {
  const [form] = Form.useForm<QueryValues>();
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState<QueryValues>({});
  const [status, setStatus] = useState('全部订单');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const rows = useMemo(() => {
    const keyword = query.keyword?.trim().toLowerCase();
    return orders.filter((order) => (
      (!keyword || order.orderNo.toLowerCase().includes(keyword) || order.customer.includes(keyword) || order.phone.includes(keyword))
      && (!query.scenicArea || order.scenicArea === query.scenicArea)
      && (!query.account || order.account === query.account)
      && (status === '全部订单' || order.status === status)
    ));
  }, [orders, query, status]);

  const reset = () => {
    form.resetFields();
    setQuery({});
    setStatus('全部订单');
    setPage(1);
  };

  const columns: TableColumnsType<Order> = [
    { title: '序号', width: 64, render: (_value, _record, index) => (page - 1) * pageSize + index + 1 },
    { title: '订单号', dataIndex: 'orderNo', width: 166 },
    { title: '订单主题', dataIndex: 'productName', width: 178, ellipsis: true },
    { title: '订单用户', dataIndex: 'customer', width: 110 },
    { title: '手机号', dataIndex: 'phone', width: 126 },
    { title: '拍摄点', dataIndex: 'scenicArea', width: 180, ellipsis: true },
    { title: '金额（元）', dataIndex: 'amount', width: 108, align: 'right', render: (value: number) => <span className="amount-text">¥{value.toFixed(2)}</span> },
    { title: '订单状态', dataIndex: 'status', width: 104, render: (value: OrderStatus) => <Tag color={statusColors[value]}>{value}</Tag> },
    { title: '所属账号', dataIndex: 'account', width: 110 },
    { title: '下单时间', dataIndex: 'createdAt', width: 168 },
    {
      title: '操作', key: 'actions', fixed: 'right', width: 156,
      render: (_, order) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => gotoViewerNode('admin-detail', () => navigate('/settlement/bill/offline/offline-tm003-current'))}>详情</Button>
          {order.status === '待付款' && (
            <Popconfirm title="取消订单" description={`确定取消订单 ${order.orderNo} 吗？`} okText="确定" cancelText="取消" onConfirm={() => {
              setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: '已取消' } : item));
              message.success(`订单 ${order.orderNo} 已取消`);
            }}>
              <Button type="link" danger size="small">取消</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page order-page">
      <section className="white-card filter-panel">
        <Form<QueryValues> form={form} layout="inline" onValuesChange={(_changed, values) => { setQuery(values); setPage(1); }}>
          <Form.Item name="keyword"><Input allowClear prefix={<SearchOutlined />} placeholder="订单号 / 姓名 / 手机号" /></Form.Item>
          <Form.Item name="scenicArea"><Select allowClear placeholder="全部拍摄点" options={scenicAreaOptions} /></Form.Item>
          <Form.Item name="account"><Select allowClear placeholder="全部账号" options={[{ value: 'admin', label: 'admin' }, { value: 'operator01', label: 'operator01' }]} /></Form.Item>
          <Form.Item><Button icon={<RedoOutlined />} onClick={reset}>重置</Button></Form.Item>
        </Form>
      </section>

      <section className="white-card list-panel">
        <div className="list-toolbar promotion-toolbar">
          <Tabs activeKey={status} items={tabs} onChange={(value) => { setStatus(value); setPage(1); }} />
          <Button type="primary" onClick={() => gotoViewerNode('admin-form', () => navigate('/promotion/new'))}>＋ 新增推广方</Button>
        </div>
        <Table<Order>
          className="order-table"
          rowKey="id"
          columns={columns}
          dataSource={rows.slice((page - 1) * pageSize, page * pageSize)}
          scroll={{ x: 1460 }}
          pagination={false}
          locale={{ emptyText: '暂无订单数据' }}
        />
        <div className="table-footer">
          <span>共 {rows.length} 条</span>
          <Pagination current={page} pageSize={pageSize} total={rows.length} showSizeChanger pageSizeOptions={[10, 20, 50]} onChange={(nextPage, nextSize) => { setPage(nextSize === pageSize ? nextPage : 1); setPageSize(nextSize); }} />
        </div>
      </section>
    </div>
  );
}
