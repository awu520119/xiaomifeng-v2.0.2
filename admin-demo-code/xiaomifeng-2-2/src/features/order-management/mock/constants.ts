import type { CouponOrder, CouponStore } from '../../../mock/coupons';
import { shootingProducts } from '../../../mock/coupons';
import type { Order } from './types';

export const FUNDING_RETRY_SETTLE_MS = 1200;
export function moneyText(value: number) { return Number(value || 0).toFixed(2); }
export function tagColor(state: string) {
  if (['已完成', '已分账', '成片交付'].includes(state)) return 'success';
  if (['待分账', '待付款', '待使用', '任务结束'].includes(state)) return 'processing';
  if (['已退款', '退款中'].includes(state)) return 'warning';
  if (['已取消', '分账失败', '回退失败'].includes(state)) return 'error';
  return 'default';
}
export function splitModeText(mode: string) { return mode === 'order_split' || mode === 'thirdParty' ? '线上自动分账' : '线下对公结算'; }

const orderStatus = (order: CouponOrder) => order.status === '待支付' ? '待付款' : order.status === '部分退款' ? '已退款' : order.status === '待使用' && order.ticketSnapshot?.points.some((point) => point.status !== '待拍摄') ? '已使用' : order.status;

export function toPremiumOrder(order: CouponOrder, store: CouponStore): Order {
  const product = shootingProductsFallback(order.productId);
  const paid = !['待付款', '已取消'].includes(orderStatus(order));
  const right = (store.accountRights || []).find((item) => item.id === order.rightId);
  const ticket = store.tickets.find((item) => item.id === order.ticketId || item.id === right?.sourceTicketId);
  const couponName = ticket?.couponName || right?.couponName || (order.ticketId || order.rightId ? '优惠券信息暂不可用' : undefined);
  const bundleSnapshot = order.ticketSnapshot;
  return {
    id: order.id, orderNo: order.id, status: orderStatus(order), orderType: bundleSnapshot ? '套票订单' : '套餐订单',
    theme: bundleSnapshot ? order.productName : product.theme, point: bundleSnapshot ? `${bundleSnapshot.scenicName}，${bundleSnapshot.points.length} 个拍摄点` : product.point, user: order.phone, phone: order.phone,
    amount: order.originalAmount, expectedAmount: product.price, paidAmount: order.payAmount, refundAmount: order.refundAmount || 0,
    netAmount: order.payAmount - (order.refundAmount || 0), shareBaseAmount: 0,
    collectionMode: 'platform', splitMode: 'system', fundingMode: 'offline_settlement', scenicName: bundleSnapshot?.scenicName || product.point,
    accountId: 'mini-program', accountName: '小程序用户', accountSource: 'C', channelAccountId: '', channelAccountIds: [],
    settlementEligible: false, rating: undefined,
    paymentWay: paid && order.payAmount > 0 ? '本地演示支付' : undefined,
    transactionId: undefined, payer: '—', receiverSummary: '—', payerMchid: undefined,
    couponName, couponKind: right ? '体验权益券' : ticket?.couponKind,
    couponSerialNo: (right || ticket?.couponKind === '体验权益券') ? (ticket?.serialNo || ticket?.redeemCode) : undefined,
    couponDiscountAmount: couponName ? order.discountAmount : undefined,
    shootInfo: bundleSnapshot ? { themeName: order.productName, scenicName: bundleSnapshot.scenicName, peopleCount: '2 人' } : { themeName: product.theme, scenicName: product.point, shootPoint: product.point },
    ticketPoints: bundleSnapshot?.points, ticketDelivery: bundleSnapshot?.delivery, ticketOrientations: bundleSnapshot?.orientations,
    ticketMediaCounts: bundleSnapshot?.mediaCounts,
    ticketMediaVersions: bundleSnapshot?.mediaVersions,
    ticketTemplate: bundleSnapshot?.templatesByCompletedPoints?.[String(bundleSnapshot.points.filter((point) => point.status === '已完成').length)],
    flowLogs: [
      { time: order.createdAt, title: '订单生成' },
      ...(paid ? [{ time: order.createdAt, title: order.payAmount > 0 ? '支付完成' : '体验权益订单创建' }] : []),
      ...(bundleSnapshot?.points.flatMap((point) => point.completedAt ? [{ time: point.completedAt, title: `拍摄点「${point.name}」完成` }] : []) || []),
      ...(bundleSnapshot?.mediaVersions?.map((version) => ({ time: version.generatedAt, title: `成片${version.version}生成` })) || []),
      ...(order.fulfilledAt ? [{ time: order.fulfilledAt, title: bundleSnapshot ? '套票交付完成' : '拍摄流程结束' }] : []),
      ...(order.refundedAt ? [{ time: order.refundedAt, title: '退款完成' }] : []),
      ...(order.status === '已取消' ? [{ time: order.createdAt, title: '订单已取消' }] : []),
    ].sort((left, right) => left.time.localeCompare(right.time)),
    businessDate: order.createdAt.slice(0, 10), createdAt: order.createdAt,
    paidAt: paid ? order.createdAt : '', completedAt: order.fulfilledAt || '', refundAt: order.refundedAt,
  };
}

function shootingProductsFallback(id: string) {
  const product = shootingProducts.find((item) => item.id === id);
  const [point = '—', theme = '—'] = product?.name.split('，') || [];
  return { point: product?.shootingPoint || point, theme: product?.theme || theme, price: product?.price || 0 };
}
