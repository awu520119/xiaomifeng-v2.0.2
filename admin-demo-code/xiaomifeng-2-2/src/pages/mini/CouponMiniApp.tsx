import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { GiftOutlined, ScanOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CouponIssueRecord, CouponStore, CouponTemplate } from '../../mock/coupons';
import { maskPhone, priceDiscount, shootingProducts } from '../../mock/coupons';
import { claimExperienceCode, claimPublicCoupon, couponUsageStatus, createCouponOrder, priceCouponReason, resolveCouponCode, rightStatus, transitionOrder } from '../../mock/couponFlow';
import lotusPond from '../../assets/lotus-pond.jpg';
import './mini.css';

type Page = 'receive' | 'redeem' | 'wallet' | 'checkout' | 'theme-list' | 'product' | 'mine' | 'order';
type Props = { page: Page; store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; readOnly?: boolean };
const demoPhone = '13800000001';
const pageIds: Record<Page, string> = { receive: 'mini-receive', redeem: 'mini-redeem', wallet: 'mini-wallet', checkout: 'mini-checkout', 'theme-list': 'mini-theme-list', product: 'mini-product', mine: 'mini-mine', order: 'mini-order' };
function path(page: Page, values: Record<string, string> = {}) {
  const base = document.documentElement.dataset.prototypeViewer === 'true' ? `/demo/export/${pageIds[page]}` : `/mini/${page}`;
  const query = new URLSearchParams(values).toString();
  return `${base}${query ? `?${query}` : ''}`;
}
function humanDate(value: string) { return value ? value.slice(0, 16).replaceAll('-', '.') : '领取后开始计算'; }
function shortScope(ticket: Pick<CouponIssueRecord, 'shootingPoints' | 'availableRange'>) {
  const points = ticket.shootingPoints.includes('全部拍摄点') ? '全部拍摄点' : ticket.shootingPoints.join('、');
  const themes = ticket.availableRange.includes('全部可用') ? '全部主题' : ticket.availableRange.join('、');
  return `${points}，${themes}`;
}
function benefit(coupon: Pick<CouponTemplate, 'kind' | 'discountAmount' | 'discountRate' | 'rightsCount' | 'minSpend'>) {
  if (coupon.kind === '体验权益券') return { hero: '可兑换 1 次体验', sub: '体验权益' };
  if (coupon.kind === '特价券') return { hero: `¥${coupon.discountAmount}`, sub: '特惠价' };
  if (coupon.kind === '折扣券') return { hero: `${coupon.discountRate}折`, sub: coupon.minSpend ? `满¥${coupon.minSpend}可用` : '无门槛' };
  return { hero: `¥${coupon.discountAmount}`, sub: coupon.minSpend ? `满¥${coupon.minSpend}可用` : '无门槛' };
}
function ticketBenefit(ticket: CouponIssueRecord) { return benefit({ kind: ticket.couponKind, discountAmount: ticket.discountAmount, discountRate: ticket.discountRate, rightsCount: ticket.totalUses, minSpend: ticket.minSpend }); }
function estimatedPrice(store: CouponStore, phone: string, product: typeof shootingProducts[number]) {
  const priceDiscounts = store.tickets
    .filter((ticket) => ticket.phoneDigits === phone && ticket.couponKind !== '体验权益券' && !priceCouponReason(ticket, product.id))
    .map((ticket) => priceDiscount(ticket, product.price));
  const rightDiscounts = (store.accountRights || [])
    .filter((right) => right.phoneDigits === phone && ['可使用', '部分使用'].includes(rightStatus(right)) && (!right.productIds.length || right.productIds.includes(product.id)))
    .map(() => product.price);
  return Math.max(0, product.price - Math.max(0, ...priceDiscounts, ...rightDiscounts));
}
function ticketKindClass(kind: CouponIssueRecord['couponKind']) { return kind === '特价券' ? 'special' : kind === '体验权益券' ? 'experience' : kind === '折扣券' ? 'discount' : 'reduction'; }
function ticketStatusClass(status: string) { return status === '待使用' ? 'ready' : status === '使用中' ? 'using' : status === '已使用' ? 'done' : ['已过期', '已作废'].includes(status) ? 'past' : 'neutral'; }
function MiniShell({ title, phone, back, right, children, footer, hideAccount = false, disableBack = false }: { title: string; phone: string; back?: () => void; right?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; hideAccount?: boolean; disableBack?: boolean }) {
  return <main className="mini-root">
    <div className="mini-screen">
      <header className="mini-header"><button className="mini-back" onClick={back} aria-label="返回" disabled={disableBack}>{disableBack ? '' : '‹'}</button><strong>{title}</strong><div className="mini-header-right">{right}</div></header>
      {!hideAccount && <div className="mini-account">当前账号 {maskPhone(phone)}</div>}
      <div className={`mini-content${footer ? ' mini-content-footer' : ''}`}>{children}</div>
      {footer && <div className="mini-footer">{footer}</div>}
    </div>
  </main>;
}
function MainButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button className="mini-main-button" type="button" onClick={onClick} disabled={disabled}>{children}</button>;
}
function TicketCard({ ticket, store, onOpen, onAction, hideAction = false }: { ticket: CouponIssueRecord; store: CouponStore; onOpen: () => void; onAction?: () => void; hideAction?: boolean }) {
  const state = couponUsageStatus(ticket, store);
  const right = (store.accountRights || []).find((item) => item.sourceTicketId === ticket.id);
  const display = ticketBenefit(ticket);
  const action = state === '待使用' && (ticket.couponKind !== '体验权益券' || (right && ['可使用', '部分使用'].includes(rightStatus(right))));
  return <article className={`mini-ticket${['已过期', '已作废', '已使用'].includes(state) ? ' is-past' : ''}`}>
    <button className="mini-ticket-body" type="button" onClick={onOpen}>
      <span className="mini-ticket-top"><span className={`mini-ticket-kind ${ticketKindClass(ticket.couponKind)}`}>{ticket.couponKind === '体验权益券' ? '体验券' : ticket.couponKind}</span><span className={`mini-ticket-status ${ticketStatusClass(state)}`}>{state}</span></span>
      <span className={`mini-ticket-hero ${ticketKindClass(ticket.couponKind)}`}>{display.hero}<small>{display.sub}</small></span>
      <span className="mini-ticket-name">{ticket.couponName}</span>
      <span className="mini-ticket-expiry">{humanDate(ticket.expiresAt)} 到期</span>
    </button>
    <div className="mini-ticket-bottom"><details className="mini-ticket-rules"><summary><span>使用规则</span><span className="mini-rule-chevron" aria-hidden="true">›</span></summary><p>{ticket.benefit}；仅限适用拍摄点和主题使用。</p></details>{hideAction ? <span /> : action && onAction ? <button type="button" onClick={onAction}>去使用</button> : <button type="button" onClick={onOpen}>查看详情</button>}</div>
  </article>;
}
function ClaimCouponCard({ coupon, onOpen }: { coupon: CouponTemplate; onOpen: () => void }) {
  const display = benefit(coupon);
  return <article className="mini-ticket"><button className="mini-ticket-body mini-ticket-static" type="button" onClick={onOpen}><span className="mini-ticket-top"><span className={`mini-ticket-kind ${ticketKindClass(coupon.kind)}`}>{coupon.kind === '体验权益券' ? '体验券' : coupon.kind}</span></span><span className={`mini-ticket-hero ${ticketKindClass(coupon.kind)}`}>{display.hero}<small>{display.sub}</small></span><span className="mini-ticket-name">{coupon.name}</span><span className="mini-ticket-expiry">领取后 {coupon.validityDays} 天有效</span></button><div className="mini-ticket-bottom"><details className="mini-ticket-rules"><summary><span>使用规则</span><span className="mini-rule-chevron" aria-hidden="true">›</span></summary><p>{coupon.benefit}；仅限适用拍摄点和主题使用。</p></details><span /></div></article>;
}
function ClaimResult({ title, onWallet, disabled = false }: { title: string; onWallet: () => void; disabled?: boolean }) {
  return <div className="mini-result"><div className="mini-result-icon">✓</div><h2>{title}</h2><MainButton onClick={onWallet} disabled={disabled}>查看我的券包</MainButton></div>;
}

export default function CouponMiniApp({ page, store, setStore, readOnly = false }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = params.get('phone') || demoPhone;
  const viewerMode = document.documentElement.dataset.prototypeViewer === 'true';
  const go = (target: Page, extra: Record<string, string> = {}) => navigate(path(target, { phone, ...extra }));
  const [error, setError] = useState('');
  const [resultId, setResultId] = useState<string>();
  const [claimedBefore, setClaimedBefore] = useState(false);
  const [claimDetailOpen, setClaimDetailOpen] = useState(false);
  const result = store.tickets.find((item) => item.id === resultId);
  const planId = params.get('planId') || (page === 'receive' && document.documentElement.dataset.prototypeViewer === 'true' ? 'CL-DEMO-ISSUER-REDUCTION' : '');
  const plan = store.plans.find((item) => item.id === planId);
  const claimCoupon = store.templates.find((item) => item.id === plan?.couponId);
  const isCodeEntry = page === 'redeem' || (page === 'receive' && Boolean(params.get('code')));
  const [code, setCode] = useState(() => params.get('code') || (page === 'redeem' && document.documentElement.dataset.prototypeViewer === 'true'
    ? store.tickets.find((item) => item.couponKind === '体验权益券' && !item.phoneDigits && item.status === '未领取')?.redeemCode || '' : ''));
  const [checkedCode, setCheckedCode] = useState('');
  const [confirmRedeem, setConfirmRedeem] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeTicket = useMemo(() => {
    try { const normalized = resolveCouponCode(checkedCode); return store.tickets.find((item) => item.redeemCode === normalized && item.couponKind === '体验权益券'); }
    catch { return undefined; }
  }, [checkedCode, store.tickets]);
  const codeCoupon = store.templates.find((item) => item.id === codeTicket?.couponId);

  useEffect(() => {
    if (!scanOpen) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前环境无法调用相机，请手动输入兑换码');
      return () => undefined;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((stream) => {
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => setError('无法打开相机，请允许相机权限或手动输入兑换码'));
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [scanOpen]);

  if (page === 'receive' || page === 'redeem') {
    if (isCodeEntry) {
      const prepareRedeem = () => {
        setError(''); setCheckedCode('');
        try {
          const normalized = resolveCouponCode(code);
          const ticket = store.tickets.find((item) => item.redeemCode === normalized && item.couponKind === '体验权益券');
          if (!ticket) throw new Error('兑换码不存在，请检查后重试');
          setCheckedCode(normalized);
          setConfirmRedeem(true);
        } catch (cause) { setError((cause as Error).message); }
      };
      const redeem = () => {
        try {
          const next = claimExperienceCode(store, checkedCode, phone);
          setStore(next.store); setResultId(next.ticketId); setClaimedBefore(next.alreadyClaimed); setError(''); setConfirmRedeem(false); setScanOpen(false);
        } catch (cause) { setError((cause as Error).message); }
      };
      const demoScanCode = store.tickets.find((item) => item.couponKind === '体验权益券' && !item.phoneDigits && item.status === '未领取')?.redeemCode || '';
      return <MiniShell title={viewerMode ? '兑换页' : '兑换体验券'} phone={phone} hideAccount back={() => go('wallet')} disableBack={viewerMode} footer={!result && <MainButton onClick={prepareRedeem}>立即兑换</MainButton>}>
        {result ? <ClaimResult title={claimedBefore ? '已在券包中' : '兑换成功'} onWallet={() => {}} /> : <>
          <section className="mini-redeem-visual"><div className="mini-redeem-visual-mark"><GiftOutlined /></div><div><strong>优惠券</strong><span>通用券兑换入口</span></div><em>通用券</em></section>
          <div className="mini-field"><div className="mini-code-row"><input id="mini-code" value={code} onChange={(event) => { setCode(event.target.value); setCheckedCode(''); setConfirmRedeem(false); setError(''); }} placeholder="请输入体验券兑换码" autoCapitalize="characters" /><button className="mini-scan-button" type="button" aria-label="扫码兑换" onClick={() => setScanOpen(true)}><ScanOutlined /></button></div></div>
          {error && <p className="mini-error" role="alert">{error}</p>}
          {codeTicket && codeCoupon && <section className="mini-offer"><span className="mini-eyebrow">兑换后获得</span><h2>{benefit(codeCoupon).hero}</h2><strong>{codeCoupon.name}</strong><p>{shortScope(codeTicket)}</p><p>领取后 {codeCoupon.validityDays} 天有效</p>{codeTicket.phoneDigits === phone && <p className="mini-note">这张体验券已在你的券包中</p>}</section>}
        </>}
        {confirmRedeem && codeTicket && codeCoupon && <div className="mini-confirm-overlay"><div className="mini-confirm" role="dialog" aria-modal="true" aria-label="确认兑换"><h2>确认兑换</h2><article className="mini-confirm-ticket"><div className="mini-confirm-ticket-value"><strong>{benefit(codeCoupon).hero}</strong><small>体验券</small></div><div className="mini-confirm-ticket-info"><strong>{codeCoupon.name}</strong><span>领取后 {codeCoupon.validityDays} 天有效</span></div></article><div className="mini-confirm-actions"><button type="button" onClick={() => setConfirmRedeem(false)}>取消</button><MainButton onClick={redeem}>确认兑换</MainButton></div></div></div>}
        {scanOpen && <div className="mini-scan-overlay" onClick={() => setScanOpen(false)}><div className="mini-scan-panel" role="dialog" aria-modal="true" aria-label="扫码兑换" onClick={(event) => event.stopPropagation()}><header><strong>扫码兑换</strong><button type="button" aria-label="关闭扫码" onClick={() => setScanOpen(false)}>×</button></header><video ref={videoRef} autoPlay playsInline muted /><p>将体验券二维码放入取景框</p>{demoScanCode && <button className="mini-scan-demo" type="button" onClick={() => { setCode(demoScanCode); setCheckedCode(''); setScanOpen(false); setError(''); }}>使用演示券码</button>}</div></div>}
      </MiniShell>;
    }
    const claim = () => {
      try {
        const next = claimPublicCoupon(store, planId, phone);
        setStore(next.store); setResultId(next.ticketId); setError('');
      } catch (cause) { setError((cause as Error).message); }
    };
    return <MiniShell title={viewerMode ? '领取页' : '领取优惠券'} phone={phone} hideAccount back={() => go('wallet')} disableBack={viewerMode} footer={!result && claimCoupon && <MainButton onClick={claim}>立即领取</MainButton>}>
      {result ? <ClaimResult title="领取成功" onWallet={() => go('wallet')} disabled={viewerMode} /> : claimCoupon ? <>
        <section className="mini-receive-hero mini-design-zone"><GiftOutlined /><div><span>限时优惠券</span><strong>领取专属优惠</strong></div><span className="mini-design-slot-label">UI 设计占位：活动氛围</span></section>
        <div className="mini-receive-ticket-zone mini-design-zone"><span className="mini-design-slot-label">UI 设计占位：券面主视觉</span><ClaimCouponCard coupon={claimCoupon} onOpen={() => setClaimDetailOpen(true)} /></div>
        {error && <p className="mini-error" role="alert">{error}</p>}
      </> : <div className="mini-empty"><h2>领取入口不可用</h2><p>请向活动方获取新的领取链接或二维码。</p><button disabled={viewerMode} onClick={() => go('wallet')}>查看我的券包</button></div>}
      {claimDetailOpen && claimCoupon && <div className="mini-sheet-overlay" onClick={() => setClaimDetailOpen(false)}><div className="mini-sheet mini-ticket-detail-sheet" role="dialog" aria-modal="true" aria-label="优惠券详情" onClick={(event) => event.stopPropagation()}><header><strong>{claimCoupon.name}</strong><button type="button" aria-label="关闭优惠券详情" onClick={() => setClaimDetailOpen(false)}>×</button></header><div className="mini-ticket-detail-content"><div className="mini-ticket-detail-benefit"><span>优惠内容</span><strong>{benefit(claimCoupon).hero}</strong></div><div className="mini-ticket-detail-row"><span>有效期</span><b>领取后 {claimCoupon.validityDays} 天有效</b></div><div className="mini-ticket-detail-row"><span>适用范围</span><b>{claimCoupon.shootingPoints.join('、')}，{claimCoupon.availableRange.join('、')}</b></div><div className="mini-ticket-detail-row"><span>使用规则</span><b>{claimCoupon.benefit}；仅限适用拍摄点和主题使用。每笔订单只能选择一张优惠券。</b></div></div></div></div>}
    </MiniShell>;
  }

  if (page === 'mine') return <Mine store={store} phone={phone} go={go} />;
  if (page === 'theme-list') return <ThemeList store={store} phone={phone} go={go} />;
  if (page === 'product') return <ProductPage store={store} phone={phone} go={go} />;
  if (page === 'order') return <OrderDetail store={store} setStore={setStore} phone={phone} orderId={params.get('orderId')} go={go} />;
  if (page === 'wallet') {
    return <Wallet store={store} phone={phone} go={go} readOnly={readOnly} />;
  }
  return <Checkout store={store} setStore={setStore} phone={phone} params={params} go={go} />;
}

const packages = [
  { id: 'SP008', name: '基础版', features: ['横屏精剪 29s', '精选相册 8张'] },
  { id: 'SP009', name: '推荐版', features: ['横屏精剪 29s', '竖屏精剪 29s', '精选相册 8张', '原片包 3段'] },
  { id: 'SP010', name: '至尊版', features: ['横屏精剪 29s', '竖屏精剪 29s', '精选相册 8张', '原片包 3段'] },
];

function ThemeList({ store, phone, go }: { store: CouponStore; phone: string; go: (page: Page, extra?: Record<string, string>) => void }) {
  const [activePoint, setActivePoint] = useState('南长街');
  const [selectedProduct, setSelectedProduct] = useState<(typeof shootingProducts)[number]>();
  const points = ['南长街', '雁荡山', '龙门古镇'];
  const themes = shootingProducts.filter((product) => product.shootingPoint === activePoint && product.id <= 'SP006');
  if (selectedProduct) return <ProductPage store={store} phone={phone} go={go} productId={selectedProduct.id} destinationName={selectedProduct.theme} onBack={() => setSelectedProduct(undefined)} />;
  return <MiniShell title="主题列表" phone={phone} hideAccount back={() => go('mine')} disableBack={document.documentElement.dataset.prototypeViewer === 'true'}>
    <section className="mini-theme-hero" style={{ backgroundImage: `url(${lotusPond})` }}><div><span>城市航拍体验</span><strong>{activePoint}</strong></div><small>发现适合你的拍摄主题</small></section>
    <div className="mini-theme-point-tabs" role="tablist" aria-label="拍摄点">{points.map((point) => <button key={point} role="tab" aria-selected={activePoint === point} className={activePoint === point ? 'active' : ''} onClick={() => setActivePoint(point)}>{point}</button>)}</div>
    <div className="mini-theme-info"><span>营业时间：09:00–23:00</span><button type="button">导航 ›</button></div>
    <section className="mini-theme-grid" aria-label="主题列表">{themes.map((product, index) => { const estimate = estimatedPrice(store, phone, product); return <button className="mini-theme-card" type="button" key={product.id} onClick={() => setSelectedProduct(product)}>
      <span className={`mini-theme-image theme-image-${index}`} style={{ backgroundImage: `url(${lotusPond})` }}><em>{index === 0 ? '热门' : '新主题'}</em></span><span className="mini-theme-card-body"><strong>{product.theme}</strong><small>{product.shootingPoint}主题体验</small><span className="mini-theme-price"><b>¥{product.price.toFixed(2)}</b><i>现价</i><em><b>¥{estimate.toFixed(2)}</b><small>预计到手</small></em></span></span>
    </button>; })}</section>
  </MiniShell>;
}

function ProductPage({ store, phone, go, productId, destinationName: destinationNameProp, onBack }: { store: CouponStore; phone: string; go: (page: Page, extra?: Record<string, string>) => void; productId?: string; destinationName?: string; onBack?: () => void }) {
  const [params] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => productId || params.get('productId') || 'SP009');
  const product = shootingProducts.find((item) => item.id === selected)!;
  const estimated = estimatedPrice(store, phone, product);
  const destination = onBack ? 'theme' : params.get('destination') || 'home';
  const destinationName = destinationNameProp || params.get('destinationName') || '曲径通幽测试 0803';
  const destinationType = destination === 'scenic' ? '景区首页' : destination === 'point' ? '拍摄点页面' : destination === 'theme' ? '主题详情页' : '';
  const fromThemeList = Boolean(onBack) || params.get('fromThemeList') === '1';
  return <main className="mini-root"><div className="mini-screen mini-product-page">
    <div className="mini-product-hero" style={{ backgroundImage: `url(${lotusPond})` }}><button aria-label={onBack || fromThemeList ? '返回主题列表' : '返回我的'} onClick={() => onBack ? onBack() : go(fromThemeList ? 'theme-list' : 'mine')}>‹</button><span>{destinationName}</span></div>
    <div className="mini-product-content"><h1>{destinationName} <small>🔥 224</small></h1>{destinationType && <p className="mini-product-context">已根据优惠券适用范围进入{destinationType}</p>}
      <div className="mini-creator"><span className="mini-creator-avatar">影</span><span><strong>顶级航拍大师 <em>沙漠之星</em></strong><small>作品 10</small></span><span className="mini-creator-more">更多 ›</span></div>
      <section className="mini-gallery-section"><h2>▣ 智能精剪视频</h2><div className="mini-video-row">{[1, 2].map((item) => <div className="mini-video-card" key={item} style={{ backgroundImage: `url(${lotusPond})` }}><span>00:29</span><b>▶</b></div>)}</div></section>
      <section className="mini-gallery-section"><h2>▧ 精选照片 <small>航拍高光瞬间</small></h2><div className="mini-photo-row">{[1, 2, 3].map((item) => <img key={item} src={lotusPond} alt={`曲径通幽精选照片 ${item}`} />)}</div></section>
      <section className="mini-gallery-section mini-material"><h2>▣ 原片素材</h2><p>完整航段原片，可自行二创</p></section>
    </div>
    <div className="mini-product-bar"><span><b>¥{product.price.toFixed(2)}</b><small>现价</small><em><strong>¥{estimated.toFixed(2)}</strong><small>预计到手</small></em></span><MainButton onClick={() => setOpen(true)} disabled={fromThemeList}>选套餐</MainButton></div>
    {open && <div className="mini-sheet-overlay" onClick={() => setOpen(false)}><div className="mini-sheet mini-package-sheet" role="dialog" aria-label="选择套餐" onClick={(event) => event.stopPropagation()}><header><button aria-label="关闭套餐选择" onClick={() => setOpen(false)}>×</button><strong>选择套餐</strong><span /></header><div className="mini-package-row">{packages.map((item) => { const value = shootingProducts.find((candidate) => candidate.id === item.id)!; const packageEstimate = estimatedPrice(store, phone, value); return <button key={item.id} className={`mini-package${selected === item.id ? ' selected' : ''}`} onClick={() => setSelected(item.id)}><strong>{item.name}</strong><span>¥{value.price.toFixed(2)}</span><small className="mini-package-estimate">¥{packageEstimate.toFixed(2)}　预计到手</small>{item.features.map((feature) => <small key={feature}>✓ {feature}</small>)}{item.id === 'SP009' && <em>推荐</em>}</button>; })}</div><div className="mini-sheet-footer"><MainButton onClick={() => go('checkout', { productId: product.id })}>确认选择 ¥{product.price.toFixed(2)}</MainButton></div></div></div>}
  </div></main>;
}

function Mine({ store, phone, go }: { store: CouponStore; phone: string; go: (page: Page, extra?: Record<string, string>) => void }) {
  const orders = (store.orders || []).filter((item) => item.phone === phone).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [showOrders, setShowOrders] = useState(false);
  const [notice, setNotice] = useState('');
  return <main className="mini-root"><div className="mini-screen mini-mine-page"><div className="mini-profile"><div className="mini-profile-avatar">影</div><div><strong>wx_10bd95e5</strong><small>{maskPhone(phone)}</small></div></div>
    <div className="mini-profile-body"><div className="mini-visit-stats"><span><b>5</b>拍摄点打卡</span><span><b>1</b>走过城市</span><span><b>5</b>到访景区</span></div>
      <div className="mini-mine-card mini-orders-shortcut"><h2>我的订单 <button onClick={() => setShowOrders(true)}>全部订单 ›</button></h2><div>{[['待支付', '◷'], ['待拍摄', '▣'], ['已完成', '✓'], ['退款', '↩']].map(([label, icon]) => { const order = orders.find((item) => label === '待拍摄' ? item.status === '待使用' : item.status === label || label === '退款' && item.status === '已退款'); return <button key={label} onClick={() => order ? go('order', { orderId: order.id }) : setNotice(`暂无${label}订单`)}><b>{icon}</b><span>{label}</span></button>; })}</div>{notice && <p className="mini-mine-notice" role="status">{notice}</p>}</div>
      <div className="mini-mine-shortcuts"><button className="mini-mine-coupon" onClick={() => go('wallet')}><span className="mini-shortcut-icon mini-coupon-entry-icon">券</span><span><b>优惠券</b></span><strong>›</strong></button><div className="mini-mine-card mini-promotion"><span className="mini-shortcut-icon mini-promotion-icon">◉</span><span><b>推广员中心</b></span></div></div>
      <div className="mini-mine-card mini-help"><h2>帮助与设置</h2><div>{['帮助指引', '意见反馈', '联系客服', '隐私协议', '用户协议', '我的设置'].map((item) => <span key={item}>◦<small>{item}</small></span>)}</div></div>
    </div><nav className="mini-bottom-nav" aria-label="小程序底部导航"><button onClick={() => go('product')}>⌂<small>首页</small></button><button disabled>▣<small>玩法</small></button><button disabled>▤<small>作品</small></button><button className="active" onClick={() => go('mine')}>◉<small>我的</small></button></nav>
    {showOrders && <div className="mini-sheet-overlay" onClick={() => setShowOrders(false)}><div className="mini-sheet mini-orders-sheet" role="dialog" aria-label="全部订单" onClick={(event) => event.stopPropagation()}><header><strong>全部订单</strong><button aria-label="关闭订单列表" onClick={() => setShowOrders(false)}>×</button></header><div className="mini-orders-list">{orders.length ? orders.map((order) => <button key={order.id} onClick={() => go('order', { orderId: order.id })}><strong>{order.productName}</strong><span>{order.status}　¥{order.payAmount.toFixed(2)} ›</span></button>) : <p>暂无订单</p>}</div></div></div>}
  </div></main>;
}

type CouponUseTarget = { type: 'home' | 'scenic' | 'point' | 'theme'; name?: string };
const scenicByPoint: Record<string, string> = {
  南长街: '南长街景区',
  雁荡山: '雁荡山景区',
  龙门古镇: '龙门古镇景区',
  藏西有风: '藏西有风景区',
  萧山科创中心: '萧山科创中心景区',
};
function couponUseTarget(ticket: CouponIssueRecord): CouponUseTarget {
  const allPoints = ticket.shootingPoints.includes('全部拍摄点');
  const allThemes = ticket.availableRange.includes('全部可用');
  if (allPoints && allThemes) return { type: 'home' };
  const themes = ticket.availableRange.filter((item) => item !== '全部可用');
  if (themes.length === 1) return { type: 'theme', name: themes[0] };
  const points = ticket.shootingPoints.filter((item) => item !== '全部拍摄点');
  if (points.length === 1) return { type: 'point', name: points[0] };
  const scenicNames = [...new Set(points.map((item) => scenicByPoint[item] || item))];
  if (points.length > 1 && scenicNames.length === 1) return { type: 'scenic', name: scenicNames[0] };
  return { type: 'home' };
}

function OrderDetail({ store, setStore, phone, orderId, go }: { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; phone: string; orderId: string | null; go: (page: Page, extra?: Record<string, string>) => void }) {
  const [params] = useSearchParams();
  const order = (store.orders || []).find((item) => item.phone === phone && item.id === orderId) || (store.orders || []).find((item) => item.phone === phone && item.id === 'ORDER-DEMO-MINI-COMMERCE-001') || (store.orders || []).find((item) => item.phone === phone);
  const linkedRight = order?.rightId ? store.accountRights?.find((item) => item.id === order.rightId) : undefined;
  const linkedCoupon = store.tickets.find((item) => item.id === (order?.ticketId || linkedRight?.sourceTicketId));
  const usedCouponName = linkedCoupon?.couponName || linkedRight?.couponName;
  const usedCouponKind = linkedCoupon?.couponKind === '体验权益券' || linkedRight ? '体验券' : linkedCoupon?.couponKind;
  const usedCouponText = usedCouponName ? `${usedCouponName}${usedCouponKind ? `（${usedCouponKind}）` : ''}` : order?.ticketId || order?.rightId ? '优惠券信息不可用' : '未使用优惠券';
  const [error, setError] = useState('');
  const change = (action: 'pay' | 'cancel') => {
    if (!order) return;
    try { setStore(transitionOrder(store, order.id, action)); setError(''); }
    catch (cause) { setError((cause as Error).message); }
  };
  return <MiniShell title="订单详情" phone={phone} hideAccount back={() => go(params.get('fromCheckout') === '1' ? 'checkout' : 'mine', params.get('fromCheckout') === '1' ? { productId: params.get('productId') || 'SP009' } : {})} footer={order?.status === '待支付' && <div className="mini-order-actions"><button onClick={() => change('cancel')}>取消</button><MainButton onClick={() => change('pay')}>立即支付</MainButton></div>}>
    {order ? <><div className="mini-order-state"><span>◷</span><h1>{order.status === '待使用' ? '待拍摄' : order.status}</h1>{order.status === '待支付' && <p>请尽快完成支付，优惠券已为本单保留</p>}</div>
      <div className="mini-order-item"><img src={lotusPond} alt="套餐拍摄点" /><div><strong>{order.productName}</strong><b>¥{order.originalAmount.toFixed(2)}</b><small>拍摄点：{shootingProducts.find((item) => item.id === order.productId)?.shootingPoint}</small></div></div>
      <div className="mini-order-location"><strong>拍摄点</strong><p>{shootingProducts.find((item) => item.id === order.productId)?.shootingPoint}</p><div><span>➤ 导航</span><span>☎ 电话</span></div></div>
      <div className="mini-order-info"><h2>订单信息</h2><div><span>订单类型</span><b>套餐订单</b></div><div><span>订单号</span><b>{order.id}</b></div><div><span>订单时间</span><b>{order.createdAt}</b></div><div><span>手机号</span><b>{maskPhone(phone)}</b></div><div className="mini-order-coupon"><span>使用优惠券</span><b>{usedCouponText}</b></div><div><span>优惠金额</span><b>−¥{order.discountAmount.toFixed(2)}</b></div><div><span>实付金额</span><b className="mini-order-pay">¥{order.payAmount.toFixed(2)}</b></div></div>{error && <p className="mini-error" role="alert">{error}</p>}
    </> : <div className="mini-empty"><h2>暂无订单</h2><button onClick={() => go('product')}>去选套餐</button></div>}
  </MiniShell>;
}

function Wallet({ store, phone, go, readOnly = false }: { store: CouponStore; phone: string; go: (page: Page, extra?: Record<string, string>) => void; readOnly?: boolean }) {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'待使用' | '使用中' | '已使用' | '已失效'>('待使用');
  const [detailId, setDetailId] = useState<string | null>(() => readOnly || params.get('detail') === 'first' ? store.tickets.find((item) => item.phoneDigits === phone)?.id ?? null : null);
  const [notice, setNotice] = useState('');
  const owned = store.tickets.filter((item) => item.phoneDigits === phone);
  const status = (item: CouponIssueRecord) => couponUsageStatus(item, store);
  const isTabStatus = (item: CouponIssueRecord, currentTab: typeof tab) => {
    const currentStatus = status(item);
    if (currentTab === '已失效') return ['已过期', '已作废'].includes(currentStatus);
    if (currentTab === '已使用') return currentStatus === '已使用';
    return currentStatus === currentTab;
  };
  const rows = owned.filter((item) => isTabStatus(item, tab))
    .sort((a, b) => tab === '待使用' ? a.expiresAt.localeCompare(b.expiresAt) : b.issuedAt.localeCompare(a.issuedAt));
  const detail = owned.find((item) => item.id === detailId);
  const useCoupon = (ticket: CouponIssueRecord) => {
    const target = couponUseTarget(ticket);
    go('product', target.type === 'home' ? {} : { destination: target.type, destinationName: target.name || '' });
  };
  return <MiniShell title="我的券包" phone={phone} hideAccount back={() => go('mine')} disableBack={document.documentElement.dataset.prototypeViewer === 'true'}>
    <div className="mini-tabs" role="tablist" aria-label="优惠券状态">{(['待使用', '使用中', '已使用', '已失效'] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}<small>{owned.filter((ticket) => isTabStatus(ticket, item)).length}</small></button>)}</div>
    {notice && <p className="mini-wallet-notice" role="status">{notice}</p>}
    <div className="mini-ticket-list">{rows.length ? rows.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} store={store} onOpen={() => setDetailId(ticket.id)} onAction={() => useCoupon(ticket)} hideAction={tab === '已失效'} />) : <div className="mini-empty"><h2>暂无{tab}的券</h2><p>通过领取链接、二维码或兑换码获取的券会出现在这里。</p></div>}</div>
    {tab === '待使用' && <button className="mini-wallet-redeem-entry" type="button" onClick={() => go('redeem')}><GiftOutlined /><span>兑换优惠券</span><b>›</b></button>}
    {detail && <div className="mini-sheet-overlay" onClick={readOnly ? undefined : () => setDetailId(null)}><div className="mini-sheet mini-ticket-detail-sheet" role="dialog" aria-modal="true" aria-label="优惠券详情" onClick={(event) => event.stopPropagation()}><header><strong>{detail.couponName}</strong>{!readOnly && <button type="button" aria-label="关闭优惠券详情" onClick={() => setDetailId(null)}>×</button>}</header><div className="mini-ticket-detail-content"><div className="mini-ticket-detail-benefit"><span>优惠内容</span><strong>{ticketBenefit(detail).hero}</strong></div><div className="mini-ticket-detail-row"><span>有效期</span><b>{detail.issuedAt ? `${humanDate(detail.issuedAt)} 至 ${humanDate(detail.expiresAt)}` : `领取后 ${detail.validityDays} 天可用`}</b></div><div className="mini-ticket-detail-row"><span>适用范围</span><b>{shortScope(detail)}</b></div><div className="mini-ticket-detail-row"><span>使用规则</span><b>{detail.benefit}；仅限适用拍摄点和主题使用。每笔订单只能选择一张优惠券。</b></div></div>{!readOnly && couponUsageStatus(detail, store) === '待使用' && <div className="mini-sheet-footer"><MainButton onClick={() => { setDetailId(null); useCoupon(detail); }}>去使用</MainButton></div>}</div></div>}
  </MiniShell>;
}

function Checkout({ store, setStore, phone, params, go }: { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; phone: string; params: URLSearchParams; go: (page: Page, extra?: Record<string, string>) => void }) {
  const productId = params.get('productId') || 'SP009';
  const [choice, setChoice] = useState<string | null>(() => {
    const ticketId = params.get('ticketId');
    const right = store.accountRights?.find((item) => item.sourceTicketId === ticketId && item.phoneDigits === phone);
    return right?.id || ticketId;
  });
  const [selector, setSelector] = useState(false);
  const [error, setError] = useState('');
  const product = shootingProducts.find((item) => item.id === productId) || shootingProducts[0];
  const prices = store.tickets.filter((item) => item.phoneDigits === phone && item.couponKind !== '体验权益券');
  const rights = (store.accountRights || []).filter((item) => item.phoneDigits === phone);
  const usablePrices = prices.filter((item) => !priceCouponReason(item, product.id));
  const usableRights = rights.filter((item) => ['可使用', '部分使用'].includes(rightStatus(item)) && (!item.productIds.length || item.productIds.includes(product.id)));
  const unavailablePrices = prices.filter((item) => couponUsageStatus(item, store) === '待使用' && !item.lockedOrderId && Boolean(priceCouponReason(item, product.id))).map((item) => ({ id: item.id, name: item.couponName, reason: priceCouponReason(item, product.id) === '不适用本商品' ? '不满足使用条件' : priceCouponReason(item, product.id) }));
  const unavailableRights = rights.filter((item) => { const source = store.tickets.find((ticket) => ticket.id === item.sourceTicketId); return source && couponUsageStatus(source, store) === '待使用' && ['可使用', '部分使用'].includes(rightStatus(item)) && item.productIds.length > 0 && !item.productIds.includes(product.id); }).map((item) => ({ id: item.id, name: item.couponName, reason: '不满足使用条件' }));
  const unavailableCoupons = [...unavailablePrices, ...unavailableRights];
  const ranked = [...usablePrices.map((item) => ({ id: item.id, discount: priceDiscount(item, product.price) })), ...usableRights.map((item) => ({ id: item.id, discount: product.price }))].sort((a, b) => b.discount - a.discount);
  const best = ranked[0]?.id;
  const invalidChoice = Boolean(choice && !ranked.some((item) => item.id === choice));
  const validChoice = choice === null ? best : choice === '' || invalidChoice ? undefined : choice;
  const ticket = prices.find((item) => item.id === validChoice);
  const right = rights.find((item) => item.id === validChoice);
  const discount = right ? product.price : ticket ? priceDiscount(ticket, product.price) : 0;
  const submit = () => {
    try {
      if (invalidChoice) throw new Error('所选优惠券已不可用，请重新选择');
      const next = createCouponOrder(store, phone, product.id, validChoice);
      const created = next.orders![0];
      const paid = created.payAmount > 0 ? transitionOrder(next, created.id, 'pay') : next;
      setStore(paid); setError(''); go('order', { orderId: created.id, fromCheckout: '1', productId: product.id });
    } catch (cause) { setError((cause as Error).message); }
  };
  return <MiniShell title="确认订单" phone={phone} hideAccount back={() => go('product')} disableBack={document.documentElement.dataset.prototypeViewer === 'true'} footer={<div className="mini-checkout-footer">{ranked.length || unavailableCoupons.length ? <button className="mini-footer-coupon" type="button" onClick={() => setSelector(true)}><GiftOutlined /><span>{ranked.length ? `${ranked.length}张可用` : '暂无可用优惠券'}</span><em>{discount ? `−¥${discount.toFixed(2)}` : '›'}</em></button> : <div className="mini-footer-coupon" aria-label="暂无可用优惠券"><GiftOutlined /><span>暂无可用优惠券</span></div>}<div className="mini-footer-pay"><span>应付 <b>¥{Math.max(0, product.price - discount).toFixed(2)}</b></span><MainButton onClick={submit}>{product.price - discount > 0 ? '确认支付' : '确认下单'}</MainButton></div></div>}>
    <section className="mini-checkout-block mini-checkout-product"><img src={lotusPond} alt="曲径通幽套餐拍摄场景" /><div><h2>{product.name}</h2><strong>¥{product.price.toFixed(2)}</strong><p>拍摄点：{product.shootingPoint}</p></div></section>
    <section className="mini-checkout-block mini-amounts"><div><span>商品金额</span><b>¥{product.price.toFixed(2)}</b></div><div><span>优惠金额</span><b>−¥{discount.toFixed(2)}</b></div><div className="total"><span>应付金额</span><strong>¥{Math.max(0, product.price - discount).toFixed(2)}</strong></div></section>
    {error && <p className="mini-error" role="alert">{error}</p>}
    {selector && <div className="mini-sheet-overlay" onClick={() => setSelector(false)}><div className="mini-sheet mini-discount-sheet" role="dialog" aria-label="选择优惠券" onClick={(event) => event.stopPropagation()}><header className="mini-discount-header"><strong>选择优惠券</strong><button aria-label="关闭" onClick={() => setSelector(false)}>×</button></header><div className="mini-sheet-scroll"><button className="mini-choice" onClick={() => setChoice('')}><span className={`mini-radio${validChoice === undefined ? ' checked' : ''}`} />不使用优惠券</button>{ranked.map(({ id, discount: save }) => { const item = prices.find((row) => row.id === id); const name = item?.couponName || rights.find((row) => row.id === id)?.couponName; return <button className="mini-choice" key={id} onClick={() => setChoice(id)}><span className={`mini-radio${validChoice === id ? ' checked' : ''}`} /><span className="mini-choice-main"><strong>{name}</strong><small>{item ? ticketBenefit(item).sub : '指定主题体验权益'}</small></span><b>省¥{save.toFixed(2)}</b></button>; })}{unavailableCoupons.length > 0 && <details className="mini-unavailable"><summary>不可用优惠券</summary>{unavailableCoupons.map((item) => <div key={item.id}>{item.name}<small>{item.reason}</small></div>)}</details>}</div><div className="mini-discount-footer"><span className="mini-discount-selected">已选 {validChoice ? '1' : '0'} 张</span><span className="mini-discount-receive">已减 <b>¥{discount.toFixed(2)}</b></span><button type="button" onClick={() => setSelector(false)}>确定</button></div></div></div>}
  </MiniShell>;
}
