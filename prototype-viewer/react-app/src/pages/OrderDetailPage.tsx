import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Select, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scenicOptions, settlementOrders } from '../mock/settlement';
import type { SettlementOrder, SettlementStatus } from '../mock/settlement';
import { gotoViewerNode } from '../viewer';

const statusColors: Record<SettlementStatus, string> = { 已完成: 'success', 已使用: 'processing', 已退款: 'error' };

function TimeCell({ value }: { value: string }) {
  const [date, time] = value.split(' ');
  return <div className="compact-cell"><span>{date}</span><span>{time}</span></div>;
}

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [scenic, setScenic] = useState('全部景区');
  const back = () => gotoViewerNode('admin-list', () => navigate('/orders'));
  const rows = scenic === '全部景区' ? settlementOrders : settlementOrders.filter((item) => item.point.startsWith('云栖山'));

  const columns: TableColumnsType<SettlementOrder> = [
    { title: '订单号', dataIndex: 'orderNo', width: 148, render: (value: string) => <Button className="order-link" type="link" size="small" onClick={() => message.info(`订单 ${value}：订单详情`)}>{value}</Button> },
    { title: '订单信息', dataIndex: 'orderInfo', width: 146 },
    { title: '拍摄点', dataIndex: 'point', width: 108 },
    { title: '订单状态', dataIndex: 'status', width: 92, render: (value: SettlementStatus) => <Tag bordered={false} color={statusColors[value]}>{value}</Tag> },
    { title: '下单时间', dataIndex: 'createdAt', width: 120, render: (value: string) => <TimeCell value={value} /> },
    { title: '完成时间', dataIndex: 'completedAt', width: 120, render: (value: string) => <TimeCell value={value} /> },
    { title: '订单金额', dataIndex: 'amount', width: 104, align: 'right', render: (value: number) => <span className="money-text">￥{value.toFixed(2)}</span> },
    { title: '结算规则', key: 'rule', width: 182, render: (_, row) => <div className="rule-detail-cell"><span>按比例 · {row.ratio}%</span><span className="premium-detail">基础 ￥{row.payable.toFixed(2)} · 溢价 ￥0.00</span></div> },
    { title: '应结算金额', dataIndex: 'payable', width: 116, align: 'right', render: (value: number) => <span className="money-text">￥{value.toFixed(2)}</span> },
  ];

  return (
    <div className="admin-page settlement-detail-page">
      <section className="white-card detail-top">
        <div className="detail-breadcrumb">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={back}>返回</Button>
          <span className="detail-sep">/</span>
          <strong className="detail-page-title">线下对公结算详情</strong>
          <span className="detail-meta">2026-05 · self_store_ops（自营商家）</span>
        </div>
        <div className="bill-hero">
          <div className="bill-hero-top">
            <span className="bill-period">2026-05</span>
            <Tag className="bill-pill" color="processing">出账中</Tag>
          </div>
          <div className="bill-summary-layout">
            <div className="bill-scope-filter">
              <span className="metric-label">范围筛选</span>
              <Select size="small" value={scenic} options={scenicOptions} onChange={setScenic} />
            </div>
            <div className="bill-summary-metrics">
              <div className="metric-item"><span className="metric-label">订单笔数</span><strong className="metric-value">9 笔</strong></div>
              <div className="metric-item"><span className="metric-label">订单金额合计</span><strong className="metric-value">￥2,561.00</strong></div>
              <div className="metric-item"><span className="metric-label">退款金额合计</span><strong className="metric-value">￥159.00</strong></div>
              <div className="metric-item"><span className="metric-label">基础分成金额</span><strong className="metric-value">￥1,944.11</strong></div>
              <div className="metric-item"><span className="metric-label">溢价</span><strong className="metric-value premium">￥0.00</strong></div>
              <div className="metric-item"><span className="metric-label">应结算金额</span><strong className="metric-value primary">￥1,944.11</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="white-card detail-table-card">
        <Table<SettlementOrder>
          className="bill-detail-table"
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1136 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
          locale={{ emptyText: '暂无订单明细' }}
        />
      </section>
    </div>
  );
}
