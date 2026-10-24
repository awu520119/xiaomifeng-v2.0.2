import { App, Button, DatePicker, Drawer, Dropdown, Form, Input, InputNumber, Modal, Popover, QRCode, Radio, Select, Space, Table, Tag, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined, EllipsisOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CouponClaimPlan, CouponIssueRecord, CouponKind, CouponStore, CouponTemplate } from '../mock/coupons';
import { authorizedIssuerIds, canCurrentOperatorIssue, canIssueCoupon, couponIssuerOptions, couponShootingPointOptions, couponTemplateStatus, createTicket, currentCouponOperatorId, couponKinds, couponLocalTime, couponRuleText, parsePhones, phoneListError, remainingQuota, shootingPointOptions, shootingProducts, uniqueCouponId } from '../mock/coupons';
import { couponUsageStatus, couponUsageStatuses, issueDirected, prepareExperienceCodes } from '../mock/couponFlow';
import { downloadExperienceCouponZip, downloadQrCode, receiveUrl } from '../utils/couponExport';
import CouponDetailContent from './CouponDetailContent';
import CouponCodeDetailContent from './CouponCodeDetailContent';

export type CouponPrototypeView = 'create' | 'directed' | 'public' | 'detail' | 'codeList' | 'codeDetail';
type Props = { store: CouponStore; setStore: Dispatch<SetStateAction<CouponStore>>; initialView?: CouponPrototypeView };
type Values = { name: string; kind: CouponKind; productIds: string[]; minSpend: number; discountAmount: number; discountRate: number; shootingPoints: string[]; allThemes: boolean; themes: string[]; validityDays: number; totalLimit: number; description?: string; remark?: string };
const label = (kind: CouponKind) => kind === '体验权益券' ? '体验券' : kind;
const kindTag = (kind: CouponKind) => <Tag className={`coupon-kind-tag ${kind === '满减券' ? 'coupon-kind-tag-reduction' : kind === '折扣券' ? 'coupon-kind-tag-discount' : 'coupon-kind-tag-experience'}`}>{label(kind)}</Tag>;
const statusTone = (value: string) => ({ '发放中': 'active', '已使用': 'active', '未开始': 'upcoming', '待使用': 'pending', '已暂停': 'pending', '使用中': 'progress', '已使用（退款）': 'refunded', '已结束': 'finished', '已过期': 'expired', '已作废': 'danger' }[value] || 'default');
const statusTag = (value: string) => <Tag className={`coupon-status-tag coupon-status-tag-${statusTone(value)}`}>{value}</Tag>;
export default function CouponListPage({ store, setStore, initialView }: Props) {
  const initializedView = useRef<CouponPrototypeView | undefined>(undefined);
  const navigate = useNavigate(); const [params] = useSearchParams(); const { message, modal } = App.useApp();
  const [keyword, setKeyword] = useState(''); const [kindFilter, setKindFilter] = useState<CouponKind>(); const [statusFilter, setStatusFilter] = useState<string>(); const [point, setPoint] = useState<string>();
  const [distributionMode, setDistributionMode] = useState<'directed' | 'public' | 'codeList' | null>(null); const [distributionCouponId, setDistributionCouponId] = useState<string | null>(null); const [createdPlan, setCreatedPlan] = useState<CouponClaimPlan | null>(null); const [directForm] = Form.useForm<{ phones: string }>(); const [codeDirectForm] = Form.useForm<{ phone: string }>(); const [codeDetailId, setCodeDetailId] = useState<string | null>(null); const codeDetail = store.tickets.find((ticket) => ticket.id === codeDetailId); const [editingId, setEditingId] = useState<string | null>(null); const [formOpen, setFormOpen] = useState(false); const [form] = Form.useForm<Values>(); const [currentPage, setCurrentPage] = useState(1); const [pageSize, setPageSize] = useState(20);
  const [formKind, setFormKind] = useState<CouponKind>('满减券'); const [formAllThemes, setFormAllThemes] = useState(true); const [formShootingPoints, setFormShootingPoints] = useState<string[]>(['全部拍摄点']);
  const [detailId, setDetailId] = useState<string | null>(params.get('couponId')); const detail = store.templates.find((row) => row.id === detailId);
  const [authorizationCouponId, setAuthorizationCouponId] = useState<string | null>(null); const authorizationCoupon = store.templates.find((row) => row.id === authorizationCouponId); const [authorizationSelection, setAuthorizationSelection] = useState<string[]>([]);
  const kind = formKind; const allThemes = formAllThemes;
  const locked = Boolean(editingId); const distributionCoupon = store.templates.find((row) => row.id === distributionCouponId);
  const status = (row: CouponTemplate) => couponTemplateStatus(row, store.tickets);
  const issued = (id: string) => store.tickets.filter((t) => t.couponId === id && Boolean(t.phoneDigits));
  const [codeKeyword, setCodeKeyword] = useState(''); const [codeState, setCodeState] = useState<string>();
  const [exportingCodes, setExportingCodes] = useState(false);
  const rows = store.templates.filter((row) => couponKinds.includes(row.kind) && (!keyword || [row.name, row.id].some((s) => s.includes(keyword))) && (!kindFilter || row.kind === kindFilter) && (!statusFilter || status(row) === statusFilter) && (!point || row.shootingPoints.includes(point) || row.shootingPoints.includes('全部拍摄点')));
  const openCreate = () => { setEditingId(null); setFormKind('满减券'); setFormAllThemes(true); setFormShootingPoints(['全部拍摄点']); form.resetFields(); form.setFieldsValue({ kind: '满减券', productIds: [], minSpend: 100, discountAmount: 20, discountRate: 8, shootingPoints: ['全部拍摄点'], allThemes: true, themes: [], validityDays: 30, totalLimit: 100 }); setFormOpen(true); };
  const openEdit = (row: CouponTemplate) => { const allThemesValue = row.availableRange.includes('全部可用'); setEditingId(row.id); setFormKind(row.kind); setFormAllThemes(allThemesValue); setFormShootingPoints(row.shootingPoints); form.resetFields(); form.setFieldsValue({ ...row, allThemes: allThemesValue, themes: allThemesValue ? [] : row.availableRange }); setFormOpen(true); };
  const availableThemeOptions = [...new Set(shootingProducts.filter((product) => formShootingPoints.includes('全部拍摄点') || formShootingPoints.includes(product.shootingPoint)).map((product) => product.theme))];
  const handleFormValuesChange = (changed: Partial<Values>) => {
    if (changed.kind) setFormKind(changed.kind);
    if (typeof changed.allThemes === 'boolean') setFormAllThemes(changed.allThemes);
    if (changed.shootingPoints) {
      const incoming = changed.shootingPoints;
      const points = incoming.includes('全部拍摄点') && !formShootingPoints.includes('全部拍摄点')
        ? ['全部拍摄点']
        : formShootingPoints.includes('全部拍摄点') && incoming.length > 1
          ? incoming.filter((point) => point !== '全部拍摄点')
          : incoming.includes('全部拍摄点') ? ['全部拍摄点'] : incoming;
      const themes = form.getFieldValue('themes') || [];
      const allowedThemes = new Set(shootingProducts.filter((product) => points.includes('全部拍摄点') || points.includes(product.shootingPoint)).map((product) => product.theme));
      const nextThemes = themes.filter((theme: string) => allowedThemes.has(theme));
      setFormShootingPoints(points);
      if (points.length !== incoming.length || points.some((point, index) => point !== incoming[index])) form.setFieldValue('shootingPoints', points);
      if (nextThemes.length !== themes.length) form.setFieldValue('themes', nextThemes);
    }
  };
  const openAuthorization = (row: CouponTemplate) => { setAuthorizationCouponId(row.id); setAuthorizationSelection(authorizedIssuerIds(row)); };
  const saveAuthorization = () => {
    if (!authorizationCoupon) return;
    setStore((current) => ({ ...current, templates: current.templates.map((row) => row.id === authorizationCoupon.id ? { ...row, authorizedIssuerIds: authorizationSelection } : row) }));
    setAuthorizationCouponId(null); message.success('发券权限已更新');
  };
  const save = async () => {
    const values = await form.validateFields().catch(() => null); if (!values) return;
    const old = store.templates.find((row) => row.id === editingId);
    const selectedPoints = values.shootingPoints || ['全部拍摄点'];
    const selected = shootingProducts.filter((product) => (selectedPoints.includes('全部拍摄点') || selectedPoints.includes(product.shootingPoint)) && (values.themes || []).includes(product.theme));
    const next: CouponTemplate = { id: old?.id || uniqueCouponId('CP'), name: values.name.trim(), kind: values.kind, benefit: '', validityDays: values.validityDays, productIds: values.kind === '体验权益券' ? selected.map((product) => product.id) : [], rightsCount: values.kind === '体验权益券' ? old?.rightsCount || 1 : 1, minSpend: values.kind === '体验权益券' ? 0 : values.minSpend, discountAmount: ['满减券', '抵扣券'].includes(values.kind) ? values.discountAmount : 0, discountRate: values.kind === '折扣券' ? values.discountRate : 10, shootingPoints: values.kind === '体验权益券' ? values.shootingPoints : (values.allThemes ? ['全部拍摄点'] : values.shootingPoints), availableRange: values.kind === '体验权益券' ? values.themes : values.allThemes ? ['全部可用'] : values.themes, totalLimit: values.totalLimit, perUserLimit: old?.perUserLimit || values.totalLimit, sponsor: old?.sponsor || '平台', status: old?.status || '启用', createdAt: old?.createdAt || couponLocalTime(), description: values.description?.trim(), authorizedIssuerIds: old?.authorizedIssuerIds || [currentCouponOperatorId] };
    next.benefit = couponRuleText(next);
    if (old && locked) { next.kind = old.kind; next.benefit = old.benefit; next.validityDays = old.validityDays; next.productIds = old.productIds; next.rightsCount = old.rightsCount; next.minSpend = old.minSpend; next.discountAmount = old.discountAmount; next.discountRate = old.discountRate; next.shootingPoints = old.shootingPoints; next.availableRange = old.availableRange; next.totalLimit = old.totalLimit; next.perUserLimit = old.perUserLimit; }
    setStore((current) => {
      let tickets = current.tickets;
      if (old && !locked) {
        let kept = 0;
        tickets = tickets.filter((ticket) => ticket.couponId !== old.id || (next.kind === '体验权益券' && kept++ < next.totalLimit)).map((ticket) => ticket.couponId === old.id ? { ...createTicket(next, ticket.source), id: ticket.id, redeemCode: ticket.redeemCode, generatedAt: ticket.generatedAt } : ticket);
      } else if (old) tickets = tickets.map((ticket) => ticket.couponId === old.id ? { ...ticket, couponName: next.name } : ticket);
      return prepareExperienceCodes({ ...current, templates: old ? current.templates.map((row) => row.id === old.id ? next : row) : [next, ...current.templates], tickets });
    }); setFormOpen(false); message.success(old ? '已保存' : '创建成功');
  };
  const ticketState = (ticket: CouponIssueRecord) => ticket.phoneDigits ? couponUsageStatus(ticket, store) : '未领取';
  const exportableExperienceCodes = distributionCoupon?.kind === '体验权益券'
    ? store.tickets.filter((ticket) => ticket.couponId === distributionCoupon.id && !ticket.phoneDigits && ticketState(ticket) === '未领取')
    : [];
  const exportExperienceCodes = async () => {
    if (!distributionCoupon || !exportableExperienceCodes.length || exportingCodes) return;
    setExportingCodes(true);
    try {
      await downloadExperienceCouponZip(exportableExperienceCodes, distributionCoupon.name);
      message.success(`已导出 ${exportableExperienceCodes.length} 张未领取体验券`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败，请重试');
    } finally { setExportingCodes(false); }
  };
  const serialNo = (ticket: CouponIssueRecord) => ticket.serialNo || `TY-${String(store.tickets.filter((item) => item.couponKind === '体验权益券').findIndex((item) => item.id === ticket.id) + 1).padStart(6, '0')}`;
  const products = (ids: string[]) => shootingProducts.filter((p) => ids.includes(p.id)).map((p) => p.name).join('、');
  const openDistribution = (row: CouponTemplate, mode: 'directed' | 'public' | 'codeList') => {
    if (mode !== 'codeList' && !canCurrentOperatorIssue(row)) { message.error('当前账号未获得该优惠券的发放权限'); return; }
    setDistributionCouponId(row.id); setDistributionMode(mode); setCodeKeyword(''); setCodeState(undefined);
    if (mode === 'public') {
      let plan = store.plans.find((item) => item.couponId === row.id);
      if (!plan) {
        plan = { id: uniqueCouponId('CL'), couponId: row.id, allowedPhones: [], status: row.status, createdAt: couponLocalTime(), operatorId: currentCouponOperatorId, operatorName: '系统管理员' };
        setStore((current) => current.plans.some((item) => item.couponId === row.id) ? current : { ...current, plans: [plan!, ...current.plans] });
      }
      setCreatedPlan(plan);
    } else setCreatedPlan(null);
  };
  const closeDistribution = () => { if (distributionMode === 'directed') directForm.resetFields(); setDistributionMode(null); setDistributionCouponId(null); setCreatedPlan(null); };
  const issueDirectly = async () => {
    const values = await directForm.validateFields().catch(() => null); if (!values || !distributionCoupon) return;
    if (!canCurrentOperatorIssue(distributionCoupon)) { message.error('当前账号未获得该优惠券的发放权限'); return; }
    const phones = parsePhones(values.phones); const validationError = phoneListError(phones);
    if (validationError) { directForm.setFields([{ name: 'phones', errors: [validationError] }]); return; }
    if (!canIssueCoupon(distributionCoupon, store.tickets) || phones.length > remainingQuota(distributionCoupon, store.tickets)) { message.error('该券已暂停、已结束或剩余名额不足'); return; }
    try {
      const next = issueDirected(store, distributionCoupon.id, values.phones);
      setStore(next); closeDistribution();
      const batch = next.batches![0];
      modal.success({ title: `已发放 ${phones.length} 张优惠券`, content: `批次：${batch.id}`, okText: '查看本次记录', onOk: () => navigate(`/coupon-issues?batchNo=${encodeURIComponent(batch.id)}`) });
    } catch (error) { message.error((error as Error).message); }
  };
  const openCodeDetail = (ticketId: string) => { setCodeDetailId(ticketId); };
  const closeCodeDetail = () => { if (codeDetail && !codeDetail.phoneDigits) codeDirectForm.resetFields(); setCodeDetailId(null); };
  const issueSelectedCode = async () => {
    const values = await codeDirectForm.validateFields().catch(() => null); if (!values || !codeDetail || !distributionCoupon) return;
    if (!canCurrentOperatorIssue(distributionCoupon)) { message.error('当前账号未获得该优惠券的发放权限'); return; }
    try {
      const next = issueDirected(store, distributionCoupon.id, values.phone, codeDetail.id);
      codeDirectForm.resetFields(); setStore(next); setCodeDetailId(null); message.success(`编号 ${codeDetail.serialNo} 已定向发放`);
    } catch (error) { message.error((error as Error).message); }
  };
  const copyClaimLink = async (plan: CouponClaimPlan) => { const url = receiveUrl('planId=' + encodeURIComponent(plan.id)); try { await navigator.clipboard.writeText(url); message.success('领取链接已复制'); } catch { message.info(url); } };
  const confirmStop = (row: CouponTemplate) => modal.confirm({ title: '暂停发放这张优惠券？', content: '暂停后不能继续发放或领取，已领取的券仍按原规则使用。', okText: '确认暂停', okButtonProps: { danger: true }, cancelText: '取消', onOk: () => setStore((current) => ({ ...current, templates: current.templates.map((item) => item.id === row.id ? { ...item, status: '已停用' } : item), plans: current.plans.map((plan) => plan.couponId === row.id ? { ...plan, status: '已停用' } : plan) })) });
  const enableCoupon = (row: CouponTemplate) => {
    if (remainingQuota(row, store.tickets) <= 0) { message.error('优惠券剩余量为 0，不能恢复发放'); return; }
    setStore((current) => ({ ...current, templates: current.templates.map((item) => item.id === row.id ? { ...item, status: '启用' } : item), plans: current.plans.map((plan) => plan.couponId === row.id ? { ...plan, status: '启用' } : plan) }));
    message.success('优惠券已恢复发放');
  };
  useEffect(() => {
    if (!initialView || initializedView.current === initialView) return;
    const price = store.templates.find((row) => row.kind === '满减券' && canIssueCoupon(row, store.tickets))
      || store.templates.find((row) => row.kind === '折扣券');
    const experience = store.templates.find((row) => row.kind === '体验权益券');
    initializedView.current = initialView;
    if (initialView === 'create') openCreate();
    if (initialView === 'detail') setDetailId((store.templates.find((row) => row.description) || price || experience)?.id || null);
    if ((initialView === 'directed' || initialView === 'public') && price) openDistribution(price, initialView);
    if (initialView === 'codeList' && experience) openDistribution(experience, 'codeList');
    if (initialView === 'codeDetail' && experience) {
      const ticket = store.tickets.find((row) => row.couponId === experience.id && !row.phoneDigits)
        || store.tickets.find((row) => row.couponId === experience.id);
      setDistributionCouponId(experience.id);
      setCodeDetailId(ticket?.id || null);
    }
  }, [initialView, store.templates, store.tickets]);
return <><section className="coupon-page admin-list-page"><div className="admin-filter-card"><div className="admin-filter-controls"><Space wrap><div className="coupon-search-control"><Input className="coupon-search-control-input" value={keyword} onChange={(e) => { setKeyword(e.target.value); setCurrentPage(1); }} onPressEnter={() => setCurrentPage(1)} placeholder="搜索券名称" allowClear /><Button className="coupon-search-control-button" icon={<SearchOutlined />} aria-label="搜索券" onClick={() => setCurrentPage(1)} /></div><Select value={kindFilter} onChange={(value) => { setKindFilter(value); setCurrentPage(1); }} placeholder="券类型" allowClear style={{ width: 135 }} options={couponKinds.map((v) => ({ value: v, label: label(v) }))} /><Select value={statusFilter} onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }} placeholder="状态" allowClear style={{ width: 120 }} options={['发放中', '已暂停', '已结束'].map((v) => ({ value: v, label: v }))} /><Select value={point} onChange={(value) => { setPoint(value); setCurrentPage(1); }} placeholder="拍摄点" allowClear style={{ width: 140 }} options={shootingPointOptions.map((v) => ({ value: v, label: v }))} /><Button type="link" icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setKindFilter(undefined); setStatusFilter(undefined); setPoint(undefined); setCurrentPage(1); }}>重置</Button></Space></div><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建优惠券</Button></div><div className="admin-list-card"><Table rowKey="id" dataSource={rows} scroll={{ x: 1150, y: 'calc(100vh - 320px)' }} pagination={{ current: currentPage, pageSize, onChange: (page, size) => { setCurrentPage(page); setPageSize(size); }, showSizeChanger: true, showTotal: (n) => `共 ${n} 条` }} columns={[{ title: '序号', width: 64, render: (_: unknown, __: CouponTemplate, index: number) => (currentPage - 1) * pageSize + index + 1 }, { title: '券名称', width: 170, render: (_, row: CouponTemplate) => <Button type="link" className="coupon-name-link" style={{ maxWidth: '100%' }} onClick={() => setDetailId(row.id)}>{row.name}</Button> }, { title: '券类型', width: 85, render: (_, row: CouponTemplate) => kindTag(row.kind) }, { title: '适用范围', width: 150, render: (_, row: CouponTemplate) => <Typography.Text ellipsis={{ tooltip: true }} style={{ maxWidth: '100%' }}>{row.kind === '体验权益券' ? products(row.productIds) : `${row.shootingPoints.join('、')} / ${row.availableRange.join('、')}`}</Typography.Text> }, { title: '有效期', width: 145, render: (_, row: CouponTemplate) => <span>领取后 {row.validityDays} 天可用</span> }, { title: '状态', width: 85, render: (_, row: CouponTemplate) => statusTag(status(row)) }, { title: '已领取/总量', width: 120, render: (_, row: CouponTemplate) => <span>{issued(row.id).filter((t) => t.phoneDigits).length} / {row.totalLimit}</span> }, { title: '创建时间', dataIndex: 'createdAt', width: 150, render: (value: string) => value?.slice(0, 16) || '—' }, { title: '操作', fixed: 'right' as const, width: 160, render: (_, row: CouponTemplate) => { const canIssue = canIssueCoupon(row, store.tickets) && canCurrentOperatorIssue(row); const rowStatus = status(row); const priceIssueItems = [{ key: 'directed', label: '定向发放', disabled: !canIssue, onClick: () => openDistribution(row, 'directed') }, { key: 'public', label: '公开发放', disabled: !canIssue, onClick: () => openDistribution(row, 'public') }]; return <Space size={0} className="coupon-row-actions"><Button type="link" onClick={() => setDetailId(row.id)}>详情</Button>{row.kind === '体验权益券' ? <Button type="link" onClick={() => openDistribution(row, 'codeList')}>查看券码</Button> : <Dropdown trigger={['click']} menu={{ items: priceIssueItems }}><Button type="link">发放</Button></Dropdown>}<Dropdown trigger={['click']} menu={{ items: [{ key: 'edit', label: '编辑', onClick: () => openEdit(row) }, { key: 'authorization', label: '发券权限', onClick: () => openAuthorization(row) }, ...(row.status === '已停用' ? [{ key: 'enable', label: '恢复发放', disabled: remainingQuota(row, store.tickets) <= 0, onClick: () => enableCoupon(row) }] : [{ key: 'stop', label: '暂停发放', danger: true, disabled: rowStatus === '已结束', onClick: () => confirmStop(row) }])] }}><Button type="text" className="coupon-more-button" icon={<EllipsisOutlined />} aria-label={`更多操作：${row.name}`} title="更多操作" /></Dropdown></Space>; } }]} /></div></section>
    <Drawer className="coupon-edit-drawer" title={editingId ? '编辑优惠券' : '创建优惠券'} size={720} open={formOpen} onClose={() => setFormOpen(false)} destroyOnHidden footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={() => setFormOpen(false)}>取消</Button><Button type="primary" onClick={save}>保存</Button></Space>}><Form form={form} layout="vertical" onValuesChange={handleFormValuesChange}><h3 className="coupon-form-section-title">基础信息</h3><Form.Item name="name" label="优惠券名称" rules={[{ required: true, whitespace: true }]}><Input maxLength={50} placeholder="请输入优惠券名称" /></Form.Item><fieldset disabled={locked} className={`coupon-fieldset ${locked ? 'coupon-fieldset-readonly' : ''}`}><Form.Item name="kind" label="优惠券类型" rules={[{ required: true }]}><Radio.Group disabled={locked} optionType="button" buttonStyle="solid" options={couponKinds.map((v) => ({ value: v, label: label(v) }))} /></Form.Item><h3 className="coupon-form-section-title">优惠规则</h3>{kind === '体验权益券' ? <div className="coupon-form-grid"><Form.Item name="shootingPoints" label="适用拍摄点" rules={[{ required: true, type: 'array', min: 1 }]}><Select disabled={locked} mode="multiple" placeholder="请选择适用拍摄点" options={couponShootingPointOptions.map((v) => ({ value: v, label: v }))} /></Form.Item><Form.Item name="themes" label="适用主题" rules={[{ required: true, type: 'array', min: 1 }]}><Select disabled={locked || !formShootingPoints.length} mode="multiple" showSearch optionFilterProp="label" placeholder={formShootingPoints.length ? "请选择适用主题" : "请先选择适用拍摄点"} options={availableThemeOptions.map((v) => ({ value: v, label: v }))} /></Form.Item></div> : <><div className="coupon-form-grid"><Form.Item name="minSpend" label="使用门槛" rules={[{ required: true }, { type: 'number', min: kind === '满减券' ? 0.01 : 0 }]}><InputNumber disabled={locked} min={0} precision={2} addonAfter="元" placeholder="请输入使用门槛" /></Form.Item>{kind === '折扣券' ? <Form.Item name="discountRate" label="折扣" rules={[{ required: true }, { type: 'number', min: 0.1, max: 9.9 }]}><InputNumber disabled={locked} min={0.1} max={9.9} precision={1} addonAfter="折" placeholder="请输入折扣" /></Form.Item> : <Form.Item name="discountAmount" label={kind === '满减券' ? '满减金额' : '固定抵扣金额'} dependencies={['minSpend']} rules={[{ required: true }, { validator: (_, v) => v > 0 && (kind !== '满减券' || v < form.getFieldValue('minSpend')) ? Promise.resolve() : Promise.reject(new Error('金额须大于0；满减金额须小于门槛')) }]}><InputNumber disabled={locked} min={0.01} precision={2} addonAfter="元" placeholder="请输入优惠金额" /></Form.Item>}</div><Form.Item name="allThemes" label="可用范围" required rules={[{ validator: (_, value) => typeof value === 'boolean' ? Promise.resolve() : Promise.reject(new Error('请选择可用范围')) }]}><Radio.Group disabled={locked} options={[{ value: true, label: '全部可用' }, { value: false, label: '指定主题' }]} /></Form.Item>{!allThemes && <div className="coupon-form-grid"><Form.Item name="shootingPoints" label="适用拍摄点" rules={[{ required: true, type: 'array', min: 1 }]}><Select disabled={locked} mode="multiple" placeholder="请选择适用拍摄点" options={couponShootingPointOptions.map((v) => ({ value: v, label: v }))} /></Form.Item><Form.Item name="themes" label="适用主题" rules={[{ required: true, type: 'array', min: 1 }]}><Select disabled={locked || !formShootingPoints.length} mode="multiple" showSearch optionFilterProp="label" placeholder={formShootingPoints.length ? "请选择适用主题" : "请先选择适用拍摄点"} options={availableThemeOptions.map((v) => ({ value: v, label: v }))} /></Form.Item></div>}</>}<Form.Item name="validityDays" label="有效期" rules={[{ required: true }, { type: 'number', min: 1, max: 3650 }]}><InputNumber disabled={locked} min={1} max={3650} precision={0} addonBefore="领取后" addonAfter="天可用" placeholder="请输入有效天数" style={{ width: '100%' }} /></Form.Item><Form.Item name="totalLimit" label="发放总量" rules={[{ required: true }, { type: 'number', min: 1, max: kind === '体验权益券' ? 10000 : 100000 }]}><InputNumber disabled={locked} min={1} max={kind === '体验权益券' ? 10000 : 100000} precision={0} addonAfter="张" placeholder="请输入发放总量" /></Form.Item></fieldset><Form.Item name="description" label="使用规则" rules={[{ required: true, whitespace: true, message: '请填写使用规则' }]}><Input.TextArea rows={4} maxLength={1000} showCount={{ formatter: ({ count, maxLength }) => `${count}/${maxLength}` }} placeholder="请输入使用规则，说明使用条件、适用范围等" /></Form.Item></Form></Drawer>
  <Modal className="coupon-distribution-modal" title={distributionMode === 'directed' ? '定向发放' : '公开领取'} width={620} open={distributionMode === 'directed' || distributionMode === 'public'} onCancel={closeDistribution} destroyOnHidden footer={distributionMode === 'public' ? null : <Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={closeDistribution}>关闭</Button><Button type="primary" onClick={issueDirectly}>确认发放</Button></Space>}>
    {distributionCoupon && <><div className="coupon-distribution-summary"><div><span>优惠券</span><strong>{distributionCoupon.name}</strong></div>{kindTag(distributionCoupon.kind)}</div>
      {distributionMode === 'directed' && <Form form={directForm} layout="vertical"><Form.Item name="phones" label="接收手机号" rules={[{ required: true, message: '请输入手机号' }, { validator: (_, value) => { const error = phoneListError(parsePhones(value || '')); return error ? Promise.reject(new Error(error)) : Promise.resolve(); } }]}><Input.TextArea rows={7} placeholder="输入手机号，多个号码用换行或逗号分隔" /></Form.Item></Form>}
      {distributionMode === 'public' && createdPlan && <div className="coupon-qr-result"><div id="coupon-public-claim-qr"><QRCode value={receiveUrl('planId=' + encodeURIComponent(createdPlan.id))} size={220} /></div><Input value={receiveUrl('planId=' + encodeURIComponent(createdPlan.id))} readOnly addonBefore="领取链接" /><Space><Button icon={<DownloadOutlined />} onClick={() => downloadQrCode('coupon-public-claim-qr', createdPlan.id + '-公开领取二维码')}>下载二维码</Button><Button icon={<CopyOutlined />} onClick={() => copyClaimLink(createdPlan)}>复制领取链接</Button></Space></div>}
    </>}
  </Modal>
    <Drawer className="coupon-code-drawer" title="查看券码" size={920} open={distributionMode === 'codeList'} onClose={closeDistribution} destroyOnHidden footer={null}>
    {distributionCoupon && <>
      <Space wrap style={{ marginBottom: 16 }}><div className="coupon-search-control coupon-code-search"><Input className="coupon-search-control-input" placeholder="搜索体验券编号、手机号" value={codeKeyword} onChange={(event) => setCodeKeyword(event.target.value)} onPressEnter={() => undefined} allowClear /><Button className="coupon-search-control-button" icon={<SearchOutlined />} aria-label="搜索券码" onClick={() => undefined} /></div><Select placeholder="券码使用状态" allowClear value={codeState} onChange={setCodeState} style={{ width: 160 }} options={[...couponUsageStatuses, '未领取'].map((value) => ({ value, label: value }))} /><Button icon={<DownloadOutlined />} loading={exportingCodes} disabled={!exportableExperienceCodes.length} onClick={() => void exportExperienceCodes()}>导出可领取券码（{exportableExperienceCodes.length}）</Button></Space>
      <Table rowKey="id" dataSource={store.tickets.filter((ticket) => ticket.couponId === distributionCoupon.id && (!codeKeyword || [ticket.serialNo || '', ticket.phone, ticket.phoneDigits || ''].some((value) => value.includes(codeKeyword))) && (!codeState || ticketState(ticket) === codeState))} locale={{ emptyText: '暂无符合条件的券码' }} pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (count) => `共 ${count} 条` }} scroll={{ x: 760, y: 'calc(100vh - 245px)' }} columns={[
        { title: '体验券编号', dataIndex: 'serialNo', width: 180, render: (value: string | undefined, ticket) => <Button type="link" onClick={() => openCodeDetail(ticket.id)}>{serialNo(ticket)}</Button> },
        { title: '使用状态', width: 120, render: (_, ticket) => statusTag(ticketState(ticket)) },
        { title: '领取用户', width: 130, render: (_, ticket) => ticket.phone || '未领取' },
        { title: '领取时间', width: 170, render: (_, ticket) => ticket.issuedAt || '—' },
        { title: '截止时间', width: 180, render: (_, ticket) => ticket.expiresAt || `领取后 ${ticket.validityDays} 天可用` },
        { title: '操作', fixed: 'right', width: 80, render: (_, ticket) => <Button type="link" onClick={() => openCodeDetail(ticket.id)}>详情</Button> },
      ]} />
    </>}
  </Drawer>
  <Modal className="coupon-code-detail-modal" title="券码详情" width={640} open={Boolean(codeDetail)} onCancel={closeCodeDetail} destroyOnHidden footer={<Button onClick={closeCodeDetail}>关闭</Button>}>
    {codeDetail && <CouponCodeDetailContent ticket={codeDetail} serial={serialNo(codeDetail)} kindLabel={label(codeDetail.couponKind)} statusTone={ticketState(codeDetail)} statusClass={statusTone(ticketState(codeDetail))}>{!codeDetail.phoneDigits && <section className="coupon-code-direct-form"><strong>发放至指定用户</strong><Form form={codeDirectForm} onFinish={() => void issueSelectedCode()}><Form.Item name="phone" rules={[{ required: true, message: '请输入接收手机号' }, { pattern: /^1\d{10}$/, message: '手机号须为11位数字' }]}><Space.Compact block><Input maxLength={11} placeholder="请输入接收手机号" /><Button type="primary" htmlType="submit" disabled={!distributionCoupon || !canIssueCoupon(distributionCoupon, store.tickets) || !canCurrentOperatorIssue(distributionCoupon)}>发放</Button></Space.Compact></Form.Item></Form></section>}</CouponCodeDetailContent>}
  </Modal>
  <Modal className="coupon-authorization-modal" title="配置发券权限" width={560} zIndex={1300} open={Boolean(authorizationCoupon)} onCancel={() => setAuthorizationCouponId(null)} onOk={saveAuthorization} okText="保存" cancelText="取消" destroyOnHidden>
    {authorizationCoupon && <><div className="coupon-distribution-summary"><div><span>优惠券</span><strong>{authorizationCoupon.name}</strong></div>{kindTag(authorizationCoupon.kind)}</div><p className="coupon-authorization-note">此处配置单券可发范围；账号还需通过系统角色获得“发券”功能权限，两项同时满足后才能发放。</p><div className="coupon-authorization-field"><label>授权账号</label><Select mode="multiple" value={authorizationSelection} onChange={setAuthorizationSelection} placeholder="请选择可发放该券的账号" optionFilterProp="label" options={couponIssuerOptions.map((issuer) => ({ value: issuer.id, label: `${issuer.account}（${issuer.name}）`, title: issuer.organization }))} /></div></>}
  </Modal>
  <Drawer className="coupon-detail-drawer" title="优惠券详情" size={800} open={Boolean(detail)} onClose={() => setDetailId(null)}>{detail && <CouponDetailContent coupon={detail} store={store} status={status(detail)} authorizedIssuers={couponIssuerOptions.filter((issuer) => authorizedIssuerIds(detail).includes(issuer.id))} onConfigureAuthorization={() => openAuthorization(detail)} />}</Drawer></>;
}
