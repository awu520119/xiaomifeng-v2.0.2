import type { CouponStore } from './coupons';
import { createTicket } from './coupons';

const seedId = 'mini-coupon-review-v2';

/** 两张可选价格券与体验券落在同一演示账号，便于串联券包和结算。 */
export function withMiniProgramSamples(store: CouponStore): CouponStore {
  if (store.demoSeeds?.includes(seedId)) return store;
  const phone = '13800000001';
  const templates = store.templates.map((item) => item.id === 'CP-EXPERIENCE' ? { ...item, name: '指定主题兑换券', rightsCount: 1, benefit: '指定主题体验 1 次' } : item);
  const oldMiniTicketIds = new Set(['CN-DEMO-MINI-REDUCTION', 'CN-DEMO-MINI-DISCOUNT']);
  const existingTickets = store.tickets.filter((item) => !oldMiniTicketIds.has(item.id)).map((item) => item.id === 'CN-DEMO-EXPERIENCE-001' ? { ...item, couponName: '指定主题兑换券', benefit: '指定主题体验 1 次', totalUses: 1, usedTimes: 0, status: '待使用' as const, usageHistory: [] } : item);
  const accountRights = (store.accountRights || []).map((right) => right.sourceTicketId === 'CN-DEMO-EXPERIENCE-001' ? { ...right, couponName: '指定主题兑换券', totalUses: 1, remainingUses: 1, usageHistory: [] } : right);
  const priceTemplates = templates.filter((item) => ['满减券', '折扣券'].includes(item.kind));
  const tickets = priceTemplates.map((coupon) => {
    const ticket = createTicket(coupon, '定向发放', phone);
    ticket.id = ticket.redeemCode = `CN-DEMO-MINI-${coupon.kind === '满减券' ? 'REDUCTION' : 'DISCOUNT'}`;
    if (coupon.kind === '折扣券') {
      ticket.minSpend = 200;
      ticket.benefit = '满 200 元享 8 折';
    }
    return ticket;
  }).filter((ticket) => !existingTickets.some((row) => row.id === ticket.id));
  return { ...store, templates, tickets: [...tickets, ...existingTickets], accountRights, demoSeeds: [...(store.demoSeeds || []), seedId] };
}

/** 现有小程序商品与订单详情的独立演示数据，不覆盖用户新下的订单。 */
export function withMiniCommerceSamples(store: CouponStore): CouponStore {
  const commerceSeed = 'mini-commerce-samples-v1';
  if (store.demoSeeds?.includes(commerceSeed)) return store;
  const orderId = 'ORDER-DEMO-MINI-COMMERCE-001';
  const order = { id: orderId, phone: '13800000001', productId: 'SP009', productName: '曲径通幽推荐版', originalAmount: 128, discountAmount: 0, payAmount: 128, status: '待支付' as const, createdAt: new Date().toLocaleString('sv-SE').replace('T', ' ') };
  return { ...store, orders: [...(store.orders || []), ...((store.orders || []).some((item) => item.id === orderId) ? [] : [order])], demoSeeds: [...(store.demoSeeds || []), commerceSeed] };
}
