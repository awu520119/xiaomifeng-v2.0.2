import type { CouponStore, CouponTemplate, ExperienceAccountRight, IssueSource } from './coupons';
import { couponExpiryAt, couponLocalTime, createTicket, dateTimeOffset, shootingProducts } from './coupons';

const seedId = 'experience-issue-examples-v1';
const couponId = 'CP-DEMO-YANDANG-EXPERIENCE';

// Add demo records once, including when opening an existing local prototype store.
// Keep all subsequent operator changes to these records on future reloads.
export function withExperienceIssueSamples(store: CouponStore): CouponStore {
  if (store.demoSeeds?.includes(seedId)) return store;
  const demoSeeds = [...(store.demoSeeds || []), seedId];
  if (store.templates.some((coupon) => coupon.id === couponId)) return { ...store, demoSeeds };

  const coupon: CouponTemplate = {
    id: couponId, name: '雁荡山活动体验券', kind: '体验权益券', benefit: '指定主题体验 1 次',
    validityDays: 30, createdAt: dateTimeOffset(-8),
    productIds: ['SP003', 'SP004'], shootingPoints: ['雁荡山'], availableRange: ['雁荡云端', '飞檐走壁'],
    rightsCount: 1, totalLimit: 12, perUserLimit: 1, minSpend: 0, discountAmount: 0, discountRate: 10,
    sponsor: '平台', status: '启用', description: '景区活动体验券示例，确认后将一次体验权益发到账户。',
  };
  const scenarios: Array<{ source: IssueSource; phone: string; state: 'pending' | 'credited' | 'used' | 'void' }> = [
    { source: '定向发放', phone: '13800000021', state: 'pending' },
    { source: '券码兑换', phone: '13800000022', state: 'pending' },
    { source: '定向发放', phone: '13800000023', state: 'credited' },
    { source: '定向发放', phone: '13800000024', state: 'used' },
    { source: '券码兑换', phone: '13800000025', state: 'void' },
  ];
  const rights: ExperienceAccountRight[] = [];
  const tickets = scenarios.map((scenario, index) => {
    const ticket = createTicket(coupon, scenario.source, scenario.phone);
    ticket.id = ticket.redeemCode = `CN-DEMO-YANDANG-${String(index + 1).padStart(3, '0')}`;
    ticket.generatedAt = coupon.createdAt;
    ticket.issuedAt = couponLocalTime(new Date(Date.now() - (scenario.source === '定向发放' ? 72 : 72 - index) * 3600000));
    ticket.expiresAt = couponExpiryAt(ticket.issuedAt, ticket.validityDays);
    if (scenario.source === '定向发放') ticket.batchNo = 'DI-DEMO-YANDANG';
    if (scenario.state === 'void') ticket.status = '已作废';
    if (['credited', 'used'].includes(scenario.state)) {
      const used = scenario.state === 'used' ? 1 : 0;
      ticket.usedTimes = used;
      if (used) ticket.status = '已使用';
      rights.push({
        id: `RIGHT-DEMO-YANDANG-${index + 1}`, sourceTicketId: ticket.id, couponId,
        couponName: coupon.name, phone: ticket.phone, phoneDigits: scenario.phone,
        productIds: [...coupon.productIds], totalUses: 1, remainingUses: 1 - used,
        expiresAt: ticket.expiresAt, grantedAt: dateTimeOffset(-2), operator: '景区运营员',
        usageHistory: Array.from({ length: used }, (_, useIndex) => {
          const product = shootingProducts[useIndex + 2];
          return { orderNo: `DEMO-YANDANG-ORDER-${index + 1}-${useIndex + 1}`, productId: product.id, productName: product.name, theme: product.theme, shootingPoint: product.shootingPoint, usedAt: dateTimeOffset(-1), orderAmount: product.price, discountAmount: product.price, payAmount: 0, operator: '景区运营员', source: '小程序下单' as const };
        }),
      });
    }
    return ticket;
  });
  return {
    ...store, demoSeeds, templates: [coupon, ...store.templates], tickets: [...tickets, ...store.tickets],
    accountRights: [...rights, ...(store.accountRights || [])],
    orders: [...rights.flatMap((right) => (right.usageHistory || []).map((use) => ({
      id: use.orderNo, phone: right.phoneDigits, productId: use.productId, productName: use.productName,
      rightId: right.id, originalAmount: use.orderAmount!, discountAmount: use.discountAmount!, payAmount: 0,
      status: '已完成' as const, createdAt: use.usedAt, fulfilledAt: use.usedAt,
    }))), ...(store.orders || [])],
    batches: [{ id: 'DI-DEMO-YANDANG', couponId, source: '定向发放', quantity: 3, createdAt: tickets[0].issuedAt, operator: '景区运营员' }, ...(store.batches || [])],
  };
}
