export type CouponKind = '特价券' | '满减券' | '折扣券' | '抵扣券' | '体验权益券';
export type CouponTemplateStatus = '启用' | '已停用';
export type CouponStatus = '未领取' | '未生效' | '待使用' | '已核销' | '已作废' | '已过期';
export type IssueSource = '定向发放' | '券码兑换' | '扫码领取';
export type ShootingProduct = { id: string; name: string; shootingPoint: string; theme: string; price: number };
export const shootingProducts: ShootingProduct[] = [
  { id: 'SP001', name: '南长街 · 古韵照壁主题体验', shootingPoint: '南长街', theme: '古韵照壁', price: 59 },
  { id: 'SP002', name: '南长街 · 白墙黛瓦主题体验', shootingPoint: '南长街', theme: '白墙黛瓦', price: 69 },
  { id: 'SP003', name: '雁荡山 · 雁荡云端主题体验', shootingPoint: '雁荡山', theme: '雁荡云端', price: 89 },
  { id: 'SP004', name: '雁荡山 · 飞檐走壁主题体验', shootingPoint: '雁荡山', theme: '飞檐走壁', price: 79 },
  { id: 'SP005', name: '龙门古镇 · 孙权故里主题体验', shootingPoint: '龙门古镇', theme: '孙权故里', price: 59 },
  { id: 'SP006', name: '藏西有风 · 拉萨入画主题体验', shootingPoint: '藏西有风', theme: '拉萨入画', price: 99 },
];
export const shootingPointOptions = [...new Set(shootingProducts.map((row) => row.shootingPoint))];
export const themeOptions = [...new Set(shootingProducts.map((row) => row.theme))];
export const couponKinds: CouponKind[] = ['满减券', '折扣券', '体验权益券'];
export type CouponTemplate = {
  id: string; name: string; kind: CouponKind; benefit: string;
  startsAt: string; endsAt: string; availableRange: string[]; shootingPoints: string[];
  productIds: string[]; rightsCount: number; minSpend: number; discountAmount: number; discountRate: number;
  totalLimit: number; perUserLimit: number; sponsor: string; status: CouponTemplateStatus;
  description?: string; remark?: string; createdAt: string;
};
export type CouponUseRecord = {
  orderNo: string; shootingPoint: string; theme: string; productId: string; productName: string; usedAt: string;
  orderAmount?: number; discountAmount?: number; payAmount?: number;
};
export type CouponIssueRecord = {
  id: string; couponId: string; couponName: string; couponKind: CouponKind; benefit: string;
  redeemCode: string; source: IssueSource; phone: string; phoneDigits?: string;
  status: CouponStatus; generatedAt: string; issuedAt: string; startsAt: string; expiresAt: string;
  productIds: string[]; shootingPoints: string[]; availableRange: string[];
  minSpend: number; discountAmount: number; discountRate: number;
  totalUses: number; usedTimes: number; usageHistory: CouponUseRecord[];
  orderNo?: string; shootingPoint?: string; batchNo?: string; claimPlanId?: string;
};
export type CouponClaimPlan = { id: string; couponId: string; allowedPhones: string[]; createdAt: string };
export type CouponStore = { version: 3; templates: CouponTemplate[]; tickets: CouponIssueRecord[]; plans: CouponClaimPlan[] };
export const couponStoreKey = 'xingying-coupon-demo-v3';
export function couponLocalTime(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}
export function dateTimeOffset(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return couponLocalTime(date); }
export function uniqueCouponId(prefix = 'CN') { return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Array.from(crypto.getRandomValues(new Uint32Array(3)), (value) => value.toString(16).padStart(8, '0')).join('').toUpperCase()}`; }
export function maskPhone(phone: string) { return `${phone.slice(0, 3)}****${phone.slice(-4)}`; }
export function parsePhones(value: string) { return value.split(/[\s,，;；]+/).map((row) => row.trim()).filter(Boolean); }
export function phoneListError(phones: string[]) {
  if (!phones.length) return '请输入手机号';
  if (phones.some((phone) => !/^1\d{10}$/.test(phone))) return '手机号须为11位数字，请检查后重试';
  if (new Set(phones).size !== phones.length) return '有重复手机号，请去重后重试';
  return undefined;
}
export function couponRuleText(coupon: Pick<CouponTemplate, 'kind' | 'minSpend' | 'discountAmount' | 'discountRate' | 'rightsCount'>) {
  if (coupon.kind === '体验权益券') return `指定主题体验 ${coupon.rightsCount} 次`;
  if (coupon.kind === '满减券') return `满 ${coupon.minSpend} 元减 ${coupon.discountAmount} 元`;
  return `${coupon.minSpend > 0 ? `满 ${coupon.minSpend} 元` : '无门槛'}享 ${coupon.discountRate} 折`;
}
export function couponTotalUses(record: CouponIssueRecord) { return record.totalUses; }
export function couponUsedTimes(record: CouponIssueRecord) { return record.usedTimes; }
export function effectiveCouponStatus(record: CouponIssueRecord): CouponStatus {
  if (record.status === '已作废' || record.usedTimes >= record.totalUses) return record.status === '已作废' ? '已作废' : '已核销';
  if (Date.now() > new Date(record.expiresAt.replace(' ', 'T')).getTime()) return '已过期';
  if (Date.now() < new Date(record.startsAt.replace(' ', 'T')).getTime()) return '未生效';
  return record.phoneDigits ? '待使用' : '未领取';
}
export function canVoidTicket(record: CouponIssueRecord) { return record.status !== '已作废' && record.usedTimes < record.totalUses; }
export function couponQuotaUsed(coupon: CouponTemplate, tickets: CouponIssueRecord[]) { return tickets.filter((row) => row.couponId === coupon.id).length; }
export function remainingQuota(coupon: CouponTemplate, tickets: CouponIssueRecord[]) { return Math.max(0, coupon.totalLimit - couponQuotaUsed(coupon, tickets)); }
export function canIssueCoupon(coupon: CouponTemplate, tickets: CouponIssueRecord[]) { return coupon.status !== '已停用' && Date.now() <= new Date(coupon.endsAt.replace(' ', 'T')).getTime() && remainingQuota(coupon, tickets) > 0; }
export function receiveLimitError(coupon: CouponTemplate, phone: string, tickets: CouponIssueRecord[]) {
  return tickets.filter((row) => row.couponId === coupon.id && row.phoneDigits === phone).length >= coupon.perUserLimit ? `该用户已达到每人 ${coupon.perUserLimit} 张的限领上限` : undefined;
}
export function createTicket(coupon: CouponTemplate, source: IssueSource, phone?: string): CouponIssueRecord {
  const code = uniqueCouponId();
  return { id: code, couponId: coupon.id, couponName: coupon.name, couponKind: coupon.kind, benefit: coupon.benefit, redeemCode: code,
    source, phone: phone ? maskPhone(phone) : '', phoneDigits: phone, status: phone ? '待使用' : '未领取', generatedAt: couponLocalTime(), issuedAt: phone ? couponLocalTime() : '',
    startsAt: coupon.startsAt, expiresAt: coupon.endsAt, productIds: [...coupon.productIds], shootingPoints: [...coupon.shootingPoints], availableRange: [...coupon.availableRange],
    minSpend: coupon.minSpend, discountAmount: coupon.discountAmount, discountRate: coupon.discountRate, totalUses: coupon.kind === '体验权益券' ? coupon.rightsCount : 1, usedTimes: 0, usageHistory: [] };
}
export function ticketProducts(ticket: Pick<CouponIssueRecord, 'productIds' | 'shootingPoints' | 'availableRange'>) {
  return shootingProducts.filter((row) => (!ticket.productIds.length || ticket.productIds.includes(row.id))
    && (ticket.shootingPoints.includes('全部拍摄点') || ticket.shootingPoints.includes(row.shootingPoint))
    && (ticket.availableRange.includes('全部可用') || ticket.availableRange.includes(row.theme)));
}
export function priceDiscount(ticket: CouponIssueRecord, amount: number) {
  return Math.round(Math.min(amount, ticket.couponKind === '满减券' ? ticket.discountAmount : amount * (1 - ticket.discountRate / 10)) * 100) / 100;
}
export function validateTicketUse(ticket: CouponIssueRecord, values: { orderNo: string; productId: string; orderAmount?: number }, allTickets: CouponIssueRecord[]) {
  const status = effectiveCouponStatus(ticket);
  if (['已作废', '已核销', '已过期', '未生效'].includes(status)) return `该券${status}，不能核销`;
  if (!ticketProducts(ticket).some((row) => row.id === values.productId)) return '该商品/主题不在券的适用范围内';
  if (!values.orderNo.trim()) return '请输入订单号';
  if (allTickets.some((row) => row.usageHistory.some((use) => use.orderNo === values.orderNo.trim()))) return '该订单已核销，不能重复使用';
  if (ticket.couponKind !== '体验权益券' && (values.orderAmount === undefined || !Number.isFinite(values.orderAmount) || values.orderAmount < ticket.minSpend || values.orderAmount <= 0)) return `订单金额须大于0且满足满 ${ticket.minSpend} 元的使用条件`;
  return undefined;
}
const defaultCoupon = { startsAt: dateTimeOffset(-5), endsAt: dateTimeOffset(30), totalLimit: 100, perUserLimit: 2, sponsor: '平台', status: '启用' as const, createdAt: dateTimeOffset(-6), minSpend: 0, discountAmount: 0, discountRate: 10, rightsCount: 1, productIds: [] as string[], availableRange: ['全部可用'], shootingPoints: ['全部拍摄点'] };
export const initialCouponTemplates: CouponTemplate[] = [
  { ...defaultCoupon, id: 'CP-EXPERIENCE', name: '南长街双次主题体验券', kind: '体验权益券', rightsCount: 2, productIds: ['SP001', 'SP002'], availableRange: ['古韵照壁', '白墙黛瓦'], shootingPoints: ['南长街'], benefit: '指定主题体验 2 次' },
  { ...defaultCoupon, id: 'CP-DISCOUNT', name: '拍摄满100元享8折', kind: '折扣券', minSpend: 100, discountRate: 8, benefit: '满 100 元享 8 折' },
  { ...defaultCoupon, id: 'CP-REDUCTION', name: '拍摄满100减20', kind: '满减券', minSpend: 100, discountAmount: 20, benefit: '满 100 元减 20 元' },
];
const samplePartial = createTicket(initialCouponTemplates[0], '定向发放', '13800000001');
samplePartial.id = samplePartial.redeemCode = 'CN-DEMO-EXPERIENCE-001';
samplePartial.usedTimes = 1;
samplePartial.usageHistory = [{ orderNo: 'DEMO-ORDER-001', shootingPoint: '南长街', theme: '古韵照壁', productId: 'SP001', productName: shootingProducts[0].name, usedAt: dateTimeOffset(-1) }];
const sampleCode = createTicket(initialCouponTemplates[0], '券码兑换');
sampleCode.id = sampleCode.redeemCode = 'CN-DEMO-EXPERIENCE-002';
const sampleDiscount = createTicket(initialCouponTemplates[1], '定向发放', '13800000002');
sampleDiscount.id = sampleDiscount.redeemCode = 'CN-DEMO-DISCOUNT-001';
const sampleReduction = createTicket(initialCouponTemplates[2], '定向发放', '13800000003');
sampleReduction.id = sampleReduction.redeemCode = 'CN-DEMO-REDUCTION-001';
export const initialIssueRecords = [samplePartial, sampleCode, sampleDiscount, sampleReduction];
export const initialCouponStore: CouponStore = { version: 3, templates: initialCouponTemplates, tickets: initialIssueRecords, plans: [] };
