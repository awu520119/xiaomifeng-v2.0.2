import source from '../../小程序_详情浏览.html?raw';
import './ticket-mini.css';

// 复用原有可交互线框图，以套票列表作为进入页面。
const documentHtml = source
  .replace("tab: 'single', point: '烟雨画桥', theme: null, orders: 0", "tab: 'multi', point: '烟雨画桥', theme: null, orders: 0")
  .replace('/* ================= 初始化 ================= */\nrenderHome();', "/* ================= 初始化 ================= */\nswitchTab('multi');")
  .replace('</head>', '<style>body{padding:0;min-height:0;background:#fff}.stage{display:block}.phone{width:100%;height:100vh}.screen{border:0}.anno-tag{display:none!important}</style></head>');

export default function TicketMiniPage() {
  return <div className="ticket-mini-page"><div className="ticket-mini-frame"><iframe title="景区套票小程序" srcDoc={documentHtml} sandbox="allow-scripts allow-modals" /></div></div>;
}
