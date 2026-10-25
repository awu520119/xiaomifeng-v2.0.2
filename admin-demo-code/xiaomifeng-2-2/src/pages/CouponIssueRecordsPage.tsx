import { App, Button, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CouponIssueRecord, CouponKind, CouponStore, IssueSource } from '../mock/coupons';
import { canVoidTicket, couponIssuerOptions } from '../mock/coupons';
import { couponUsageStatus, couponUsageStatuses } from '../mock/couponFlow';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; mode?: 'ledger' | 'issue' };
const label = (kind: CouponKind) => kind === '体验权益券' ? '体验券' : kind;
const kindTag = (kind: CouponKind) => <Tag className={`coupon-kind-tag ${kind === '满减券' ? 'coupon-kind-tag-reduction' : kind === '折扣券' ? 'coupon-kind-tag-discount' : 'coupon-kind-tag-experience'}`}>{label(kind)}</Tag>;
const statusTone = (value: string) => ({ '待使用': 'pending', '使用中': 'progress', '已使用': 'active', '已使用（退款）': 'refunded', '已过期': 'expired', '已作废': 'danger' }[value] || 'default');
const statusTag = (value: string) => <Tag className={`coupon-status-tag coupon-status-tag-${statusTone(value)}`}>{value}</Tag>;
const sourceName = (source: IssueSource) => source === '扫码领取' ? '公开领取' : source === '券码兑换' ? '券码领取' : '定向发放';
const operatorProfile = (value: string) => {
  const matched = couponIssuerOptions.find((issuer) => issuer.name === value || issuer.account === value);
  if (matched) return { account: matched.account, name: matched.name };
  if (value === '景区运营员') return { account: 'scenic-operator', name: value };
  return { account: value || 'admin', name: value || '系统管理员' };
};
const serialNo = (ticket: CouponIssueRecord, store: CouponStore) => ticket.serialNo || `TY-${String(store.tickets.filter((item) => item.couponKind === '体验权益券').findIndex((item) => item.id === ticket.id) + 1).padStart(6, '0')}`;
const orderOf = (ticket: CouponIssueRecord, store: CouponStore) => ticket.lockedOrderId || ticket.orderNo || (store.accountRights || []).find((right) => right.sourceTicketId === ticket.id)?.orderNo || ticket.usageHistory.at(-1)?.orderNo;

function LedgerRecords({ store, setStore }: Props) {
  const [params, setParams] = useSearchParams();
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const [source, setSource] = useState<IssueSource>();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const stateOf = (ticket: CouponIssueRecord) => couponUsageStatus(ticket, store);
  const rows = store.tickets.filter((ticket) => Boolean(ticket.phoneDigits)
    && (!params.get('couponId') || ticket.couponId === params.get('couponId'))
    && (!params.get('batchNo') || ticket.batchNo === params.get('batchNo'))
    && (!params.get('recordId') || ticket.id === params.get('recordId'))
    && (!keyword.trim() || [ticket.couponName, ticket.redeemCode, ticket.phoneDigits || '', ticket.phone, ticket.batchNo || '', store.batches?.find((batch) => batch.id === ticket.batchNo)?.operator || ''].some((value) => value.includes(keyword.trim())))
    && (!source || ticket.source === source)
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
      <div className="coupon-search-control"><Input className="coupon-search-control-input" placeholder="搜索券名称、券码、手机号" value={keyword} onChange={(event) => { setKeyword(event.target.value); setCurrentPage(1); }} onPressEnter={() => setCurrentPage(1)} allowClear /><Button className="coupon-search-control-button" icon={<SearchOutlined />} aria-label="搜索券使用记录" onClick={() => setCurrentPage(1)} /></div>
      <DatePicker.RangePicker value={range} onChange={(value) => { setRange(value as typeof range); setCurrentPage(1); }} />
      <Select placeholder="获取方式" value={source} onChange={(value) => { setSource(value); setCurrentPage(1); }} allowClear style={{ width: 150 }} options={[{ value: '定向发放', label: '定向发放' }, { value: '扫码领取', label: '公开领取' }, { value: '券码兑换', label: '券码领取' }]} />
      <Select placeholder="使用状态" value={status} onChange={(value) => { setStatus(value); setCurrentPage(1); }} allowClear style={{ width: 150 }} options={couponUsageStatuses.map((value) => ({ value, label: value }))} />
      <Button type="link" icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setSource(undefined); setStatus(undefined); setRange(null); setCurrentPage(1); }}>重置</Button>
      {context && <Button onClick={() => setParams({})}>查看全部记录</Button>}
    </Space></div>
    <div className="admin-list-card"><Table<CouponIssueRecord> rowKey="id" dataSource={rows} scroll={{ x: 1170, y: 'calc(100vh - 390px)' }} pagination={{ current: currentPage, pageSize, onChange: (page, size) => { setCurrentPage(page); setPageSize(size); }, showSizeChanger: true, showTotal: (count) => `共 ${count} 条` }} locale={{ emptyText: '暂无符合条件的券使用记录' }} columns={[
      { title: '序号', width: 64, render: (_: unknown, __: CouponIssueRecord, index: number) => (currentPage - 1) * pageSize + index + 1 },
      { title: '券名称', dataIndex: 'couponName', width: 180 },
      { title: '券类型', width: 90, render: (_, ticket) => kindTag(ticket.couponKind) },
      { title: '使用状态', width: 125, render: (_, ticket) => statusTag(stateOf(ticket)) },
      { title: '持券用户', dataIndex: 'phone', width: 130 },
      { title: '获取时间', dataIndex: 'issuedAt', width: 160, render: (value: string) => value?.slice(0, 16) || '—' },
      { title: '关联订单号', width: 200, render: (_, ticket) => { const order = orderOf(ticket, store); return order ? <Typography.Text ellipsis={{ tooltip: order }} copyable>{order}</Typography.Text> : '—'; } },
      { title: '获取方式', width: 105, render: (_, ticket) => sourceName(ticket.source) },
      { title: '有效期', width: 220, render: (_, ticket) => <div><div>领取后 {ticket.validityDays} 天可用</div><Typography.Text type="secondary">截止：{ticket.expiresAt || '—'}</Typography.Text></div> },
      { title: '操作', fixed: 'right', width: 80, render: (_, ticket) => canVoidTicket(ticket) && !ticket.lockedOrderId ? <Popconfirm title="作废该券？" description="该券将不能继续使用，历史记录保留。" onConfirm={() => voidTicket(ticket)}><Button type="link" danger>作废</Button></Popconfirm> : <Button type="link" disabled>作废</Button> },
    ]} /></div>
  </section>;
}

function IssueRecords({ store }: Props) {
  const [keyword, setKeyword] = useState('');
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const rows = store.tickets.filter((ticket) => ticket.source === '定向发放' && Boolean(ticket.phoneDigits)
    && (!keyword.trim() || [ticket.couponName, ticket.phoneDigits || '', ticket.phone, ticket.batchNo || '', store.batches?.find((batch) => batch.id === ticket.batchNo)?.operator || ''].some((value) => value.includes(keyword.trim())))
    && (!range || ticket.issuedAt.slice(0, 10) >= range[0].format('YYYY-MM-DD') && ticket.issuedAt.slice(0, 10) <= range[1].format('YYYY-MM-DD')))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const operatorOf = (ticket: CouponIssueRecord) => operatorProfile(store.batches?.find((batch) => batch.id === ticket.batchNo)?.operator || '系统管理员');
  return <><section className="coupon-page admin-list-page">
    <div className="admin-filter-card"><Space wrap>
      <div className="coupon-search-control"><Input className="coupon-search-control-input" placeholder="搜索券名称、手机号" value={keyword} onChange={(event) => { setKeyword(event.target.value); setCurrentPage(1); }} onPressEnter={() => setCurrentPage(1)} allowClear /><Button className="coupon-search-control-button" icon={<SearchOutlined />} aria-label="搜索定向发放记录" onClick={() => setCurrentPage(1)} /></div>
      <DatePicker.RangePicker value={range} onChange={(value) => { setRange(value as typeof range); setCurrentPage(1); }} />
      <Button type="link" icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setRange(null); setCurrentPage(1); }}>重置</Button>
    </Space></div>
    <div className="admin-list-card"><Table<CouponIssueRecord> rowKey="id" dataSource={rows} locale={{ emptyText: '暂无符合条件的定向发放记录' }} pagination={{ current: currentPage, pageSize, onChange: (page, size) => { setCurrentPage(page); setPageSize(size); }, showSizeChanger: true, showTotal: (count) => `共 ${count} 条` }} scroll={{ x: 1120, y: 'calc(100vh - 390px)' }} columns={[
      { title: '序号', width: 64, render: (_: unknown, __: CouponIssueRecord, index: number) => (currentPage - 1) * pageSize + index + 1 },
      { title: '券名称', dataIndex: 'couponName', width: 210 },
      { title: '发放人', width: 145, render: (_, ticket) => { const operator = operatorOf(ticket); return <div className="coupon-operator-cell"><span>{operator.account}</span><Typography.Text type="secondary">{operator.name}</Typography.Text></div>; } },
      { title: '券类型', width: 95, render: (_, ticket) => kindTag(ticket.couponKind) },
      { title: '体验券编号', width: 145, render: (_, ticket) => ticket.couponKind === '体验权益券' ? <Typography.Text className="coupon-serial-link">{serialNo(ticket, store)}</Typography.Text> : '—' },
      { title: '接收用户', dataIndex: 'phone', width: 135 },
      { title: '发放时间', dataIndex: 'issuedAt', width: 160, render: (value: string) => value?.slice(0, 16) || '—' },
      { title: '关联订单', width: 190, render: (_, ticket) => { const order = orderOf(ticket, store); return order ? <Typography.Text ellipsis={{ tooltip: order }} copyable>{order}</Typography.Text> : '—'; } },
    ]} /></div>
  </section></>;
}

export default function CouponIssueRecordsPage({ store, setStore, mode = 'ledger' }: Props) {
  return mode === 'ledger' ? <LedgerRecords store={store} setStore={setStore} mode={mode} /> : <IssueRecords store={store} setStore={setStore} mode={mode} />;
}
