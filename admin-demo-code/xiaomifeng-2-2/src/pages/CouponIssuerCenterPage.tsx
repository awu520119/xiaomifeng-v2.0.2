import { App, Button, Card, Empty, Form, Input, QRCode, Segmented, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled, DownloadOutlined, DownOutlined, GiftOutlined, SearchOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CouponClaimPlan, CouponIssueRecord, CouponIssuer, CouponStore, CouponTemplate } from '../mock/coupons';
import { authorizedIssuerIds, canIssueCoupon, couponIssuerOptions, couponKinds, couponLocalTime, couponRuleText, couponTemplateStatus, currentCouponOperatorId, effectiveCouponStatus, remainingQuota, shootingProducts, uniqueCouponId } from '../mock/coupons';
import { couponUsageStatus, issueDirected } from '../mock/couponFlow';
import { downloadQrCode, receiveUrl } from '../utils/couponExport';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; initialTab?: '发券' | '发放记录'; lockTabs?: boolean };
type View = 'list' | 'direct' | 'public' | 'result';
const kindText = (kind: CouponTemplate['kind']) => kind === '体验权益券' ? '体验券' : kind;
const kindClass = (kind: CouponTemplate['kind']) => kind === '满减券' ? 'issuer-kind-reduction' : kind === '折扣券' ? 'issuer-kind-discount' : 'issuer-kind-experience';
const statusTone = (value: string) => ({ '发放中': 'active', '已使用': 'active', '未开始': 'upcoming', '待使用': 'pending', '已暂停': 'pending', '使用中': 'progress', '已使用（退款）': 'refunded', '已结束': 'finished', '已过期': 'expired', '已作废': 'danger' }[value] || 'default');
const statusTag = (value: string) => <Tag className={`coupon-status-tag coupon-status-tag-${statusTone(value)}`}>{value}</Tag>;
const kindBenefit = (coupon: CouponTemplate) => coupon.benefit || couponRuleText(coupon);
const scopeText = (coupon: CouponTemplate) => coupon.kind === '体验权益券'
  ? shootingProducts.filter((item) => coupon.productIds.includes(item.id)).map((item) => item.name).join('、')
  : `${coupon.shootingPoints.join('、')}，${coupon.availableRange.join('、')}`;

export default function CouponIssuerCenterPage({ store, setStore, initialTab = '发券', lockTabs = false }: Props) {
  const { message } = App.useApp();
  const [tab, setTab] = useState<'发券' | '发放记录'>(initialTab);
  const [recordFilter, setRecordFilter] = useState<'全部' | '定向发放' | '公开领取'>('全部');
  const [view, setView] = useState<View>('list');
  const [keyword, setKeyword] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [resultTicketId, setResultTicketId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Demo shell currently exposes 系统管理员 in the global header; use that authenticated session identity directly.
  const issuer = couponIssuerOptions.find((item) => item.id === currentCouponOperatorId) as CouponIssuer;
  const coupon = store.templates.find((item) => item.id === selectedCouponId);
  const couponIssueStatus = (item: CouponTemplate) => couponTemplateStatus(item, store.tickets);
  const ticketUsageStatus = (ticket: CouponIssueRecord) => ticket.phoneDigits ? couponUsageStatus(ticket, store) : effectiveCouponStatus(ticket);
  const resultTicket = store.tickets.find((item) => item.id === resultTicketId);
  const activePlan = store.plans.find((item) => item.id === activePlanId);
  const activePlanCoupon = activePlan && store.templates.find((item) => item.id === activePlan.couponId);
  const authorizedCoupons = useMemo(() => store.templates
    .filter((item) => couponKinds.includes(item.kind) && authorizedIssuerIds(item).includes(issuer.id))
    .sort((a, b) => Number(canIssueCoupon(b, store.tickets)) - Number(canIssueCoupon(a, store.tickets))),
  [issuer.id, store.templates, store.tickets]);
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
  const publicTickets = personalTickets.filter((item) => item.source === '扫码领取');
  const unlinkedPublicTickets = publicTickets.filter((ticket) => !ticket.claimPlanId || !ownedPlanIds.has(ticket.claimPlanId));
  const hasDirectedRecords = directedTickets.length > 0;
  const hasPublicRecords = personalPlans.length + unlinkedPublicTickets.length > 0;
  const hasVisibleRecords = recordFilter === '全部' ? hasDirectedRecords || hasPublicRecords : recordFilter === '定向发放' ? hasDirectedRecords : hasPublicRecords;

  const backToList = () => { setView('list'); setSelectedCouponId(null); setPhone(''); setActivePlanId(null); setResultTicketId(null); };
  const openDirected = (item: CouponTemplate) => { setSelectedCouponId(item.id); setPhone(''); setView('direct'); };
  const openPublic = (item: CouponTemplate) => {
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
      setStore(next); setResultTicketId(ticket.id); setView('result'); setPhone('');
    } catch (error) { message.error((error as Error).message); }
    finally { setBusy(false); }
  };
  const couponCard = (item: CouponTemplate) => {
    const remaining = remainingQuota(item, store.tickets);
    const available = canIssueCoupon(item, store.tickets);
    const state = couponIssueStatus(item);
    return <Card key={item.id} className="issuer-coupon-card" size="small">
      <div className="issuer-card-head"><Tag className={`issuer-kind-tag ${kindClass(item.kind)}`}>{kindText(item.kind)}</Tag>{statusTag(state)}</div>
      <Typography.Text className="issuer-coupon-name" strong>{item.name}</Typography.Text>
      <div className="issuer-coupon-benefit"><GiftOutlined /><strong>{kindBenefit(item)}</strong></div>
      <div className="issuer-coupon-keyfacts"><div><span>剩余数量</span><strong>{remaining}<small> 张</small></strong></div><div><span>有效期</span><strong>领取后 {item.validityDays} 天</strong></div></div>
      <div className="issuer-coupon-scope"><span>适用范围</span><Typography.Text ellipsis={{ tooltip: true }}>{scopeText(item) || '全部适用'}</Typography.Text></div>
      <details className="issuer-coupon-rules">
        <summary><span>使用规则</span><DownOutlined /></summary>
        <p>{item.description?.trim() || '暂无使用规则'}</p>
      </details>
      <div className="issuer-card-actions"><Button block disabled={!available} onClick={() => openDirected(item)}>定向发放</Button><Button block type="primary" disabled={!available} onClick={() => openPublic(item)}>公开领取</Button></div>
    </Card>;
  };

  return <main className="issuer-mobile-shell"><div className="issuer-app-frame">
    {view === 'list' && <>
      <Segmented className="issuer-tabs" block value={tab} onChange={(value) => { if (!lockTabs) setTab(value as typeof tab); }} options={[
        { value: '发券', disabled: lockTabs && tab !== '发券', label: <span className="issuer-tab-label"><GiftOutlined />发券</span> },
        { value: '发放记录', disabled: lockTabs && tab !== '发放记录', label: <span className="issuer-tab-label"><ShareAltOutlined />发放记录</span> },
      ]} />
      {tab === '发券' ? <section className="issuer-content">
        <div className="issuer-section-heading"><div><Typography.Title level={5}>选择优惠券</Typography.Title></div><Tag color="blue">{authorizedCoupons.length} 张</Tag></div>
        {authorizedCoupons.length > 3 && <Input className="issuer-search" prefix={<SearchOutlined />} allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索优惠券名称" />}
        {visibleCoupons.length ? <div className="issuer-coupon-list">{visibleCoupons.map(couponCard)}</div> : <Empty className="issuer-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description={keyword ? '没有找到匹配的优惠券' : '暂无可发放优惠券'}>{!keyword && <Typography.Text type="secondary">请联系管理员为当前账号配置发券权限</Typography.Text>}</Empty>}
      </section> : <section className="issuer-content issuer-record-content">
        <div className="issuer-section-heading"><div><Typography.Title level={5}>发放记录</Typography.Title></div></div>
        <Segmented className="issuer-record-filters" block value={recordFilter} onChange={(value) => setRecordFilter(value as typeof recordFilter)} options={['全部', '定向发放', '公开领取']} />
        {hasVisibleRecords ? <>
          {(recordFilter === '全部' || recordFilter === '定向发放') && directedTickets.length > 0 && <section className="issuer-history-group">
            <div className="issuer-history-heading"><span>定向发放</span><Tag>{directedTickets.length}</Tag></div>
            {directedTickets.map((ticket) => <Card key={ticket.id} className="issuer-history-card issuer-ticket-record" size="small">
              <div className="issuer-history-title"><strong>{ticket.couponName}</strong><Space size={4}><Tag className={`issuer-kind-tag ${kindClass(ticket.couponKind)}`}>{kindText(ticket.couponKind)}</Tag>{statusTag(ticketUsageStatus(ticket))}</Space></div>
              <div className="issuer-record-recipient"><span>发给</span><strong>{ticket.phone || '—'}</strong></div>
              <div className="issuer-history-facts"><div><span>发放时间</span><strong>{ticket.issuedAt.slice(0, 16) || '—'}</strong></div><div><span>有效截止</span><strong>{ticket.expiresAt || '—'}</strong></div></div>
              <div className="issuer-history-code"><span>{ticket.couponKind === '体验权益券' ? '体验券编号' : '券码'}</span><Typography.Text copyable>{ticket.serialNo || ticket.redeemCode}</Typography.Text></div>
            </Card>)}
          </section>}
          {(recordFilter === '全部' || recordFilter === '公开领取') && <section className="issuer-history-group">
            <div className="issuer-history-heading"><span>公开领取</span><Tag>{personalPlans.length + unlinkedPublicTickets.length}</Tag></div>
            {personalPlans.map((plan) => {
              const planCoupon = store.templates.find((item) => item.id === plan.couponId);
              const planTickets = publicTickets.filter((ticket) => ticket.claimPlanId === plan.id);
              const planStatus = planCoupon ? couponIssueStatus(planCoupon) : '已结束';
              return <Card key={plan.id} className="issuer-history-card issuer-public-record" size="small">
                <div className="issuer-history-title"><strong>{planCoupon?.name || '优惠券'}</strong><Space size={4}>{planCoupon && <Tag className={`issuer-kind-tag ${kindClass(planCoupon.kind)}`}>{kindText(planCoupon.kind)}</Tag>}{statusTag(planStatus)}</Space></div>
                <div className="issuer-history-facts"><div><span>已领取</span><strong>{planTickets.length} 张</strong></div><div><span>创建时间</span><strong>{plan.createdAt.slice(0, 16)}</strong></div></div>
                <details className="issuer-record-details"><summary><span>领取明细</span><Tag>{planTickets.length}</Tag><DownOutlined /></summary>
                  {planTickets.length ? <div className="issuer-record-claims">{planTickets.map((ticket) => <div className="issuer-record-claim" key={ticket.id}><div className="issuer-record-claim-heading">{statusTag(ticketUsageStatus(ticket))}</div><div className="issuer-record-recipient"><span>领取用户</span><strong>{ticket.phone || '—'}</strong></div><div className="issuer-history-facts"><div><span>领取时间</span><strong>{ticket.issuedAt.slice(0, 16) || '—'}</strong></div><div><span>有效截止</span><strong>{ticket.expiresAt || '—'}</strong></div></div><div className="issuer-history-code"><span>{ticket.couponKind === '体验权益券' ? '体验券编号' : '券码'}</span><Typography.Text copyable>{ticket.serialNo || ticket.redeemCode}</Typography.Text></div></div>)}</div> : <Typography.Text className="issuer-record-no-claims" type="secondary">暂未有人领取</Typography.Text>}
                </details>
              </Card>;
            })}
            {unlinkedPublicTickets.map((ticket) => <Card key={ticket.id} className="issuer-history-card issuer-ticket-record" size="small"><div className="issuer-history-title"><strong>{ticket.couponName}</strong><Space size={4}><Tag className={`issuer-kind-tag ${kindClass(ticket.couponKind)}`}>{kindText(ticket.couponKind)}</Tag>{statusTag(ticketUsageStatus(ticket))}</Space></div><div className="issuer-record-recipient"><span>领取用户</span><strong>{ticket.phone || '—'}</strong></div><div className="issuer-history-facts"><div><span>领取时间</span><strong>{ticket.issuedAt.slice(0, 16) || '—'}</strong></div><div><span>有效截止</span><strong>{ticket.expiresAt || '—'}</strong></div></div><div className="issuer-history-code"><span>{ticket.couponKind === '体验权益券' ? '体验券编号' : '券码'}</span><Typography.Text copyable>{ticket.serialNo || ticket.redeemCode}</Typography.Text></div></Card>)}
          </section>}
        </> : <Empty className="issuer-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无发放记录"><Typography.Text type="secondary">完成发券后，记录会显示在这里</Typography.Text></Empty>}
      </section>}
    </>}

    {view === 'direct' && coupon && <section className="issuer-content issuer-action-view">
      <Button className="issuer-back-button" type="text" icon={<ArrowLeftOutlined />} onClick={backToList}>返回</Button>
      <div className="issuer-action-heading"><Space size={6}><Tag className={`issuer-kind-tag ${kindClass(coupon.kind)}`}>{kindText(coupon.kind)}</Tag>{statusTag(couponIssueStatus(coupon))}</Space><Typography.Title level={4}>{coupon.name}</Typography.Title><div className="issuer-coupon-benefit"><GiftOutlined /><strong>{kindBenefit(coupon)}</strong></div></div>
      <div className="issuer-detail-box"><div><span>有效期</span><strong>领取后 {coupon.validityDays} 天可用</strong></div><div><span>剩余数量</span><strong>{remainingQuota(coupon, store.tickets)} 张</strong></div><div className="issuer-detail-scope"><span>适用范围</span><strong>{scopeText(coupon) || '全部适用'}</strong></div></div>
      <details className="issuer-coupon-rules issuer-action-rules"><summary><span>使用规则</span><DownOutlined /></summary><p>{coupon.description?.trim() || '暂无使用规则'}</p></details>
      <Form layout="vertical" onFinish={() => void issueToPhone()} className="issuer-phone-form"><Form.Item label="接收用户手机号" required><Input inputMode="numeric" autoComplete="tel" maxLength={11} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} placeholder="请输入 11 位手机号" size="large" /></Form.Item><Typography.Text type="secondary">发放后，优惠券将绑定到该手机号账户。</Typography.Text><div className="issuer-sticky-action"><Button block type="primary" htmlType="submit" size="large" loading={busy} disabled={!canIssueCoupon(coupon, store.tickets)}>确认发放</Button></div></Form>
    </section>}

    {view === 'result' && resultTicket && <section className="issuer-content issuer-result-view"><div className="issuer-success-icon"><CheckCircleFilled /></div><Typography.Title level={4}>发放成功</Typography.Title><Typography.Text type="secondary">已发给 {resultTicket.phone}</Typography.Text><Card className="issuer-result-card" size="small"><div><span>优惠券</span><strong>{resultTicket.couponName}</strong></div><div><span>有效期至</span><strong>{resultTicket.expiresAt || `领取后 ${resultTicket.validityDays} 天有效`}</strong></div><div><span>{resultTicket.couponKind === '体验权益券' ? '体验券编号' : '券码'}</span><Typography.Text copyable>{resultTicket.serialNo || resultTicket.redeemCode}</Typography.Text></div></Card><Button block type="primary" size="large" onClick={backToList}>继续发券</Button></section>}

    {view === 'public' && <section className="issuer-content issuer-action-view">
      <Button className="issuer-back-button" type="text" icon={<ArrowLeftOutlined />} onClick={backToList}>返回</Button>
      {activePlan && activePlanCoupon ? <><div className="issuer-action-heading"><Space size={6}><Tag className={`issuer-kind-tag ${kindClass(activePlanCoupon.kind)}`}>{kindText(activePlanCoupon.kind)}</Tag>{statusTag(couponIssueStatus(activePlanCoupon))}</Space><Typography.Title level={4}>公开领取入口已创建</Typography.Title><Typography.Text>{activePlanCoupon.name}</Typography.Text></div><div className="issuer-public-qr"><div id="issuer-public-qr-code"><QRCode value={receiveUrl(`planId=${encodeURIComponent(activePlan.id)}`)} size={224} /></div><Typography.Text type="secondary">用户扫码确认后，优惠券进入本人券包</Typography.Text></div><div className="issuer-public-facts"><span>有效期</span><strong>领取后 {activePlanCoupon.validityDays} 天可用</strong><span>可领取数量</span><strong>{remainingQuota(activePlanCoupon, store.tickets)} 张</strong></div><details className="issuer-coupon-rules issuer-action-rules"><summary><span>使用规则</span><DownOutlined /></summary><p>{activePlanCoupon.description?.trim() || '暂无使用规则'}</p></details><Space direction="vertical" style={{ width: '100%' }}><Button block type="primary" icon={<DownloadOutlined />} onClick={() => { const ok = downloadQrCode('issuer-public-qr-code', `${activePlanCoupon.name}-公开领取`); if (!ok) message.error('二维码尚未加载完成'); else message.success('二维码已下载'); }}>下载二维码</Button><Button className="issuer-open-records" block onClick={() => { setTab('发放记录'); setView('list'); setActivePlanId(null); }}>查看发放记录</Button></Space></> : <Empty description="领取入口已不存在" />}
    </section>}
  </div></main>;
}
