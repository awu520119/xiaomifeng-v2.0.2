import { App, Button, Descriptions, Form, Input, Result, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CouponStore } from '../mock/coupons';
import { canIssueCoupon, couponLocalTime, createTicket, effectiveCouponStatus, maskPhone, receiveLimitError, shootingProducts } from '../mock/coupons';
type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };
export default function CouponReceivePage({ store, setStore }: Props) {
  const [params] = useSearchParams(); const navigate = useNavigate(); const planId = params.get('planId');
  const plan = store.plans.find((row) => row.id === planId); const [form] = Form.useForm<{ phone: string; code: string }>();
  const [resultId, setResultId] = useState<string | null>(null); const [busy, setBusy] = useState(false); const { message } = App.useApp();
  const codeValue = Form.useWatch('code', form) || params.get('code') || '';
  const codeTicket = store.tickets.find((row) => row.redeemCode === codeValue.trim().toUpperCase());
  const coupon = store.templates.find((row) => row.id === (plan?.couponId || codeTicket?.couponId));
  const result = store.tickets.find((row) => row.id === resultId);
  const receive = async () => {
    if (busy) return; setBusy(true);
    try {
      const values = await form.validateFields().catch(() => null); if (!values) return;
      if (planId && !plan) { message.error('领取入口不存在，请重新获取二维码'); return; }
      if (!coupon) { message.error('券码不存在，请检查后重试'); return; }
      const limit = receiveLimitError(coupon, values.phone, store.tickets);
      if (planId) {
        if (plan!.allowedPhones.length && !plan!.allowedPhones.includes(values.phone)) { message.error('该手机号不在本次允许领取名单中'); return; }
        if (!canIssueCoupon(coupon, store.tickets)) { message.error('该券已停用、失效或发放名额已满'); return; }
        if (limit) { message.error(limit); return; }
        const ticket = { ...createTicket(coupon, '扫码领取', values.phone), claimPlanId: plan!.id };
        setStore((current) => ({ ...current, tickets: [ticket, ...current.tickets] })); setResultId(ticket.id);
      } else {
        if (!codeTicket) { message.error('券码不存在'); return; }
        if (codeTicket.phoneDigits) { message.error('该券码已被领取，不能重复兑换'); return; }
        if (['已作废', '已过期', '已核销'].includes(effectiveCouponStatus(codeTicket))) { message.error('该券码已失效或作废，不能兑换'); return; }
        if (limit) { message.error(limit); return; }
        setStore((current) => ({ ...current, tickets: current.tickets.map((row) => row.id === codeTicket.id ? { ...row, phone: maskPhone(values.phone), phoneDigits: values.phone, issuedAt: couponLocalTime(), status: '待使用' } : row) })); setResultId(codeTicket.id);
      }
      message.destroy();
    } finally { setBusy(false); }
  };
  return <main className="coupon-receive-page"><section className="coupon-receive-card"><Typography.Title level={3}>{planId ? '扫码领取优惠券' : '券码兑换'}</Typography.Title>
    {result ? <><Result status="success" title={planId ? '领取成功' : '兑换成功'} subTitle={`优惠券已发给 ${result.phone}`} /><Descriptions column={1} size="small" items={[{ key: 'name', label: '优惠券', children: result.couponName }, { key: 'code', label: '唯一券号', children: result.redeemCode }, { key: 'rule', label: '优惠内容', children: result.benefit }, { key: 'status', label: '状态', children: <Tag>{effectiveCouponStatus(result)}</Tag> }, { key: 'start', label: '生效日期', children: result.startsAt }, { key: 'end', label: '失效日期', children: result.expiresAt }]} /><Space><Button onClick={() => { setResultId(null); }}>继续{planId ? '领取' : '兑换'}</Button><Button type="primary" onClick={() => navigate(`/coupon-issues?couponId=${result.couponId}&recordId=${result.id}`)}>返回后台查看这张券</Button></Space></> : <>
      {coupon && <div className="coupon-receive-info"><Typography.Text strong>{coupon.name}</Typography.Text><p>{coupon.benefit}</p>{coupon.kind === '体验权益券' && <p>可兑换：{shootingProducts.filter((row) => coupon.productIds.includes(row.id)).map((row) => row.name).join('、')}</p>}<p>生效：{coupon.startsAt}<br />失效：{coupon.endsAt}</p>{plan?.allowedPhones.length ? <Tag>仅指定手机号可领取</Tag> : null}</div>}
      {planId && !plan ? <Result status="warning" title="领取入口不存在" subTitle="请在后台重新生成领取二维码" /> : <Form form={form} layout="vertical" onFinish={receive} initialValues={{ code: params.get('code') || '' }}>
        <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入11位手机号' }]}><Input maxLength={11} placeholder="输入领取人的手机号" /></Form.Item>
        {!planId && <Form.Item name="code" label="唯一券号 / 兑换码" rules={[{ required: true, whitespace: true, message: '请输入兑换码' }]}><Input placeholder="输入券码，或扫描券码二维码" /></Form.Item>}
        <Button type="primary" htmlType="submit" loading={busy} block>{planId ? '确认领取' : '确认兑换'}</Button>
      </Form>}
    </>}
    <Button type="link" className="coupon-receive-back" onClick={() => navigate('/coupons')}>返回后台原型</Button>
  </section></main>;
}
