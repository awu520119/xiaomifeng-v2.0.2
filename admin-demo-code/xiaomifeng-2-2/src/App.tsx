import {
  AppstoreOutlined,
  CameraOutlined,
  MobileOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AlertCenter, DutySchedule, OperationsWorkbench, SolutionLibrary } from './pages/OperationsPages';
import { initialOperationsStore } from './mock/operations';
import type { OperationsStore } from './features/operations/types';
import design from '../design/system.json';
import ThemeManagement from './pages/ThemeManagement';
import NotificationCenter from './components/NotificationCenter';
import TicketMiniPage from './pages/TicketMiniPage';

const { Header, Sider, Content } = Layout;

export default function App() {
  const [operationsStore, setOperationsStore] = useState<OperationsStore>(() => {
    try { const data = JSON.parse(localStorage.getItem('xiaomifeng-operations-demo-v1') || 'null'); if (data?.devices && data?.alerts && data?.workOrders && data?.schedules && data?.solutions) { if (data.alertContentVersion !== 3) data.alerts = initialOperationsStore.alerts; else data.alerts = data.alerts.map((alert: OperationsStore['alerts'][number]) => alert.id === 'CSV-AL-5' && alert.status === '已关闭' && (!alert.closedAt || alert.closedAt === '2026-11-02 15:05:26') && alert.timeline.some(entry => entry.action === '完成处置：已更换电池并确认状态正常' && entry.at === '2026-11-02 14:35:26') ? { ...alert, closedAt: '2026-11-02 15:05:26', timeline: alert.timeline.map(entry => entry.action === '完成处置：已更换电池并确认状态正常' && entry.at === '2026-11-02 14:35:26' ? { ...entry, at: '2026-11-02 15:05:26' } : entry) } : alert); return { ...initialOperationsStore, ...data, alerts: [...data.alerts, ...initialOperationsStore.alerts.filter(alert => !data.alerts.some((item: OperationsStore['alerts'][number]) => item.id === alert.id))], people: data.people ? data.people.map((person: OperationsStore['people'][number]) => ({ ...person, account: person.account || initialOperationsStore.people.find(sample => sample.id === person.id)?.account })) : initialOperationsStore.people, devices: [...data.devices.map((device: OperationsStore['devices'][number]) => { const sample = initialOperationsStore.devices.find(item => item.id === device.id); return device.weather && !device.weather.flightStatus && !device.weather.unavailable && sample?.weather?.flightStatus ? { ...device, weather: sample.weather } : device; }), ...initialOperationsStore.devices.filter(item => item.id === 'DR-105' && !data.devices.some((device: OperationsStore['devices'][number]) => device.id === item.id))] }; } } catch { /* 恢复运维演示数据 */ }
    return initialOperationsStore;
  });
  useEffect(() => { try { localStorage.setItem('xiaomifeng-operations-demo-v1', JSON.stringify({ ...operationsStore, alertContentVersion: 3 })); } catch { /* 当前会话仍可继续演示 */ } }, [operationsStore]);
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(() => [window.location.hash.startsWith('#/business/') ? 'business' : 'operations']);
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = location.pathname.startsWith('/ops/') || location.pathname.startsWith('/business/') || location.pathname.startsWith('/ticket-mini') ? location.pathname : '/ops/dashboard';
  const pageTitles: Record<string, string> = { '/ticket-mini': '景区套票小程序端', '/business/themes': '主题管理', '/ops/dashboard': '运维工作台', '/ops/alerts': '告警中心', '/ops/schedule': '值班排班', '/ops/solutions': '处置方案库' };
  const pageTitle = pageTitles[location.pathname] || pageTitles[selectedKey];

  return (
    <Layout className="app-layout">
      <Sider
        className="app-sider"
        width={design.navigation.width}
        collapsedWidth={design.navigation.collapsedWidth}
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
            { key: '/ticket-mini', icon: <MobileOutlined />, label: '景区套票小程序端' },
            { key: 'business', icon: <AppstoreOutlined />, label: '运营中心', children: [{ key: '/business/themes', label: '主题管理' }] },
            {
              key: 'operations',
              icon: <ToolOutlined />,
              label: '运维管理',
              children: [
                { key: '/ops/dashboard', label: '运维工作台' },
                { key: '/ops/alerts', label: '告警中心' },
                { key: '/ops/schedule', label: '值班排班' },
                { key: '/ops/solutions', label: '处置方案库' },
              ],
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
            <NotificationCenter />
            <Avatar size={28} icon={<UserOutlined />} />
            <span>系统管理员</span>
          </Space>
        </Header>

        <Content className="app-content">
          <Routes>
            <Route path="/ticket-mini" element={<TicketMiniPage />} />
            <Route path="/business/themes" element={<ThemeManagement />} />
            <Route path="/ops/dashboard" element={<OperationsWorkbench store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/ops/alerts" element={<AlertCenter store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/ops/schedule" element={<DutySchedule store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="/ops/solutions" element={<SolutionLibrary store={operationsStore} setStore={setOperationsStore} />} />
            <Route path="*" element={<Navigate to="/ops/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
