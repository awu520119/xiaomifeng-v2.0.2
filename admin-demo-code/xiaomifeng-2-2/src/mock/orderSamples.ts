import type { CouponOrder, CouponStore } from './coupons';
import { dateTimeOffset, shootingProducts } from './coupons';

const seedId = 'order-management-samples-v1';

export function withOrderSamples(store: CouponStore): CouponStore {
  if (store.demoSeeds?.includes(seedId)) return store;
  const findTicket = (id: string) => store.tickets.find((ticket) => ticket.id === id);
  const findRightByTicket = (ticketId: string) => (store.accountRights || []).find((right) => right.sourceTicketId === ticketId);
  const product = (id: string) => shootingProducts.find((item) => item.id === id)!;
  const discountTicket = findTicket('CN-DEMO-DISCOUNT-001');
  const reductionTicket = findTicket('CN-DEMO-REDUCTION-001');
  const experienceTicket = findTicket('CN-DEMO-EXPERIENCE-001');
  const yandangCredited = findRightByTicket('CN-DEMO-YANDANG-003');
  const yandangPartial = findRightByTicket('CN-DEMO-YANDANG-004');
  const p1 = product('SP003');
  const p2 = product('SP002');
  const p3 = product('SP006');
  const orders: CouponOrder[] = [
    { id: 'ORDER-DEMO-PRICE-001', phone: discountTicket?.phoneDigits || '13800000002', productId: p1.id, productName: p1.name, ticketId: discountTicket?.id, originalAmount: p1.price, discountAmount: 12, payAmount: p1.price - 12, status: '已完成', createdAt: dateTimeOffset(-5), fulfilledAt: dateTimeOffset(-4) },
    { id: 'ORDER-DEMO-PRICE-002', phone: reductionTicket?.phoneDigits || '13800000003', productId: p3.id, productName: p3.name, ticketId: reductionTicket?.id, originalAmount: 120, discountAmount: 20, payAmount: 100, status: '已退款', createdAt: dateTimeOffset(-4), refundedAt: dateTimeOffset(-3), refundAmount: 100, couponReturnResult: '原价格券已返还，可继续使用' },
    { id: 'ORDER-DEMO-NONE-001', phone: '13800000030', productId: p2.id, productName: p2.name, originalAmount: p2.price, discountAmount: 0, payAmount: p2.price, status: '待支付', createdAt: dateTimeOffset(-1) },
    { id: 'ORDER-DEMO-RIGHT-001', phone: yandangCredited?.phoneDigits || '13800000023', productId: p1.id, productName: p1.name, rightId: yandangCredited?.id, originalAmount: p1.price, discountAmount: p1.price, payAmount: 0, status: '待使用', createdAt: dateTimeOffset(-2) },
    { id: 'ORDER-DEMO-RIGHT-002', phone: yandangPartial?.phoneDigits || '13800000024', productId: p1.id, productName: p1.name, rightId: yandangPartial?.id, originalAmount: p1.price, discountAmount: p1.price, payAmount: 0, status: '已完成', createdAt: dateTimeOffset(-6), fulfilledAt: dateTimeOffset(-5) },
    { id: 'ORDER-DEMO-EXPERIENCE-001', phone: experienceTicket?.phoneDigits || '13800000001', productId: p2.id, productName: p2.name, ticketId: experienceTicket?.id, originalAmount: p2.price, discountAmount: p2.price, payAmount: 0, status: '已完成', createdAt: dateTimeOffset(-3), fulfilledAt: dateTimeOffset(-2) },
  ];
  return { ...store, demoSeeds: [...(store.demoSeeds || []), seedId], orders: [...orders, ...(store.orders || [])] };
}
