import type { CouponIssueRecord, CouponIssuer, CouponOrder, CouponStore, ExperienceAccountRight } from './coupons';
import { authorizedIssuerIds, canIssueCoupon, couponExpiryAt, couponLocalTime, createTicket, currentCouponOperatorId, effectiveCouponStatus, issuerAwareRedeemCode, maskPhone, parsePhones, phoneListError, priceDiscount, receiveLimitError, shootingProducts, ticketProducts, uniqueCouponId } from './coupons';

export function prepareExperienceCodes(store: CouponStore): CouponStore {
  let serialSequence = 0;
  const nextSerial = () => `TY-${String(++serialSequence).padStart(6, '0')}`;
  const tickets = store.tickets.map((ticket) => ticket.couponKind === '体验权益券'
    ? { ...ticket, serialNo: nextSerial() }
    : ticket);
  for (const coupon of store.templates.filter((item) => item.kind === '体验权益券')) {
    const count = tickets.filter((ticket) => ticket.couponId === coupon.id).length;
    for (let index = count; index < coupon.totalLimit; index++) tickets.push({ ...createTicket(coupon, '券码兑换'), serialNo: nextSerial() });
  }
  return withClaimedExperienceRights({ ...store, tickets, accountRights: (store.accountRights || []).map((right) => {
    const source = tickets.find((ticket) => ticket.id === right.sourceTicketId);
    return { ...right, expiresAt: right.expiresAt || source?.expiresAt };
  }) });
}

/** 体验券到账即可下单；旧存储中的已领取券也按同一口径补齐权益。 */
export function withClaimedExperienceRights(store: CouponStore): CouponStore {
  const rights = [...(store.accountRights || [])];
  for (const ticket of store.tickets) {
    if (ticket.couponKind !== '体验权益券' || ticket.status === '已作废' || !ticket.phoneDigits || !ticket.issuedAt || rights.some((right) => right.sourceTicketId === ticket.id)) continue;
    rights.push({
      id: uniqueCouponId('RIGHT'), sourceTicketId: ticket.id, couponId: ticket.couponId,
      couponName: ticket.couponName, phone: ticket.phone, phoneDigits: ticket.phoneDigits,
      productIds: [...ticket.productIds], totalUses: ticket.totalUses,
      remainingUses: Math.max(0, ticket.totalUses - ticket.usedTimes),
      grantedAt: ticket.issuedAt, operator: '领券自动到账', expiresAt: ticket.expiresAt,
      usageHistory: [...ticket.usageHistory],
    });
  }
  return rights.length === (store.accountRights || []).length ? store : { ...store, accountRights: rights };
}

export function claimPublicCoupon(store: CouponStore, planId: string, phone: string) {
  if (!/^1\d{10}$/.test(phone)) throw new Error('请先确认当前账号手机号');
  const plan = store.plans.find((item) => item.id === planId);
  if (!plan) throw new Error('领取入口不存在');
  const coupon = store.templates.find((item) => item.id === plan.couponId);
  if (!coupon) throw new Error('优惠券不存在');
  if (plan.status === '已停用' || (plan.endsAt && Date.now() > new Date(plan.endsAt.replace(' ', 'T')).getTime())) throw new Error('领取入口已结束');
  if (plan.totalLimit && store.tickets.filter((item) => item.claimPlanId === plan.id).length >= plan.totalLimit) throw new Error('该入口已领完');
  if (plan.allowedPhones.length && !plan.allowedPhones.includes(phone)) throw new Error('当前账号不在领取名单中');
  if (!canIssueCoupon(coupon, store.tickets)) throw new Error('优惠券已暂停或已领完');
  const limit = receiveLimitError(coupon, phone, store.tickets);
  if (limit) throw new Error(limit);
  const issuerId = plan.operatorId || currentCouponOperatorId;
  if (coupon.kind === '体验权益券') {
    const code = store.tickets.find((item) => item.couponId === coupon.id && !item.phoneDigits && !item.distributedById && item.status !== '已作废');
    if (!code) throw new Error('体验券已领完');
    const issuedAt = couponLocalTime();
    const tickets = store.tickets.map((item) => item.id === code.id ? {
      ...item, redeemCode: issuerAwareRedeemCode(item.redeemCode, issuerId), distributedById: issuerId, distributedAt: plan.createdAt, phone: maskPhone(phone), phoneDigits: phone, issuedAt,
      expiresAt: couponExpiryAt(issuedAt, item.validityDays || coupon.validityDays),
      source: '扫码领取' as const, claimPlanId: plan.id, status: '待使用' as const,
    } : item);
    return { store: withClaimedExperienceRights({ ...store, tickets }), ticketId: code.id };
  }
  const baseTicket = createTicket(coupon, '扫码领取', phone);
  const ticket = { ...baseTicket, redeemCode: issuerAwareRedeemCode(baseTicket.redeemCode, issuerId), distributedById: issuerId, distributedAt: plan.createdAt, claimPlanId: plan.id };
  return { store: { ...store, tickets: [ticket, ...store.tickets] }, ticketId: ticket.id };
}

export function claimExperienceCode(store: CouponStore, input: string, phone: string) {
  if (!/^1\d{10}$/.test(phone)) throw new Error('请先确认当前账号手机号');
  const code = resolveCouponCode(input);
  const ticket = store.tickets.find((item) => item.redeemCode === code && item.couponKind === '体验权益券');
  if (!ticket) throw new Error('兑换码不存在，请检查后重试');
  const coupon = store.templates.find((item) => item.id === ticket.couponId);
  if (!coupon) throw new Error('体验券不存在');
  if (ticket.phoneDigits) {
    if (ticket.phoneDigits !== phone) throw new Error('该兑换码已被领取');
    return { store: withClaimedExperienceRights(store), ticketId: ticket.id, alreadyClaimed: true };
  }
  if (coupon.status === '已停用' || !canIssueCoupon(coupon, store.tickets)) throw new Error('体验券已暂停或已领完');
  if (effectiveCouponStatus(ticket) !== '未领取') throw new Error('该兑换码已失效');
  const issuedAt = couponLocalTime();
  const tickets = store.tickets.map((item) => item.id === ticket.id ? {
    ...item, phone: maskPhone(phone), phoneDigits: phone, issuedAt,
    expiresAt: couponExpiryAt(issuedAt, item.validityDays || coupon.validityDays), status: '待使用' as const,
  } : item);
  return { store: withClaimedExperienceRights({ ...store, tickets }), ticketId: ticket.id, alreadyClaimed: false };
}

/** Record who presented a single experience code; viewing its list does not count as distribution. */
export function markExperienceCodeDistributed(store: CouponStore, ticketId: string, issuerId: string): CouponStore {
  const ticket = store.tickets.find((item) => item.id === ticketId && item.couponKind === '体验权益券');
  const coupon = store.templates.find((item) => item.id === ticket?.couponId);
  if (!ticket || !coupon) throw new Error('体验券编号不存在');
  if (!authorizedIssuerIds(coupon).includes(issuerId)) throw new Error('当前账号未获得该优惠券的发放权限');
  if (!canIssueCoupon(coupon, store.tickets) || effectiveCouponStatus(ticket) !== '未领取') throw new Error('该编号已领取、已作废或不可发放');
  if (ticket.distributedById && ticket.distributedById !== issuerId) throw new Error('该编号已由其他发券人投放');
  if (ticket.distributedById === issuerId) return store;
  return { ...store, tickets: store.tickets.map((item) => item.id === ticketId
    ? { ...item, redeemCode: issuerAwareRedeemCode(item.redeemCode, issuerId), distributedById: issuerId, distributedAt: couponLocalTime() } : item) };
}

export function resolveCouponCode(value: string) {
  const input = value.trim();
  if (!input.includes('://')) return input.toUpperCase();
  try {
    const url = new URL(input);
    const query = new URLSearchParams(url.hash.includes('?') ? url.hash.split('?')[1] : url.search);
    if (query.has('planId')) throw new Error('这是公开领取入口，请出示单张体验券二维码');
    const code = query.get('code');
    if (!code) throw new Error('二维码中没有券码，请出示体验券二维码');
    return code.trim().toUpperCase();
  } catch (error) { throw error instanceof Error ? error : new Error('无法识别该二维码'); }
}

export function rightStatus(right: ExperienceAccountRight) {
  if (!right.expiresAt || Date.now() > new Date(right.expiresAt.replace(' ', 'T')).getTime()) return '已过期';
  if (right.remainingUses <= 0) return (right.usageHistory?.length || 0) >= right.totalUses ? '已用完' : '待体验';
  return (right.usageHistory?.length || 0) > 0 ? '部分使用' : '可使用';
}

export function codeTracking(ticket: CouponIssueRecord, store: CouponStore) {
  const right = (store.accountRights || []).find((item) => item.sourceTicketId === ticket.id);
  if (right) return rightStatus(right) === '可使用' ? '权益已到账' : rightStatus(right);
  const status = effectiveCouponStatus(ticket);
  return status === '待使用' ? '待使用' : status === '未领取' ? '待领取' : status;
}

export const couponUsageStatuses = ['待使用', '使用中', '已使用', '已使用（退款）', '已过期', '已作废'] as const;
export type CouponUsageStatus = typeof couponUsageStatuses[number];

/** 面向运营的用户券状态：统一价格券、体验券及历史多次券的展示口径。 */
export function couponUsageStatus(ticket: CouponIssueRecord, store: CouponStore): CouponUsageStatus {
  if (ticket.status === '已作废') return '已作废';
  if (ticket.couponKind === '体验权益券') {
    const right = (store.accountRights || []).find((item) => item.sourceTicketId === ticket.id);
    const orders = right ? (store.orders || []).filter((item) => item.rightId === right.id) : [];
    if (right && right.remainingUses <= 0 && !orders.some((item) => ['待使用', '待核销', '部分退款'].includes(item.status))) return '已使用';
    if (orders.some((item) => ['待使用', '待核销', '部分退款'].includes(item.status))) return '使用中';
    if (!right && ticket.usedTimes >= ticket.totalUses) return '已使用';
    const expiresAt = right?.expiresAt || ticket.expiresAt;
    if (expiresAt && Date.now() > new Date(expiresAt.replace(' ', 'T')).getTime()) return '已过期';
    return '待使用';
  }
  const refundedOrder = (store.orders || []).find((order) => order.ticketId === ticket.id && Boolean(order.refundedAt));
  if (ticket.usedTimes > 0 && refundedOrder) return '已使用（退款）';
  if (ticket.usedTimes >= ticket.totalUses) return '已使用';
  if (ticket.lockedOrderId || ticket.usedTimes > 0) return '使用中';
  if (ticket.expiresAt && Date.now() > new Date(ticket.expiresAt.replace(' ', 'T')).getTime()) return '已过期';
  return '待使用';
}

export function experienceUseRecords(ticket: CouponIssueRecord, store: CouponStore) {
  const right = (store.accountRights || []).find((item) => item.sourceTicketId === ticket.id);
  return [...new Map([...ticket.usageHistory, ...(right?.usageHistory || [])].map((record) => [record.orderNo, record])).values()];
}

export function issueDirected(store: CouponStore, couponId: string, input: string, selectedTicketId?: string, issuer: Pick<CouponIssuer, 'id' | 'name'> = { id: currentCouponOperatorId, name: '系统管理员' }) {
  const coupon = store.templates.find((item) => item.id === couponId);
  const phones = parsePhones(input); const invalid = phoneListError(phones);
  if (invalid) throw new Error(invalid);
  if (!coupon || !canIssueCoupon(coupon, store.tickets)) throw new Error('该券已停用、失效或已发完');
  if (!authorizedIssuerIds(coupon).includes(issuer.id)) throw new Error('当前账号未获得该优惠券的发放权限');
  for (const phone of phones) { const error = receiveLimitError(coupon, phone, store.tickets); if (error) throw new Error(`${phone}：${error}`); }
  const batch = { id: uniqueCouponId('DI'), couponId, source: '定向发放' as const, quantity: phones.length, createdAt: couponLocalTime(), operator: issuer.name, operatorId: issuer.id };
  let tickets = [...store.tickets];
  if (coupon.kind === '体验权益券') {
    const pool = tickets.filter((ticket) => ticket.couponId === couponId && !ticket.phoneDigits && ticket.status !== '已作废' && (!ticket.distributedById || ticket.distributedById === issuer.id));
    if (selectedTicketId && phones.length !== 1) throw new Error('按编号定向发放时仅可填写一个手机号');
    if (pool.length < phones.length) throw new Error('剩余可发数量不足');
    const selected = selectedTicketId ? pool.find((ticket) => ticket.id === selectedTicketId) : undefined;
    if (selectedTicketId && !selected) throw new Error('该编号已绑定用户或已作废，不能定向发放');
    const allocationPool = selected ? [selected] : pool.slice(0, phones.length);
    const allocations = new Map(allocationPool.map((ticket, index) => [ticket.id, phones[index]]));
    tickets = tickets.map((ticket) => allocations.has(ticket.id) ? { ...ticket, redeemCode: issuerAwareRedeemCode(ticket.redeemCode, issuer.id), phoneDigits: allocations.get(ticket.id)!, phone: maskPhone(allocations.get(ticket.id)!), source: '定向发放' as const, issuedAt: batch.createdAt, expiresAt: couponExpiryAt(batch.createdAt, coupon.validityDays), validityDays: coupon.validityDays, batchNo: batch.id, distributedById: issuer.id, distributedAt: batch.createdAt, status: '待使用' as const } : ticket);
  } else {
    if (tickets.filter((ticket) => ticket.couponId === couponId).length + phones.length > coupon.totalLimit) throw new Error('剩余可发数量不足');
    tickets = [...phones.map((phone) => { const ticket = createTicket(coupon, '定向发放', phone); return { ...ticket, redeemCode: issuerAwareRedeemCode(ticket.redeemCode, issuer.id), batchNo: batch.id, distributedById: issuer.id, distributedAt: batch.createdAt }; }), ...tickets];
  }
  return withClaimedExperienceRights({ ...store, tickets, batches: [batch, ...(store.batches || [])] });
}

export function redeemExperience(store: CouponStore, input: string, recipient?: string, orderNo?: string) {
  const code = resolveCouponCode(input);
  const ticket = store.tickets.find((item) => item.redeemCode === code && item.couponKind === '体验权益券');
  if (!ticket) throw new Error('未找到体验券，请检查券码');
  const coupon = store.templates.find((item) => item.id === ticket.couponId);
  if (!coupon || !authorizedIssuerIds(coupon).includes(currentCouponOperatorId)) throw new Error('当前账号未获得该优惠券的发放权限');
  if ((store.accountRights || []).some((right) => right.sourceTicketId === ticket.id)) throw new Error('该券权益已到账，请勿重复发放');
  if (!['待使用', '未领取'].includes(effectiveCouponStatus(ticket))) throw new Error(`该券${effectiveCouponStatus(ticket)}，不能发放`);
  if (ticket.phoneDigits && recipient?.trim() && ticket.phoneDigits !== recipient.trim()) throw new Error('该券已绑定其他手机号，不能转发');
  const phone = ticket.phoneDigits || recipient?.trim() || '';
  if (!/^1\d{10}$/.test(phone)) throw new Error('请输入接收权益的11位手机号');
  if (!ticket.phoneDigits) {
    if (coupon.status === '已停用') throw new Error('该券已停用领取');
    const error = receiveLimitError(coupon, phone, store.tickets); if (error) throw new Error(error);
  }
  const grantedAt = couponLocalTime();
  const issuedAt = ticket.issuedAt || grantedAt;
  const expiresAt = ticket.expiresAt || couponExpiryAt(issuedAt, ticket.validityDays || coupon.validityDays);
  const right: ExperienceAccountRight = { id: uniqueCouponId('RIGHT'), sourceTicketId: ticket.id, couponId: ticket.couponId, couponName: ticket.couponName, phone: maskPhone(phone), phoneDigits: phone, productIds: [...ticket.productIds], totalUses: 1, remainingUses: ticket.usedTimes > 0 ? 0 : 1, expiresAt, grantedAt, operator: '系统管理员', orderNo: orderNo?.trim() || undefined };
  return { ...store, accountRights: [right, ...(store.accountRights || [])], tickets: store.tickets.map((item) => item.id === ticket.id ? { ...item, phone: right.phone, phoneDigits: phone, issuedAt, expiresAt, validityDays: ticket.validityDays || coupon.validityDays, source: item.phoneDigits ? item.source : '定向发放' as const, orderNo: orderNo?.trim() || item.orderNo, status: '待使用' as const } : item) };
}

export function priceCouponReason(ticket: CouponIssueRecord, productId: string) {
  const product = shootingProducts.find((item) => item.id === productId);
  if (!product) return '商品不存在';
  if (ticket.lockedOrderId) return '已被待支付订单占用';
  if (effectiveCouponStatus(ticket) !== '待使用') return effectiveCouponStatus(ticket);
  if (!ticketProducts(ticket).some((item) => item.id === productId)) return '不适用本商品';
  if (product.price < ticket.minSpend) return `未满 ${ticket.minSpend} 元`;
  if (product.price - priceDiscount(ticket, product.price) <= 0) return '优惠后应付为 0，本单不可用';
  return '';
}

export function createCouponOrder(store: CouponStore, phone: string, productId: string, choice?: string) {
  if (!/^1\d{10}$/.test(phone)) throw new Error('请输入演示手机号');
  const product = shootingProducts.find((item) => item.id === productId); if (!product) throw new Error('商品不存在');
  const ticket = store.tickets.find((item) => item.id === choice && item.phoneDigits === phone && item.couponKind !== '体验权益券');
  const right = (store.accountRights || []).find((item) => item.id === choice && item.phoneDigits === phone);
  if (choice && !ticket && !right) throw new Error('所选优惠已不可用，请重新选择');
  if (ticket) { const reason = priceCouponReason(ticket, productId); if (reason) throw new Error(reason); }
  if (right && (!['可使用', '部分使用'].includes(rightStatus(right)) || (right.productIds.length > 0 && !right.productIds.includes(productId)))) throw new Error('体验权益已失效、用完或不适用本商品');
  const discount = right ? product.price : ticket ? priceDiscount(ticket, product.price) : 0;
  const order: CouponOrder = { id: uniqueCouponId('OR'), phone, productId, productName: product.name, ticketId: ticket?.id, rightId: right?.id, originalAmount: product.price, discountAmount: discount, payAmount: Math.round((product.price - discount) * 100) / 100, status: right ? '待使用' : '待支付', createdAt: couponLocalTime() };
  return { ...store, orders: [order, ...(store.orders || [])], tickets: store.tickets.map((item) => item.id === ticket?.id ? { ...item, lockedOrderId: order.id } : item), accountRights: (store.accountRights || []).map((item) => item.id === right?.id ? { ...item, remainingUses: item.remainingUses - 1 } : item) };
}

export function transitionOrder(store: CouponStore, orderId: string, action: 'pay' | 'cancel' | 'fulfil' | 'refund-full' | 'refund-partial') {
  const order = (store.orders || []).find((item) => item.id === orderId); if (!order) throw new Error('订单不存在');
  let tickets = [...store.tickets]; let rights = [...(store.accountRights || [])]; let updated = { ...order }; const now = couponLocalTime();
  const ticket = tickets.find((item) => item.id === order.ticketId); const product = shootingProducts.find((item) => item.id === order.productId)!;
  const use = { orderNo: order.id, productId: product.id, productName: product.name, theme: product.theme, shootingPoint: product.shootingPoint, usedAt: now, orderAmount: order.originalAmount, discountAmount: order.discountAmount, payAmount: order.payAmount, operator: '用户下单', source: '小程序下单' as const };
  if (action === 'pay') {
    if (order.status !== '待支付') throw new Error('订单当前不能支付');
    if (ticket && (ticket.lockedOrderId !== order.id || effectiveCouponStatus(ticket) !== '待使用' || order.payAmount <= 0)) throw new Error('优惠券已不可用，请取消订单后重新下单');
    updated.status = '待使用';
    tickets = tickets.map((item) => item.id === ticket?.id ? { ...item, lockedOrderId: undefined, usedTimes: 1, status: '已使用', orderNo: order.id, usageHistory: [...item.usageHistory, use] } : item);
  } else if (action === 'cancel') {
    if (order.status !== '待支付') throw new Error('仅待支付订单可以取消');
    updated.status = '已取消';
    tickets = tickets.map((item) => item.lockedOrderId === order.id ? { ...item, lockedOrderId: undefined } : item);
  } else if (action === 'fulfil') {
    if (!['待使用', '部分退款'].includes(order.status) || order.fulfilledAt) throw new Error('订单当前不能确认履约');
    if (order.rightId) {
      const right = rights.find((item) => item.id === order.rightId);
      if (!right || ['已过期', '未生效'].includes(rightStatus(right))) throw new Error('体验权益不在有效期内，不能确认履约');
    }
    updated = { ...order, status: '已完成', fulfilledAt: now };
    rights = rights.map((item) => item.id === order.rightId ? { ...item, usageHistory: [...(item.usageHistory || []), use] } : item);
  } else {
    if (!['待使用', '已完成'].includes(order.status) || order.payAmount <= 0 || order.refundedAt) throw new Error('该订单当前不能退款');
    const full = action === 'refund-full';
    const valid = ticket && ticket.status !== '已作废' && Boolean(ticket.issuedAt) && Date.now() <= new Date(ticket.expiresAt.replace(' ', 'T')).getTime();
    const returned = full && !order.fulfilledAt && order.status !== '已完成' && valid;
    updated = { ...order, status: full ? '已退款' : '部分退款', refundedAt: now, refundAmount: full ? order.payAmount : Math.round(order.payAmount * 50) / 100, couponReturnResult: !ticket ? '未使用价格券' : returned ? '原价格券已返还，可继续使用' : !full ? '部分退款不返券、不退权益' : order.fulfilledAt || order.status === '已完成' ? '已履约，不返券、不退权益' : '原券已失效，不返券' };
    if (returned) tickets = tickets.map((item) => item.id === ticket!.id ? { ...item, usedTimes: 0, status: '待使用', orderNo: undefined, usageHistory: item.usageHistory.map((record) => record.orderNo === order.id ? { ...record, couponReturnedAt: now } : record) } : item);
  }
  return { ...store, tickets, accountRights: rights, orders: (store.orders || []).map((item) => item.id === order.id ? updated : item) };
}
