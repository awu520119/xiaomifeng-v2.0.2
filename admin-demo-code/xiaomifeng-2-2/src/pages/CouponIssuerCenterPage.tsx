import { App, Button, Card, Empty, Form, Input, QRCode, Segmented, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled, CopyOutlined, DownloadOutlined, DownOutlined, GiftOutlined, SearchOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CouponClaimPlan, CouponIssueRecord, CouponIssuer, CouponStore, CouponTemplate } from '../mock/coupons';
import { authorizedIssuerIds, canIssueCoupon, couponIssuerOptions, couponKinds, couponLocalTime, couponRuleText, couponTemplateStatus, currentCouponOperatorId, effectiveCouponStatus, remainingQuota, shootingProducts, uniqueCouponId } from '../mock/coupons';
import { couponUsageStatus, issueDirected, markExperienceCodeDistributed } from '../mock/couponFlow';
import { downloadQrCode, receiveUrl } from '../utils/couponExport';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; initialTab?: '发券' | '发放记录'; lockTabs?: boolean };
type View = 'list' | 'direct' | 'public' | 'result' | 'codes' | 'codeDetail';
type RecordFilter = '全部' | '定向发放' | '公开发放' | '券码领取';
type CodeFilter = '未领取' | '已领取';
type RecordEntry =
  | { kind: 'direct' | 'code' | 'publicTicket'; ticket: CouponIssueRecord; activityAt: string }
  | { kind: 'public'; plan: CouponClaimPlan; coupon?: CouponTemplate; claims: CouponIssueRecord[]; activityAt: string };
const kindText = (kind: CouponTemplate['kind']) => kind === '体验权益券' ? '体验券' : kind;
const kindClass = (kind: CouponTemplate['kind']) => kind === '特价券' ? 'issuer-kind-special' : kind === '满减券' ? 'issuer-kind-reduction' : kind === '折扣券' ? 'issuer-kind-discount' : 'issuer-kind-experience';
const statusTone = (value: string) => ({ '发放中': 'active', '已领取': 'active', '已使用': 'active', '未开始': 'upcoming', '未领取': 'pending', '待使用': 'pending', '已暂停': 'pending', '使用中': 'progress', '已结束': 'finished', '已过期': 'expired', '已作废': 'danger' }[value] || 'default');
const statusTag = (value: string) => <Tag className={`coupon-status-tag coupon-status-tag-${statusTone(value)}`}>{value}</Tag>;
const kindBenefit = (coupon: CouponTemplate) => coupon.benefit || couponRuleText(coupon);
const benefitClass = (kind: CouponTemplate['kind']) => `issuer-benefit-panel issuer-benefit-${kind === '特价券' ? 'special' : kind === '满减券' ? 'reduction' : kind === '折扣券' ? 'discount' : 'experience'}`;
const benefitBlock = (benefit: string, kind: CouponTemplate['kind'], extraClass = '') =>
  <div className={`${benefitClass(kind)} ${extraClass}`}><strong className="issuer-benefit-value">{benefit}</strong></div>;
const couponAvailability = (coupon: CouponTemplate, tickets: CouponIssueRecord[]) => <div className="issuer-availability">
  <div><span>剩余可发</span><strong>{remainingQuota(coupon, tickets)} 张</strong></div>
  <div><span>有效期</span><strong>领取后 {coupon.validityDays} 天可用</strong></div>
</div>;
const scopeText = (coupon: CouponTemplate) => coupon.kind === '体验权益券'
  ? shootingProducts.filter((item) => coupon.productIds.includes(item.id)).map((item) => item.name).join('、')
  : [coupon.shootingPoints.join('、'), coupon.availableRange.join('、')].filter(Boolean).join('，');
const couponInfo = (coupon: CouponTemplate) => <div className="issuer-action-info">
  <section className="issuer-info-block"><h5>适用范围</h5><p>{scopeText(coupon) || '全部适用'}</p></section>
  <details className="issuer-info-block issuer-info-rules"><summary><span>使用规则</span><DownOutlined /></summary><p>{coupon.description?.trim() || '暂无使用规则'}</p></details>
</div>;

export default function CouponIssuerCenterPage({ store, setStore, initialTab = '发券', lockTabs = false }: Props) {
  const { message, modal } = App.useApp();
  const [tab, setTab] = useState<'发券' | '发放记录'>(initialTab);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('全部');
  const [view, setView] = useState<View>('list');
  const [keyword, setKeyword] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [resultTicketId, setResultTicketId] = useState<string | null>(null);
  const [resultReturnView, setResultReturnView] = useState<'direct' | 'codeDetail'>('direct');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeTicketId, setCodeTicketId] = useState<string | null>(null);
  const [codeFilter, setCodeFilter] = useState<CodeFilter>('未领取');
  const [codeMode, setCodeMode] = useState<'扫码领取' | '定向发放'>('定向发放');
  const [codeWasDistributed, setCodeWasDistributed] = useState(false);
  const [codeKeyword, setCodeKeyword] = useState('');
  const [codeVisibleCount, setCodeVisibleCount] = useState(10);
  // Demo shell currently exposes 系统管理员 in the global header; use that authenticated session identity directly.
  const issuer = couponIssuerOptions.find((item) => item.id === currentCouponOperatorId) as CouponIssuer;
  const coupon = store.templates.find((item) => item.id === selectedCouponId);
  const couponIssueStatus = (item: CouponTemplate) => couponTemplateStatus(item, store.tickets);
  const ticketUsageStatus = (ticket: CouponIssueRecord) => ticket.phoneDigits ? couponUsageStatus(ticket, store) : effectiveCouponStatus(ticket);
  const resultTicket = store.tickets.find((item) => item.id === resultTicketId);
  const codeTicket = store.tickets.find((item) => item.id === codeTicketId && item.couponId === selectedCouponId);
  const sameCodeAndSerial = Boolean(codeTicket?.phoneDigits && (codeTicket.serialNo || codeTicket.redeemCode) === codeTicket.redeemCode);
  const canOperateCode = Boolean(coupon && codeTicket && canIssueCoupon(coupon, store.tickets)
    && authorizedIssuerIds(coupon).includes(issuer.id) && (!codeTicket.distributedById || codeTicket.distributedById === issuer.id));
  const activePlan = store.plans.find((item) => item.id === activePlanId);
  const activePlanCoupon = activePlan && store.templates.find((item) => item.id === activePlan.couponId);
  const authorizedCoupons = useMemo(() => {
    const available = store.templates.filter((item) => couponKinds.includes(item.kind) && authorizedIssuerIds(item).includes(issuer.id));
    return (['体验权益券', '满减券', '折扣券', '特价券'] as const)
      .map((kind) => available.find((item) => item.kind === kind))
      .filter((item): item is CouponTemplate => Boolean(item));
  }, [issuer.id, store.templates]);
  const visibleCoupons = useMemo(() => authorizedCoupons.filter((item) => !keyword.trim() || item.name.toLowerCase().includes(keyword.trim().toLowerCase())), [authorizedCoupons, keyword]);
  const ownedBatches = (store.batches || []).filter((item) => item.operatorId === issuer.id || (!item.operatorId && item.operator === issuer.name));
  const ownedBatchIds = new Set(ownedBatches.map((item) => item.id));
  const ownedPlans = store.plans.filter((item) => item.operatorId === issuer.id || (!item.operatorId && issuer.id === currentCouponOperatorId));
  const ownedPlanIds = new Set(ownedPlans.map((item) => item.id));
  const personalTickets = store.tickets
    .filter((item) => (item.batchNo && ownedBatchIds.has(item.batchNo)) || (item.claimPlanId && ownedPlanIds.has(item.claimPlanId)))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const personalPlans = [...ownedPlans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const directedTickets = personalTickets.filter((item) => item.source === '定向发放');
  const directedIssuerAccount = (ticket: CouponIssueRecord) => {
    const batch = store.batches?.find((item) => item.id === ticket.batchNo);
    const issuerId = ticket.distributedById || batch?.operatorId;
    const matched = couponIssuerOptions.find((item) => item.id === issuerId || item.name === batch?.operator);
    return matched?.account || issuerId || batch?.operator || '-';
  };
  const publicTickets = personalTickets.filter((item) => item.source === '扫码领取' && item.phoneDigits);
  const unlinkedPublicTickets = publicTickets.filter((ticket) => !ticket.claimPlanId || !ownedPlanIds.has(ticket.claimPlanId));
  const codeClaimTickets = store.tickets.filter((ticket) => ticket.couponKind === '体验权益券' && ticket.source === '券码兑换' && ticket.phoneDigits)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const codeTickets = store.tickets.filter((ticket) => ticket.couponId === selectedCouponId && ticket.couponKind === '体验权益券'
    && (ticket.phoneDigits || effectiveCouponStatus(ticket) !== '已作废'));
  const codeListStatus = (ticket: CouponIssueRecord) => ticket.phoneDigits ? '已领取' : '未领取';
  const visibleCodeTickets = codeTickets.filter((ticket) => {
    const matchedStatus = codeFilter === '未领取' ? !ticket.phoneDigits : Boolean(ticket.phoneDigits);
    return matchedStatus && (!codeKeyword.trim() || [ticket.serialNo || '', ticket.redeemCode, ticket.phoneDigits || ''].some((value) => value.includes(codeKeyword.trim())));
  }).sort((a, b) => (a.serialNo || '').localeCompare(b.serialNo || ''));
  const recordEntries: RecordEntry[] = [
    ...directedTickets.map((ticket): RecordEntry => ({ kind: 'direct', ticket, activityAt: ticket.issuedAt })),
    ...personalPlans.flatMap((plan): RecordEntry[] => {
      const claims = publicTickets.filter((ticket) => ticket.claimPlanId === plan.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
      return claims.length ? [{ kind: 'public', plan, coupon: store.templates.find((item) => item.id === plan.couponId), claims,
        activityAt: claims[0].issuedAt }] : [];
    }),
    ...unlinkedPublicTickets.map((ticket): RecordEntry => ({ kind: 'publicTicket', ticket, activityAt: ticket.issuedAt })),
    ...codeClaimTickets.map((ticket): RecordEntry => ({ kind: 'code', ticket, activityAt: ticket.issuedAt })),
  ].filter((entry) => recordFilter === '全部' || (recordFilter === '定向发放' && entry.kind === 'direct')
    || (recordFilter === '公开发放' && ['public', 'publicTicket'].includes(entry.kind))
    || (recordFilter === '券码领取' && entry.kind === 'code'))
    .sort((a, b) => b.activityAt.localeCompare(a.activityAt));

  const backToList = () => { setView('list'); setSelectedCouponId(null); setPhone(''); setActivePlanId(null); setResultTicketId(null); setResultReturnView('direct'); setCodeWasDistributed(false); };
  const continueFromResult = () => {
    setResultTicketId(null);
    setPhone('');
    if (resultReturnView === 'codeDetail') {
      setCodeMode('定向发放');
      setView('codeDetail');
      return;
    }
    setView('direct');
  };
  const openCodes = (item: CouponTemplate) => {
    if (!canIssueCoupon(item, store.tickets)) return;
    const candidates = store.tickets.filter((ticket) => ticket.couponId === item.id && ticket.couponKind === '体验权益券'
      && !ticket.phoneDigits && effectiveCouponStatus(ticket) !== '已作废' && (!ticket.distributedById || ticket.distributedById === issuer.id));
    if (!candidates.length) { message.error('暂无可发的体验券编号'); return; }
    const previous = candidates.find((ticket) => ticket.id === codeTicketId);
    const unshared = candidates.filter((ticket) => !ticket.distributedById);
    const pool = unshared.length ? unshared : candidates;
    const ticket = previous || pool[Math.floor(Math.random() * pool.length)];
    setSelectedCouponId(item.id); setCodeTicketId(ticket.id); setCodeMode('定向发放'); setPhone(''); setCodeWasDistributed(Boolean(ticket.distributedById)); setView('codeDetail');
  };
  const openCodeDetail = (item: CouponIssueRecord) => {
    setCodeWasDistributed(Boolean(item.distributedById));
    setCodeTicketId(item.id); setCodeMode('定向发放'); setPhone(''); setView('codeDetail');
  };
  const changeCodeMode = (mode: '扫码领取' | '定向发放') => {
    if (mode === '扫码领取' && codeTicket && canOperateCode) {
      try {
        const next = markExperienceCodeDistributed(store, codeTicket.id, issuer.id);
        if (next !== store) setStore(next);
      } catch (error) { message.error((error as Error).message); return; }
    }
    setCodeMode(mode);
  };
  const backToCodes = () => { setView('codes'); setCodeTicketId(null); setPhone(''); setCodeWasDistributed(false); };
  const copyCodeLink = async () => {
    if (!codeTicket) return;
    try {
      const next = markExperienceCodeDistributed(store, codeTicket.id, issuer.id);
      if (!navigator.clipboard?.writeText) throw new Error('当前环境不支持复制链接');
      await navigator.clipboard.writeText(receiveUrl(`code=${encodeURIComponent(codeTicket.redeemCode)}`, codeTicket.distributedById || issuer.id));
      if (next !== store) setStore(next);
      setCodeWasDistributed(true);
      message.success('领取链接已复制');
    } catch (error) { message.error((error as Error).message); }
  };
  const copyCode = async () => {
    if (!codeTicket) return;
    try {
      const next = !codeTicket.phoneDigits ? markExperienceCodeDistributed(store, codeTicket.id, issuer.id) : store;
      if (!navigator.clipboard?.writeText) throw new Error('当前环境不支持复制券码');
      await navigator.clipboard.writeText(codeTicket.redeemCode);
      if (next !== store) setStore(next);
      setCodeWasDistributed(true);
      message.success('券码已复制');
    } catch (error) { message.error((error as Error).message); }
  };
  const copyPublicLink = async () => {
    if (!activePlan) return;
    const url = receiveUrl(`planId=${encodeURIComponent(activePlan.id)}`, activePlan.operatorId || issuer.id);
    try { await navigator.clipboard.writeText(url); message.success('领取链接已复制'); }
    catch { message.info(url); }
  };
  const openDirected = (item: CouponTemplate) => { setSelectedCouponId(item.id); setPhone(''); setView('direct'); };
  const openPublic = (item: CouponTemplate) => {
    if (item.kind === '体验权益券') { message.error('体验券请通过单张券码发放'); return; }
    if (!authorizedIssuerIds(item).includes(issuer.id)) { message.error('当前账号未获得该优惠券的发放权限'); return; }
    if (!canIssueCoupon(item, store.tickets)) { message.error('该券已暂停或剩余量不足'); return; }
    const plan: CouponClaimPlan = { id: uniqueCouponId('CL'), couponId: item.id, allowedPhones: [], status: '启用', createdAt: couponLocalTime(), operatorId: issuer.id, operatorName: issuer.name };
    setStore((current) => ({ ...current, plans: [plan, ...current.plans] })); setSelectedCouponId(item.id); setActivePlanId(plan.id); setView('public');
  };
  const issueToPhone = async () => {
    if (!coupon || busy) return;
    if (!/^1\d{10}$/.test(phone)) { message.error('请输入正确的 11 位手机号'); return; }
    setBusy(true);
    try {
      if (!authorizedIssuerIds(coupon).includes(issuer.id)) throw new Error('当前账号未获得该优惠券的发放权限');
      const next = issueDirected(store, coupon.id, phone, undefined, issuer);
      const ticket = next.tickets.find((item) => item.batchNo === next.batches?.[0]?.id);
      if (!ticket) throw new Error('发放失败，请重试');
      setStore(next); setResultTicketId(ticket.id); setResultReturnView('direct'); setView('result'); setPhone('');
    } catch (error) { message.error((error as Error).message); }
    finally { setBusy(false); }
  };
  const issueCodeToPhone = async (confirmed = false) => {
    if (!coupon || !codeTicket || busy) return;
    if (!/^1\d{10}$/.test(phone)) { message.error('请输入正确的 11 位手机号'); return; }
    if (codeWasDistributed && !confirmed) {
      modal.confirm({ title: '该编号已分享，仍要定向发放？', content: '发给指定手机号后，原二维码或领取链接不能再由其他用户领取。', okText: '确认发放', cancelText: '返回', onOk: () => issueCodeToPhone(true) });
      return;
    }
    setBusy(true);
    try {
      const next = issueDirected(store, coupon.id, phone, codeTicket.id, issuer);
      const ticket = next.tickets.find((item) => item.id === codeTicket.id);
      if (!ticket?.phoneDigits) throw new Error('发放失败，请重试');
      setStore(next); setResultTicketId(ticket.id); setResultReturnView('codeDetail'); setCodeTicketId(codeTicket.id); setPhone(''); setView('result');
    } catch (error) { message.error((error as Error).message); }
    finally { setBusy(false); }
  };
  const couponCard = (item: CouponTemplate) => {
    const remaining = remainingQuota(item, store.tickets);
    const available = canIssueCoupon(item, store.tickets);
    const hasAvailableCode = item.kind !== '体验权益券' || store.tickets.some((ticket) => ticket.couponId === item.id && !ticket.phoneDigits
      && effectiveCouponStatus(ticket) !== '已作废' && (!ticket.distributedById || ticket.distributedById === issuer.id));
    const state = couponIssueStatus(item);
    return <Card key={item.id} className="issuer-coupon-card" size="small">
      <div className="issuer-card-head"><Tag className={`issuer-kind-tag ${kindClass(item.kind)}`}>{kindText(item.kind)}</Tag>{statusTag(state)}</div>
      <Typography.Text className="issuer-coupon-name" strong>{item.name}</Typography.Text>
      {benefitBlock(kindBenefit(item), item.kind, 'issuer-coupon-offer')}
      <div className="issuer-coupon-keyfacts"><span>可发 <strong>{remaining}</strong> 张</span><span>领取后 {item.validityDays} 天可用</span></div>
      <div className="issuer-card-actions">{item.kind === '体验权益券'
        ? <Button block type="primary" disabled={!available || !hasAvailableCode} onClick={() => openCodes(item)}>发放体验券</Button>
        : <><Button block disabled={!available} onClick={() => openDirected(item)}>定向发放</Button><Button block type="primary" disabled={!available} onClick={() => openPublic(item)}>公开发放</Button></>}</div>
      {item.kind === '体验权益券' && available && !hasAvailableCode && <span className="issuer-card-unavailable">暂无可发的体验券编号</span>}
    </Card>;
  };
  const renderRecord = (entry: RecordEntry) => {
    if (entry.kind === 'public') {
      const { plan, coupon: planCoupon, claims } = entry;
      const benefit = planCoupon ? kindBenefit(planCoupon) : claims[0]?.benefit;
      const kind = planCoupon?.kind || claims[0]?.couponKind;
      return <Card key={`public-${plan.id}`} className="issuer-history-card issuer-public-record issuer-activity-card" size="small">
        <div className="issuer-activity-head"><strong>{planCoupon?.name || claims[0]?.couponName || '优惠券'}</strong><Tag className="issuer-source-tag">公开发放</Tag></div>
        {benefit && kind && benefitBlock(benefit, kind, 'issuer-record-benefit')}
        <div className="issuer-activity-main"><span>已领取 {claims.length} 张</span></div>
        <div className="issuer-activity-meta"><span>最近领取</span><time>{entry.activityAt.slice(0, 16)}</time></div>
        <details className="issuer-record-details"><summary><span>领取明细</span><DownOutlined /></summary>
          <div className="issuer-record-claims">{claims.map((ticket) => <div className="issuer-record-claim" key={ticket.id}>
            <div className="issuer-claim-head"><span>领取用户 <strong>{ticket.phone || '—'}</strong></span>{statusTag(ticketUsageStatus(ticket))}</div>
            <div className="issuer-history-facts"><div><span>领取时间</span><time>{ticket.issuedAt || '—'}</time></div><div><span>有效截止</span><time>{ticket.expiresAt || '—'}</time></div></div>
            {ticket.couponKind === '体验权益券' && <div className="issuer-history-code"><span>体验券编号</span><Typography.Text copyable>{ticket.serialNo || ticket.redeemCode}</Typography.Text></div>}
          </div>)}</div>
        </details>
      </Card>;
    }
    const { ticket } = entry;
    const isDirected = entry.kind === 'direct';
    const sourceLabel = isDirected ? '定向发放' : entry.kind === 'code' ? '券码领取' : '公开发放';
    return <Card key={`${entry.kind}-${ticket.id}`} className="issuer-history-card issuer-ticket-record issuer-activity-card" size="small">
      <div className="issuer-activity-head"><strong>{ticket.couponName}</strong><Tag className="issuer-source-tag">{sourceLabel}</Tag></div>
      {benefitBlock(ticket.benefit, ticket.couponKind, 'issuer-record-benefit')}
      <div className="issuer-activity-main"><span>{isDirected ? '发给' : '领取用户'} {ticket.phone || '—'}</span>{statusTag(ticketUsageStatus(ticket))}</div>
      {isDirected
        ? <div className="issuer-history-facts issuer-directed-record-facts"><div><span>发放人账号</span><strong>{directedIssuerAccount(ticket)}</strong></div><div><span>发放时间</span><time>{ticket.issuedAt.slice(0, 16) || '—'}</time></div></div>
        : <div className="issuer-activity-meta"><span>领取时间</span><time>{ticket.issuedAt.slice(0, 16) || '—'}</time></div>}
      <details className="issuer-record-details issuer-ticket-details"><summary><span>查看券信息</span><DownOutlined /></summary><div className="issuer-ticket-detail-content"><div><span>有效截止</span><strong>{ticket.expiresAt || '—'}</strong></div>{ticket.couponKind === '体验权益券' && <div><span>体验券编号</span><Typography.Text copyable>{ticket.serialNo || ticket.redeemCode}</Typography.Text></div>}</div></details>
    </Card>;
  };

  return <main className="issuer-mobile-shell"><div className="issuer-app-frame">
    {view === 'list' && <>
      <Segmented className="issuer-tabs" block value={tab} onChange={(value) => { if (!lockTabs) setTab(value as typeof tab); }} options={[
        { value: '发券', disabled: lockTabs && tab !== '发券', label: <span className="issuer-tab-label"><GiftOutlined />发券</span> },
        { value: '发放记录', disabled: lockTabs && tab !== '发放记录', label: <span className="issuer-tab-label"><ShareAltOutlined />发放记录</span> },
      ]} />
      {tab === '发券' ? <section className="issuer-content">
        {authorizedCoupons.length > 3 && <Input className="issuer-search" prefix={<SearchOutlined />} allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索优惠券名称" />}
        {visibleCoupons.length ? <div className="issuer-coupon-list">{visibleCoupons.map(couponCard)}</div> : <Empty className="issuer-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description={keyword ? '没有找到匹配的优惠券' : '暂无可发放优惠券'} />}
      </section> : <section className="issuer-content issuer-record-content">
        <Segmented className="issuer-record-filters" block value={recordFilter} onChange={(value) => setRecordFilter(value as RecordFilter)} options={['全部', '定向发放', '公开发放', '券码领取']} />
        {recordEntries.length ? <div className="issuer-activity-list">{recordEntries.map(renderRecord)}</div>
          : <Empty className="issuer-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无发放记录" />}
      </section>}
    </>}

    {view === 'codes' && coupon && <section className="issuer-content issuer-action-view">
      <Button className="issuer-back-button" type="text" icon={<ArrowLeftOutlined />} onClick={backToList}>返回</Button>
      <div className="issuer-action-heading"><Typography.Title level={4}>{coupon.name}</Typography.Title></div>
      {benefitBlock(kindBenefit(coupon), coupon.kind, 'issuer-code-benefit')}
      <Segmented className="issuer-code-filters" block value={codeFilter} onChange={(value) => { setCodeFilter(value as CodeFilter); setCodeVisibleCount(10); }} options={['未领取', '已领取']} />
      <Input className="issuer-code-search" prefix={<SearchOutlined />} allowClear value={codeKeyword} onChange={(event) => { setCodeKeyword(event.target.value); setCodeVisibleCount(10); }} placeholder="搜索体验券编号、手机号" />
      {visibleCodeTickets.length ? <><div className="issuer-code-list">{visibleCodeTickets.slice(0, codeVisibleCount).map((ticket) => <button type="button" className="issuer-code-row" key={ticket.id} onClick={() => openCodeDetail(ticket)}><span><strong>{ticket.serialNo || ticket.redeemCode}</strong>{ticket.phone && <small>{ticket.phone}</small>}</span>{statusTag(codeListStatus(ticket))}<span className="issuer-code-chevron">›</span></button>)}</div>{visibleCodeTickets.length > codeVisibleCount && <Button className="issuer-code-more" block onClick={() => setCodeVisibleCount((count) => count + 10)}>查看更多券码</Button>}</> : <Empty className="issuer-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无符合条件的券码" />}
    </section>}

    {view === 'codeDetail' && coupon && codeTicket && <section className="issuer-content issuer-action-view">
      <Button className="issuer-back-button" type="text" icon={<ArrowLeftOutlined />} onClick={backToList}>返回发券</Button>
      <div className="issuer-code-hero">
        <div className="issuer-code-hero-tags"><Tag className={`issuer-kind-tag ${kindClass(coupon.kind)}`}>体验券</Tag>{statusTag(codeListStatus(codeTicket))}</div>
        <strong className="issuer-code-coupon-name">{coupon.name}</strong>
        <div className="issuer-code-serial"><span>体验券编号</span><strong>{codeTicket.serialNo || codeTicket.redeemCode}</strong>{sameCodeAndSerial && <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => void copyCode()}>复制编号</Button>}</div>
        {!codeTicket.phoneDigits && couponAvailability(coupon, store.tickets)}
      </div>
      {codeTicket.phoneDigits ? <>{<div className="issuer-code-facts"><div><span>领取用户</span><strong>{codeTicket.phone}</strong></div><div><span>领取时间</span><strong>{codeTicket.issuedAt || '—'}</strong></div><div><span>有效截止</span><strong>{codeTicket.expiresAt || '—'}</strong></div></div>}{!sameCodeAndSerial && <div className="issuer-code-credential"><span>券码</span><Typography.Text copyable>{codeTicket.redeemCode}</Typography.Text></div>}</> : <>
        {couponInfo(coupon)}
        <Segmented className="issuer-code-mode" block value={codeMode} onChange={(value) => changeCodeMode(value as typeof codeMode)} options={['定向发放', '扫码领取']} />
        {codeMode === '扫码领取' ? <div className="issuer-code-mode-content">
          <div className="issuer-code-credential"><span>券码</span><Typography.Text>{codeTicket.redeemCode}</Typography.Text><Button type="link" disabled={!canOperateCode} onClick={() => void copyCode()}>复制券码</Button></div>
          {canOperateCode ? <><div className="issuer-code-qr-group"><div className="issuer-public-qr issuer-code-qr"><div id="issuer-experience-code-qr"><QRCode value={receiveUrl(`code=${encodeURIComponent(codeTicket.redeemCode)}`, codeTicket.distributedById || issuer.id)} size={224} /></div></div></div><div className="issuer-code-public-actions"><Button block icon={<CopyOutlined />} onClick={() => void copyCodeLink()}>复制领取链接</Button><Button block type="primary" icon={<DownloadOutlined />} onClick={() => { const ok = downloadQrCode('issuer-experience-code-qr', `${codeTicket.serialNo || codeTicket.redeemCode}-领取二维码`); if (!ok) message.error('二维码尚未加载完成'); else { setCodeWasDistributed(true); message.success('二维码已下载'); } }}>下载二维码</Button></div></> : <Typography.Text type="secondary">当前编号暂不可领取</Typography.Text>}
        </div> : <><Form className="issuer-code-direct-form" layout="vertical" onFinish={() => void issueCodeToPhone()}>
          <Form.Item label="接收用户手机号" required><Input inputMode="numeric" autoComplete="tel" maxLength={11} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} placeholder="请输入 11 位手机号" size="large" /></Form.Item><Button type="primary" block htmlType="submit" size="large" loading={busy} disabled={!canOperateCode}>确认发放</Button>
        </Form></>}
      </>}
    </section>}

    {view === 'direct' && coupon && <section className="issuer-content issuer-action-view">
      <Button className="issuer-back-button" type="text" icon={<ArrowLeftOutlined />} onClick={backToList}>返回</Button>
      <div className="issuer-action-heading"><div className="issuer-action-head-tags"><Tag className={`issuer-kind-tag ${kindClass(coupon.kind)}`}>{kindText(coupon.kind)}</Tag>{statusTag(couponIssueStatus(coupon))}</div><Typography.Title level={4}>{coupon.name}</Typography.Title>{benefitBlock(kindBenefit(coupon), coupon.kind, 'issuer-action-benefit')}</div>
      {couponAvailability(coupon, store.tickets)}
      {couponInfo(coupon)}
      <Form layout="vertical" onFinish={() => void issueToPhone()} className="issuer-phone-form"><Form.Item label="接收用户手机号" required><Input inputMode="numeric" autoComplete="tel" maxLength={11} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} placeholder="请输入 11 位手机号" size="large" /></Form.Item><div className="issuer-sticky-action"><Button block type="primary" htmlType="submit" size="large" loading={busy} disabled={!canIssueCoupon(coupon, store.tickets)}>确认发放</Button></div></Form>
    </section>}

    {view === 'result' && resultTicket && <section className="issuer-content issuer-result-view"><div className="issuer-success-icon"><CheckCircleFilled /></div><Typography.Title level={4}>发放成功</Typography.Title><Typography.Text type="secondary">已发给 {resultTicket.phone}</Typography.Text><Card className="issuer-result-card" size="small"><div className="issuer-result-summary"><strong className="issuer-result-name">{resultTicket.couponName}</strong><div className="issuer-result-expiry"><span>有效期至</span><time>{resultTicket.expiresAt || `领取后 ${resultTicket.validityDays} 天有效`}</time></div></div>{resultTicket.couponKind === '体验权益券' && <div className="issuer-result-code"><span>体验券编号</span><Typography.Text copyable>{resultTicket.serialNo || resultTicket.redeemCode}</Typography.Text></div>}</Card><Button block type="primary" size="large" onClick={continueFromResult}>{resultTicket.couponKind === '体验权益券' ? '返回' : '继续发券'}</Button></section>}

    {view === 'public' && <section className="issuer-content issuer-action-view">
      <Button className="issuer-back-button" type="text" icon={<ArrowLeftOutlined />} onClick={backToList}>返回</Button>
      {activePlan && activePlanCoupon ? <><div className="issuer-action-heading"><div className="issuer-action-head-tags"><Tag className={`issuer-kind-tag ${kindClass(activePlanCoupon.kind)}`}>{kindText(activePlanCoupon.kind)}</Tag>{statusTag(couponIssueStatus(activePlanCoupon))}</div><Typography.Title level={4}>{activePlanCoupon.name}</Typography.Title>{benefitBlock(kindBenefit(activePlanCoupon), activePlanCoupon.kind, 'issuer-action-benefit')}</div>{couponAvailability(activePlanCoupon, store.tickets)}{couponInfo(activePlanCoupon)}<div className="issuer-public-qr"><div id="issuer-public-qr-code"><QRCode value={receiveUrl(`planId=${encodeURIComponent(activePlan.id)}`, activePlan.operatorId || issuer.id)} size={224} /></div></div><div className="issuer-public-actions"><Button block icon={<CopyOutlined />} onClick={() => void copyPublicLink()}>复制领取链接</Button><Button block type="primary" icon={<DownloadOutlined />} onClick={() => { const ok = downloadQrCode('issuer-public-qr-code', `${activePlanCoupon.name}-公开发放`); if (!ok) message.error('二维码尚未加载完成'); else message.success('二维码已下载'); }}>下载二维码</Button></div></> : <Empty description="领取入口已不存在" />}
    </section>}
  </div></main>;
}
