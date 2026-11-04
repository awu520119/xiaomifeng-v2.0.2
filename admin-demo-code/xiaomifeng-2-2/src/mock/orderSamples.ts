import type { CouponOrder, CouponStore } from './coupons';
import type { TicketMediaVersion } from './coupons';
import { dateTimeOffset, shootingProducts } from './coupons';

const seedId = 'order-management-samples-v1';
const ticketSeedId = 'order-management-ticket-sample-v1';
const completedTicketSeedId = 'order-management-completed-ticket-sample-v1';
const unstartedTicketSeedId = 'order-management-unstarted-ticket-sample-v1';
const partialTicketVersions: TicketMediaVersion[] = [{ version: '第 1 版', generatedAt: '2026-11-01 10:45:00', completedPoints: ['烟雨画桥'], template: '云上环绕模板', mediaCounts: { smartHorizontal: 1, smartVertical: 1, photos: 3, rawVideos: 1 } }];
const completedTicketVersions: TicketMediaVersion[] = [
  { version: '第 1 版', generatedAt: '2026-10-24 14:32:10', completedPoints: ['烟雨画桥'], template: '云上环绕模板', mediaCounts: { smartHorizontal: 1, smartVertical: 1, photos: 3, rawVideos: 1 } },
  { version: '第 2 版', generatedAt: '2026-10-24 15:28:50', completedPoints: ['烟雨画桥', '云顶观景台'], template: '电影感拉升模板', mediaCounts: { smartHorizontal: 1, smartVertical: 1, photos: 6, rawVideos: 3 } },
];

export function withOrderSamples(store: CouponStore): CouponStore {
  const hasOrderSamples = store.demoSeeds?.includes(seedId);
  const hasTicketSample = store.demoSeeds?.includes(ticketSeedId);
  const hasCompletedTicketSample = store.demoSeeds?.includes(completedTicketSeedId);
  const hasUnstartedTicketSample = store.demoSeeds?.includes(unstartedTicketSeedId);
  const needsTicketMediaMigration = (store.orders || []).some((order) => ['20261031185001492792', '20261024121500731589'].includes(order.id) && order.ticketSnapshot && !order.ticketSnapshot.mediaVersions);
  const patchedOrders = needsTicketMediaMigration ? (store.orders || []).map((order) => {
    if (!order.ticketSnapshot || order.ticketSnapshot.mediaVersions) return order;
    if (order.id === '20261031185001492792') return { ...order, ticketSnapshot: { ...order.ticketSnapshot, mediaCounts: order.ticketSnapshot.mediaCounts || partialTicketVersions.at(-1)?.mediaCounts, mediaVersions: partialTicketVersions } };
    if (order.id === '20261024121500731589') return { ...order, ticketSnapshot: { ...order.ticketSnapshot, mediaCounts: order.ticketSnapshot.mediaCounts || completedTicketVersions.at(-1)?.mediaCounts, mediaVersions: completedTicketVersions } };
    return order;
  }) : store.orders || [];
  if (hasOrderSamples && hasTicketSample && hasCompletedTicketSample && hasUnstartedTicketSample) return needsTicketMediaMigration ? { ...store, orders: patchedOrders } : store;
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
  const orders: CouponOrder[] = hasOrderSamples ? [] : [
    { id: 'ORDER-DEMO-PRICE-001', phone: discountTicket?.phoneDigits || '13800000002', productId: p1.id, productName: p1.name, ticketId: discountTicket?.id, originalAmount: p1.price, discountAmount: 12, payAmount: p1.price - 12, status: '已完成', createdAt: dateTimeOffset(-5), fulfilledAt: dateTimeOffset(-4) },
    { id: 'ORDER-DEMO-PRICE-002', phone: reductionTicket?.phoneDigits || '13800000003', productId: p3.id, productName: p3.name, ticketId: reductionTicket?.id, originalAmount: 120, discountAmount: 20, payAmount: 100, status: '已退款', createdAt: dateTimeOffset(-4), refundedAt: dateTimeOffset(-3), refundAmount: 100, couponReturnResult: '原价格券已返还，可继续使用' },
    { id: 'ORDER-DEMO-NONE-001', phone: '13800000030', productId: p2.id, productName: p2.name, originalAmount: p2.price, discountAmount: 0, payAmount: p2.price, status: '待支付', createdAt: dateTimeOffset(-1) },
    { id: 'ORDER-DEMO-RIGHT-001', phone: yandangCredited?.phoneDigits || '13800000023', productId: p1.id, productName: p1.name, rightId: yandangCredited?.id, originalAmount: p1.price, discountAmount: p1.price, payAmount: 0, status: '待使用', createdAt: dateTimeOffset(-2) },
    { id: 'ORDER-DEMO-RIGHT-002', phone: yandangPartial?.phoneDigits || '13800000024', productId: p1.id, productName: p1.name, rightId: yandangPartial?.id, originalAmount: p1.price, discountAmount: p1.price, payAmount: 0, status: '已完成', createdAt: dateTimeOffset(-6), fulfilledAt: dateTimeOffset(-5) },
    { id: 'ORDER-DEMO-EXPERIENCE-001', phone: experienceTicket?.phoneDigits || '13800000001', productId: p2.id, productName: p2.name, ticketId: experienceTicket?.id, originalAmount: p2.price, discountAmount: p2.price, payAmount: 0, status: '已完成', createdAt: dateTimeOffset(-3), fulfilledAt: dateTimeOffset(-2) },
  ];
  const ticketOrder: CouponOrder = {
    id: '20261031185001492792', phone: '15900008612', productId: 'TICKET-CLOUD-LAKE-002',
    productName: '云湖双点旅拍套票', originalAmount: 129, discountAmount: 30, payAmount: 99,
    status: '待使用', createdAt: '2026-10-31 18:50:02',
    ticketSnapshot: {
      scenicName: '云湖景区',
      points: [
        { name: '烟雨画桥', route: '画桥穿越航线', effect: '桥面穿越', status: '已完成', completedAt: '2026-11-01 10:32:18', taskId: 'FT-20261101-001', taskIds: ['FT-20261101-000', 'FT-20261101-001'] },
        { name: '云顶观景台', route: '观景台拉升航线', effect: '观景台拉升', status: '待拍摄', taskId: '—' },
      ],
      delivery: ['智能精剪', '精选照片集', '高光照片'], orientations: ['横屏', '竖屏'],
      templatesByCompletedPoints: { '1': '云上环绕模板', '2': '电影感拉升模板' },
      mediaVersions: partialTicketVersions,
    },
  };
  const completedTicketOrder: CouponOrder = {
    id: '20261024121500731589', phone: '13700004328', productId: 'TICKET-CLOUD-LAKE-002',
    productName: '云湖双点旅拍套票', originalAmount: 129, discountAmount: 30, payAmount: 99,
    status: '已完成', createdAt: '2026-10-24 12:15:00', fulfilledAt: '2026-10-24 15:42:36',
    ticketSnapshot: {
      scenicName: '云湖景区',
      points: [
        { name: '烟雨画桥', route: '画桥穿越航线', effect: '桥面穿越', status: '已完成', completedAt: '2026-10-24 14:18:22', taskId: 'FT-20261024-017' },
        { name: '云顶观景台', route: '观景台拉升航线', effect: '观景台拉升', status: '已完成', completedAt: '2026-10-24 15:06:41', taskId: 'FT-20261024-021' },
      ],
      delivery: ['智能精剪', '精选照片集', '高光照片'], orientations: ['横屏', '竖屏'],
      templatesByCompletedPoints: { '1': '云上环绕模板', '2': '电影感拉升模板' },
      mediaCounts: completedTicketVersions.at(-1)?.mediaCounts,
      mediaVersions: completedTicketVersions,
    },
  };
  const unstartedTicketOrder: CouponOrder = {
    id: '20261029113000486217', phone: '13600002174', productId: 'TICKET-CLOUD-LAKE-002',
    productName: '云湖双点旅拍套票', originalAmount: 129, discountAmount: 30, payAmount: 99,
    status: '待使用', createdAt: '2026-10-29 11:30:00',
    ticketSnapshot: {
      scenicName: '云湖景区',
      points: [
        { name: '烟雨画桥', route: '画桥穿越航线', effect: '桥面穿越', status: '待拍摄' },
        { name: '云顶观景台', route: '观景台拉升航线', effect: '观景台拉升', status: '待拍摄' },
      ],
      delivery: ['智能精剪', '精选照片集', '高光照片'], orientations: ['横屏', '竖屏'],
      templatesByCompletedPoints: { '1': '云上环绕模板', '2': '电影感拉升模板' },
    },
  };
  return {
    ...store,
    demoSeeds: [...new Set([...(store.demoSeeds || []), ...(!hasOrderSamples ? [seedId] : []), ...(!hasTicketSample ? [ticketSeedId] : []), ...(!hasCompletedTicketSample ? [completedTicketSeedId] : []), ...(!hasUnstartedTicketSample ? [unstartedTicketSeedId] : [])])],
    orders: [...(!hasUnstartedTicketSample ? [unstartedTicketOrder] : []), ...(!hasCompletedTicketSample ? [completedTicketOrder] : []), ...(!hasTicketSample ? [ticketOrder] : []), ...orders, ...patchedOrders],
  };
}
