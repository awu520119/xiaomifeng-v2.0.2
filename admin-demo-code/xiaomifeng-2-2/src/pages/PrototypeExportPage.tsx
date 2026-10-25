import { Empty, Typography } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import type { CouponStore } from '../mock/coupons';
import CouponListPage from './CouponListPage';
import type { CouponPrototypeView } from './CouponListPage';
import CouponRecordsPage from './CouponRecordsPage';
import CouponIssuerCenterPage from './CouponIssuerCenterPage';
import OperationLogsPage from './OperationLogsPage';
import OrderListPage from './OrderListPage';
import '../features/order-management/pages/order-management.css';
import CouponMiniApp from './mini/CouponMiniApp';

type Props = { page: string; store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };
const couponViews: Record<string, CouponPrototypeView | undefined> = {
  'coupon-list': undefined,
  'coupon-create': 'create',
  'coupon-directed': 'directed',
  'coupon-public': 'public',
  'coupon-detail': 'detail',
  'coupon-codes': 'codeList',
  'coupon-code-detail': 'codeDetail',
};

/** Viewer entry points reuse the live pages, including their forms, dialogs and local interactions. */
export default function PrototypeExportPage({ page, store, setStore }: Props) {
  const miniPages = { 'mini-receive': 'receive', 'mini-redeem': 'redeem', 'mini-wallet': 'wallet', 'mini-checkout': 'checkout', 'mini-product': 'product', 'mini-mine': 'mine', 'mini-order': 'order' } as const;
  if (Object.hasOwn(miniPages, page)) return <CouponMiniApp key={page} page={miniPages[page as keyof typeof miniPages]} store={store} setStore={setStore} />;
  const isIssuerPage = ['issuer-center', 'issuer-coupons', 'issuer-records'].includes(page);
  const isPopupPage = Boolean(couponViews[page]);
  let content;
  if (Object.hasOwn(couponViews, page)) {
    content = <CouponListPage key={page} store={store} setStore={setStore} initialView={couponViews[page]} />;
  } else if (page === 'coupon-usage' || page === 'coupon-issued') {
    content = <CouponRecordsPage key={page} store={store} setStore={setStore} initialTab={page === 'coupon-issued' ? 'issue' : 'ledger'} lockTabs />;
  } else if (isIssuerPage) {
    content = <CouponIssuerCenterPage key={page} store={store} setStore={setStore} initialTab={page === 'issuer-records' ? '发放记录' : '发券'} lockTabs />;
  } else if (page === 'order-coupon-detail') {
    content = <OrderListPage store={store} initialDetail lockDetail />;
  } else if (page === 'operation-logs') {
    content = <OperationLogsPage />;
  } else {
    content = <Empty description="原型页面不存在" />;
  }

  return <main className={`prototype-export-workspace${isPopupPage ? ' prototype-export-isolated' : ''}`} data-prototype-page={page}>
    {isPopupPage && <div className="prototype-stage-mask" aria-hidden="true" />}
    {isIssuerPage && <header className="prototype-issuer-header"><Typography.Title level={4}>{page === 'issuer-records' ? '发放记录' : '发券'}</Typography.Title><Typography.Text type="secondary">系统管理员，admin</Typography.Text></header>}
    {content}
  </main>;
}
