import {
  CameraOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CouponReceivePage from './pages/CouponReceivePage';
import CouponListPage from './pages/CouponListPage';
import CouponIssueRecordsPage from './pages/CouponIssueRecordsPage';
import { RedemptionRecordsPage } from './pages/CouponRedemptionPages';
import { MiniOrderPage, MyCouponsPage } from './pages/CouponMiniProgramPage';
import OperationLogsPage from './pages/OperationLogsPage';
import { couponStoreKey, initialCouponStore } from './mock/coupons';
import type { CouponStore } from './mock/coupons';
import { prepareExperienceCodes } from './mock/couponFlow';
import { withExperienceIssueSamples } from './mock/experienceIssueSamples';

const { Header, Sider, Content } = Layout;

export default function App() {
  const [store, setStore] = useState<CouponStore>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(couponStoreKey) || 'null');
      if (data?.version === 3 && Array.isArray(data.templates) && Array.isArray(data.tickets) && Array.isArray(data.plans)) return prepareExperienceCodes(withExperienceIssueSamples(data));
    } catch { /* 无有效存储时恢复演示数据 */ }
    return prepareExperienceCodes(withExperienceIssueSamples(initialCouponStore));
  });
  useEffect(() => { try { localStorage.setItem(couponStoreKey, JSON.stringify(store)); } catch { /* 禁用存储时仍可在当前页面演示 */ } }, [store]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key !== couponStoreKey || !event.newValue) return; try { const data = JSON.parse(event.newValue); if (data.version === 3 && Array.isArray(data.templates) && Array.isArray(data.tickets) && Array.isArray(data.plans)) setStore(data); } catch { /* 忽略无效存储 */ } };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(['marketing']);
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = ['/coupon-directed', '/coupon-public', '/coupon-batches', '/coupon-issues'].includes(location.pathname) ? '/coupon-issues' : ['/coupon-redeem', '/coupon-redemptions'].includes(location.pathname) ? '/coupon-redemptions' : location.pathname === '/operation-logs' ? '/operation-logs' : '/coupons';
  const pageTitles: Record<string, string> = { '/coupons': '优惠券管理', '/coupon-directed': '定向发放', '/coupon-public': '公开领取', '/coupon-batches': '券码批次', '/coupon-issues': '发放记录', '/coupon-redeem': '核销工作台', '/coupon-redemptions': '活动发券', '/operation-logs': '操作日志' };
  const pageTitle = pageTitles[location.pathname] || pageTitles[selectedKey];
  useEffect(() => { setOpenKeys(selectedKey === '/operation-logs' ? ['system'] : ['marketing']); }, [selectedKey]);
  if (location.pathname === '/coupon-receive') return <CouponReceivePage store={store} setStore={setStore} />;
  if (location.pathname === '/coupon-my') return <MyCouponsPage store={store} />;
  if (location.pathname === '/coupon-order') return <MiniOrderPage store={store} setStore={setStore} />;

  return (
    <Layout className="app-layout">
      <Sider
        className="app-sider"
        width={220}
        collapsedWidth={80}
        collapsed={collapsed}
        trigger={null}
      >
        <div className="brand" aria-label="形影随拍">
          <div className="brand-mark"><CameraOutlined /></div>
          {!collapsed && <span className="brand-name">形影随拍</span>}
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[selectedKey]}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={setOpenKeys}
          items={[
            {
              key: 'marketing',
              icon: <TagOutlined />,
              label: '营销管理',
              children: [
                { key: '/coupons', label: '优惠券管理' },
                { key: '/coupon-issues', label: '发放记录' },
                { key: '/coupon-redemptions', label: '活动发券' },
              ],
            },
            {
              key: 'system',
              icon: <SafetyCertificateOutlined />,
              label: '系统管理',
              children: [{ key: '/operation-logs', label: '操作日志' }],
            },
          ]}
          onClick={({ key }) => navigate(key)}
        />
        <div className="sider-trigger">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            aria-label={collapsed ? '展开导航' : '收起导航'}
            onClick={() => setCollapsed((value) => !value)}
          />
        </div>
      </Sider>

      <Layout className="app-workspace">
        <Header className="app-header">
          <Typography.Title level={1}>{pageTitle}</Typography.Title>
          <Space size={8} className="account">
            <Avatar size={28} icon={<UserOutlined />} />
            <span>系统管理员</span>
          </Space>
        </Header>

        <Content className="app-content">
          <Routes>
            <Route path="/coupons" element={<CouponListPage store={store} setStore={setStore} />} />
            <Route path="/coupon-directed" element={<Navigate replace to="/coupons" />} />
            <Route path="/coupon-public" element={<Navigate replace to="/coupons" />} />
            <Route path="/coupon-batches" element={<Navigate replace to="/coupons" />} />
            <Route path="/coupon-issues" element={<CouponIssueRecordsPage key="issued" store={store} setStore={setStore} />} />
            <Route path="/coupon-redeem" element={<Navigate replace to="/coupon-redemptions" />} />
            <Route path="/coupon-redemptions" element={<RedemptionRecordsPage store={store} setStore={setStore} />} />
            <Route path="/coupon-codes" element={<Navigate replace to="/coupon-batches" />} />
            <Route path="/coupon-channel-codes" element={<Navigate replace to="/coupon-batches" />} />
            <Route path="/operation-logs" element={<OperationLogsPage />} />
            <Route path="*" element={<Navigate to="/coupons" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
