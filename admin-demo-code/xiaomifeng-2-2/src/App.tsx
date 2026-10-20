import {
  CameraOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CouponListPage from './pages/CouponListPage';
import CouponIssueRecordsPage from './pages/CouponIssueRecordsPage';
import OperationLogsPage from './pages/OperationLogsPage';
import { initialCouponCodeRecords, initialCouponTemplates, initialIssueRecords } from './mock/coupons';

const { Header, Sider, Content } = Layout;

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = location.pathname.startsWith('/coupon-issues')
    ? '/coupon-issues'
    : location.pathname.startsWith('/operation-logs') ? '/operation-logs' : '/coupons';
  const pageTitle = selectedKey === '/coupon-issues' ? '发放明细' : selectedKey === '/operation-logs' ? '操作日志' : '优惠券管理';
  const [couponTemplates, setCouponTemplates] = useState(initialCouponTemplates);
  const [issueRecords, setIssueRecords] = useState(initialIssueRecords);
  const [couponCodeRecords, setCouponCodeRecords] = useState(initialCouponCodeRecords);

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
          defaultOpenKeys={collapsed ? [] : [selectedKey === '/operation-logs' ? 'system' : 'marketing']}
          items={[
            {
              key: 'marketing',
              icon: <TagOutlined />,
              label: '营销管理',
              children: [
                { key: '/coupons', label: '优惠券管理' },
                { key: '/coupon-issues', label: '发放明细' },
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
            <Route path="/coupons" element={<CouponListPage templates={couponTemplates} setTemplates={setCouponTemplates} issueRecords={issueRecords} setIssueRecords={setIssueRecords} couponCodeRecords={couponCodeRecords} setCouponCodeRecords={setCouponCodeRecords} />} />
            <Route path="/coupon-issues" element={<CouponIssueRecordsPage templates={couponTemplates} issueRecords={issueRecords} setIssueRecords={setIssueRecords} couponCodeRecords={couponCodeRecords} setCouponCodeRecords={setCouponCodeRecords} />} />
            <Route path="/operation-logs" element={<OperationLogsPage />} />
            <Route path="*" element={<Navigate to="/coupons" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
