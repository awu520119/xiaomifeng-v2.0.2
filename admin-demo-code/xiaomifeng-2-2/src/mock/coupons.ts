export type CouponKind = '特价券' | '满减券' | '折扣券' | '抵扣券' | '体验权益券';
export type CouponTemplateStatus = '启用' | '已停用';
export type CouponStatus = '待使用' | '部分使用' | '已核销' | '已作废' | '已过期';
export type CouponCodeStatus = '未售出' | '待兑换' | '已兑换' | '已作废';

export type CouponUseRecord = {
  orderNo: string;
  shootingPoint: string;
  theme: string;
  usedAt: string;
};

export type CouponTemplate = {
  id: string;
  name: string;
  kind: CouponKind;
  benefit: string;
  availableRange: string[];
  shootingPoints: string[];
  validityDays: number;
  totalLimit?: number;
  perUserLimit?: number;
  sponsor: string;
  status?: CouponTemplateStatus;
  createdAt: string;
};

export type CouponIssueRecord = {
  id: string;
  couponId: string;
  couponName: string;
  couponKind: CouponKind;
  benefit: string;
  status: CouponStatus;
  phone: string;
  phoneDigits?: string;
  orderNo?: string;
  issuedAt: string;
  expiresAt: string;
  redeemCode: string;
  sourceCode?: string;
  source?: '定向发放' | '活动领取' | '渠道兑换';
  totalUses?: number;
  usedTimes?: number;
  usageHistory?: CouponUseRecord[];
  shootingPoint?: string;
};

export type CouponCodeRecord = {
  id: string;
  couponId: string;
  couponName: string;
  couponKind: CouponKind;
  benefit: string;
  code: string;
  channel: string;
  batchNo: string;
  status: CouponCodeStatus;
  generatedAt: string;
  soldAt?: string;
  validityDays: number;
  redeemedAt?: string;
  redeemedPhone?: string;
  expiresAt?: string;
};

export const couponKinds: CouponKind[] = ['特价券', '满减券', '折扣券', '抵扣券', '体验权益券'];

export const shootingPointOptions = ['藏西有风', '夕舍江畔', '龙门古镇', '雁荡山', '舒天阁', '闻堰老街', '南长街'];
export const themeOptions = ['拉萨入画', '悠享时光', '观池碧波', '白墙黛瓦', '孙权故里', '古韵照壁', '飞檐走壁', '雁荡云端'];

export function couponTotalUses(record: CouponIssueRecord) {
  return record.totalUses ?? (record.couponKind === '体验权益券' ? Number.parseInt(record.benefit, 10) || 1 : 1);
}

export function couponUsedTimes(record: CouponIssueRecord) {
  return record.usedTimes ?? (record.status === '已核销' ? couponTotalUses(record) : 0);
}

export function effectiveCouponStatus(record: CouponIssueRecord): CouponStatus {
  if ((record.status === '待使用' || record.status === '部分使用') && new Date(record.expiresAt.replace(' ', 'T')).getTime() <= Date.now()) return '已过期';
  return record.status;
}

function relativeDateTime(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export const initialCouponTemplates: CouponTemplate[] = [
  { id: 'CP2026101501', name: '藏西有风', kind: '特价券', benefit: '1分钱', availableRange: ['拉萨入画'], shootingPoints: ['藏西有风'], validityDays: 1, sponsor: '平台', createdAt: '2026-10-15 17:23:23' },
  { id: 'CP2026101502', name: '夕舍江畔', kind: '特价券', benefit: '1分钱', availableRange: ['悠享时光'], shootingPoints: ['夕舍江畔'], validityDays: 1, sponsor: '景区', createdAt: '2026-10-15 16:41:33' },
  { id: 'CP2026100301', name: '龙门测试', kind: '特价券', benefit: '1分钱', availableRange: ['观池碧波', '白墙黛瓦'], shootingPoints: ['龙门古镇'], validityDays: 1, sponsor: '景区', createdAt: '2026-10-03 10:28:56' },
  { id: 'CP2026092501', name: '龙门全场体验', kind: '体验权益券', benefit: '1次体验', availableRange: ['全部可用'], shootingPoints: ['龙门古镇'], validityDays: 1, sponsor: '平台', createdAt: '2026-09-25 10:58:21' },
  { id: 'CP2026092502', name: '龙门古韵体验', kind: '体验权益券', benefit: '1次体验', availableRange: ['孙权故里', '古韵照壁'], shootingPoints: ['龙门古镇'], validityDays: 1, sponsor: '景区', createdAt: '2026-09-25 10:51:10' },
  { id: 'CP2026092401', name: '雁荡山双主题体验', kind: '体验权益券', benefit: '2次体验', availableRange: ['飞檐走壁', '雁荡云端'], shootingPoints: ['雁荡山'], validityDays: 3, sponsor: '平台', createdAt: '2026-09-24 10:59:08' },
  { id: 'CP2026092402', name: '舒天阁体验券', kind: '体验权益券', benefit: '1次体验', availableRange: ['登舒天阁', '揽太湖风光'], shootingPoints: ['舒天阁'], validityDays: 1, sponsor: '景区', createdAt: '2026-09-24 10:55:05' },
  { id: 'CP2026091601', name: '闻堰老街多主题券', kind: '体验权益券', benefit: '3次体验', availableRange: ['悠享时光', '码头寻味', '水岸律动'], shootingPoints: ['闻堰老街'], validityDays: 3, sponsor: '渠道', createdAt: '2026-09-16 10:57:26' },
  { id: 'CP2026091001', name: '南长街运营体验券', kind: '体验权益券', benefit: '1次体验', availableRange: ['全部可用'], shootingPoints: ['南长街'], validityDays: 8, totalLimit: 1000, perUserLimit: 10, sponsor: '平台', createdAt: '2026-09-10 09:12:18' },
  { id: 'CP2026082101', name: '夏日满减券', kind: '满减券', benefit: '满 50 减 10 元', availableRange: ['全部可用'], shootingPoints: ['全部拍摄点'], validityDays: 7, totalLimit: 100, perUserLimit: 1, sponsor: '景区', createdAt: '2026-08-21 13:20:00' },
  { id: 'CP2026081501', name: '新客折扣券', kind: '折扣券', benefit: '8折', availableRange: ['拉萨入画', '悠享时光'], shootingPoints: ['全部拍摄点'], validityDays: 3, sponsor: '平台', createdAt: '2026-08-15 11:08:30' },
];

export const initialIssueRecords: CouponIssueRecord[] = [
  { id: 'ISS20261016001', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', status: '已核销', phone: '188****3225', phoneDigits: '18812343225', orderNo: '202610161437565156291', issuedAt: '2026-10-16 14:34:18', expiresAt: '2026-10-24 14:34:18', redeemCode: 'NCJ-000001', shootingPoint: '南长街' },
  { id: 'ISS20261016002', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', status: '已核销', phone: '188****3225', phoneDigits: '18812343225', orderNo: '202610161438575156192', issuedAt: '2026-10-16 14:34:18', expiresAt: '2026-10-24 14:34:18', redeemCode: 'NCJ-000002', shootingPoint: '南长街' },
  { id: 'ISS20261016003', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', status: '已核销', phone: '188****3225', phoneDigits: '18812343225', orderNo: '202610161446175153905', issuedAt: '2026-10-16 14:34:18', expiresAt: '2026-10-24 14:34:18', redeemCode: 'NCJ-000003', shootingPoint: '南长街' },
  { id: 'ISS20261016004', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', status: '待使用', phone: '188****3225', phoneDigits: '18812343225', issuedAt: '2026-10-16 14:34:18', expiresAt: '2026-10-24 14:34:18', redeemCode: 'NCJ-000004' },
  { id: 'ISS20261016005', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', status: '待使用', phone: '176****0016', phoneDigits: '17612340016', issuedAt: '2026-10-16 14:34:18', expiresAt: '2026-10-24 14:34:18', redeemCode: 'NCJ-000005' },
  { id: 'ISS20261016006', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', status: '已作废', phone: '176****0016', phoneDigits: '17612340016', issuedAt: '2026-10-16 14:34:18', expiresAt: '2026-10-24 14:34:18', redeemCode: 'NCJ-000006' },
  { id: 'ISS20261015001', couponId: 'CP2026101501', couponName: '藏西有风', couponKind: '特价券', benefit: '1分钱', status: '已过期', phone: '139****5094', phoneDigits: '13912345094', issuedAt: '2026-10-15 10:12:00', expiresAt: '2026-10-16 10:12:00', redeemCode: 'ZX-000001' },
  { id: 'ISS20261014001', couponId: 'CP2026082101', couponName: '夏日满减券', couponKind: '满减券', benefit: '满 50 减 10 元', status: '待使用', phone: '186****3061', phoneDigits: '18612343061', issuedAt: '2026-10-14 18:20:00', expiresAt: '2026-10-21 18:20:00', redeemCode: 'MJ-000001' },
  { id: 'ISS20261013001', couponId: 'CP2026081501', couponName: '新客折扣券', couponKind: '折扣券', benefit: '8折', status: '已核销', phone: '177****8832', phoneDigits: '17712348832', orderNo: '20261013103300211', issuedAt: '2026-10-13 10:33:00', expiresAt: '2026-10-16 10:33:00', redeemCode: 'ZK-000001', shootingPoint: '闻堰老街' },
  { id: 'ISS20261012001', couponId: 'CP2026092401', couponName: '雁荡山双主题体验', couponKind: '体验权益券', benefit: '2次体验', status: '待使用', phone: '158****7820', phoneDigits: '15812347820', issuedAt: '2026-10-12 12:10:00', expiresAt: '2026-10-15 12:10:00', redeemCode: 'YT-000001' },
  { id: 'ISS20261011001', couponId: 'CP2026092502', couponName: '龙门古韵体验', couponKind: '体验权益券', benefit: '1次体验', status: '已作废', phone: '133****5903', phoneDigits: '13312345903', issuedAt: '2026-10-11 17:52:00', expiresAt: '2026-10-12 17:52:00', redeemCode: 'LM-000001' },
  { id: 'ISS20261010001', couponId: 'CP2026092402', couponName: '舒天阁体验券', couponKind: '体验权益券', benefit: '1次体验', status: '已核销', phone: '185****4217', phoneDigits: '18512344217', orderNo: '20261010143008881', issuedAt: '2026-10-10 09:30:00', expiresAt: '2026-10-11 09:30:00', redeemCode: 'STG-000001', shootingPoint: '舒天阁' },
  { id: 'ISS-DEMO-PARTIAL', couponId: 'CP2026092401', couponName: '雁荡山双主题体验', couponKind: '体验权益券', benefit: '2次体验', status: '部分使用', phone: '158****7820', phoneDigits: '15812347820', issuedAt: relativeDateTime(-1), expiresAt: relativeDateTime(2), redeemCode: 'YT-DEMO-002', totalUses: 2, usedTimes: 1, usageHistory: [{ orderNo: 'DEMO-ORDER-001', shootingPoint: '雁荡山', theme: '飞檐走壁', usedAt: relativeDateTime(-1) }], source: '定向发放' },
];

export const initialCouponCodeRecords: CouponCodeRecord[] = [
  { id: 'CODE-001', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', code: 'MT-1001-CB2026A001-000001', channel: '美团', batchNo: 'CB2026A001', status: '待兑换', generatedAt: '2026-10-10 10:00:00', soldAt: '2026-10-19 12:00:00', validityDays: 8 },
  { id: 'CODE-002', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', code: 'MT-1001-CB2026A001-000002', channel: '美团', batchNo: 'CB2026A001', status: '已兑换', generatedAt: '2026-10-10 10:00:00', validityDays: 8, redeemedAt: '2026-10-12 14:20:00', redeemedPhone: '188****3225', expiresAt: '2026-10-20 14:20:00' },
  { id: 'CODE-003', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', code: 'DY-1001-CB2026B001-000001', channel: '抖音', batchNo: 'CB2026B001', status: '已作废', generatedAt: '2026-10-11 09:30:00', validityDays: 8 },
  { id: 'CODE-004', couponId: 'CP2026091001', couponName: '南长街运营体验券', couponKind: '体验权益券', benefit: '1次体验', code: 'DY-1001-CB2026B001-000002', channel: '抖音', batchNo: 'CB2026B001', status: '未售出', generatedAt: '2026-10-11 09:30:00', validityDays: 8 },
];
