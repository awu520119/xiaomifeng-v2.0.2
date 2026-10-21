import { App, Button, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CouponIssueRecord, CouponStore, IssueSource } from '../mock/coupons';
import { canVoidTicket, effectiveCouponStatus } from '../mock/coupons';
import { codeTracking } from '../mock/couponFlow';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };
const sourceName = (source: IssueSource) => source === '扫码领取' ? '公开领取' : source === '券码兑换' ? '券码领取' : '定向发放';
export default function CouponIssueRecordsPage({ store, setStore }: Props) {
  const [params, setParams] = useSearchParams(); const { message } = App.useApp();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string>();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const stateOf = (ticket: CouponIssueRecord) => ticket.couponKind === '体验权益券' ? codeTracking(ticket, store) : ticket.lockedOrderId ? '待支付占用' : effectiveCouponStatus(ticket);
  const rows = store.tickets.filter((ticket) => Boolean(ticket.phoneDigits)
    && (!params.get('couponId') || ticket.couponId === params.get('couponId'))
    && (!params.get('batchNo') || ticket.batchNo === params.get('batchNo'))
    && (!params.get('recordId') || ticket.id === params.get('recordId'))
    && (!phone.trim() || (ticket.phoneDigits || '').includes(phone.trim()) || ticket.phone.includes(phone.trim()))
    && (!status || stateOf(ticket) === status)
    && (!range || ticket.issuedAt.slice(0, 10) >= range[0].format('YYYY-MM-DD') && ticket.issuedAt.slice(0, 10) <= range[1].format('YYYY-MM-DD')))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const voidTicket = (ticket: CouponIssueRecord) => {
    if (!canVoidTicket(ticket) || ticket.lockedOrderId) return;
    setStore((current) => ({ ...current, tickets: current.tickets.map((item) => item.id === ticket.id ? { ...item, status: '已作废' } : item) }));
    message.success('已作废');
  };
  const context = Boolean(params.get('couponId') || params.get('batchNo') || params.get('recordId'));
  return <section className="coupon-page admin-list-page">
    <div className="admin-filter-card"><Space wrap>
      <Input placeholder="输入手机号查询" value={phone} onChange={(event) => setPhone(event.target.value)} allowClear style={{ width: 220 }} />
      <DatePicker.RangePicker value={range} onChange={(value) => setRange(value as typeof range)} />
      <Select placeholder="状态" value={status} onChange={setStatus} allowClear style={{ width: 150 }} options={['待使用', '待核销', '权益已到账', '待体验', '部分使用', '已用完', '待支付占用', '已核销', '未生效', '已过期', '已作废'].map((value) => ({ value, label: value }))} />
      <Button type="link" icon={<ReloadOutlined />} onClick={() => { setPhone(''); setStatus(undefined); setRange(null); }}>重置</Button>
      {context && <Button onClick={() => setParams({})}>查看全部记录</Button>}
    </Space></div>
    <div className="admin-list-card"><Table<CouponIssueRecord> rowKey="id" dataSource={rows} scroll={{ x: 1110 }} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (count) => `共 ${count} 条` }} locale={{ emptyText: '暂无符合条件的发放记录' }} columns={[
      { title: '券名称', dataIndex: 'couponName', width: 180 },
      { title: '券类型', width: 90, render: (_, ticket) => ticket.couponKind === '体验权益券' ? '体验券' : ticket.couponKind },
      { title: '状态', width: 115, render: (_, ticket) => <Tag>{stateOf(ticket)}</Tag> },
      { title: '领取用户', dataIndex: 'phone', width: 130 },
      { title: '关联订单号', width: 200, render: (_, ticket) => { const order = ticket.lockedOrderId || ticket.orderNo || (store.accountRights || []).find((right) => right.sourceTicketId === ticket.id)?.orderNo || ticket.usageHistory.at(-1)?.orderNo; return order ? <Typography.Text ellipsis={{ tooltip: order }} copyable>{order}</Typography.Text> : '—'; } },
      { title: '发放方式', width: 105, render: (_, ticket) => sourceName(ticket.source) },
      { title: '有效期', width: 190, render: (_, ticket) => <>{ticket.startsAt.slice(0, 16)}<div className="coupon-cell-subtitle">至 {ticket.expiresAt.slice(0, 16)}</div></> },
      { title: '操作', fixed: 'right', width: 80, render: (_, ticket) => canVoidTicket(ticket) && !ticket.lockedOrderId ? <Popconfirm title="作废该券？" description="该券将不能继续使用，历史记录保留。" onConfirm={() => voidTicket(ticket)}><Button type="link" danger>作废</Button></Popconfirm> : <Button type="link" disabled>作废</Button> },
    ]} /></div>
  </section>;
}
