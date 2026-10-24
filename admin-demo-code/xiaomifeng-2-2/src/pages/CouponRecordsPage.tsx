import { Tabs } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CouponStore } from '../mock/coupons';
import CouponIssueRecordsPage from './CouponIssueRecordsPage';

type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; initialTab?: 'ledger' | 'issue' };

/** 优惠券记录统一入口：券使用记录追踪用户券状态，定向发放记录追踪实际发放事件。 */
export default function CouponRecordsPage({ store, setStore, initialTab }: Props) {
  const location = useLocation();
  const [activeKey, setActiveKey] = useState(initialTab || (location.pathname === '/coupon-issues' ? 'issue' : 'ledger'));
  useEffect(() => { setActiveKey(initialTab || (location.pathname === '/coupon-issues' ? 'issue' : 'ledger')); }, [location.pathname, initialTab]);
  return (
    <section className="coupon-records-page">
      <div className="coupon-records-tabs-card">
        <Tabs
          className="coupon-records-tabs"
          activeKey={activeKey}
          onChange={(key) => setActiveKey(key === 'issue' ? 'issue' : 'ledger')}
          items={[
            {
              key: 'ledger',
              label: '券使用记录',
              children: <CouponIssueRecordsPage store={store} setStore={setStore} mode="ledger" />,
            },
            {
              key: 'issue',
              label: '定向发放记录',
              children: <CouponIssueRecordsPage store={store} setStore={setStore} mode="issue" />,
            },
          ]}
        />
      </div>
    </section>
  );
}
