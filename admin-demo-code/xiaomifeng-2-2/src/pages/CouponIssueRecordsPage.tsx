import { Alert, App, Button, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CouponCodeRecord, CouponCodeStatus, CouponIssueRecord, CouponStatus, CouponTemplate, CouponUseRecord } from '../mock/coupons';
import { couponTotalUses, couponUsedTimes, effectiveCouponStatus, shootingPointOptions, themeOptions } from '../mock/coupons';

type SearchValues = { keyword?: string; phone?: string; status?: string; channel?: string };
type RedeemValues = { phone: string };
type UseValues = { orderNo: string; shootingPoint: string; theme: string };
type Props = {
  templates: CouponTemplate[];
  issueRecords: CouponIssueRecord[];
  setIssueRecords: Dispatch<SetStateAction<CouponIssueRecord[]>>;
  couponCodeRecords: CouponCodeRecord[];
  setCouponCodeRecords: Dispatch<SetStateAction<CouponCodeRecord[]>>;
};

const holderStatuses: CouponStatus[] = ['待使用', '部分使用', '已核销', '已过期', '已作废'];
const codeStatuses: CouponCodeStatus[] = ['未售出', '待兑换', '已兑换', '已作废'];
const statusColor: Record<string, string> = { 未售出: 'default', 待兑换: 'gold', 待使用: 'green', 部分使用: 'cyan', 已兑换: 'blue', 已核销: 'blue', 已过期: 'default', 已作废: 'default' };

function localDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export default function CouponIssueRecordsPage({ templates, issueRecords, setIssueRecords, couponCodeRecords, setCouponCodeRecords }: Props) {
  const [form] = Form.useForm<SearchValues>();
  const [redeemForm] = Form.useForm<RedeemValues>();
  const [useForm] = Form.useForm<UseValues>();
  const [filters, setFilters] = useState<SearchValues>({});
  const [redeemingCode, setRedeemingCode] = useState<CouponCodeRecord | null>(null);
  const [usingRecord, setUsingRecord] = useState<CouponIssueRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<CouponIssueRecord | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const couponId = searchParams.get('couponId') || undefined;
  const couponName = searchParams.get('couponName') || undefined;
  const activeTab = searchParams.get('view') === 'codes' ? 'codes' : 'holders';
  const { message } = App.useApp();

  const holderRows = useMemo(() => issueRecords.filter((record) => (
    (!couponId || record.couponId === couponId)
    && (!filters.keyword || record.couponName.toLowerCase().includes(filters.keyword.trim().toLowerCase()) || record.redeemCode.toLowerCase().includes(filters.keyword.trim().toLowerCase()))
    && (!filters.phone || record.phoneDigits?.includes(filters.phone.trim()) || record.phone.includes(filters.phone.trim()))
    && (!filters.status || effectiveCouponStatus(record) === filters.status)
  )), [couponId, filters, issueRecords]);
  const codeRows = useMemo(() => couponCodeRecords.filter((record) => (
    (!couponId || record.couponId === couponId)
    && (!filters.keyword || record.couponName.toLowerCase().includes(filters.keyword.trim().toLowerCase()) || record.code.toLowerCase().includes(filters.keyword.trim().toLowerCase()) || record.batchNo.toLowerCase().includes(filters.keyword.trim().toLowerCase()))
    && (!filters.channel || record.channel === filters.channel)
    && (!filters.status || record.status === filters.status)
  )), [couponCodeRecords, couponId, filters]);

  const voidHolder = (record: CouponIssueRecord) => {
    if (effectiveCouponStatus(record) !== '待使用') return;
    setIssueRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: '已作废' } : item));
    message.success('持券记录已作废');
  };
  const voidCode = (record: CouponCodeRecord) => {
    if (record.status !== '未售出' && record.status !== '待兑换') return;
    setCouponCodeRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: '已作废' } : item));
    message.success('兑换码已作废');
  };
  const markSold = (record: CouponCodeRecord) => {
    if (record.status !== '未售出') return;
    setCouponCodeRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: '待兑换', soldAt: localDateTime(new Date()) } : item));
    message.success('已模拟渠道售出，可继续模拟用户兑换');
  };
  const closeRedeem = () => { setRedeemingCode(null); redeemForm.resetFields(); };
  const redeemCode = async () => {
    const values = await redeemForm.validateFields().catch(() => null);
    if (!values) return;
    if (!redeemingCode) return;
    const currentCode = couponCodeRecords.find((record) => record.id === redeemingCode.id);
    if (currentCode?.status !== '待兑换') { message.error('该码当前不可兑换'); return; }
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + currentCode.validityDays);
    const holder: CouponIssueRecord = {
      id: `ISS${now.getTime()}-${Math.random().toString(36).slice(2, 5)}`,
      couponId: currentCode.couponId,
      couponName: currentCode.couponName,
      couponKind: currentCode.couponKind,
      benefit: currentCode.benefit,
      status: '待使用',
      phone: `${values.phone.slice(0, 3)}****${values.phone.slice(-4)}`,
      phoneDigits: values.phone,
      issuedAt: localDateTime(now),
      expiresAt: localDateTime(expires),
      redeemCode: `CP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      sourceCode: currentCode.code,
      source: '渠道兑换',
      totalUses: Number.parseInt(currentCode.benefit, 10) || 1,
      usedTimes: 0,
    };
    setCouponCodeRecords((current) => current.map((record) => record.id === currentCode.id ? { ...record, status: '已兑换', redeemedAt: localDateTime(now), redeemedPhone: holder.phone, expiresAt: holder.expiresAt } : record));
    setIssueRecords((current) => [holder, ...current]);
    closeRedeem();
    message.success('模拟兑换成功，已生成持券记录');
    changeTab('holders');
  };

  const selectedTemplate = templates.find((item) => item.id === usingRecord?.couponId);
  const pointOptions = selectedTemplate?.shootingPoints.includes('全部拍摄点') ? shootingPointOptions : selectedTemplate?.shootingPoints || [];
  const useThemeOptions = selectedTemplate?.availableRange.includes('全部可用') ? themeOptions : selectedTemplate?.availableRange || [];
  const openUse = (record: CouponIssueRecord) => {
    setUsingRecord(record);
  };
  const closeUse = () => { setUsingRecord(null); useForm.resetFields(); };
  const useRight = async () => {
    const values = await useForm.validateFields().catch(() => null);
    if (!values) return;
    if (!usingRecord) return;
    const latest = issueRecords.find((record) => record.id === usingRecord.id);
    const template = templates.find((item) => item.id === usingRecord.couponId);
    if (!latest || !template || latest.couponKind !== '体验权益券' || !['待使用', '部分使用'].includes(effectiveCouponStatus(latest))) { message.error('该权益当前不可核销'); return; }
    if (!template.shootingPoints.includes('全部拍摄点') && !template.shootingPoints.includes(values.shootingPoint)) { message.error('拍摄点不在适用范围内'); return; }
    if (!template.availableRange.includes('全部可用') && !template.availableRange.includes(values.theme)) { message.error('主题不在适用范围内'); return; }
    if (issueRecords.some((record) => record.orderNo === values.orderNo || record.usageHistory?.some((use) => use.orderNo === values.orderNo))) { message.error('该订单号已被核销'); return; }
    const nextCount = couponUsedTimes(latest) + 1;
    if (nextCount > couponTotalUses(latest)) { message.error('可用次数不足'); return; }
    const usedAt = localDateTime(new Date());
    const use: CouponUseRecord = { ...values, usedAt };
    setIssueRecords((current) => current.map((record) => record.id === latest.id ? { ...record, usedTimes: nextCount, totalUses: couponTotalUses(latest), status: nextCount === couponTotalUses(latest) ? '已核销' : '部分使用', orderNo: values.orderNo, shootingPoint: values.shootingPoint, usageHistory: [...(record.usageHistory || []), use] } : record));
    closeUse();
    message.success(`模拟核销成功，剩余 ${couponTotalUses(latest) - nextCount} 次`);
  };

  const changeTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', tab);
    setSearchParams(next);
    form.resetFields();
    setFilters({});
  };
  const resetFilters = () => { form.resetFields(); setFilters({}); };

  const holderColumns: TableColumnsType<CouponIssueRecord> = [
    { title: '优惠券名称', dataIndex: 'couponName', width: 180, ellipsis: true },
    { title: '券权益', width: 145, render: (_, row) => <><Tag color={row.couponKind === '体验权益券' ? 'purple' : 'blue'}>{row.couponKind}</Tag><div className="coupon-cell-subtitle">{row.benefit}</div></> },
    { title: '状态', width: 100, render: (_, row) => { const status = effectiveCouponStatus(row); return <Tag color={statusColor[status]}>{status}</Tag>; } },
    { title: '持券用户 / 来源', width: 140, render: (_, row) => <>{row.phone}<div className="coupon-cell-subtitle">{row.source || (row.sourceCode ? '渠道兑换' : '历史记录')}</div></> },
    { title: '使用情况', width: 105, render: (_, row) => row.couponKind === '体验权益券' ? `${couponUsedTimes(row)} / ${couponTotalUses(row)} 次` : effectiveCouponStatus(row) === '已核销' ? '已使用' : '未使用' },
    { title: '券码', dataIndex: 'redeemCode', width: 165 },
    { title: '最近核销订单', dataIndex: 'orderNo', width: 175, render: (value?: string) => value || '—' },
    { title: '发放时间', dataIndex: 'issuedAt', width: 160 },
    { title: '有效期截止', dataIndex: 'expiresAt', width: 160 },
    { title: '操作', key: 'operation', fixed: 'right', width: 180, render: (_, record) => <Space size={0}>
      {record.couponKind === '体验权益券' && ['待使用', '部分使用'].includes(effectiveCouponStatus(record)) && <Button type="link" onClick={() => openUse(record)}>模拟核销</Button>}
      {couponUsedTimes(record) > 0 && <Button type="link" onClick={() => setHistoryRecord(record)}>核销记录</Button>}
      {effectiveCouponStatus(record) === '待使用' && <Popconfirm title="作废这张券？" description="作废后无法恢复，也不能继续使用。" okText="确认作废" cancelText="取消" onConfirm={() => voidHolder(record)}><Button type="link" danger>作废</Button></Popconfirm>}
      {effectiveCouponStatus(record) !== '待使用' && couponUsedTimes(record) === 0 && '—'}
    </Space> },
  ];
  const codeColumns: TableColumnsType<CouponCodeRecord> = [
    { title: '优惠券名称', dataIndex: 'couponName', width: 180, ellipsis: true },
    { title: '兑换码', dataIndex: 'code', width: 255 },
    { title: '销售渠道 / 批次', width: 200, render: (_, row) => <>{row.channel}<div className="coupon-cell-subtitle">{row.batchNo}</div></> },
    { title: '状态', dataIndex: 'status', width: 95, render: (status: CouponCodeStatus) => <Tag color={statusColor[status]}>{status}</Tag> },
    { title: '生成时间', dataIndex: 'generatedAt', width: 160 },
    { title: '售出时间', dataIndex: 'soldAt', width: 160, render: (value?: string) => value || '—' },
    { title: '兑换用户', dataIndex: 'redeemedPhone', width: 125, render: (value?: string) => value || '—' },
    { title: '兑换时间', dataIndex: 'redeemedAt', width: 160, render: (value?: string) => value || '—' },
    { title: '权益截止', dataIndex: 'expiresAt', width: 155, render: (value: string | undefined, record) => value || `兑换后${record.validityDays}天` },
    { title: '操作', key: 'operation', fixed: 'right', width: 165, render: (_, record) => <Space size={0}>
      {record.status === '未售出' && <Button type="link" onClick={() => markSold(record)}>模拟售出</Button>}
      {record.status === '待兑换' && <Button type="link" onClick={() => setRedeemingCode(record)}>模拟兑换</Button>}
      {(record.status === '未售出' || record.status === '待兑换') && <Popconfirm title="作废该兑换码？" description={record.status === '待兑换' ? '请确认渠道已退款。作废后该码不能兑换。' : '作废后该码不能兑换，额度不返还。'} okText="确认作废" cancelText="取消" onConfirm={() => voidCode(record)}><Button type="link" danger>作废</Button></Popconfirm>}
      {(record.status === '已兑换' || record.status === '已作废') && '—'}
    </Space> },
  ];

  const historyRows = historyRecord?.usageHistory?.length ? historyRecord.usageHistory : historyRecord?.orderNo && historyRecord.shootingPoint ? [{ orderNo: historyRecord.orderNo, shootingPoint: historyRecord.shootingPoint, theme: '—', usedAt: '—' }] : [];

  return (
    <section className="coupon-page admin-list-page">
      <section className="admin-filter-card coupon-record-filter-card">
        <div className="coupon-record-page-heading">
          <div><h2>发放明细</h2><Typography.Text type="secondary">持券记录是已进入用户账户的券；渠道码按生成、售出、兑换顺序追踪。</Typography.Text></div>
          {couponId && <Button type="link" onClick={() => { resetFilters(); setSearchParams({ view: activeTab }); }}>清除券筛选</Button>}
        </div>
        {couponId && <div className="coupon-filter-context">当前优惠券：{couponName || '指定优惠券'}</div>}
        <div className="coupon-list-toolbar"><Form<SearchValues> form={form} layout="inline" onValuesChange={(_, values) => setFilters(values)}>
          {activeTab === 'holders' ? <>
            <Form.Item name="keyword"><Input allowClear prefix={<SearchOutlined />} placeholder="查询优惠券名、券码" /></Form.Item>
            <Form.Item name="phone"><Input allowClear placeholder="持券用户手机号" /></Form.Item>
            <Form.Item name="status"><Select allowClear placeholder="状态" options={holderStatuses.map((status) => ({ value: status, label: status }))} /></Form.Item>
          </> : <>
            <Form.Item name="keyword"><Input allowClear prefix={<SearchOutlined />} placeholder="查询优惠券名、兑换码、批次" /></Form.Item>
            <Form.Item name="channel"><Select allowClear placeholder="销售渠道" options={['美团', '抖音'].map((channel) => ({ value: channel, label: channel }))} /></Form.Item>
            <Form.Item name="status"><Select allowClear placeholder="状态" options={codeStatuses.map((status) => ({ value: status, label: status }))} /></Form.Item>
          </>}
          <Form.Item><Button type="link" icon={<ReloadOutlined />} onClick={resetFilters}>重置</Button></Form.Item>
        </Form></div>
      </section>
      <section className="coupon-table-card admin-list-card coupon-record-list-card">
        <Tabs activeKey={activeTab} onChange={changeTab} items={[
          { key: 'holders', label: `持券记录（${couponId ? issueRecords.filter((r) => r.couponId === couponId).length : issueRecords.length}）` },
          { key: 'codes', label: `第三方兑换码（${couponId ? couponCodeRecords.filter((r) => r.couponId === couponId).length : couponCodeRecords.length}）` },
        ]} />
        {activeTab === 'holders' ? <>
          <Alert className="coupon-workflow-guide" type="info" showIcon title="体验次数券可模拟逐次核销；部分使用后保留剩余次数。价格券仅展示已有核销结果。" />
          <Table<CouponIssueRecord> rowKey="id" columns={holderColumns} dataSource={holderRows} scroll={{ x: 1425 }} pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }} locale={{ emptyText: '暂无持券记录' }} />
        </> : <>
          <Alert className="coupon-workflow-guide" type="info" showIcon title="本地演示：生成兑换码 → 模拟渠道售出 → 模拟用户兑换；兑换成功后持券有效期才开始计算。" />
          <Table<CouponCodeRecord> rowKey="id" columns={codeColumns} dataSource={codeRows} scroll={{ x: 1655 }} pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }} locale={{ emptyText: '暂无第三方兑换码' }} />
        </>}
      </section>

      <Modal title="模拟用户兑换" open={Boolean(redeemingCode)} onCancel={closeRedeem} onOk={redeemCode} okText="确认兑换" destroyOnHidden>
        {redeemingCode && <>
          <Descriptions size="small" column={1} items={[{ key: 'coupon', label: '优惠券', children: redeemingCode.couponName }, { key: 'code', label: '兑换码', children: redeemingCode.code }, { key: 'validity', label: '有效期', children: `兑换成功后 ${redeemingCode.validityDays} 天` }]} />
          <Form form={redeemForm} layout="vertical"><Form.Item name="phone" label="兑换用户手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入有效的 11 位手机号' }]}><Input maxLength={11} placeholder="输入模拟用户手机号" /></Form.Item></Form>
        </>}
      </Modal>
      <Modal title="模拟体验权益核销" open={Boolean(usingRecord)} onCancel={closeUse} onOk={useRight} okText="确认核销" destroyOnHidden>
        {usingRecord && <>
          <Alert className="coupon-code-help" type="info" showIcon title={`${usingRecord.couponName}：已用 ${couponUsedTimes(usingRecord)} 次，剩余 ${couponTotalUses(usingRecord) - couponUsedTimes(usingRecord)} 次；每个订单仅核销一次。`} />
          <Form key={usingRecord.id} form={useForm} layout="vertical" preserve={false} initialValues={{ shootingPoint: selectedTemplate?.shootingPoints.includes('全部拍摄点') ? undefined : selectedTemplate?.shootingPoints[0], theme: selectedTemplate?.availableRange.includes('全部可用') ? undefined : selectedTemplate?.availableRange[0] }}>
            <Form.Item name="orderNo" label="服务订单号" rules={[{ required: true, message: '请输入服务订单号' }]}><Input maxLength={40} placeholder="输入模拟服务订单号" /></Form.Item>
            <Form.Item name="shootingPoint" label="核销拍摄点" rules={[{ required: true, message: '请选择拍摄点' }]}><Select options={pointOptions.map((value) => ({ value, label: value }))} placeholder="选择适用拍摄点" /></Form.Item>
            <Form.Item name="theme" label="拍摄主题" rules={[{ required: true, message: '请选择主题' }]}><Select options={useThemeOptions.map((value) => ({ value, label: value }))} placeholder="选择适用主题" /></Form.Item>
          </Form>
        </>}
      </Modal>
      <Modal title="核销记录" open={Boolean(historyRecord)} onCancel={() => setHistoryRecord(null)} footer={null} width={720}>
        {historyRecord && <><Typography.Paragraph>{historyRecord.couponName} · {historyRecord.phone} · 已用 {couponUsedTimes(historyRecord)} / {couponTotalUses(historyRecord)} 次</Typography.Paragraph><Table<CouponUseRecord> rowKey="orderNo" size="small" pagination={false} dataSource={historyRows} columns={[{ title: '服务订单号', dataIndex: 'orderNo' }, { title: '拍摄点', dataIndex: 'shootingPoint' }, { title: '主题', dataIndex: 'theme' }, { title: '核销时间', dataIndex: 'usedAt' }]} locale={{ emptyText: '历史记录未提供逐次核销明细' }} /></>}
      </Modal>
    </section>
  );
}
