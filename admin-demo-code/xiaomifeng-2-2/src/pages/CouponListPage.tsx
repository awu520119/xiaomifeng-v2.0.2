import { App, Button, Checkbox, Collapse, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, QRCode, Radio, Select, Space, Table, Tag, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CouponClaimPlan, CouponIssueRecord, CouponKind, CouponStore, CouponTemplate, CouponUseRecord } from '../mock/coupons';
import { canIssueCoupon, canVoidTicket, couponKinds, couponLocalTime, couponRuleText, createTicket, effectiveCouponStatus, maskPhone, parsePhones, phoneListError, priceDiscount, receiveLimitError, remainingQuota, shootingPointOptions, shootingProducts, themeOptions, uniqueCouponId, validateTicketUse } from '../mock/coupons';
import { downloadCouponCodes, downloadQrCode, receiveUrl } from '../utils/couponExport';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };
type Values = { name: string; kind: CouponKind; productIds: string[]; rightsCount: number; minSpend: number; discountAmount: number; discountRate: number; shootingPoints: string[]; allThemes: boolean; themes: string[]; validity: [Dayjs, Dayjs]; totalLimit: number; perUserLimit: number; description?: string; remark?: string };
type UseValues = { phone?: string; orderNo: string; productId: string; orderAmount?: number };
export default function CouponListPage({ store, setStore }: Props) {
  const [keyword, setKeyword] = useState(''); const [point, setPoint] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false); const [form] = Form.useForm<Values>();
  const kind = Form.useWatch('kind', form) || '满减券'; const allThemes = Form.useWatch('allThemes', form) ?? true;
  const [detailId, setDetailId] = useState<string | null>(null); const detail = store.templates.find((row) => row.id === detailId);
  const [issuingId, setIssuingId] = useState<string | null>(null); const issuing = store.templates.find((row) => row.id === issuingId); const [phoneForm] = Form.useForm<{ phones: string }>();
  const [qrCouponId, setQrCouponId] = useState<string | null>(null); const qrCoupon = store.templates.find((row) => row.id === qrCouponId);
  const [qrForm] = Form.useForm<{ audience: 'specified' | 'all'; phones: string }>(); const audience = Form.useWatch('audience', qrForm) || 'specified';
  const [plan, setPlan] = useState<CouponClaimPlan | null>(null); const [busy, setBusy] = useState(false);
  const [expandedCouponIds, setExpandedCouponIds] = useState<string[]>([]);
  const [genCouponId, setGenCouponId] = useState<string | null>(null); const [genForm] = Form.useForm<{ quantity: number }>();
  const [useTicketId, setUseTicketId] = useState<string | null>(null); const useTicket = store.tickets.find((row) => row.id === useTicketId); const [useForm] = Form.useForm<UseValues>(); const orderAmount = Form.useWatch('orderAmount', useForm);
  const [qrTicketId, setQrTicketId] = useState<string | null>(null); const qrTicket = store.tickets.find((row) => row.id === qrTicketId);
  const { message } = App.useApp();
  const canIssue = (coupon: CouponTemplate) => canIssueCoupon(coupon, store.tickets);
  const status = (coupon: CouponTemplate) => coupon.status === '已停用' ? '已停用' : Date.now() > new Date(coupon.endsAt.replace(' ', 'T')).getTime() ? '已失效' : remainingQuota(coupon, store.tickets) < 1 ? '已发完' : Date.now() < new Date(coupon.startsAt.replace(' ', 'T')).getTime() ? '未生效' : '生效中';
  const closeIssue = () => { setIssuingId(null); phoneForm.resetFields(); };
  const openCreate = () => { form.resetFields(); form.setFieldsValue({ kind: '满减券', productIds: [], rightsCount: 1, minSpend: 100, discountAmount: 20, discountRate: 8, shootingPoints: ['全部拍摄点'], allThemes: true, validity: [dayjs().startOf('day'), dayjs().add(30, 'day').endOf('day')], totalLimit: 100, perUserLimit: 1 }); setCreateOpen(true); };
  const save = async () => {
    const values = await form.validateFields().catch(() => null); if (!values) return;
    const selected = shootingProducts.filter((row) => values.productIds?.includes(row.id));
    const coupon: CouponTemplate = { id: uniqueCouponId('CP'), name: values.name.trim(), kind: values.kind, benefit: '',
      startsAt: values.validity[0].format('YYYY-MM-DD HH:mm:ss'), endsAt: values.validity[1].format('YYYY-MM-DD HH:mm:ss'),
      productIds: values.kind === '体验权益券' ? values.productIds : [], rightsCount: values.kind === '体验权益券' ? values.rightsCount : 1,
      minSpend: values.kind === '体验权益券' ? 0 : values.minSpend, discountAmount: values.kind === '满减券' ? values.discountAmount : 0, discountRate: values.kind === '折扣券' ? values.discountRate : 10,
      shootingPoints: values.kind === '体验权益券' ? [...new Set(selected.map((row) => row.shootingPoint))] : values.shootingPoints,
      availableRange: values.kind === '体验权益券' ? [...new Set(selected.map((row) => row.theme))] : values.allThemes ? ['全部可用'] : values.themes,
      totalLimit: values.totalLimit, perUserLimit: values.perUserLimit, sponsor: '平台', status: '启用', createdAt: couponLocalTime(), description: values.description, remark: values.remark };
    coupon.benefit = couponRuleText(coupon); setStore((current) => ({ ...current, templates: [coupon, ...current.templates] })); setCreateOpen(false); message.success('创建成功');
  };
  const send = async () => {
    if (busy) return; setBusy(true);
    try {
      const values = await phoneForm.validateFields().catch(() => null); if (!values || !issuing) return;
      const phones = parsePhones(values.phones); const error = phoneListError(phones); if (error) { phoneForm.setFields([{ name: 'phones', errors: [error] }]); return; }
      if (!canIssue(issuing) || phones.length > remainingQuota(issuing, store.tickets)) { message.error('该券已停用、失效或剩余名额不足'); return; }
      const limit = phones.map((phone) => receiveLimitError(issuing, phone, store.tickets)).find(Boolean); if (limit) { message.error(limit); return; }
      const tickets = phones.map((phone) => createTicket(issuing, '定向发放', phone));
      setStore((current) => ({ ...current, tickets: [...tickets, ...current.tickets] })); const couponId = issuing.id; closeIssue(); setExpandedCouponIds((ids) => ids.includes(couponId) ? ids : [...ids, couponId]); message.success(`已发放 ${tickets.length} 张`);
    } finally { setBusy(false); }
  };
  const createPlan = async () => {
    const values = await qrForm.validateFields().catch(() => null); if (!values || !qrCoupon) return;
    if (!canIssue(qrCoupon)) { message.error('该券当前不能继续领取'); return; }
    const phones = values.audience === 'specified' ? parsePhones(values.phones) : []; const error = values.audience === 'specified' ? phoneListError(phones) : undefined;
    if (error) { qrForm.setFields([{ name: 'phones', errors: [error] }]); return; }
    const next: CouponClaimPlan = { id: uniqueCouponId('QR'), couponId: qrCoupon.id, allowedPhones: phones, createdAt: couponLocalTime() };
    setStore((current) => ({ ...current, plans: [next, ...current.plans] })); setPlan(next); message.success('二维码已生成');
  };
  const generateCodes = async (coupon: CouponTemplate) => {
    if (busy) return; setBusy(true);
    try { const values = await genForm.validateFields().catch(() => null); if (!values) return;
      if (!canIssueCoupon(coupon, store.tickets) || values.quantity > remainingQuota(coupon, store.tickets)) { message.error('剩余可发数量不足'); return; }
      const tickets = Array.from({ length: values.quantity }, () => createTicket(coupon, '券码兑换'));
      setStore((current) => ({ ...current, tickets: [...tickets, ...current.tickets] })); downloadCouponCodes(tickets); setGenCouponId(null); setExpandedCouponIds((ids) => ids.includes(coupon.id) ? ids : [...ids, coupon.id]); message.success(`已生成 ${tickets.length} 个券码`);
    } finally { setBusy(false); }
  };
  const redeemTicket = async () => {
    if (busy) return; setBusy(true);
    try { const values = await useForm.validateFields().catch(() => null); if (!values || !useTicket) return;
      const current = store.tickets.find((row) => row.id === useTicket.id); if (!current) return;
      const error = validateTicketUse(current, values, store.tickets); if (error) { message.error(error); return; }
      const phone = current.phoneDigits || values.phone!; const product = shootingProducts.find((row) => row.id === values.productId)!;
      const discount = current.couponKind === '体验权益券' ? undefined : priceDiscount(current, values.orderAmount!);
      const usage: CouponUseRecord = { orderNo: values.orderNo.trim(), productId: product.id, productName: product.name, theme: product.theme, shootingPoint: product.shootingPoint, usedAt: couponLocalTime(), orderAmount: values.orderAmount, discountAmount: discount, payAmount: discount === undefined ? undefined : Math.round((values.orderAmount! - discount) * 100) / 100 };
      setStore((currentStore) => ({ ...currentStore, tickets: currentStore.tickets.map((row) => row.id === current.id ? { ...row, phoneDigits: phone, phone: maskPhone(phone), issuedAt: row.issuedAt || couponLocalTime(), usedTimes: row.usedTimes + 1, status: row.usedTimes + 1 === row.totalUses ? '已核销' : '待使用', orderNo: usage.orderNo, shootingPoint: usage.shootingPoint, usageHistory: [...row.usageHistory, usage] } : row) }));
      setUseTicketId(null); useForm.resetFields(); message.success('核销成功');
    } finally { setBusy(false); }
  };
  const voidCode = (ticket: CouponIssueRecord) => { if (!canVoidTicket(ticket)) return; setStore((current) => ({ ...current, tickets: current.tickets.map((row) => row.id === ticket.id ? { ...row, status: '已作废' } : row) })); message.success('已作废'); };
  const rows = store.templates.filter((row) => (!keyword.trim() || row.name.includes(keyword.trim())) && (!point || row.shootingPoints.includes(point) || row.shootingPoints.includes('全部拍摄点')));
  const products = (ids: string[]) => shootingProducts.filter((row) => ids.includes(row.id)).map((row) => row.name).join('、');
  return <section className="coupon-page reference-coupon-page"><section className="coupon-table-card reference-coupon-card">
    <div className="reference-toolbar"><div className="reference-filters"><Input.Search value={keyword} onChange={(event) => setKeyword(event.target.value)} enterButton allowClear placeholder="搜索优惠券名称" style={{ width: 250 }} /><Select value={point} onChange={setPoint} allowClear placeholder="拍摄点" options={shootingPointOptions.map((value) => ({ value, label: value }))} style={{ width: 170 }} /><Button type="link" icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setPoint(undefined); }}>重置</Button></div><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建优惠券</Button></div>
    <Table<CouponTemplate> rowKey="id" dataSource={rows} scroll={{ x: 1110 }} expandable={{ showExpandColumn: false, expandIcon: () => null, expandedRowKeys: expandedCouponIds, onExpand: (open, row) => setExpandedCouponIds((ids) => open ? [...new Set([...ids, row.id])] : ids.filter((id) => id !== row.id)), expandedRowRender: (coupon) => {
      const codes = store.tickets.filter((ticket) => ticket.couponId === coupon.id).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
      return <div className="coupon-inline-codes"><div className="coupon-inline-toolbar"><Typography.Text strong>券码（{codes.length}）</Typography.Text><Button type="primary" size="small" disabled={!canIssue(coupon)} onClick={() => { genForm.resetFields(); genForm.setFieldsValue({ quantity: 1 }); setGenCouponId(coupon.id); }}>生成券码</Button></div><Table<CouponIssueRecord> size="small" rowKey="id" dataSource={codes} pagination={{ pageSize: 5, size: 'small', showTotal: (n) => `共 ${n} 张` }} locale={{ emptyText: '暂无券码' }} columns={[
        { title: '唯一券号', dataIndex: 'redeemCode', width: 220, render: (code: string) => <Typography.Text copyable>{code}</Typography.Text> },
        { title: '状态', width: 90, render: (_, row) => <Tag>{effectiveCouponStatus(row)}</Tag> },
        { title: '持券用户', width: 120, render: (_, row) => row.phone || '未领取' },
        { title: '使用情况', width: 120, render: (_, row) => row.couponKind === '体验权益券' ? `${row.usedTimes}/${row.totalUses} 次` : row.usedTimes ? '已使用' : '未使用' },
        { title: '生效日期', dataIndex: 'startsAt', width: 155 }, { title: '失效日期', dataIndex: 'expiresAt', width: 155 },
        { title: '操作', width: 190, render: (_, row) => <Space size={0}>{['未领取', '待使用'].includes(effectiveCouponStatus(row)) && <Button type="link" size="small" onClick={() => { useForm.resetFields(); setUseTicketId(row.id); }}>核销</Button>}{!row.phoneDigits && !['已作废', '已过期'].includes(effectiveCouponStatus(row)) && <Button type="link" size="small" onClick={() => setQrTicketId(row.id)}>二维码</Button>}{canVoidTicket(row) && <Popconfirm title={row.usedTimes ? '作废剩余权益？' : '作废这张券？'} okText="作废" cancelText="取消" onConfirm={() => voidCode(row)}><Button type="link" size="small" danger>作废</Button></Popconfirm>}</Space> },
      ]} /></div>;
    } }} pagination={{ pageSize: 20, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条` }} columns={[
      { title: '序号', width: 45, render: (_, __, index) => index + 1 }, { title: '优惠券名称', width: 145, render: (_, row) => <Button type="link" className="coupon-name-link" onClick={() => setDetailId(row.id)}>{row.name}</Button> },
      { title: '类型', width: 80, render: (_, row) => <Tag color={row.kind === '体验权益券' ? 'blue' : 'purple'}>{row.kind === '体验权益券' ? '体验券' : row.kind}</Tag> },
      { title: '优惠内容', dataIndex: 'benefit', width: 145 }, { title: '可兑换商品 / 适用范围', width: 190, render: (_, row) => <><Typography.Text ellipsis={{ tooltip: true }} style={{ maxWidth: 175 }}>{row.kind === '体验权益券' ? products(row.productIds) : row.shootingPoints.join('、')}</Typography.Text>{row.kind !== '体验权益券' && <div className="coupon-cell-subtitle">{row.availableRange.join('、')}</div>}</> },
      { title: '生效日期', width: 125, render: (_, row) => <>{row.startsAt.slice(0, 10)}<div className="coupon-cell-subtitle">{row.startsAt.slice(11)}</div></> },
      { title: '失效日期', width: 125, render: (_, row) => <>{row.endsAt.slice(0, 10)}<div className="coupon-cell-subtitle">{row.endsAt.slice(11)}</div></> },
      { title: '操作', width: 255, fixed: 'right', render: (_, row) => <Space size={0}><Button type="link" disabled={!canIssue(row)} onClick={() => { phoneForm.resetFields(); setIssuingId(row.id); }}>定向发券</Button><Button type="link" onClick={() => setExpandedCouponIds((ids) => ids.includes(row.id) ? ids.filter((id) => id !== row.id) : [...ids, row.id])}>{expandedCouponIds.includes(row.id) ? '收起券码' : `券码（${store.tickets.filter((ticket) => ticket.couponId === row.id).length}）`}</Button><Button type="link" disabled={!canIssue(row)} onClick={() => { qrForm.resetFields(); setPlan(null); setQrCouponId(row.id); }}>领取二维码</Button></Space> },
    ]} />
  </section>
  <Drawer title="新建优惠券" width={720} open={createOpen} onClose={() => setCreateOpen(false)} destroyOnHidden className="design-drawer reference-create-drawer" footer={<Space><Button onClick={() => setCreateOpen(false)}>取消</Button><Button type="primary" onClick={save}>保存</Button></Space>}>
    <Form form={form} layout="vertical" preserve={false}>
      <Form.Item name="name" label="优惠券名称" rules={[{ required: true, whitespace: true, message: '请输入优惠券名称' }]}><Input maxLength={50} showCount /></Form.Item>
      <Form.Item name="kind" label="优惠券类型" rules={[{ required: true }]}><Radio.Group optionType="button" buttonStyle="solid" options={couponKinds.map((value) => ({ value, label: value === '体验权益券' ? '体验券' : value }))} /></Form.Item>
      {kind === '体验权益券' ? <>
        <Form.Item name="productIds" label="可兑换商品 / 主题体验" rules={[{ required: true, type: 'array', min: 1, message: '请选择至少一个可兑换的主题体验' }]}><Checkbox.Group className="coupon-product-options" options={shootingProducts.map((row) => ({ value: row.id, label: row.name }))} /></Form.Item>
        <Form.Item name="rightsCount" label="可兑换次数" rules={[{ required: true, message: '请输入次数' }, { type: 'number', min: 1 }]}><InputNumber min={1} precision={0} addonAfter="次" /></Form.Item>
      </> : <>
        <Form.Item name="minSpend" label="使用条件：订单满多少元" rules={[{ required: true, message: '请输入使用门槛' }, { type: 'number', min: kind === '满减券' ? 0.01 : 0 }]}><InputNumber min={kind === '满减券' ? 0.01 : 0} precision={2} addonAfter="元" /></Form.Item>
        {kind === '满减券' ? <Form.Item name="discountAmount" label="减免金额" dependencies={['minSpend']} rules={[{ required: true, message: '请输入减免金额' }, { validator: (_, value) => value === undefined || value > 0 && value < form.getFieldValue('minSpend') ? Promise.resolve() : Promise.reject(new Error('减免金额须大于0且小于使用门槛')) }]}><InputNumber min={0.01} precision={2} addonAfter="元" /></Form.Item> : <Form.Item name="discountRate" label="折扣" rules={[{ required: true, message: '请输入折扣' }]}><InputNumber min={0.1} max={9.9} precision={1} addonAfter="折" /></Form.Item>}
        <Form.Item name="shootingPoints" label="适用拍摄点" rules={[{ required: true, type: 'array', min: 1 }]}><Select mode="multiple" options={['全部拍摄点', ...shootingPointOptions].map((value) => ({ value, label: value }))} onChange={(values: string[]) => { if (values.includes('全部拍摄点')) form.setFieldValue('shootingPoints', values.at(-1) === '全部拍摄点' ? ['全部拍摄点'] : values.filter((value) => value !== '全部拍摄点')); }} /></Form.Item>
        <Form.Item name="allThemes" label="适用主题"><Radio.Group options={[{ value: true, label: '全部可用' }, { value: false, label: '指定主题' }]} /></Form.Item>
        {!allThemes && <Form.Item name="themes" label="选择主题" rules={[{ required: true, type: 'array', min: 1 }]}><Select mode="multiple" options={themeOptions.map((value) => ({ value, label: value }))} /></Form.Item>}
      </>}
      <Form.Item name="validity" label="生效日期 — 失效日期" rules={[{ required: true, message: '请选择完整的生效和失效时间' }, { validator: (_, value) => !value || value[1]?.isAfter(value[0]) ? Promise.resolve() : Promise.reject(new Error('失效时间须晚于生效时间')) }]}><DatePicker.RangePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} /></Form.Item>
      <div className="coupon-form-grid"><Form.Item name="totalLimit" label="发放总量" rules={[{ required: true }, { type: 'number', min: 1, max: 100000 }]}><InputNumber min={1} max={100000} precision={0} addonAfter="张" /></Form.Item><Form.Item name="perUserLimit" label="每人限领" dependencies={['totalLimit']} rules={[{ required: true }, { validator: (_, value) => value > 0 && value <= form.getFieldValue('totalLimit') ? Promise.resolve() : Promise.reject(new Error('须为正整数且不超过总量')) }]}><InputNumber min={1} precision={0} addonAfter="张" /></Form.Item></div>
      <Collapse ghost items={[{ key: 'extra', label: '更多设置（选填）', children: <><Form.Item name="description" label="使用说明"><Input.TextArea rows={2} maxLength={500} /></Form.Item><Form.Item name="remark" label="内部备注"><Input maxLength={300} /></Form.Item></> }]} />
    </Form>
  </Drawer>
  <Drawer title="优惠券详情" width={720} open={Boolean(detail)} onClose={() => setDetailId(null)} className="coupon-detail-drawer">
    {detail && <section className="coupon-detail-section"><h3>{detail.name}</h3><Descriptions column={1} size="small" items={[
      { key: 'kind', label: '类型', children: detail.kind === '体验权益券' ? '体验券' : detail.kind }, { key: 'rule', label: '优惠内容', children: detail.benefit },
      ...(detail.kind === '体验权益券' ? [{ key: 'products', label: '可兑换商品', children: products(detail.productIds) }] : []),
      { key: 'point', label: '适用拍摄点', children: detail.shootingPoints.join('、') }, { key: 'theme', label: '适用主题', children: detail.availableRange.join('、') },
      { key: 'start', label: '生效日期', children: detail.startsAt }, { key: 'end', label: '失效日期', children: detail.endsAt }, { key: 'status', label: '状态', children: status(detail) },
      { key: 'quota', label: '剩余可发', children: `${remainingQuota(detail, store.tickets)} / ${detail.totalLimit} 张` }, { key: 'limit', label: '每人限领', children: `${detail.perUserLimit} 张` },
    ]} /></section>}
  </Drawer>
  <Modal centered title={`定向发券 - ${issuing?.name || ''}`} open={Boolean(issuing)} onCancel={closeIssue} onOk={send} confirmLoading={busy} okText="发放" cancelText="取消" width={600} destroyOnHidden>
    {issuing && <Form form={phoneForm} layout="vertical"><Form.Item name="phones" label="手机号" rules={[{ required: true, whitespace: true, message: '请输入手机号' }]}><Input.TextArea aria-label="接收用户手机号" rows={7} maxLength={1000} placeholder="多个手机号用换行、逗号或空格分隔" showCount onChange={() => phoneForm.setFields([{ name: 'phones', errors: [] }])} /></Form.Item><Typography.Text type="secondary">剩余可发 {remainingQuota(issuing, store.tickets)} 张</Typography.Text></Form>}
  </Modal>
  <Modal title={`扫码领取 - ${qrCoupon?.name || ''}`} width={600} open={Boolean(qrCoupon)} onCancel={() => { setQrCouponId(null); setPlan(null); }} footer={null} destroyOnHidden>
    {qrCoupon && <><Form form={qrForm} layout="vertical" initialValues={{ audience: 'specified' }} onValuesChange={() => setPlan(null)}><Form.Item name="audience" label="谁可以扫码领取"><Radio.Group options={[{ value: 'specified', label: '指定手机号' }, { value: 'all', label: '所有登录用户' }]} /></Form.Item>{audience === 'specified' && <Form.Item name="phones" label="允许领取的手机号" rules={[{ required: true, whitespace: true, message: '请输入允许领取的手机号' }]}><Input.TextArea rows={3} placeholder="每行一个手机号，也可用逗号或空格分隔" /></Form.Item>}<Button type="primary" onClick={createPlan}>生成领取二维码</Button></Form>
      {plan && <div className="coupon-qr-result"><div id="coupon-claim-qr"><QRCode value={receiveUrl(`planId=${encodeURIComponent(plan.id)}`)} size={180} /></div><Space wrap><Button icon={<DownloadOutlined />} onClick={() => { if (!downloadQrCode('coupon-claim-qr', `${qrCoupon.name}-领取二维码`)) message.error('二维码尚未就绪'); }}>下载二维码</Button><Button icon={<CopyOutlined />} onClick={async () => { try { await navigator.clipboard.writeText(receiveUrl(`planId=${plan.id}`)); message.success('链接已复制'); } catch { message.info(receiveUrl(`planId=${plan.id}`)); } }}>复制链接</Button></Space></div>}
    </>}
  </Modal>
  <Modal title="生成券码" open={Boolean(genCouponId)} onCancel={() => setGenCouponId(null)} onOk={() => { const coupon = store.templates.find((row) => row.id === genCouponId); if (coupon) void generateCodes(coupon); }} confirmLoading={busy} okText="生成并下载" cancelText="取消" destroyOnHidden><Form form={genForm} layout="vertical"><Form.Item name="quantity" label="生成数量" rules={[{ required: true, message: '请输入数量' }, { type: 'number', min: 1, max: 10000 }]}><InputNumber min={1} max={10000} precision={0} addonAfter="张" style={{ width: 220 }} /></Form.Item>{genCouponId && <Typography.Text type="secondary">剩余可发 {remainingQuota(store.templates.find((row) => row.id === genCouponId)!, store.tickets)} 张</Typography.Text>}</Form></Modal>
  <Modal title="手动核销" open={Boolean(useTicket)} onCancel={() => { setUseTicketId(null); useForm.resetFields(); }} onOk={redeemTicket} confirmLoading={busy} okText="确认核销" cancelText="取消" destroyOnHidden>{useTicket && <><Descriptions size="small" column={1} items={[{ key: 'code', label: '券号', children: useTicket.redeemCode }, { key: 'rule', label: '优惠内容', children: useTicket.benefit }]} /><Form key={useTicket.id} form={useForm} layout="vertical" preserve={false} initialValues={{ productId: shootingProducts.filter((row) => useTicket.productIds.includes(row.id)).length === 1 ? useTicket.productIds[0] : undefined }}>{!useTicket.phoneDigits && <Form.Item name="phone" label="用户手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入11位手机号' }]}><Input maxLength={11} /></Form.Item>}{useTicket.phoneDigits && <Form.Item label="用户手机号">{useTicket.phone}</Form.Item>}<Form.Item name="orderNo" label="订单号" rules={[{ required: true, whitespace: true, message: '请输入订单号' }]}><Input maxLength={60} /></Form.Item><Form.Item name="productId" label={useTicket.couponKind === '体验权益券' ? '兑换商品 / 主题' : '订单商品 / 主题'} rules={[{ required: true, message: '请选择商品/主题' }]}><Select options={shootingProducts.filter((row) => useTicket.productIds.includes(row.id) || !useTicket.productIds.length).map((row) => ({ value: row.id, label: row.name }))} /></Form.Item>{useTicket.couponKind !== '体验权益券' && <><Form.Item name="orderAmount" label="订单原价" rules={[{ required: true, message: '请输入订单原价' }, { type: 'number', min: 0.01 }]}><InputNumber min={0.01} precision={2} addonAfter="元" /></Form.Item>{typeof orderAmount === 'number' && orderAmount >= useTicket.minSpend && orderAmount > 0 && <Typography.Text>本单优惠 {priceDiscount(useTicket, orderAmount).toFixed(2)} 元</Typography.Text>}</>}{useTicket.couponKind === '体验权益券' && <Typography.Text type="secondary">剩余 {useTicket.totalUses - useTicket.usedTimes} 次</Typography.Text>}</Form></>}</Modal>
  <Modal title="券码二维码" open={Boolean(qrTicket)} onCancel={() => setQrTicketId(null)} footer={null} destroyOnHidden>{qrTicket && <div className="coupon-qr-result"><Typography.Text copyable>{qrTicket.redeemCode}</Typography.Text><div id="coupon-ticket-qr"><QRCode value={receiveUrl(`code=${encodeURIComponent(qrTicket.redeemCode)}`)} size={180} /></div><Button icon={<DownloadOutlined />} onClick={() => downloadQrCode('coupon-ticket-qr', `${qrTicket.redeemCode}-二维码`)}>下载二维码</Button></div>}</Modal>
  </section>;
}
