import { MoreOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, message, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import './theme-management.css';
import ThemeCreateDrawer from './ThemeCreateDrawer';

type ThemeStatus = '已发布' | '测试中' | '草稿' | '已下架' | '待审核';
type Theme = { id: number; name: string; type: string; status: ThemeStatus; tags: string[]; price: number; originalPrice: number; location: string; createdAt: string; account: string; configuration?: unknown };
const initialThemes: Theme[] = [
  { id: 1, name: '体验包--', type: '套餐主题', status: '已发布', tags: ['无人值守', '假日1111111111111122', '正式运营', '热门'], price: 0.02, originalPrice: 999, location: '模拟机场', createdAt: '2026-10-27 09:13:12', account: 'xxfz' },
  { id: 2, name: '待生成体验包套餐主题M...', type: '套餐主题', status: '测试中', tags: [], price: 0.01, originalPrice: 0.01, location: '手飞场景-科创楼下', createdAt: '2026-10-26 17:11:36', account: 'zhuixing' },
  { id: 3, name: '藏西有风', type: '套餐主题', status: '测试中', tags: ['无人值守', '正式运营'], price: 0.01, originalPrice: 39.9, location: '闻堰老街', createdAt: '2026-10-14 17:38:59', account: 'xsfzsj' },
  { id: 4, name: '主题名称好像', type: '玩法主题', status: '已发布', tags: [], price: 98, originalPrice: 99, location: '故宫南门', createdAt: '2026-10-12 17:26:24', account: 'xsfzsj' },
  { id: 5, name: '玩法主题文言', type: '玩法主题', status: '已发布', tags: [], price: 0.01, originalPrice: 99, location: '故宫东门', createdAt: '2026-10-12 17:25:07', account: 'xsfzsj' },
  { id: 6, name: '套餐 UI 测试', type: '套餐主题', status: '草稿', tags: [], price: 0, originalPrice: 0, location: '萧山科创中心（测试）', createdAt: '2026-10-12 14:15:21', account: 'zhuixing' },
  { id: 7, name: '玩法右侧环绕复制', type: '玩法主题', status: '已下架', tags: [], price: 0.01, originalPrice: 99, location: '手飞场景-科创楼下', createdAt: '2026-10-10 11:03:34', account: 'zhuixing' },
  { id: 8, name: 'msdk 测试玩法左到右', type: '玩法主题', status: '已发布', tags: [], price: 0.01, originalPrice: 99, location: '手飞场景-科创楼下', createdAt: '2026-10-10 10:35:42', account: 'zhuixing' },
  { id: 9, name: '玩法主题-科创刷锅+拉远', type: '玩法主题', status: '已下架', tags: [], price: 0.01, originalPrice: 188, location: '萧山科创中心（测试）', createdAt: '2026-10-09 17:17:15', account: 'zhuixing' },
  { id: 10, name: '复制玩法科创左侧-到右侧', type: '玩法主题', status: '待审核', tags: [], price: 0.01, originalPrice: 99, location: '手飞场景-科创楼下', createdAt: '2026-10-09 15:09:45', account: 'zhuixing' },
];
const options = (values: string[]) => values.map((value) => ({ label: value, value }));
export default function ThemeManagement() {
  const [rows, setRows] = useState(initialThemes);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Theme>();
  const [input, setInput] = useState(''); const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string>(); const [status, setStatus] = useState<string>(); const [type, setType] = useState<string>(); const [location, setLocation] = useState<string>();
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20);
  const [notice, contextHolder] = message.useMessage();
  const filtered = useMemo(() => rows.filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase()) && (!tag || row.tags.includes(tag)) && (!status || row.status === status) && (!type || row.type === type) && (!location || row.location === location)), [rows, query, tag, status, type, location]);
  const reset = () => { setInput(''); setQuery(''); setTag(undefined); setStatus(undefined); setType(undefined); setLocation(undefined); setPage(1); };
  const changeStatus = (id: number, next: ThemeStatus) => { setRows((items) => items.map((item) => item.id === id ? { ...item, status: next } : item)); notice.success(next === '已下架' ? '已下架' : next === '测试中' ? '已进入测试' : '已发布'); };
  const columns: ColumnsType<Theme> = [
    { title: '序号', width: 70, render: (_, __, index) => (page - 1) * pageSize + index + 1 },
    { title: '主题名称', dataIndex: 'name', width: 210, ellipsis: { showTitle: false }, render: (value: string) => <Tooltip title={value}>{value}</Tooltip> },
    { title: '主题类型', dataIndex: 'type', width: 120 },
    { title: '主题状态', dataIndex: 'status', width: 110, render: (value: ThemeStatus) => <Tag color={{ 已发布: 'green', 测试中: 'blue', 草稿: 'purple', 已下架: 'default', 待审核: 'orange' }[value]}>{value}</Tag> },
    { title: '标签', dataIndex: 'tags', width: 210, render: (tags: string[]) => tags.length ? <div className="theme-tags">{tags.slice(0, 2).map((value) => <Tag color="blue" key={value}>{value}</Tag>)}{tags.length > 2 && <Tooltip title={tags.slice(2).join('、')}><Tag>+{tags.length - 2}</Tag></Tooltip>}</div> : '—' },
    { title: '现价（元）', dataIndex: 'price', align: 'right', width: 110, render: (value: number) => value.toFixed(2) },
    { title: '原价（元）', dataIndex: 'originalPrice', align: 'right', width: 110, render: (value: number) => value.toFixed(2) },
    { title: '拍摄点', dataIndex: 'location', width: 150, ellipsis: { showTitle: true } },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    { title: '所属账号', dataIndex: 'account', width: 120 },
    { title: '操作', key: 'actions', width: 120, fixed: 'right', render: (_, row) => {
      const more: Record<ThemeStatus, string[]> = { 草稿: ['删除'], 已下架: ['测试', '编辑', '删除'], 测试中: ['发布', '测试白名单', '删除'], 已发布: ['编辑'], 待审核: ['审核', '编辑', '转成体验包'] };
      const act = (action: string) => {
        if (action === '编辑' && row.status === '草稿' && row.configuration) { setEditingDraft(row); setCreateOpen(true); return; }
        if (action === '删除') { Modal.confirm({ title: '确认删除该主题？', content: row.name, okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setRows(items => items.filter(item => item.id !== row.id)); notice.success('已删除'); } }); return; }
        if (action === '发布') { Modal.confirm({ title: '确认发布该主题？', content: row.name, okText: '发布', cancelText: '取消', onOk: () => changeStatus(row.id, '已发布') }); return; }
        if (action === '测试') { changeStatus(row.id, '测试中'); return; }
        notice.info(`${action}功能待完善`);
      };
      return <Space size={4}>{row.status === '草稿' ? <Button type="link" size="small" onClick={() => act('编辑')}>编辑</Button> : row.status === '待审核' ? null : <Popconfirm title={row.status === '已下架' ? '确认发布该主题？' : '确认下架该主题？'} onConfirm={() => changeStatus(row.id, row.status === '已下架' ? '已发布' : '已下架')}><Button type="link" size="small">{row.status === '已下架' ? '发布' : '下架'}</Button></Popconfirm>}<Dropdown overlayClassName="theme-more-menu" menu={{ items: more[row.status].map(label => ({ key: label, label, danger: label === '删除' })), onClick: ({ key }) => act(key) }} trigger={['click']}><Button type="text" size="small" icon={<MoreOutlined />} aria-label={`${row.name}更多操作`} /></Dropdown></Space>;
    } },
  ];
  return <div className="theme-management">{contextHolder}<div className="theme-toolbar"><div className="theme-filters"><Space.Compact><Input aria-label="搜索主题名称" placeholder="搜索主题名称" value={input} onChange={(e) => setInput(e.target.value)} onPressEnter={() => { setQuery(input); setPage(1); }} /><Button type="primary" aria-label="搜索" icon={<SearchOutlined />} onClick={() => { setQuery(input); setPage(1); }} /></Space.Compact><Select aria-label="标签筛选" placeholder="标签筛选" allowClear value={tag} options={options([...new Set(rows.flatMap((row) => row.tags))])} onChange={(v) => { setTag(v); setPage(1); }} /><Select aria-label="主题状态" placeholder="主题状态" allowClear value={status} options={options(['已发布', '测试中', '草稿', '已下架', '待审核'])} onChange={(v) => { setStatus(v); setPage(1); }} /><Select aria-label="主题类型" placeholder="主题类型" allowClear value={type} options={options(['套餐主题', '玩法主题', '套票主题'])} onChange={(v) => { setType(v); setPage(1); }} /><Select aria-label="拍摄点" placeholder="拍摄点" allowClear value={location} options={options([...new Set(rows.map((row) => row.location))])} onChange={(v) => { setLocation(v); setPage(1); }} /><Button type="link" icon={<ReloadOutlined />} onClick={reset}>重置</Button></div><Space wrap><Button onClick={() => notice.info('体验包管理功能待完善')}>体验包管理（21）</Button><Button icon={<TagsOutlined />} onClick={() => notice.info('标签管理功能待完善')}>标签管理</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDraft(undefined); setCreateOpen(true); }}>新增主题</Button></Space></div><Table<Theme> rowKey="id" columns={columns} dataSource={filtered} scroll={{ x: 1490, y: 'calc(100vh - 280px)' }} pagination={{ current: page, pageSize, total: filtered.length, showTotal: (total) => `共 ${total} 条`, showSizeChanger: true, showQuickJumper: true, onChange: (next, size) => { setPage(size !== pageSize ? 1 : next); setPageSize(size); } }} /><ThemeCreateDrawer open={createOpen} initialDraft={editingDraft} onClose={() => { setCreateOpen(false); setEditingDraft(undefined); }} onSave={(value) => { setRows((items) => editingDraft ? items.map(item => item.id === editingDraft.id ? { ...item, ...value } : item) : [{ ...value, id: Date.now(), account: '当前账号', createdAt: new Date().toLocaleString('sv-SE') }, ...items]); reset(); notice.success(value.status === '草稿' ? '草稿已保存' : '主题已保存'); }} /></div>;
}
