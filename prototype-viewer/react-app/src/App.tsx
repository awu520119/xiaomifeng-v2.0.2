import { Avatar, Layout, Space, Typography } from 'antd';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DrawerFormPage from './pages/DrawerFormPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderListPage from './pages/OrderListPage';

const { Header, Content } = Layout;

export default function App() {
  const { pathname } = useLocation();
  const title = pathname.startsWith('/promotion/')
    ? '推广方管理'
    : pathname.startsWith('/settlement/bill/offline/')
      ? '线下对公结算详情'
      : '订单列表';

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Typography.Title level={1}>{title}</Typography.Title>
        <Space size={8} className="account">
          <Avatar size={28}>管</Avatar>
          <span>系统管理员</span>
        </Space>
      </Header>
      <Content className="app-content">
        <Routes>
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/promotion/new" element={<DrawerFormPage />} />
          <Route path="/settlement/bill/offline/:billId" element={<OrderDetailPage />} />
          <Route path="*" element={<Navigate to="/orders" replace />} />
        </Routes>
      </Content>
    </Layout>
  );
}
