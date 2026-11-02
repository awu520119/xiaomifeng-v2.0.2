import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import { applyAdminDesignVariables } from './design/system';
import { adminTheme } from './theme';
import './styles.css';

applyAdminDesignVariables();

// Offline viewer embeds pages as about:srcdoc, which cannot resolve relative URLs.
const Router = window.location.protocol === 'about:' ? MemoryRouter : HashRouter;
const routerProps = window.location.protocol === 'about:'
  ? { initialEntries: [window.location.hash.slice(1) || '/'] }
  : {};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={adminTheme}>
      <AntApp message={{ maxCount: 1 }}>
        <Router {...routerProps}>
          <App />
        </Router>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);

