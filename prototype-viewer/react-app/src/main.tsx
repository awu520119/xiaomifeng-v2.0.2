import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import { adminTheme } from './theme';
import './styles.css';

const embeddedInitialRoute = (window as Window & { __PROTOTYPE_INITIAL_ROUTE__?: string })
  .__PROTOTYPE_INITIAL_ROUTE__;

const application = <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={adminTheme}>
      <AntApp>
        {embeddedInitialRoute ? (
          <MemoryRouter initialEntries={[embeddedInitialRoute]}>{application}</MemoryRouter>
        ) : (
          <HashRouter>{application}</HashRouter>
        )}
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
