export type CouponKind = '特价券' | '满减券' | '折扣券' | '抵扣券' | '体验权益券';
export type CouponTemplateStatus = '启用' | '已停用';
export type CouponStatus = '未领取' | '未生效' | '待使用' | '已使用' | '已使用（退款）' | '已核销' | '已核销（退款）' | '已作废' | '已过期';
export type IssueSource = '定向发放' | '券码兑换' | '扫码领取';
export type ShootingProduct = { id: string; name: string; shootingPoint: string; theme: string; price: number };
export const shootingProducts: ShootingProduct[] = [
  { id: 'SP001', name: '南长街，古韵照壁主题体验', shootingPoint: '南长街', theme: '古韵照壁', price: 59 },
  { id: 'SP002', name: '南长街，白墙黛瓦主题体验', shootingPoint: '南长街', theme: '白墙黛瓦', price: 69 },
  { id: 'SP003', name: '雁荡山，雁荡云端主题体验', shootingPoint: '雁荡山', theme: '雁荡云端', price: 89 },
  { id: 'SP004', name: '雁荡山，飞檐走壁主题体验', shootingPoint: '雁荡山', theme: '飞檐走壁', price: 79 },
  { id: 'SP005', name: '龙门古镇，孙权故里主题体验', shootingPoint: '龙门古镇', theme: '孙权故里', price: 59 },
  { id: 'SP006', name: '藏西有风，拉萨入画主题体验', shootingPoint: '藏西有风', theme: '拉萨入画', price: 99 },
  { id: 'SP007', name: '雁荡山，云端双人拍摄套餐', shootingPoint: '雁荡山', theme: '雁荡云端', price: 128 },
  { id: 'SP008', name: '曲径通幽基础版', shootingPoint: '萧山科创中心', theme: '曲径通幽', price: 89 },
  { id: 'SP009', name: '曲径通幽推荐版', shootingPoint: '萧山科创中心', theme: '曲径通幽', price: 128 },
  { id: 'SP010', name: '曲径通幽至尊版', shootingPoint: '萧山科创中心', theme: '曲径通幽', price: 168 },
];
export const shootingPointOptions = [...new Set(shootingProducts.map((row) => row.shootingPoint))];
export const couponShootingPointOptions = ['全部拍摄点', ...shootingPointOptions];
export const themeOptions = [...new Set(shootingProducts.map((row) => row.theme))];
export const couponKinds: CouponKind[] = ['满减券', '折扣券', '体验权益券'];
export type CouponTemplate = {
  id: string; name: string; kind: CouponKind; benefit: string;
  validityDays: number; availableRange: string[]; shootingPoints: string[];
  productIds: string[]; rightsCount: number; minSpend: number; discountAmount: number; discountRate: number;
  totalLimit: number; perUserLimit: number; sponsor: string; status: CouponTemplateStatus;
  description?: string; remark?: string; createdAt: string; authorizedIssuerIds?: string[];
};
export type CouponIssuer = { id: string; name: string; account: string; organization: string };
export const currentCouponOperatorId = 'current-admin';
export const couponIssuerOptions: CouponIssuer[] = [
  { id: currentCouponOperatorId, name: '系统管理员', account: 'admin', organization: '平台运营中心' },
  { id: 'issuer-wanglin', name: '王琳', account: 'wanglin', organization: '市场运营组' },
  { id: 'issuer-chenjie', name: '陈杰', account: 'chenjie', organization: '景区运营组' },
];
export function authorizedIssuerIds(coupon: CouponTemplate) { return coupon.authorizedIssuerIds ?? [currentCouponOperatorId]; }
export function canCurrentOperatorIssue(coupon: CouponTemplate) { return authorizedIssuerIds(coupon).includes(currentCouponOperatorId); }
export type CouponUseRecord = {
  orderNo: string; shootingPoint: string; theme: string; productId: string; productName: string; usedAt: string;
  orderAmount?: number; discountAmount?: number; payAmount?: number; operator?: string; source?: '后台核销' | '小程序下单';
  couponReturnedAt?: string;
};
export type CouponIssueRecord = {
  id: string; couponId: string; couponName: string; couponKind: CouponKind; benefit: string;
  redeemCode: string; serialNo?: string; source: IssueSource; phone: string; phoneDigits?: string;
  status: CouponStatus; generatedAt: string; issuedAt: string; expiresAt: string; validityDays: number;
  productIds: string[]; shootingPoints: string[]; availableRange: string[];
  minSpend: number; discountAmount: number; discountRate: number;
  totalUses: number; usedTimes: number; usageHistory: CouponUseRecord[];
  orderNo?: string; shootingPoint?: string; batchNo?: string; claimPlanId?: string; lockedOrderId?: string;
};
export type CouponClaimPlan = { id: string; couponId: string; allowedPhones: string[]; createdAt: string; totalLimit?: number; perUserLimit?: number; endsAt?: string; status?: '启用' | '已停用'; operatorId?: string; operatorName?: string };
export type CouponBatch = { id: string; couponId: string; source: '定向发放' | '专属券码'; quantity: number; createdAt: string; operator: string; operatorId?: string; origin?: string };
export type ExperienceAccountRight = { id: string; sourceTicketId: string; couponId: string; couponName: string; phone: string; phoneDigits: string; productIds: string[]; totalUses: number; remainingUses: number; grantedAt: string; operator: string; orderNo?: string; expiresAt?: string; usageHistory?: CouponUseRecord[] };
export type CouponOrder = { id: string; phone: string; productId: string; productName: string; ticketId?: string; rightId?: string; originalAmount: number; discountAmount: number; payAmount: number; status: '待支付' | '待核销' | '待使用' | '已完成' | '已取消' | '已退款' | '部分退款'; createdAt: string; fulfilledAt?: string; refundedAt?: string; refundAmount?: number; couponReturnResult?: string };
export type CouponStore = { version: 3; templates: CouponTemplate[]; tickets: CouponIssueRecord[]; plans: CouponClaimPlan[]; batches?: CouponBatch[]; orders?: CouponOrder[]; accountRights?: ExperienceAccountRight[]; demoSeeds?: string[] };
export function normalizeCouponStore(value: CouponStore): CouponStore {
  const templates = value.templates.map((coupon) => {
    const legacy = coupon as CouponTemplate & { startsAt?: string; endsAt?: string };
    if (Number.isFinite(legacy.validityDays) && legacy.validityDays > 0) return coupon;
    const duration = legacy.startsAt && legacy.endsAt
      ? Math.ceil((new Date(legacy.endsAt.replace(' ', 'T')).getTime() - new Date(legacy.startsAt.replace(' ', 'T')).getTime()) / 86400000)
      : 30;
    const { startsAt: _startsAt, endsAt: _endsAt, ...rest } = legacy;
    return { ...rest, validityDays: Math.max(1, duration) } as CouponTemplate;
  });
  const validityByCoupon = new Map(templates.map((coupon) => [coupon.id, coupon.validityDays]));
  const tickets = value.tickets.map((ticket) => {
    const validityDays = ticket.validityDays || validityByCoupon.get(ticket.couponId) || 30;
    // 已领取券保留原截止时间；未领取的券码领取后再开始计时。
    const issuedAt = ticket.issuedAt || '';
    const { startsAt: _startsAt, ...rest } = ticket as CouponIssueRecord & { startsAt?: string };
    return { ...rest, validityDays, expiresAt: ticket.expiresAt || (issuedAt ? couponExpiryAt(issuedAt, validityDays) : '') };
  });
  const accountRights = (value.accountRights || []).map((right) => {
    const { startsAt: _startsAt, ...rest } = right as ExperienceAccountRight & { startsAt?: string };
    return rest;
  });
  return { ...value, templates, tickets, accountRights };
}
export const couponStoreKey = 'xingying-coupon-demo-v3';
export function couponLocalTime(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}
export function dateTimeOffset(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return couponLocalTime(date); }
export function couponExpiryAt(issuedAt: string, validityDays: number) {
  const date = new Date(issuedAt.replace(' ', 'T'));
  date.setDate(date.getDate() + validityDays);
  return couponLocalTime(date);
}
export function uniqueCouponId(prefix = 'CN') { return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Array.from(crypto.getRandomValues(new Uint32Array(3)), (value) => value.toString(16).padStart(8, '0')).join('').toUpperCase()}`; }
export function maskPhone(phone: string) { return `${phone.slice(0, 3)}****${phone.slice(-4)}`; }
export function parsePhones(value: string) { return value.split(/[\s,，;；]+/).map((row) => row.trim()).filter(Boolean); }
export function phoneListError(phones: string[]) {
  if (!phones.length) return '请输入手机号';
  if (phones.some((phone) => !/^1\d{10}$/.test(phone))) return '手机号须为11位数字，请检查后重试';
  return undefined;
}
export function couponRuleText(coupon: Pick<CouponTemplate, 'kind' | 'minSpend' | 'discountAmount' | 'discountRate' | 'rightsCount'>) {
  if (coupon.kind === '体验权益券') return `指定主题体验 ${coupon.rightsCount} 次`;
  if (coupon.kind === '满减券') return `满 ${coupon.minSpend} 元减 ${coupon.discountAmount} 元`;
  if (coupon.kind === '抵扣券') return `${coupon.minSpend > 0 ? `满 ${coupon.minSpend} 元` : '无门槛'}抵扣 ${coupon.discountAmount} 元`;
  return `${coupon.minSpend > 0 ? `满 ${coupon.minSpend} 元` : '无门槛'}享 ${coupon.discountRate} 折`;
}
export function couponTotalUses(record: CouponIssueRecord) { return record.totalUses; }
export function couponUsedTimes(record: CouponIssueRecord) { return record.usedTimes; }
export function effectiveCouponStatus(record: CouponIssueRecord): CouponStatus {
  if (record.status === '已作废' || record.usedTimes >= record.totalUses) return record.status === '已作废' ? '已作废' : '已使用';
  if (!record.phoneDigits) return '未领取';
  if (!record.expiresAt) return '未领取';
  if (Date.now() > new Date(record.expiresAt.replace(' ', 'T')).getTime()) return '已过期';
  return '待使用';
}
export function canVoidTicket(record: CouponIssueRecord) { return record.status !== '已作废' && record.usedTimes < record.totalUses; }
export function couponQuotaUsed(coupon: CouponTemplate, tickets: CouponIssueRecord[]) { return tickets.filter((row) => row.couponId === coupon.id && (coupon.kind !== '体验权益券' || Boolean(row.phoneDigits) || row.status === '已作废')).length; }
export function remainingQuota(coupon: CouponTemplate, tickets: CouponIssueRecord[]) { return Math.max(0, coupon.totalLimit - couponQuotaUsed(coupon, tickets)); }
export function couponTemplateStatus(coupon: CouponTemplate, tickets: CouponIssueRecord[]) { return remainingQuota(coupon, tickets) === 0 ? '已结束' : coupon.status === '已停用' ? '已暂停' : '发放中'; }
export function canIssueCoupon(coupon: CouponTemplate, tickets: CouponIssueRecord[]) { return coupon.status !== '已停用' && remainingQuota(coupon, tickets) > 0; }
// 保留旧调用签名以兼容本地演示数据，不再按用户限制领取数量。
export function receiveLimitError(_coupon: CouponTemplate, _phone: string, _tickets: CouponIssueRecord[]): string | undefined { return undefined; }
export function createTicket(coupon: CouponTemplate, source: IssueSource, phone?: string): CouponIssueRecord {
  const code = uniqueCouponId();
  const issuedAt = phone ? couponLocalTime() : '';
  return { id: code, couponId: coupon.id, couponName: coupon.name, couponKind: coupon.kind, benefit: coupon.benefit, redeemCode: code,
    source, phone: phone ? maskPhone(phone) : '', phoneDigits: phone, status: phone ? '待使用' : '未领取', generatedAt: couponLocalTime(), issuedAt,
    expiresAt: issuedAt ? couponExpiryAt(issuedAt, coupon.validityDays) : '', validityDays: coupon.validityDays, productIds: [...coupon.productIds], shootingPoints: [...coupon.shootingPoints], availableRange: [...coupon.availableRange],
    minSpend: coupon.minSpend, discountAmount: coupon.discountAmount, discountRate: coupon.discountRate, totalUses: coupon.kind === '体验权益券' ? coupon.rightsCount : 1, usedTimes: 0, usageHistory: [] };
}
export function ticketProducts(ticket: Pick<CouponIssueRecord, 'productIds' | 'shootingPoints' | 'availableRange'>) {
  return shootingProducts.filter((row) => (!ticket.productIds.length || ticket.productIds.includes(row.id))
    && (ticket.shootingPoints.includes('全部拍摄点') || ticket.shootingPoints.includes(row.shootingPoint))
    && (ticket.availableRange.includes('全部可用') || ticket.availableRange.includes(row.theme)));
}
export function priceDiscount(ticket: CouponIssueRecord, amount: number) {
  return Math.round(Math.min(amount, ['满减券', '抵扣券'].includes(ticket.couponKind) ? ticket.discountAmount : amount * (1 - ticket.discountRate / 10)) * 100) / 100;
}
export function validateTicketUse(ticket: CouponIssueRecord, values: { orderNo: string; productId: string; orderAmount?: number }, allTickets: CouponIssueRecord[]) {
  const status = effectiveCouponStatus(ticket);
  if (['已作废', '已使用', '已使用（退款）', '已过期', '未生效'].includes(status)) return `该券${status}，不能使用`;
  if (!ticketProducts(ticket).some((row) => row.id === values.productId)) return '该商品/主题不在券的适用范围内';
  if (!values.orderNo.trim()) return '请输入订单号';
  if (allTickets.some((row) => row.usageHistory.some((use) => use.orderNo === values.orderNo.trim()))) return '该订单已使用优惠券，不能重复使用';
  if (ticket.couponKind !== '体验权益券' && (values.orderAmount === undefined || !Number.isFinite(values.orderAmount) || values.orderAmount < ticket.minSpend || values.orderAmount <= 0)) return `订单金额须大于0且满足满 ${ticket.minSpend} 元的使用条件`;
  return undefined;
}
const defaultCoupon = { validityDays: 30, totalLimit: 100, perUserLimit: 2, sponsor: '平台', status: '启用' as const, createdAt: dateTimeOffset(-6), authorizedIssuerIds: [currentCouponOperatorId], minSpend: 0, discountAmount: 0, discountRate: 10, rightsCount: 1, productIds: [] as string[], availableRange: ['全部可用'], shootingPoints: ['全部拍摄点'] };
export const initialCouponTemplates: CouponTemplate[] = [
  { ...defaultCoupon, id: 'CP-EXPERIENCE', name: '指定主题兑换券', kind: '体验权益券', rightsCount: 1, productIds: ['SP001', 'SP002'], availableRange: ['古韵照壁', '白墙黛瓦'], shootingPoints: ['南长街'], benefit: '指定主题体验 1 次' },
  { ...defaultCoupon, id: 'CP-DISCOUNT', name: '拍摄满100元享8折', kind: '折扣券', minSpend: 100, discountRate: 8, benefit: '满 100 元享 8 折' },
  { ...defaultCoupon, id: 'CP-REDUCTION', name: '拍摄满100减20', kind: '满减券', minSpend: 100, discountAmount: 20, benefit: '满 100 元减 20 元' },
];
const samplePartial = createTicket(initialCouponTemplates[0], '定向发放', '13800000001');
samplePartial.id = samplePartial.redeemCode = 'CN-DEMO-EXPERIENCE-001';
samplePartial.serialNo = 'TY-000001';
samplePartial.usedTimes = 0;
samplePartial.usageHistory = [];
const sampleCode = createTicket(initialCouponTemplates[0], '券码兑换');
sampleCode.id = sampleCode.redeemCode = 'CN-DEMO-EXPERIENCE-002';
sampleCode.serialNo = 'TY-000002';
const sampleDiscount = createTicket(initialCouponTemplates[1], '定向发放', '13800000002');
sampleDiscount.id = sampleDiscount.redeemCode = 'CN-DEMO-DISCOUNT-001';
const sampleReduction = createTicket(initialCouponTemplates[2], '定向发放', '13800000003');
sampleReduction.id = sampleReduction.redeemCode = 'CN-DEMO-REDUCTION-001';
const sampleExchanged = createTicket(initialCouponTemplates[0], '定向发放', '13800000004');
sampleExchanged.id = sampleExchanged.redeemCode = 'CN-DEMO-EXPERIENCE-003';
sampleExchanged.serialNo = 'TY-000003';
sampleExchanged.usedTimes = sampleExchanged.totalUses;
sampleExchanged.status = '已使用';
export const initialIssueRecords = [samplePartial, sampleCode, sampleDiscount, sampleReduction, sampleExchanged];
export const initialCouponStore: CouponStore = {
  version: 3, templates: initialCouponTemplates, tickets: initialIssueRecords, plans: [], batches: [], orders: [],
  accountRights: [{ id: 'RIGHT-DEMO-001', sourceTicketId: sampleExchanged.id, couponId: sampleExchanged.couponId, couponName: sampleExchanged.couponName, phone: sampleExchanged.phone, phoneDigits: sampleExchanged.phoneDigits!, productIds: [...sampleExchanged.productIds], totalUses: 1, remainingUses: 0, grantedAt: dateTimeOffset(-2), operator: '系统管理员', usageHistory: [{ orderNo: 'DEMO-ORDER-RIGHT-001', shootingPoint: '南长街', theme: '古韵照壁', productId: 'SP001', productName: shootingProducts[0].name, usedAt: dateTimeOffset(-1), orderAmount: shootingProducts[0].price, discountAmount: shootingProducts[0].price, payAmount: 0, operator: '用户下单', source: '小程序下单' }] }],
};
