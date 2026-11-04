import { useEffect, useState } from 'react';
import { EnvironmentOutlined, PhoneOutlined, ShareAltOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons';
import cover from '../assets/lotus-pond.jpg';
import video from '../assets/nfc-demo.mp4';
import './ticket-mini.css';
import './mini-order-list.css';

type Entry = { id: string; type: '套餐' | '套票'; name: string; points: string[]; status: '待支付' | '待使用' | '已使用' | '已完成' | '已取消' | '已退款' | '退款中'; price: number; createdAt?: string; coupon?: string; discount?: number; done?: number; ticketId?: string; delivery?: string[]; photoCount?: number; videoFormat?: string; rawCount?: number; shootingPoint?: string; shootingStartedAt?: number; productionStartedAt?: number; pointPhones?: Record<string, string>; pointStates?: Array<'待拍摄' | '拍摄失败' | '已完成'>; versions?: Array<{ name: string; points: string[]; time: string }> };
const orders: Entry[] = [
  { id: '2026101016272648108', type: '套餐', name: '体验-竖+原片', points: ['萧山区北干街道惠学桥'], status: '已完成', price: 0 },
  { id: '2026092315155744303', type: '套餐', name: '原素材+高光套餐+抽帧不加购', points: ['西湖拍摄点'], status: '待使用', price: 0.1 },
  { id: '2026092315151247554', type: '套餐', name: '精剪竖屏', points: ['西湖拍摄点'], status: '待支付', price: 0.1 },
  { id: '202608111352842973', type: '套餐', name: '精剪竖屏', points: ['西湖拍摄点'], status: '已取消', price: 0.05 },
  { id: 'DEMO-TICKET-WAITING', type: '套票', name: '苏州园林双拍摄点联拍', points: ['拙政园', '留园'], status: '待使用', price: 68, done: 0, pointStates: ['待拍摄', '待拍摄'], versions: [], ticketId: 'DEMO-TICKET-WAITING' },
  { id: 'DEMO-TICKET-PARTIAL', type: '套票', name: '苏州园林双拍摄点联拍', points: ['拙政园', '留园'], status: '已使用', price: 68, coupon: '满减券', discount: 10, done: 1, pointStates: ['已完成', '拍摄失败'], versions: [{ name: '第 1 版', points: ['拙政园'], time: '2026-11-02 14:20' }], ticketId: 'DEMO-TICKET-PARTIAL' },
  { id: 'DEMO-TICKET-COMPLETE', type: '套票', name: '苏州园林双拍摄点联拍', points: ['拙政园', '留园'], status: '已完成', price: 68, done: 2, pointStates: ['已完成', '已完成'], versions: [{ name: '第 1 版', points: ['拙政园'], time: '2026-11-01 10:15' }, { name: '第 2 版', points: ['拙政园', '留园'], time: '2026-11-01 11:05' }], ticketId: 'DEMO-TICKET-COMPLETE' },
  { id: 'DEMO-TICKET-REFUNDED', type: '套票', name: '苏州园林双拍摄点联拍', points: ['拙政园', '留园'], status: '已退款', price: 68, done: 1, pointStates: ['已完成', '待拍摄'], versions: [{ name: '第 1 版', points: ['拙政园'], time: '2026-10-30 15:10' }], ticketId: 'DEMO-TICKET-REFUNDED' },
];
const tabs = ['全部', '待支付', '待使用', '已使用', '退款/取消'] as const;
function StatusBar() { return <div className="mol-status"><b>10:17</b><span>▮▮▮ 4G ▰</span></div>; }
function Cover({ type }: { type: Entry['type'] }) { return <div className="mol-cover"><img src={cover} alt="" /><span className={type === '套票' ? 'mol-ticket-badge' : undefined}>{type === '套票' ? '多点套票' : type}</span></div>; }
export default function MiniOrderListPage({ initialOrderId, onExit }: { initialOrderId?: string; onExit?: () => void } = {}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('全部');
  const [selected, setSelected] = useState<Entry | null>(() => { const saved = JSON.parse(localStorage.getItem('suite-mini-orders') || '[]') as Entry[]; return saved.find((item) => item.id === initialOrderId) || null; });
  const [notice, setNotice] = useState(initialOrderId ? '下单成功，可前往拍摄点开始拍摄' : '');
  const [items, setItems] = useState<Entry[]>(() => { const saved = JSON.parse(localStorage.getItem('suite-mini-orders') || '[]') as Entry[]; return [...saved, ...orders.filter((item) => !saved.some((entry) => entry.id === item.id))]; });
  const [mediaOpen, setMediaOpen] = useState(false);
  const rows = items.filter((order) => tab === '全部' || (tab === '退款/取消' ? ['已退款', '已取消', '退款中'].includes(order.status) : tab === '已使用' ? ['已使用', '已完成'].includes(order.status) : order.status === tab));
  const status = (order: Entry) => order.status;
  return <div className="ticket-mini-page"><div className="ticket-mini-frame mol-screen">
    {selected?.type === '套餐' && mediaOpen ? <WorkViewer back={() => setMediaOpen(false)} /> : selected?.type === '套票' ? <SuiteDetail order={selected} back={() => { setSelected(null); setMediaOpen(false); }} update={(order) => { setSelected(order); setItems((previous) => { const next = previous.map((item) => item.id === order.id ? order : item); localStorage.setItem('suite-mini-orders', JSON.stringify(next)); return next; }); }} mediaOpen={mediaOpen} setMediaOpen={setMediaOpen} initialNotice={notice} /> : <><StatusBar /><header className="mol-nav"><button onClick={() => selected ? setSelected(null) : onExit?.()} aria-label="返回">‹</button><strong>{selected ? '订单详情' : ''}</strong><span>••• ◉</span></header>
      {selected ? <><div className="mol-detail-body"><div className="mol-hero"><div className="mol-hero-icon">{selected.status === '已完成' ? '▶' : '◷'}</div><h2>{status(selected)}</h2><p>{selected.status === '已完成' ? '制作完成，快去看看作品集吧～' : selected.status === '待使用' ? '请前往拍摄点开始拍摄' : '查看订单状态'}</p></div><div className="mol-product"><Cover type={selected.type} /><div><strong>{selected.name}</strong><p>¥ <b>{selected.price}</b></p><small>拍摄点：{selected.points[0]}</small></div></div><section className="mol-location"><strong>拍摄点</strong><p>{selected.points[0]}</p><div><button onClick={() => setNotice('暂无法打开导航')}>➤ 导航</button><button onClick={() => setNotice('暂无法拨打电话')}>☎ 电话</button></div></section><section className="mol-info"><h3>订单信息</h3>{[['订单类型','套餐订单'],['订单号',selected.id],['订单时间','2026-10-10 16:27:26'],...(selected.status === '已完成' ? [['完成时间','2026-10-10 16:32:05']] : []),['手机号','130****0295'],['使用优惠券', selected.coupon || '未使用'],['优惠金额', `¥${(selected.discount || 0).toFixed(2)}`],['实付金额', `¥${selected.price.toFixed(2)}`],['交付物内容','原片素材共3段，剪辑视频共1段']].map(([label,value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</section>{notice && <p className="mol-notice">{notice}</p>}</div><footer className="mol-footer"><button onClick={() => selected.status === '已完成' ? setMediaOpen(true) : setNotice('暂无法操作')}>{selected.status === '已完成' ? '前往查看' : selected.status === '待使用' ? '前往拍摄' : '查看订单'}</button></footer></> : <><div className="mol-tabs">{tabs.map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><div className="mol-list">{rows.length ? rows.map((order) => <button className="mol-card" key={order.id} onClick={() => { setNotice(''); setSelected(order); }}><div className="mol-card-head"><span>NO.{order.id}</span><span>{status(order)}</span></div><div className="mol-card-main"><Cover type={order.type} /><div><strong>{order.name}</strong><small>拍摄点：{order.points.join('、')}</small>{order.type === '套票' && <small>已完成 {order.done}/{order.points.length} 个拍摄点{order.pointStates?.includes('拍摄失败') ? '，有拍摄失败' : ''}</small>}<p>¥<b>{order.price}</b></p></div></div></button>) : <div className="mol-empty">暂无订单</div>}</div></>}
    </>}
  </div></div>;
}

function SuiteDetail({ order, back, update, mediaOpen, setMediaOpen, initialNotice }: { order: Entry; back: () => void; update: (order: Entry) => void; mediaOpen: boolean; setMediaOpen: (open: boolean) => void; initialNotice: string }) {
  const [notice, setNotice] = useState(initialNotice);
  const shootingIndex = order.shootingPoint ? order.points.indexOf(order.shootingPoint) : -1;
  const shooting = shootingIndex >= 0 ? shootingIndex : null;
  const [scanPoint, setScanPoint] = useState<string>();
  const [missingPhonePoint, setMissingPhonePoint] = useState<string>();
  const [finishOpen, setFinishOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundPending, setRefundPending] = useState(order.status === '退款中');
  const [versionIndex, setVersionIndex] = useState(Math.max(0, (order.versions?.length || 1) - 1));
  const states = order.pointStates || order.points.map(() => '待拍摄' as const);
  const done = states.filter((state) => state === '已完成').length;
  const completed = order.status === '已完成';
  const refunded = order.status === '已退款';
  const generating = order.productionStartedAt !== undefined;
  const failed = states.includes('拍摄失败');
  const versions = order.versions || [];
  useEffect(() => {
    if (shooting === null || order.status !== '已使用') return;
    const remaining = Math.max(0, 5000 - (Date.now() - (order.shootingStartedAt || Date.now())));
    const timer = window.setTimeout(() => {
      const nextStates = states.map((state, index) => index === shooting ? '已完成' as const : state);
      const count = nextStates.filter((state) => state === '已完成').length;
      update({ ...order, shootingPoint: undefined, shootingStartedAt: undefined, pointStates: nextStates, done: count });
      setNotice(count < order.points.length ? '拍摄完成，可继续拍摄或制作作品' : '所有拍摄点已完成，可开始制作作品');
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [order]);
  const startShooting = () => {
    if (!scanPoint || shooting !== null || completed || refunded || refundPending) return;
    const index = order.points.indexOf(scanPoint);
    if (index < 0 || states[index] === '已完成') { setScanPoint(undefined); setNotice('该拍摄点不在订单中或已完成'); return; }
    update({ ...order, status: '已使用', shootingPoint: scanPoint, shootingStartedAt: Date.now() });
    setScanPoint(undefined); setNotice('');
  };
  const startProduction = () => {
    setFinishOpen(false);
    const selectedPoints = order.points.filter((_, index) => states[index] === '已完成');
    if (!selectedPoints.length) return;
    setNotice('作品制作中');
    update({ ...order, productionStartedAt: Date.now() });
    window.setTimeout(() => {
      const version = { name: selectedPoints.length === order.points.length ? '完整作品' : `已拍摄 ${selectedPoints.length} 个点位`, points: selectedPoints, time: new Date().toLocaleString('zh-CN', { hour12: false }) };
      update({ ...order, productionStartedAt: undefined, versions: [...versions, version], status: selectedPoints.length === order.points.length ? '已完成' : '已使用' });
    }, 5000);
  };
  const refund = () => { if (shooting === null && !completed && !refunded) setRefundOpen(true); };
  const startRefund = () => { setRefundOpen(false); setRefundPending(true); update({ ...order, status: '退款中' }); };
  useEffect(() => {
    if (!refundPending || order.status !== '退款中') return;
    const timer = window.setTimeout(() => { setRefundPending(false); setNotice('退款成功，已生成的作品可继续查看'); update({ ...order, status: '已退款' }); }, 1800);
    return () => window.clearTimeout(timer);
  }, [refundPending, order]);
  const heading = order.status;
  const description = refundPending ? '退款处理中，暂不可拍摄或重试' : refunded ? '退款完成，已生成的作品仍可查看' : completed ? '制作完成，快去看看作品集吧～' : shooting !== null ? `正在拍摄：${order.points[shooting]}，拍摄中，请稍候` : generating ? '作品制作中，可稍后查看' : failed ? '本次拍摄未完成，可重新尝试拍摄' : order.status === '待使用' ? '请前往拍摄点，扫描现场二维码开始拍摄' : `已完成 ${done}/${order.points.length} 个拍摄点${versions.length ? '，已有部分作品可查看' : ''}`;
  return <>{!mediaOpen && <><StatusBar /><header className="mol-nav mol-detail-nav"><button onClick={back} aria-label="返回">‹</button><strong>{mediaOpen ? '已交付内容' : '订单详情'}</strong><span>••• ◉</span></header></>}{mediaOpen ? <WorkViewer back={() => setMediaOpen(false)} delivery={order.delivery} photoCount={order.photoCount} versions={versions} versionIndex={versionIndex} setVersionIndex={setVersionIndex} /> : <><div className="mol-detail-body"><div className="mol-hero"><div className="mol-hero-icon">{completed ? '▶' : refunded ? '↩' : '◷'}</div><h2>{heading}</h2><p role="status">{generating || completed || refunded || refundPending ? description : notice || description}</p></div><div className="mol-product"><Cover type="套票" /><div><strong>{order.name}</strong><p>¥ <b>{order.price}</b></p><small>共 {order.points.length} 个拍摄点</small></div></div><section className="mol-suite-points"><div className="mol-suite-heading"><strong>拍摄点</strong><span>已完成 {done}/{order.points.length}</span></div><div className="mol-points-progress" role="progressbar" aria-label="拍摄点完成进度" aria-valuemin={0} aria-valuemax={order.points.length} aria-valuenow={done}><span style={{ width: `${order.points.length ? done / order.points.length * 100 : 0}%` }} /></div><div className="mol-points-route">{order.points.map((point, index) => { const state = shooting === index ? '拍摄中' : states[index]; const statusClass = state === '已完成' ? 'done' : state === '拍摄中' ? 'shooting' : state === '拍摄失败' ? 'failed' : 'waiting'; const phone = order.pointPhones?.[point]; return <div className="mol-suite-point" key={point}><span className={`mol-point-number ${statusClass}`}>{index + 1}</span><div className="mol-point-main"><div className="mol-point-heading"><b>{point}</b><span className={`mol-point-status ${statusClass}`}>{state}</span></div>{state === '拍摄失败' && <p className="mol-point-hint">可重新拍摄</p>}<div className="mol-point-actions"><button onClick={() => setNotice(`${point}暂无法打开导航`)}><EnvironmentOutlined /> 导航</button>{phone ? <a href={`tel:${phone}`}><PhoneOutlined /> 电话</a> : <button onClick={() => setMissingPhonePoint(point)}><PhoneOutlined /> 电话</button>}</div>{missingPhonePoint === point && <p className="mol-point-contact-notice" role="status">暂未提供联系电话</p>}</div></div>; })}</div></section><section className="mol-info"><div className="mol-info-heading"><h3>订单信息</h3>{!completed && !refunded && !refundPending && <button className="mol-refund-link" disabled={shooting !== null} onClick={refund}>退款</button>}</div>{[['订单类型','套票订单'],['订单号',order.id],['订单时间', order.createdAt || '2026-11-02 14:20:00'],['手机号','130****0295'],['使用优惠券', order.coupon || '未使用'],['优惠金额', `¥${(order.discount || 0).toFixed(2)}`],['实付金额', `¥${order.price.toFixed(2)}`],['交付物内容',(order.delivery || ['智能精剪','精选照片']).join('、')]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</section></div><footer className="mol-footer mol-suite-footer"><div className="mol-footer-actions">{versions.length > 0 && <button className="mol-primary" onClick={() => setMediaOpen(true)}>前往查看</button>}{!completed && !refunded && !refundPending && !generating && shooting === null && done > 0 && <button className={done === order.points.length ? "mol-primary" : "mol-secondary"} onClick={() => setFinishOpen(true)}>{done === order.points.length ? '开始制作' : '结束拍摄并制作'}</button>}{!completed && !refunded && !refundPending && !generating && shooting === null && done < order.points.length && <button className="mol-primary" onClick={() => { setNotice(''); const index = states.findIndex((state) => state === '拍摄失败'); const next = index >= 0 ? index : states.findIndex((state) => state === '待拍摄'); if (next >= 0) setScanPoint(order.points[next]); }}>继续拍摄</button>}</div></footer>{scanPoint && <div className="mol-dialog-mask"><div className="mol-dialog" role="dialog" aria-modal="true" aria-label="确认拍摄点"><h3>确认拍摄点</h3><p>即将在「{scanPoint}」开始拍摄，请确认您已到达现场。</p><div><button onClick={() => setScanPoint(undefined)}>取消</button><button onClick={startShooting}>开始拍摄</button></div></div></div>}{finishOpen && <div className="mol-dialog-mask"><div className="mol-dialog"><h3>{done === order.points.length ? "开始制作作品？" : "结束拍摄并开始制作？"}</h3><p>{done === order.points.length ? "作品制作预计需要约 5 分钟。" : `已拍摄 ${done} 个点位。拍完整条路线，作品更有故事感。现在制作后仍可继续拍摄。`}</p><div><button onClick={() => setFinishOpen(false)}>{done === order.points.length ? "取消" : "继续拍摄"}</button><button onClick={startProduction}>开始制作</button></div></div></div>}{refundOpen && <div className="mol-dialog-mask"><div className="mol-dialog"><h3>确认申请全额退款？</h3><p>退款金额：¥{order.price.toFixed(2)}</p><p>{order.coupon ? '已使用优惠券按原有效期返还，过期券仍为过期。' : '本订单未使用优惠券。'}退款后剩余拍摄权益终止，已有作品保留。</p><div><button onClick={() => setRefundOpen(false)}>取消</button><button onClick={startRefund}>确认退款</button></div></div></div>}</>}</>;
}

function WorkViewer({ back, delivery, photoCount, versions = [], versionIndex = 0, setVersionIndex }: { back: () => void; delivery?: string[]; photoCount?: number; versions?: Array<{ name: string; points: string[]; time: string }>; versionIndex?: number; setVersionIndex?: (index: number) => void }) {
  const categories = delivery?.length ? delivery : ['航拍快剪', '航拍照片', '精品照片'];
  const [tab, setTab] = useState(categories[0]);
  const [notice, setNotice] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoTotal = photoCount || 1;
  return <div className="work-viewer"><div className="work-bg" style={{ backgroundImage: `url(${cover})` }} /><div className="work-content"><div className="work-status"><span>11:01</span><span>▮▮▮ 4G ▰</span></div><div className="work-top"><button onClick={back} aria-label="返回">‹</button><span>••• ◉</span></div>{versions.length > 0 && <div className="work-version"><select aria-label="选择成片版本" value={versionIndex} onChange={(event) => setVersionIndex?.(Number(event.target.value))}>{versions.map((version, index) => <option key={version.name} value={index}>{version.name}{index === versions.length - 1 ? '（最新）' : ''}</option>)}</select><small>{versions[versionIndex]?.points.join('、')}　{versions[versionIndex]?.time}</small></div>}<div className="work-stage">{(tab === '航拍快剪' || tab === '智能精剪' || tab === '原片素材') ? <video key={versionIndex} src={video} poster={cover} controls playsInline /> : <div className="work-photos"><img src={cover} alt={tab} /><span>{photoIndex + 1} / {photoTotal}</span>{photoTotal > 1 && <div className="work-photo-nav"><button aria-label="上一张照片" disabled={photoIndex === 0} onClick={() => setPhotoIndex(photoIndex - 1)}>‹</button><button aria-label="下一张照片" disabled={photoIndex >= photoTotal - 1} onClick={() => setPhotoIndex(photoIndex + 1)}>›</button></div>}</div>}</div><div className="work-actions"><button onClick={() => setNotice('暂无法评价')}><b><EditOutlined /></b>评价</button><div><button onClick={() => setNotice('暂无法分享')}><b><ShareAltOutlined /></b>分享</button><button onClick={() => setNotice('暂无法下载')}><b><DownloadOutlined /></b>下载</button></div></div>{notice && <p className="work-notice" role="status">{notice}</p>}<div className="work-tabs">{categories.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setPhotoIndex(0); }}>{item}</button>)}</div></div></div>;
}
