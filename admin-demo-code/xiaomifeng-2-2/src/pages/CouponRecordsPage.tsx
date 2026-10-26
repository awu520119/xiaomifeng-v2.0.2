import type { Dispatch, SetStateAction } from 'react';
import type { CouponStore } from '../mock/coupons';
import CouponIssueRecordsPage from './CouponIssueRecordsPage';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>> };

/** 优惠券记录统一入口：券使用记录追踪用户券状态，定向发放记录追踪实际发放事件。 */
export default function CouponRecordsPage({ store, setStore }: Props) {
  return <CouponIssueRecordsPage store={store} setStore={setStore} mode="ledger" />;
}
