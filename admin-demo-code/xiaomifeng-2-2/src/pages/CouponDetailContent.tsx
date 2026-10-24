import { Button, Descriptions, Space, Tag, Typography } from 'antd';
import type { CouponIssuer, CouponKind, CouponStore, CouponTemplate } from '../mock/coupons';
import { shootingProducts } from '../mock/coupons';

type Props = {
  coupon: CouponTemplate;
  store: CouponStore;
  status: string;
  authorizedIssuers: CouponIssuer[];
  onConfigureAuthorization: () => void;
};

const kindLabel = (kind: CouponKind) => kind === '体验权益券' ? '体验券' : kind;
const kindTone = (kind: CouponKind) => kind === '满减券' ? 'reduction' : kind === '折扣券' ? 'discount' : 'experience';
const statusTone = (status: string) => ({ '发放中': 'active', '未开始': 'upcoming', '已暂停': 'pending', '已结束': 'finished' }[status] || 'default');

export default function CouponDetailContent({ coupon, store, status, authorizedIssuers, onConfigureAuthorization }: Props) {
  const claimed = store.tickets.filter((ticket) => ticket.couponId === coupon.id && ticket.phoneDigits).length;
  const products = shootingProducts.filter((product) => coupon.productIds.includes(product.id));
  const points = coupon.kind === '体验权益券' ? [...new Set(products.map((product) => product.shootingPoint))] : coupon.shootingPoints;
  const themes = coupon.kind === '体验权益券' ? [...new Set(products.map((product) => product.theme))] : coupon.availableRange;

  return <div className="coupon-detail-content">
    <div className="coupon-detail-hero">
      <div><Typography.Title level={4}>{coupon.name}</Typography.Title><Space size={8}><Tag className={`coupon-kind-tag coupon-kind-tag-${kindTone(coupon.kind)}`}>{kindLabel(coupon.kind)}</Tag><Tag className={`coupon-status-tag coupon-status-tag-${statusTone(status)}`}>{status}</Tag></Space></div>
      <div className="coupon-detail-hero-benefit"><span>优惠内容</span><strong>{coupon.benefit}</strong></div>
    </div>
    <section className="coupon-order-detail-section">
      <h3><span />基础信息</h3>
      <Descriptions size="small" column={2}>
        <Descriptions.Item label="优惠券类型">{kindLabel(coupon.kind)}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{coupon.createdAt?.slice(0, 16) || '—'}</Descriptions.Item>
        <Descriptions.Item label="有效期">领取后 {coupon.validityDays} 天可用</Descriptions.Item>
        <Descriptions.Item label="发放总量">{coupon.totalLimit} 张</Descriptions.Item>
        <Descriptions.Item label="已领取">{claimed} 张</Descriptions.Item>
      </Descriptions>
    </section>
    <section className="coupon-order-detail-section">
      <h3><span />优惠规则</h3>
      <Descriptions size="small" column={2}>
        {coupon.kind === '体验权益券' ? <>
          <Descriptions.Item label="适用拍摄点">{points.join('、') || '—'}</Descriptions.Item>
          <Descriptions.Item label="适用主题">{themes.join('、') || '—'}</Descriptions.Item>
        </> : <>
          <Descriptions.Item label="使用门槛">{coupon.minSpend > 0 ? `满 ${coupon.minSpend} 元` : '无门槛'}</Descriptions.Item>
          <Descriptions.Item label={coupon.kind === '折扣券' ? '折扣' : '优惠金额'}>{coupon.kind === '折扣券' ? `${coupon.discountRate} 折` : `${coupon.discountAmount} 元`}</Descriptions.Item>
          <Descriptions.Item label="可用范围">{themes.join('、') || '全部可用'}</Descriptions.Item>
          <Descriptions.Item label="适用拍摄点">{points.join('、')}</Descriptions.Item>
        </>}
        <Descriptions.Item label="使用规则" span={2}>{coupon.description || '—'}</Descriptions.Item>
      </Descriptions>
    </section>
    <section className="coupon-order-detail-section coupon-detail-permission-section">
      <div className="coupon-detail-section-heading"><h3><span />配置权限</h3><Button type="link" onClick={onConfigureAuthorization}>配置</Button></div>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="授权账号">{authorizedIssuers.length ? authorizedIssuers.map((issuer) => `${issuer.account}（${issuer.name}）`).join('、') : '暂未授权账号，当前不可发放'}</Descriptions.Item>
      </Descriptions>
    </section>
  </div>;
}
