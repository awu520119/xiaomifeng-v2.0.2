import {
  CameraOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  ShoppingOutlined,
  TagOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CouponListPage from './pages/CouponListPage';
import CouponIssuerCenterPage from './pages/CouponIssuerCenterPage';
import CouponRecordsPage from './pages/CouponRecordsPage';
import CouponMiniApp from './pages/mini/CouponMiniApp';
import OperationLogsPage from './pages/OperationLogsPage';
import OrderListPage from './pages/OrderListPage';
import MiniPreviewPage from './pages/MiniPreviewPage';
import { AlertCenter, DutySchedule, OperationsWorkbench, SolutionLibrary, WorkOrderCenter } from './pages/OperationsPages';
import { findPrototypePage } from './pages/registry';
import { couponStoreKey, initialCouponStore, normalizeCouponStore } from './mock/coupons';
import type { CouponStore } from './mock/coupons';
import { prepareExperienceCodes, withClaimedExperienceRights } from './mock/couponFlow';
import { withExperienceIssueSamples } from './mock/experienceIssueSamples';
import { withIssuerCenterSamples } from './mock/issuerCenterSamples';
import { withOrderSamples } from './mock/orderSamples';
import { withMiniCommerceSamples, withMiniProgramSamples } from './mock/miniProgramSamples';
import { initialOperationsStore } from './mock/operations';
import type { OperationsStore } from './features/operations/types';
import design from '../design/system.json';

const { Header, Sider, Content } = Layout;

export default function App() {
  const hydrate = (data: CouponStore) => withClaimedExperienceRights(withMiniCommerceSamples(withMiniProgramSamples(withIssuerCenterSamples(withOrderSamples(prepareExperienceCodes(data))))));
  const [store, setStore] = useState<CouponStore>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(couponStoreKey) || 'null');
      if (data?.version === 3 && Array.isArray(data.templates) && Array.isArray(data.tickets) && Array.isArray(data.plans)) return hydrate(withExperienceIssueSamples(normalizeCouponStore(data)));
    } catch { /* 无有效存储时恢复演示数据 */ }
    return hydrate(withExperienceIssueSamples(initialCouponStore));
  });
  useEffect(() => { try { localStorage.setItem(couponStoreKey, JSON.stringify(store)); } catch { /* 禁用存储时仍可在当前页面演示 */ } }, [store]);
  const [operationsStore, setOperationsStore] = useState<OperationsStore>(() => {
    try { const data = JSON.parse(localStorage.getItem('xiaomifeng-operations-demo-v1') || 'null'); if (data?.devices && data?.alerts && data?.workOrders && data?.schedules && data?.solutions) return data; } catch { /* 恢复运维演示数据 */ }
    return initialOperationsStore;
  });
  useEffect(() => { try { localStorage.setItem('xiaomifeng-operations-demo-v1', JSON.stringify(operationsStore)); } catch { /* 当前会话仍可继续演示 */ } }, [operationsStore]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key !== couponStoreKey || !event.newValue) return; try { const data = JSON.parse(event.newValue); if (data.version === 3 && Array.isArray(data.templates) && Array.isArray(data.tickets) && Array.isArray(data.plans)) setStore(hydrate(withExperienceIssueSamples(normalizeCouponStore(data)))); } catch { /* 忽略无效存储 */ } };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(['marketing', 'orders', 'operations', 'mini']);
  const location = useLocation();
  const navigate = useNavigate();

  const prototypeEntry = findPrototypePage(location.pathname);
  if (prototypeEntry) {
    const PrototypePage = prototypeEntry.component;
    return <PrototypePage key={location.pathname} page={prototypeEntry.route} store={store} setStore={setStore} />;
  }
  if (document.documentElement.dataset.prototypeViewer === 'true') return <div className="prototype-stage-mask" aria-hidden="true" />;

  const miniCommercePaths = ['/mini-preview/product', '/mini-preview/checkout', '/mini-preview/order'];
  const selectedKey = miniCommercePaths.includes(location.pathname) ? '/mini-preview/product' : location.pathname.startsWith('/mini-preview/') ? location.pathname : ['/coupon-directed', '/coupon-public', '/coupon-batches', '/coupon-issues', '/coupon-redemptions', '/coupon-records'].includes(location.pathname) ? '/coupon-records' : location.pathname === '/operation-logs' ? '/operation-logs' : location.pathname === '/orders' ? '/orders' : location.pathname === '/issuer-center' ? '/issuer-center' : location.pathname.startsWith('/ops/') ? location.pathname : '/coupons';
  const pageTitles: Record<string, string> = { '/coupons': '优惠券管理', '/coupon-records': '优惠券记录', '/coupon-issues': '优惠券记录', '/coupon-redemptions': '优惠券记录', '/issuer-center': '发券中心', '/operation-logs': '操作日志', '/orders': '订单列表', '/ops/dashboard': '运维工作台', '/ops/alerts': '告警中心', '/ops/schedule': '值班排班', '/ops/work-orders': '运维工单', '/ops/solutions': '处置方案库', '/mini-preview/receive': '领取优惠券', '/mini-preview/redeem': '兑换体验券', '/mini-preview/wallet': '我的券包', '/mini-preview/checkout': '商品详情与选购', '/mini-preview/product': '商品详情与选购', '/mini-preview/mine': '我的', '/mini-preview/order': '商品详情与选购' };
  const pageTitle = pageTitles[location.pathname] || pageTitles[selectedKey];
  const miniPage = location.pathname === '/coupon-receive' ? 'receive' : location.pathname === '/coupon-my' ? 'wallet' : location.pathname === '/coupon-order' ? 'checkout' : location.pathname.startsWith('/mini/') ? location.pathname.slice('/mini/'.length) : '';
  if (['receive', 'redeem', 'wallet', 'checkout', 'product', 'mine', 'order'].includes(miniPage)) return <CouponMiniApp key={miniPage} page={miniPage as 'receive' | 'redeem' | 'wallet' | 'checkout' | 'product' | 'mine' | 'order'} store={store} setStore={setStore} />;

  return (
    <Layout className="app-layout">
      <Sider
        className="app-sider"
        width={design.layout.sidebarWidth}
        collapsedWidth={design.layout.sidebarCollapsedWidth}
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
                { key: '/coupon-records', label: '优惠券记录' },
                { key: '/issuer-center', label: '发券中心' },
              ],
            },
            {
              key: 'orders',
              icon: <ShoppingOutlined />,
              label: '订单管理',
              children: [{ key: '/orders', label: '订单列表' }],
            },
            {
              key: 'operations',
              icon: <ToolOutlined />,
              label: '运维管理',
              children: [
                { key: '/ops/dashboard', label: '运维工作台' },
                { key: '/ops/alerts', label: '告警中心' },
                { key: '/ops/schedule', label: '值班排班' },
                { key: '/ops/work-orders', label: '运维工单' },
                { key: '/ops/solutions', label: '处置方案库' },
              ],
            },
            {
              key: 'mini',
              icon: <MobileOutlined />,
              label: '用户端小程序',
              children: [
                { key: '/mini-preview/product', label: '商品详情与选购' },
                { key: '/mini-preview/mine', label: '我的' },
                { key: '/mini-preview/receive', label: '领取优惠券' },
                { key: '/mini-preview/redeem', label: '兑换体验券' },
                { key: '/mini-preview/wallet', label: '我的券包' },
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
            <Route path="/issuer-center" element={<CouponIssuerCenterPage store={store} setStore={setStore} />} />
            <Route path="/orders" element={<OrderListPage store={store} />} />
            <Route path="/ops/dashboard" element={<OperationsWorkbench store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/ops/alerts" element={<AlertCenter store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/ops/schedule" element={<DutySchedule store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/ops/work-orders" element={<WorkOrderCenter store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/ops/solutions" element={<SolutionLibrary store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/coupon-directed" element={<Navigate replace to="/coupons" />} />
            <Route path="/coupon-public" element={<Navigate replace to="/coupons" />} />
            <Route path="/coupon-batches" element={<Navigate replace to="/coupons" />} />
            <Route path="/coupon-issues" element={<CouponRecordsPage store={store} setStore={setStore} />} />
            <Route path="/coupon-records" element={<CouponRecordsPage store={store} setStore={setStore} />} />
            <Route path="/coupon-redeem" element={<Navigate replace to="/coupon-issues" />} />
            <Route path="/coupon-redemptions" element={<Navigate replace to="/coupon-issues" />} />
            <Route path="/coupon-codes" element={<Navigate replace to="/coupon-batches" />} />
            <Route path="/coupon-channel-codes" element={<Navigate replace to="/coupon-batches" />} />
            <Route path="/operation-logs" element={<OperationLogsPage />} />
            <Route path="/mini-preview/:page" element={<MiniPreviewPage store={store} />} />
            <Route path="*" element={<Navigate to="/coupons" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
