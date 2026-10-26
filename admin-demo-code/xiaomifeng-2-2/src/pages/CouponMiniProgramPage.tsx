import { App, Button, Card, Descriptions, Drawer, Empty, Input, Modal, Popconfirm, QRCode, Radio, Select, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CouponOrder, CouponStore } from '../mock/coupons';
import { effectiveCouponStatus, priceDiscount, shootingProducts, ticketProducts } from '../mock/coupons';
import { couponUsageStatus, couponUsageStatuses, createCouponOrder, priceCouponReason, rightStatus, transitionOrder } from '../mock/couponFlow';
import { receiveUrl } from '../utils/couponExport';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };
function MiniShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate(); const [params] = useSearchParams(); const query = params.get('phone') ? `?phone=${encodeURIComponent(params.get('phone')!)}` : '';
  return <main className="coupon-mini-page"><div className="coupon-mini-card"><div className="coupon-mini-nav"><Button type="link" onClick={() => navigate(`/coupon-my${query}`)}>我的优惠券</Button><Button type="link" onClick={() => navigate(`/coupon-order${query}`)}>下单使用</Button><Button type="link" onClick={() => navigate('/coupons')}>返回后台</Button></div><Typography.Title level={4}>{title}</Typography.Title>{children}</div></main>;
}
export function MyCouponsPage({ store }: { store: CouponStore }) {
  const [params, setParams] = useSearchParams(); const [phone, setPhone] = useState(params.get('phone') || ''); const [tab, setTab] = useState('待使用'); const [detailId, setDetailId] = useState<string | null>(null); const [qrId, setQrId] = useState<string | null>(null); const navigate = useNavigate();
  const tickets = store.tickets.filter((ticket) => ticket.phoneDigits === params.get('phone')); const detail = tickets.find((ticket) => ticket.id === detailId); const qrTicket = tickets.find((ticket) => ticket.id === qrId);
  const rights = (store.accountRights || []).filter((right) => right.phoneDigits === params.get('phone'));
  const rows = tickets.filter((ticket) => tab === '全部' || couponUsageStatus(ticket, store) === tab).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  return <MiniShell title="我的优惠券">
    <Space.Compact style={{ width: '100%', marginBottom: 16 }}><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="输入演示手机号" maxLength={11} /><Button type="primary" onClick={() => setParams(phone ? { phone } : {})}>查看</Button></Space.Compact>
    {rights.length > 0 && <section><Typography.Title level={5}>账户体验权益</Typography.Title>{rights.map((right) => <Card key={right.id} size="small" style={{ marginBottom: 12 }} title={right.couponName} extra={<Tag>{rightStatus(right)}</Tag>}>
      <Typography.Paragraph>体验权益：{right.remainingUses > 0 ? '待使用' : '已使用'}</Typography.Paragraph>
      <Typography.Paragraph type="secondary">{shootingProducts.filter((product) => right.productIds.includes(product.id)).map((product) => product.name).join('、')}<br />有效至：{right.expiresAt || '原券已失效'}</Typography.Paragraph>
      {['可使用', '部分使用'].includes(rightStatus(right)) && <Button type="primary" size="small" onClick={() => navigate(`/coupon-order?phone=${right.phoneDigits}&rightId=${right.id}`)}>去体验</Button>}
    </Card>)}</section>}
    <Radio.Group value={tab} onChange={(event) => setTab(event.target.value)} optionType="button" buttonStyle="solid" style={{ marginBottom: 16 }} options={[...couponUsageStatuses, '全部'].map((value) => ({ value, label: value }))} />
    {rows.length ? rows.map((ticket) => <Card key={ticket.id} size="small" style={{ marginBottom: 12 }} title={<><Tag color={ticket.couponKind === '体验权益券' ? 'blue' : 'purple'}>{ticket.couponKind === '体验权益券' ? '体验券' : '价格优惠券'}</Tag>{ticket.couponName}</>} extra={<Tag>{couponUsageStatus(ticket, store)}</Tag>}>
      <Typography.Paragraph>{ticket.benefit}</Typography.Paragraph><Typography.Paragraph type="secondary">有效期：领取后 {ticket.validityDays} 天可用，截止时间：{ticket.expiresAt || '领取后开始计算'}</Typography.Paragraph>
      {ticket.couponKind === '体验权益券' && effectiveCouponStatus(ticket) === '待使用' && <Typography.Paragraph type="secondary">请出示券码，由工作人员确认后将体验权益发放到账户。</Typography.Paragraph>}
      <Space><Button size="small" onClick={() => setDetailId(ticket.id)}>查看详情</Button>{effectiveCouponStatus(ticket) === '待使用' && (ticket.couponKind === '体验权益券' ? <Button size="small" type="primary" onClick={() => setQrId(ticket.id)}>出示兑换码</Button> : <Button size="small" type="primary" disabled={Boolean(ticket.lockedOrderId)} onClick={() => navigate(`/coupon-order?phone=${ticket.phoneDigits}`)}>去使用</Button>)}</Space>
    </Card>) : <Empty description={params.get('phone') ? '暂无此状态的优惠券' : '请输入手机号查看本地演示券'} />}
    <Drawer title="优惠券详情" width={480} open={Boolean(detail)} onClose={() => setDetailId(null)}>{detail && <Descriptions column={1} items={[
      { key: 'name', label: '优惠券', children: detail.couponName }, { key: 'id', label: '券码', children: detail.redeemCode }, { key: 'rule', label: '优惠内容', children: detail.benefit }, { key: 'scope', label: '适用范围', children: ticketProducts(detail).map((product) => product.name).join('、') }, { key: 'valid', label: '有效期', children: detail.expiresAt ? `领取后 ${detail.validityDays} 天可用，截止时间：${detail.expiresAt}` : `领取后 ${detail.validityDays} 天可用` }, { key: 'state', label: '状态', children: couponUsageStatus(detail, store) },
    ]} />}</Drawer>
    <Modal title="出示兑换码" open={Boolean(qrTicket)} onCancel={() => setQrId(null)} footer={null}>{qrTicket && <div className="coupon-qr-result"><QRCode value={receiveUrl(`code=${encodeURIComponent(qrTicket.redeemCode)}`, qrTicket.distributedById)} size={220} /><Typography.Text copyable>{qrTicket.redeemCode}</Typography.Text><Typography.Text type="secondary">由工作人员确认后，将权益发放到当前用户账户。</Typography.Text></div>}</Modal>
  </MiniShell>;
}
export function MiniOrderPage({ store, setStore }: Props) {
  const [params, setParams] = useSearchParams(); const [phone, setPhone] = useState(params.get('phone') || '');
  const preferredRight = (store.accountRights || []).find((right) => right.id === params.get('rightId') && right.phoneDigits === params.get('phone'));
  const [productId, setProductId] = useState(preferredRight?.productIds[0] || shootingProducts[0].id); const [choice, setChoice] = useState<string>(); const [orderId, setOrderId] = useState<string | null>(null); const { message } = App.useApp();
  const selectedPhone = params.get('phone') || ''; const product = shootingProducts.find((item) => item.id === productId)!;
  const prices = store.tickets.filter((ticket) => ticket.phoneDigits === selectedPhone && ticket.couponKind !== '体验权益券');
  const usable = prices.filter((ticket) => !priceCouponReason(ticket, productId));
  const rights = (store.accountRights || []).filter((right) => right.phoneDigits === selectedPhone && ['可使用', '部分使用'].includes(rightStatus(right)) && right.productIds.includes(productId));
  const best = usable.reduce<(typeof usable)[number] | undefined>((current, ticket) => !current || priceDiscount(ticket, product.price) > priceDiscount(current, product.price) ? ticket : current, undefined);
  const preferredId = rights.find((right) => right.id === params.get('rightId'))?.id;
  useEffect(() => { setChoice(preferredId || best?.id); }, [productId, selectedPhone, preferredId, best?.id]);
  const chosenTicket = prices.find((ticket) => ticket.id === choice); const chosenRight = rights.find((right) => right.id === choice);
  const discount = chosenRight ? product.price : chosenTicket ? priceDiscount(chosenTicket, product.price) : 0;
  const orders = (store.orders || []).filter((order) => order.phone === selectedPhone).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const order = orders.find((item) => item.id === orderId);
  const submit = () => { try { const next = createCouponOrder(store, selectedPhone, productId, choice); setStore(next); setOrderId(next.orders![0].id); message.success(chosenRight ? '体验订单已创建，已预占一次权益' : '订单已创建，所选价格券已锁定'); } catch (error) { message.error((error as Error).message); } };
  const act = (current: CouponOrder, action: Parameters<typeof transitionOrder>[2]) => {
    try { const next = transitionOrder(store, current.id, action); setStore(next); const updated = next.orders!.find((item) => item.id === current.id)!; message.success(action.startsWith('refund') ? `退款完成；${updated.couponReturnResult}` : action === 'pay' ? '支付成功，待使用服务' : action === 'fulfil' ? '已完成体验服务' : '已关闭订单并释放价格券'); } catch (error) { message.error((error as Error).message); }
  };
  const linkedTicket = order && store.tickets.find((ticket) => ticket.id === order.ticketId || ticket.id === (store.accountRights || []).find((right) => right.id === order.rightId)?.sourceTicketId);
  const linkedRight = order && (store.accountRights || []).find((right) => right.id === order.rightId);
  const linkedCode = linkedTicket?.redeemCode;
  const couponKindLabel = linkedTicket?.couponKind === '体验权益券' ? '体验券' : linkedTicket?.couponKind;
  const couponKindClass = linkedTicket?.couponKind === '满减券' ? 'coupon-kind-tag-reduction' : linkedTicket?.couponKind === '折扣券' ? 'coupon-kind-tag-discount' : 'coupon-kind-tag-experience';
  return <MiniShell title="下单使用优惠券">
    <Space.Compact style={{ width: '100%', marginBottom: 18 }}><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="输入演示手机号" maxLength={11} /><Button type="primary" onClick={() => setParams(phone ? { phone } : {})}>确认用户</Button></Space.Compact>
    <Typography.Paragraph strong>选择拍摄主题或套餐</Typography.Paragraph><Select style={{ width: '100%', marginBottom: 18 }} value={productId} onChange={setProductId} options={shootingProducts.map((item) => ({ value: item.id, label: `${item.name}，¥${item.price}` }))} />
    <Typography.Paragraph strong>使用优惠券 / 账户体验权益</Typography.Paragraph><Select style={{ width: '100%', marginBottom: 12 }} value={choice || 'none'} onChange={(value) => setChoice(value === 'none' ? undefined : value)} options={[
      { value: 'none', label: '不使用优惠券' }, ...rights.map((right) => ({ value: right.id, label: `${right.couponName}，${right.remainingUses > 0 ? '可使用' : '已使用'}` })),
      ...prices.map((ticket) => { const reason = priceCouponReason(ticket, productId); return { value: ticket.id, disabled: Boolean(reason), label: `${ticket.couponName}，${reason || `优惠 ¥${priceDiscount(ticket, product.price).toFixed(2)}${best?.id === ticket.id ? '（推荐）' : ''}`}` }; }),
    ]} />
    <Typography.Text type="secondary">价格券每单一张；优惠后应付为 0 的券本单不可用。</Typography.Text>
    <div className="coupon-mini-summary"><div>商品原价 <b>¥{product.price.toFixed(2)}</b></div><div>优惠金额 <b>−¥{discount.toFixed(2)}</b></div><div>应付金额 <strong>¥{Math.max(0, product.price - discount).toFixed(2)}</strong></div></div>
    <Button type="primary" block onClick={submit}>创建订单</Button>
    {order && <Card size="small" title="订单详情" style={{ marginTop: 16 }}><Descriptions column={1} size="small" items={[
      { key: 'id', label: '订单号', children: order.id }, { key: 'product', label: '主题 / 套餐', children: order.productName }, { key: 'code', label: '关联券码', children: linkedCode || '未使用优惠券' },
      { key: 'amount', label: '应付金额', children: `¥${order.payAmount.toFixed(2)}` }, { key: 'state', label: '订单状态', children: order.status }, { key: 'refund', label: '退款金额', children: order.refundAmount === undefined ? '—' : `¥${order.refundAmount.toFixed(2)}` },
      { key: 'returned', label: '返券结果', children: order.couponReturnResult || '—' },
    ]} /><section className="coupon-order-usage"><Typography.Title level={5}>优惠券使用情况</Typography.Title>{linkedTicket ? <Descriptions column={1} size="small" items={[
      { key: 'coupon-name', label: '使用券名称', children: linkedTicket.couponName },
      { key: 'coupon-kind', label: '券类型', children: <Tag className={`coupon-kind-tag ${couponKindClass}`}>{couponKindLabel}</Tag> },
      { key: 'coupon-state', label: '使用状态', children: <Tag className={`coupon-status-tag coupon-status-tag-${couponUsageStatus(linkedTicket, store) === '已使用' ? 'active' : couponUsageStatus(linkedTicket, store) === '使用中' ? 'progress' : 'pending'}`}>{couponUsageStatus(linkedTicket, store)}</Tag> },
      { key: 'coupon-code', label: linkedTicket.couponKind === '体验权益券' ? '体验券编号 / 券码' : '券码', children: <Typography.Text copyable>{linkedTicket.serialNo ? `${linkedTicket.serialNo} / ` : ''}{linkedTicket.redeemCode}</Typography.Text> },
      { key: 'coupon-discount', label: linkedRight ? '体验权益' : '优惠金额', children: linkedRight ? '本单使用 1 次体验权益' : `−¥${order.discountAmount.toFixed(2)}` },
    ]} /> : <Typography.Text type="secondary">本订单未使用优惠券或体验权益</Typography.Text>}</section><Space wrap>
      {order.status === '待支付' && <><Button type="primary" onClick={() => act(order, 'pay')}>模拟支付成功</Button><Button onClick={() => act(order, 'cancel')}>取消订单</Button><Button onClick={() => act(order, 'cancel')}>模拟超时关闭</Button></>}
      {(order.status === '待使用' || order.status === '部分退款' && !order.fulfilledAt) && <Button type="primary" onClick={() => act(order, 'fulfil')}>模拟完成服务</Button>}
      {['待使用', '已完成'].includes(order.status) && !order.refundedAt && order.payAmount > 0 && <>
        <Popconfirm title="模拟全额退款？" description={order.status === '已完成' || order.fulfilledAt ? '已履约订单不返券、不退权益。' : '未使用服务且原价格券仍有效时返还原券。'} onConfirm={() => act(order, 'refund-full')}><Button danger>全额退款</Button></Popconfirm>
        <Popconfirm title="模拟退还实付金额的 50%？" description="部分退款不返券、不退权益。" onConfirm={() => act(order, 'refund-partial')}><Button>部分退款（50%）</Button></Popconfirm>
      </>}
    </Space>{order.rightId && <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>体验权益订单无需支付；下单预占一次权益，完成服务后记录实际体验。</Typography.Paragraph>}</Card>}
    <Typography.Title level={5} style={{ marginTop: 24 }}>我的订单</Typography.Title>{orders.map((item) => <Card key={item.id} size="small" style={{ marginBottom: 8 }}><Button type="link" onClick={() => setOrderId(item.id)} style={{ paddingLeft: 0 }}>{item.productName}，{item.status}</Button><div><Typography.Text type="secondary">{item.id}　¥{item.payAmount.toFixed(2)}</Typography.Text></div></Card>)}
  </MiniShell>;
}
