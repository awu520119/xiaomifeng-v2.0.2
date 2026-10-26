import type { CouponStore } from './coupons';
import { createTicket } from './coupons';

const seedId = 'mini-coupon-review-v6';

/** 满减券、折扣券和体验券落在同一演示账号，便于展示券包与结算。 */
export function withMiniProgramSamples(store: CouponStore): CouponStore {
  if (store.demoSeeds?.includes(seedId)) return store;
  const phone = '13800000001';
  const templates = store.templates.map((item) => item.id === 'CP-EXPERIENCE' ? { ...item, name: '指定主题兑换券', rightsCount: 1, benefit: '指定主题体验 1 次' } : item);
  const oldMiniTicketIds = new Set([
    'CN-DEMO-MINI-REDUCTION',
    'CN-DEMO-MINI-DISCOUNT',
    'CN-DEMO-MINI-EXPIRED-REDUCTION',
    'CN-DEMO-MINI-EXPIRED-DISCOUNT',
    'CN-DEMO-MINI-EXPIRED-EXPERIENCE',
    'CN-DEMO-MINI-VOID-REDUCTION',
  ]);
  const existingTickets = store.tickets.filter((item) => !oldMiniTicketIds.has(item.id)).map((item) => item.id === 'CN-DEMO-EXPERIENCE-001' ? { ...item, couponName: '指定主题兑换券', benefit: '指定主题体验 1 次', totalUses: 1, usedTimes: 0, status: '待使用' as const, usageHistory: [] } : item);
  const accountRights = (store.accountRights || []).map((right) => right.sourceTicketId === 'CN-DEMO-EXPERIENCE-001' ? { ...right, couponName: '指定主题兑换券', totalUses: 1, remainingUses: 1, usageHistory: [] } : right);
  const priceTemplates = templates.filter((item) => ['满减券', '折扣券'].includes(item.kind));
  const tickets = priceTemplates.map((coupon) => {
    const ticket = createTicket(coupon, '定向发放', phone);
    ticket.id = ticket.redeemCode = `CN-DEMO-MINI-${coupon.kind === '满减券' ? 'REDUCTION' : 'DISCOUNT'}`;
    if (coupon.kind === '折扣券') {
      ticket.minSpend = 100;
      ticket.benefit = '满 100 元享 8 折';
    }
    return ticket;
  }).filter((ticket) => !existingTickets.some((row) => row.id === ticket.id));
  const expiredAt = '2026-10-01 23:59:59';
  const expiredIssuedAt = '2026-09-01 10:00:00';
  const expiredTickets = [
    { coupon: priceTemplates.find((item) => item.kind === '满减券')!, id: 'CN-DEMO-MINI-EXPIRED-REDUCTION' },
    { coupon: priceTemplates.find((item) => item.kind === '折扣券')!, id: 'CN-DEMO-MINI-EXPIRED-DISCOUNT' },
    { coupon: templates.find((item) => item.kind === '体验权益券')!, id: 'CN-DEMO-MINI-EXPIRED-EXPERIENCE' },
  ].map(({ coupon, id }) => {
    const ticket = createTicket(coupon, '定向发放', phone);
    return { ...ticket, id, redeemCode: id, issuedAt: expiredIssuedAt, expiresAt: expiredAt, status: '已过期' as const };
  });
  const voidCoupon = priceTemplates.find((item) => item.kind === '满减券')!;
  const voidTicket = createTicket(voidCoupon, '定向发放', phone);
  const voidTicketMock = { ...voidTicket, id: 'CN-DEMO-MINI-VOID-REDUCTION', redeemCode: 'CN-DEMO-MINI-VOID-REDUCTION', issuedAt: '2026-09-15 10:00:00', expiresAt: '2026-10-15 23:59:59', status: '已作废' as const };
  return { ...store, templates, tickets: [voidTicketMock, ...expiredTickets, ...tickets, ...existingTickets], accountRights, demoSeeds: [...(store.demoSeeds || []), seedId] };
}

/** 现有小程序商品与订单详情的独立演示数据，不覆盖用户新下的订单。 */
export function withMiniCommerceSamples(store: CouponStore): CouponStore {
  const commerceSeed = 'mini-commerce-samples-v3';
  if (store.demoSeeds?.includes(commerceSeed)) return store;
  const orderId = 'ORDER-DEMO-MINI-COMMERCE-001';
  const phone = '13800000001';
  const demoTicket = store.tickets.find((item) => item.id === 'CN-DEMO-MINI-REDUCTION' && item.phoneDigits === phone);
  const order = { id: orderId, phone, productId: 'SP009', productName: '曲径通幽推荐版', ticketId: demoTicket?.id, originalAmount: 128, discountAmount: demoTicket ? 20 : 0, payAmount: demoTicket ? 108 : 128, status: '待支付' as const, createdAt: new Date().toLocaleString('sv-SE').replace('T', ' ') };
  const tickets = demoTicket
    ? store.tickets.map((item) => item.id === demoTicket.id ? { ...item, lockedOrderId: orderId, status: '待使用' as const, usedTimes: 0, usageHistory: [] } : item)
    : store.tickets;
  const orders = (store.orders || []).filter((item) => item.id !== orderId);
  const demoSeeds = (store.demoSeeds || []).filter((seed) => !['mini-commerce-samples-v1', 'mini-commerce-samples-v2'].includes(seed));
  return { ...store, orders: [order, ...orders], tickets, demoSeeds: [...demoSeeds, commerceSeed] };
}
