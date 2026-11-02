import { App, Badge, Button, Drawer, Empty, Tabs, Tag, Tooltip } from 'antd';
import { BellOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { notificationSamples } from '../mock/notifications';
import './notification-center.css';

const storageKey = 'xiaomifeng-notifications-read-v1';
export default function NotificationCenter() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [readIds, setReadIds] = useState<string[]>(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []; } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(readIds)); } catch { /* 会话内继续保留已读状态 */ } }, [readIds]);
  const unread = notificationSamples.filter(item => !readIds.includes(item.id)).length;
  const rows = notificationSamples.filter(item => tab === 'all' || (tab === 'read' ? readIds.includes(item.id) : !readIds.includes(item.id)));
  const readNotice = (item: typeof notificationSamples[number]) => {
    setReadIds(current => current.includes(item.id) ? current : [...current, item.id]);
    message.info(item.target ? `将打开${item.target.replace(/^该|^跳转/g, '')}（原型仅提示）` : '该通知暂未配置详情入口（原型仅提示）');
  };
  return <>
    <Tooltip title="通知中心"><Badge count={unread} size="small"><Button type="text" icon={<BellOutlined />} aria-label="打开通知中心" onClick={() => setOpen(true)} /></Badge></Tooltip>
    <Drawer title="站内通知" className="notification-center" size={600} open={open} onClose={() => setOpen(false)}>
      <div className="notification-toolbar"><Tabs activeKey={tab} onChange={setTab} items={[{ key: 'all', label: '全部' }, { key: 'unread', label: <span>未读 {unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}</span> }, { key: 'read', label: '已读' }]} /><Button className="notification-read-all" disabled={!unread} onClick={() => { setReadIds(notificationSamples.map(item => item.id)); message.success('已将全部通知标记为已读'); }}>全部已读</Button></div>
      <div className="notification-list" aria-label="通知列表">{rows.length ? rows.map(item => {
        const read = readIds.includes(item.id);
        return <button type="button" key={item.id} className={`notification-item ${read ? 'is-read' : 'is-unread'}`} onClick={() => readNotice(item)} aria-label={`查看通知：${item.content}`}>
          <span className="notification-dot" /><span className="notification-icon"><ExclamationCircleOutlined /></span>
          <span className="notification-content"><span className="notification-heading"><span className="notification-title" title={item.content}>{item.content}</span><Tag color="error">{item.category}</Tag></span><span className="notification-description">{item.content}</span><span className="notification-meta"><time>{item.time}</time><span className="notification-read-state">{read ? '已读' : '未读'}</span></span></span>
        </button>;
      }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tab === 'unread' ? '暂无未读通知' : '暂无已读通知'} />}</div>
    </Drawer>
  </>;
}
