import { App, Button, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, QRCode, Select, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CouponIssueRecord, CouponStatus, CouponStore, CouponUseRecord } from '../mock/coupons';
import { canVoidTicket, couponLocalTime, effectiveCouponStatus, maskPhone, priceDiscount, receiveLimitError, shootingProducts, ticketProducts, validateTicketUse } from '../mock/coupons';
import { downloadQrCode, receiveUrl } from '../utils/couponExport';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };
type UseValues = { phone?: string; orderNo: string; productId: string; orderAmount?: number };
const statuses: CouponStatus[] = ['未领取', '未生效', '待使用', '已核销', '已过期', '已作废'];
const statusColor: Record<string, string> = { 未领取: 'default', 未生效: 'gold', 待使用: 'green', 已核销: 'blue', 已过期: 'default', 已作废: 'red' };
export default function CouponIssueRecordsPage({ store, setStore }: Props) {
  const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const couponId = params.get('couponId');
  const scoped = store.templates.find((row) => row.id === couponId);
  const [keyword, setKeyword] = useState(''); const [status, setStatus] = useState<CouponStatus>();
  const [selectedId, setSelectedId] = useState<string | null>(null); const selected = store.tickets.find((row) => row.id === selectedId);
  const [useOpen, setUseOpen] = useState(false); const [historyOpen, setHistoryOpen] = useState(false); const [qrOpen, setQrOpen] = useState(false);
  const [useForm] = Form.useForm<UseValues>();
  const [busy, setBusy] = useState(false); const amount = Form.useWatch('orderAmount', useForm); const { message } = App.useApp();
  const rows = store.tickets.filter((row) => Boolean(row.phoneDigits) && (!couponId || row.couponId === couponId)
    && (!status || effectiveCouponStatus(row) === status) && (!params.get('recordId') || row.id === params.get('recordId'))
    && (!keyword.trim() || [row.redeemCode, row.couponName, row.phone, row.phoneDigits || ''].some((value) => value.toLowerCase().includes(keyword.trim().toLowerCase())))).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const useTicket = async () => {
    if (busy) return; setBusy(true);
    try {
      const values = await useForm.validateFields().catch(() => null); if (!values || !selected) return;
      const current = store.tickets.find((row) => row.id === selected.id); if (!current) return;
      const error = validateTicketUse(current, values, store.tickets); if (error) { message.error(error); return; }
      const phone = current.phoneDigits || values.phone!; const coupon = store.templates.find((row) => row.id === current.couponId);
      if (!current.phoneDigits && coupon) { const limit = receiveLimitError(coupon, phone, store.tickets); if (limit) { message.error(limit); return; } }
      const product = shootingProducts.find((row) => row.id === values.productId)!;
      const discount = current.couponKind === '体验权益券' ? undefined : priceDiscount(current, values.orderAmount!);
      const use: CouponUseRecord = { orderNo: values.orderNo.trim(), productId: product.id, productName: product.name, theme: product.theme, shootingPoint: product.shootingPoint, usedAt: couponLocalTime(), orderAmount: values.orderAmount, discountAmount: discount, payAmount: discount === undefined ? undefined : Math.round((values.orderAmount! - discount) * 100) / 100 };
      setStore((state) => ({ ...state, tickets: state.tickets.map((row) => row.id === current.id ? { ...row, phoneDigits: phone, phone: maskPhone(phone), issuedAt: row.issuedAt || couponLocalTime(), usedTimes: row.usedTimes + 1, status: row.usedTimes + 1 === row.totalUses ? '已核销' : '待使用', orderNo: use.orderNo, shootingPoint: use.shootingPoint, usageHistory: [...row.usageHistory, use] } : row) }));
      setUseOpen(false); useForm.resetFields(); message.success(current.couponKind === '体验权益券' ? `核销成功，剩余 ${current.totalUses - current.usedTimes - 1} 次` : `核销成功，本单优惠 ${discount!.toFixed(2)} 元`);
    } finally { setBusy(false); }
  };
  const voidTicket = (ticket: CouponIssueRecord) => { if (!canVoidTicket(ticket)) return; setStore((current) => ({ ...current, tickets: current.tickets.map((row) => row.id === ticket.id ? { ...row, status: '已作废' } : row) })); message.success('券已作废，已核销记录保留'); };
  return <section className="coupon-page reference-coupon-page"><section className="coupon-table-card reference-coupon-card">
    <div className="reference-toolbar"><div className="reference-filters"><Input.Search allowClear enterButton value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索券号、手机号或券名称" style={{ width: 280 }} /><Select value={status} onChange={setStatus} allowClear placeholder="状态" options={statuses.filter((row) => row !== '未领取').map((value) => ({ value, label: value }))} /><Button type="link" icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setStatus(undefined); }}>重置</Button></div></div>
    {scoped && <div className="reference-record-context"><Typography.Text type="secondary">当前优惠券：{scoped.name}</Typography.Text><Button type="link" size="small" onClick={() => { setParams({}); setKeyword(''); setStatus(undefined); }}>查看全部记录</Button><Button type="link" size="small" onClick={() => navigate(`/coupons?couponId=${scoped.id}`)}>返回优惠券</Button></div>}
    <Table<CouponIssueRecord> rowKey="id" dataSource={rows} scroll={{ x: 1840 }} pagination={{ pageSize: 20, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 张券` }} locale={{ emptyText: '暂无发放记录' }} columns={[
      { title: '唯一券号 / 券码', width: 260, render: (_, row) => <Typography.Text copyable={{ text: row.redeemCode }} className="reference-channel-code">{row.redeemCode}</Typography.Text> },
      { title: '优惠券名称', dataIndex: 'couponName', width: 180 }, { title: '类型', width: 90, render: (_, row) => <Tag>{row.couponKind === '体验权益券' ? '体验券' : row.couponKind}</Tag> },
      { title: '优惠内容', dataIndex: 'benefit', width: 175 }, { title: '状态', width: 100, render: (_, row) => <Tag color={statusColor[effectiveCouponStatus(row)]}>{effectiveCouponStatus(row)}</Tag> },
      { title: '使用情况', width: 150, render: (_, row) => row.couponKind === '体验权益券' ? <>已使用 {row.usedTimes} / {row.totalUses} 次<div className="coupon-cell-subtitle">{row.status === '已作废' ? '未用次数已作废' : `剩余 ${row.totalUses - row.usedTimes} 次`}</div></> : row.usedTimes ? '已使用' : '未使用' },
      { title: '领取用户', width: 130, render: (_, row) => row.phone || '尚未领取' }, { title: '生效日期', dataIndex: 'startsAt', width: 175 }, { title: '失效日期', dataIndex: 'expiresAt', width: 175 },
      { title: '操作', width: 300, fixed: 'right', render: (_, row) => <Space size={0}>
        {['未领取', '待使用'].includes(effectiveCouponStatus(row)) && <Button type="link" onClick={() => { setSelectedId(row.id); useForm.resetFields(); setUseOpen(true); }}>核销</Button>}
        <Button type="link" onClick={() => { setSelectedId(row.id); setHistoryOpen(true); }}>详情/核销记录</Button>
        {!row.phoneDigits && !['已作废', '已过期'].includes(effectiveCouponStatus(row)) && <Button type="link" onClick={() => { setSelectedId(row.id); setQrOpen(true); }}>二维码</Button>}
        {canVoidTicket(row) && <Popconfirm title={row.usedTimes ? '作废剩余权益？' : '作废这张券？'} description="作废后不能领取或核销，名额不返还；已经核销的记录保留。" okText="确认作废" cancelText="取消" onConfirm={() => voidTicket(row)}><Button type="link" danger>作废</Button></Popconfirm>}
      </Space> },
    ]} />
  </section>
  <Modal title="手动核销" open={useOpen && Boolean(selected)} onCancel={() => { setUseOpen(false); useForm.resetFields(); }} onOk={useTicket} confirmLoading={busy} okText="确认核销" cancelText="取消" destroyOnHidden>
    {selected && <><Descriptions column={1} size="small" items={[{ key: 'code', label: '唯一券号', children: selected.redeemCode }, { key: 'rule', label: '使用规则', children: selected.benefit }, { key: 'dates', label: '有效期', children: `${selected.startsAt} 至 ${selected.expiresAt}` }]} /><Form key={selected.id} form={useForm} layout="vertical" preserve={false} initialValues={{ productId: ticketProducts(selected).length === 1 ? ticketProducts(selected)[0].id : undefined }}>
      {!selected.phoneDigits ? <Form.Item name="phone" label="核销用户手机号" rules={[{ required: true, message: '未领取券核销时须绑定用户' }, { pattern: /^1\d{10}$/, message: '请输入11位手机号' }]}><Input maxLength={11} /></Form.Item> : <Typography.Paragraph>核销用户：{selected.phone}</Typography.Paragraph>}
      <Form.Item name="orderNo" label="订单号" rules={[{ required: true, whitespace: true, message: '请输入订单号' }]}><Input maxLength={60} /></Form.Item>
      <Form.Item name="productId" label={selected.couponKind === '体验权益券' ? '本次兑换的商品 / 主题体验' : '订单商品 / 主题'} rules={[{ required: true, message: '请选择本次商品/主题' }]}><Select options={ticketProducts(selected).map((row) => ({ value: row.id, label: row.name }))} /></Form.Item>
      {selected.couponKind !== '体验权益券' && <><Form.Item name="orderAmount" label="订单原价" rules={[{ required: true, message: '请输入订单原价' }, { type: 'number', min: 0.01 }]}><InputNumber min={0.01} precision={2} addonAfter="元" /></Form.Item>{typeof amount === 'number' && amount >= selected.minSpend && amount > 0 && <Typography.Paragraph>本单优惠 {priceDiscount(selected, amount).toFixed(2)} 元，优惠后应付 {(amount - priceDiscount(selected, amount)).toFixed(2)} 元。</Typography.Paragraph>}</>}
      {selected.couponKind === '体验权益券' && <Typography.Text type="secondary">本次核销扣减1次，当前剩余 {selected.totalUses - selected.usedTimes} 次。</Typography.Text>}
    </Form></>}
  </Modal>
  <Modal title="券详情与核销记录" width={920} open={historyOpen && Boolean(selected)} onCancel={() => setHistoryOpen(false)} footer={null}>
    {selected && <><Descriptions column={2} size="small" items={[{ key: 'code', label: '唯一券号', children: selected.redeemCode }, { key: 'user', label: '用户', children: selected.phone || '未领取' }, { key: 'rule', label: '优惠内容', children: selected.benefit }, { key: 'source', label: '发券方式', children: selected.source }, { key: 'start', label: '生效日期', children: selected.startsAt }, { key: 'end', label: '失效日期', children: selected.expiresAt }, { key: 'product', label: '可兑换/适用商品', children: ticketProducts(selected).map((row) => row.name).join('、') }]} /><Table<CouponUseRecord> rowKey="orderNo" dataSource={selected.usageHistory} pagination={false} size="small" locale={{ emptyText: '尚未核销' }} columns={[{ title: '核销时间', dataIndex: 'usedAt', width: 165 }, { title: '商品 / 主题体验', dataIndex: 'productName', width: 200 }, { title: '订单号', dataIndex: 'orderNo' }, { title: '订单原价', render: (_, row) => row.orderAmount === undefined ? '—' : `${row.orderAmount.toFixed(2)}元` }, { title: '本单优惠', render: (_, row) => row.discountAmount === undefined ? '—' : `${row.discountAmount.toFixed(2)}元` }]} /></>}
  </Modal>
  <Modal title="券码兑换二维码" open={qrOpen && Boolean(selected)} onCancel={() => setQrOpen(false)} footer={null} destroyOnHidden>{selected && <div className="coupon-qr-result"><Typography.Paragraph>唯一券号：{selected.redeemCode}</Typography.Paragraph><div id="coupon-ticket-qr"><QRCode value={receiveUrl(`code=${encodeURIComponent(selected.redeemCode)}`)} size={180} /></div><Space><Button icon={<DownloadOutlined />} onClick={() => downloadQrCode('coupon-ticket-qr', `${selected.redeemCode}-兑换二维码`)}>下载二维码</Button><Button onClick={() => navigate(`/coupon-receive?code=${encodeURIComponent(selected.redeemCode)}`)}>预览兑换页</Button></Space></div>}</Modal>
  </section>;
}
