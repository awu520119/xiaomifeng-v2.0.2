import { App, Button, DatePicker, Descriptions, Drawer, Form, Input, Select, Space, Table, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CouponStore, ExperienceAccountRight } from '../mock/coupons';
import { effectiveCouponStatus } from '../mock/coupons';
import { redeemExperience } from '../mock/couponFlow';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };
type Values = { code: string; phone: string; orderNo?: string };
export function RedemptionRecordsPage({ store, setStore }: Props) {
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Values>();
  const code = Form.useWatch('code', form);
  const ticket = store.tickets.find((item) => item.redeemCode === code);
  const candidates = store.tickets.filter((item) => item.couponKind === '体验权益券'
    && ['待使用', '未领取'].includes(effectiveCouponStatus(item))
    && !(store.accountRights || []).some((right) => right.sourceTicketId === item.id)
    && (item.phoneDigits || store.templates.find((coupon) => coupon.id === item.couponId)?.status === '启用'));
  const codeOf = (right: ExperienceAccountRight) => store.tickets.find((item) => item.id === right.sourceTicketId)?.redeemCode || right.sourceTicketId;
  const rows = (store.accountRights || []).filter((right) => (!keyword.trim() || [codeOf(right), right.phoneDigits, right.orderNo || '', right.operator].some((value) => value.includes(keyword.trim())))
    && (!range || right.grantedAt.slice(0, 10) >= range[0].format('YYYY-MM-DD') && right.grantedAt.slice(0, 10) <= range[1].format('YYYY-MM-DD')))
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  const issue = async () => {
    const values = await form.validateFields().catch(() => null); if (!values) return;
    try {
      setStore(redeemExperience(store, values.code, values.phone, values.orderNo));
      setOpen(false); form.resetFields(); message.success('体验券已发放至用户账户');
    } catch (error) { message.error((error as Error).message); }
  };
  return <><section className="coupon-page admin-list-page">
    <div className="admin-filter-card"><div className="admin-filter-controls"><Space wrap>
      <Input placeholder="券码、手机号、订单号、操作人" value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear style={{ width: 280 }} />
      <DatePicker.RangePicker value={range} onChange={(value) => setRange(value as typeof range)} />
      <Button type="link" icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setRange(null); }}>重置</Button>
    </Space></div><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>发体验券</Button></div>
    <div className="admin-list-card"><Table rowKey="id" dataSource={rows} locale={{ emptyText: '暂无活动发券记录' }} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (count) => `共 ${count} 条` }} scroll={{ x: 1000 }} columns={[
      { title: '券码', width: 340, render: (_, right: ExperienceAccountRight) => <Typography.Text copyable>{codeOf(right)}</Typography.Text> },
      { title: '发放用户', dataIndex: 'phone', width: 150 },
      { title: '关联订单', width: 220, render: (_, right: ExperienceAccountRight) => right.orderNo ? <Typography.Text copyable ellipsis={{ tooltip: right.orderNo }}>{right.orderNo}</Typography.Text> : '—' },
      { title: '操作人', dataIndex: 'operator', width: 130 },
      { title: '发放时间', dataIndex: 'grantedAt', width: 180 },
    ]} /></div>
  </section>
  <Drawer title="发放体验券" width={620} open={open} onClose={() => setOpen(false)} destroyOnHidden footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={() => setOpen(false)}>取消</Button><Button type="primary" onClick={issue}>确认发放</Button></Space>}>
    <Form form={form} layout="vertical">
      <Form.Item name="code" label="指定券码" rules={[{ required: true, message: '请选择券码' }]}><Select showSearch optionFilterProp="label" placeholder="搜索券码或体验券名称" options={candidates.map((item) => ({ value: item.redeemCode, label: `${item.redeemCode} · ${item.couponName}` }))} onChange={(value) => form.setFieldValue('phone', store.tickets.find((item) => item.redeemCode === value)?.phoneDigits || '')} /></Form.Item>
      {ticket && <Descriptions size="small" column={1} style={{ marginBottom: 24 }} items={[{ key: 'name', label: '体验券', children: ticket.couponName }, { key: 'expiry', label: '有效期', children: `${ticket.startsAt} 至 ${ticket.expiresAt}` }]} />}
      <Form.Item name="phone" label="接收手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入11位手机号' }]}><Input readOnly={Boolean(ticket?.phoneDigits)} maxLength={11} placeholder="输入接收体验券的手机号" /></Form.Item>
      <Form.Item name="orderNo" label="关联订单号（选填）"><Input maxLength={80} placeholder="输入关联订单号" /></Form.Item>
    </Form>
  </Drawer></>;
}
