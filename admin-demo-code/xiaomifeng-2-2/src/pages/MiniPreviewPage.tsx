import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import type { CouponStore } from '../mock/coupons';
import './MiniPreviewPage.css';

const titles: Record<string, string> = {
  receive: '领取优惠券',
  redeem: '兑换体验券',
  wallet: '我的券包',
  checkout: '下单选券',
  product: '商品详情与选套餐',
  mine: '我的',
  order: '订单详情',
};

export default function MiniPreviewPage({ store }: { store: CouponStore }) {
  const { page = '' } = useParams();
  const [exampleCode] = useState(() => store.tickets.find((ticket) => ticket.couponKind === '体验权益券' && ticket.status === '未领取' && !ticket.phoneDigits)?.redeemCode || '');
  if (!Object.hasOwn(titles, page)) return <Navigate to="/mini-preview/wallet" replace />;

  const query = new URLSearchParams({ phone: '13800000001' });
  if (page === 'receive') query.set('planId', 'CL-DEMO-ISSUER-REDUCTION');
  if (page === 'redeem' && exampleCode) query.set('code', exampleCode);
  if (page === 'checkout') query.set('productId', 'SP009');
  if (page === 'order') query.set('orderId', 'ORDER-DEMO-MINI-COMMERCE-001');
  const source = `#/mini/${page}?${query}`;

  return <section className="mini-preview-page" aria-label={`${titles[page]}手机预览`}>
    <div className="mini-preview-stage">
      <iframe className="mini-preview-device" title={`${titles[page]}手机预览`} src={source} />
    </div>
  </section>;
}
