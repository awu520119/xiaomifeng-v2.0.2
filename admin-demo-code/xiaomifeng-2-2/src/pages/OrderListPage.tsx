import { useMemo } from 'react';
import type { CouponStore } from '../mock/coupons';
import { toPremiumOrder } from '../features/order-management/mock/constants';
import PremiumOrderListPage from '../features/order-management/pages/PremiumOrderListPage';
import '../features/order-management/pages/order-management.css';

export default function OrderListPage({ store, initialDetail = false, lockDetail = false }: { store: CouponStore; initialDetail?: boolean; lockDetail?: boolean }) {
  const orders = useMemo(() => (store.orders || []).map((order) => toPremiumOrder(order, store)), [store]);
  return <PremiumOrderListPage orders={orders} initialOrderId={initialDetail ? orders.find((order) => order.couponName)?.id : undefined} lockDetail={lockDetail} />;
}
