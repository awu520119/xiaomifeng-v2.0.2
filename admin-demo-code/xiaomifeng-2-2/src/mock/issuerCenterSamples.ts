import type { CouponClaimPlan, CouponIssueRecord, CouponStore } from './coupons';
import { couponExpiryAt, createTicket, currentCouponOperatorId, dateTimeOffset, issuerAwareRedeemCode, maskPhone } from './coupons';

const seedId = 'issuer-center-claim-details-v1';
const codeSeedId = 'issuer-center-code-claim-v1';
const availableCodeSeedId = 'issuer-center-available-code-v1';

function withIssuerCodeClaimSample(store: CouponStore): CouponStore {
  if (store.demoSeeds?.includes(codeSeedId)) return store;
  const ticket = store.tickets.find((item) => item.couponId === 'CP-EXPERIENCE' && item.id !== 'CN-DEMO-EXPERIENCE-002' && !item.phoneDigits && item.status === '未领取');
  if (!ticket) return store;
  const phone = '13800000516';
  const issuedAt = dateTimeOffset(-2);
  return {
    ...store,
    demoSeeds: [...(store.demoSeeds || []), codeSeedId],
    tickets: store.tickets.map((item) => item.id === ticket.id ? {
      ...item, redeemCode: issuerAwareRedeemCode(item.redeemCode, currentCouponOperatorId), source: '券码兑换' as const, phone: maskPhone(phone), phoneDigits: phone,
      status: '待使用' as const, issuedAt, expiresAt: couponExpiryAt(issuedAt, item.validityDays),
      distributedById: currentCouponOperatorId, distributedAt: dateTimeOffset(-3),
    } : item),
  };
}

function withIssuerAvailableExperienceCode(store: CouponStore): CouponStore {
  if (store.demoSeeds?.includes(availableCodeSeedId) || store.tickets.some((item) => item.id === 'TY-DEMO-ISSUER-AVAILABLE-001')) return store;
  const coupon = store.templates.find((item) => item.id === 'CP-EXPERIENCE');
  if (!coupon) return store;
  const ticket = createTicket(coupon, '券码兑换');
  ticket.id = ticket.redeemCode = 'TY-DEMO-ISSUER-AVAILABLE-001';
  ticket.serialNo = 'TY-900001';
  return { ...store, tickets: [...store.tickets, ticket], demoSeeds: [...(store.demoSeeds || []), availableCodeSeedId] };
}

/** Add readable public claim examples once, without resetting local operator activity. */
export function withIssuerCenterSamples(store: CouponStore): CouponStore {
  if (store.demoSeeds?.includes(seedId)) return withIssuerAvailableExperienceCode(withIssuerCodeClaimSample(store));

  const plans: CouponClaimPlan[] = [];
  const tickets: CouponIssueRecord[] = [];
  const ticketUpdates = new Map<string, CouponIssueRecord>();
  const addPlan = (id: string, couponId: string, createdDaysAgo: number) => {
    if (!store.templates.some((coupon) => coupon.id === couponId)) return undefined;
    const plan: CouponClaimPlan = {
      id, couponId, allowedPhones: [], status: '启用', createdAt: dateTimeOffset(-createdDaysAgo),
      operatorId: currentCouponOperatorId, operatorName: '系统管理员',
    };
    plans.push(plan);
    return plan;
  };
  const addTicket = (couponId: string, planId: string, id: string, phone: string, issuedDaysAgo: number, state: '待使用' | '已使用' | '已过期') => {
    const coupon = store.templates.find((item) => item.id === couponId);
    if (!coupon || store.tickets.some((item) => item.id === id)) return;
    const ticket = createTicket(coupon, '扫码领取', phone);
    ticket.id = ticket.redeemCode = id;
    ticket.claimPlanId = planId;
    ticket.redeemCode = issuerAwareRedeemCode(ticket.redeemCode, currentCouponOperatorId);
    ticket.distributedById = currentCouponOperatorId;
    ticket.distributedAt = ticket.generatedAt;
    ticket.issuedAt = dateTimeOffset(-issuedDaysAgo);
    ticket.expiresAt = state === '已过期' ? dateTimeOffset(-2) : couponExpiryAt(ticket.issuedAt, ticket.validityDays);
    if (state === '已使用') {
      ticket.status = '已使用';
      ticket.usedTimes = ticket.totalUses;
    }
    tickets.push(ticket);
  };

  const discountPlan = addPlan('CL-DEMO-ISSUER-DISCOUNT', 'CP-DISCOUNT', 5);
  if (discountPlan) {
    addTicket(discountPlan.couponId, discountPlan.id, 'PUB-DEMO-DISCOUNT-001', '13800000511', 4, '待使用');
    addTicket(discountPlan.couponId, discountPlan.id, 'PUB-DEMO-DISCOUNT-002', '13800000512', 3, '已使用');
    addTicket(discountPlan.couponId, discountPlan.id, 'PUB-DEMO-DISCOUNT-003', '13800000513', 40, '已过期');
  }

  const reductionPlan = addPlan('CL-DEMO-ISSUER-REDUCTION', 'CP-REDUCTION', 2);
  if (reductionPlan) addTicket(reductionPlan.couponId, reductionPlan.id, 'PUB-DEMO-REDUCTION-001', '13800000514', 1, '待使用');

  const experiencePlan = addPlan('CL-DEMO-ISSUER-EXPERIENCE', 'CP-EXPERIENCE', 1);
  if (experiencePlan) {
    const ticket = store.tickets.find((item) => item.couponId === experiencePlan.couponId && !item.phoneDigits && item.status === '未领取');
    if (ticket) {
      const phone = '13800000515';
      const issuedAt = dateTimeOffset(-1);
      ticketUpdates.set(ticket.id, {
        ...ticket, redeemCode: issuerAwareRedeemCode(ticket.redeemCode, experiencePlan.operatorId), distributedById: experiencePlan.operatorId, distributedAt: experiencePlan.createdAt, source: '扫码领取', phone: maskPhone(phone), phoneDigits: phone,
        status: '待使用', issuedAt, expiresAt: couponExpiryAt(issuedAt, ticket.validityDays), claimPlanId: experiencePlan.id,
      });
    }
  }

  return withIssuerAvailableExperienceCode(withIssuerCodeClaimSample({
    ...store,
    demoSeeds: [...(store.demoSeeds || []), seedId],
    plans: [...plans, ...store.plans],
    tickets: [...tickets, ...store.tickets.map((ticket) => ticketUpdates.get(ticket.id) || ticket)],
  }));
}
