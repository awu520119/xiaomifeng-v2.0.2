import {
  App,
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  QRCode,
  Radio,
  Select,
  Space,
  Tabs,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CouponCodeRecord, CouponIssueRecord, CouponKind, CouponStatus, CouponTemplate, CouponTemplateStatus } from '../mock/coupons';
import { couponKinds, couponTotalUses, couponUsedTimes, effectiveCouponStatus, shootingPointOptions, themeOptions } from '../mock/coupons';

type CouponListPageProps = {
  templates: CouponTemplate[];
  setTemplates: Dispatch<SetStateAction<CouponTemplate[]>>;
  issueRecords: CouponIssueRecord[];
  setIssueRecords: Dispatch<SetStateAction<CouponIssueRecord[]>>;
  couponCodeRecords: CouponCodeRecord[];
  setCouponCodeRecords: Dispatch<SetStateAction<CouponCodeRecord[]>>;
};

type CouponFormValues = {
  name: string;
  category: 'price' | 'rights';
  kind: CouponKind;
  fixedAmount?: number;
  threshold?: number;
  discountAmount?: number;
  discountRate?: number;
  rightsCount?: number;
  allThemes: boolean;
  themes?: string[];
  shootingPoints: string[];
  validityDays: number;
  totalLimit: number;
  perUserLimit: number;
  sponsor: string;
};
type SearchValues = { keyword?: string; shootingPoint?: string; status?: CouponTemplateStatus | '已发完' };

const issueStates: CouponStatus[] = ['待使用', '部分使用', '已核销', '已作废', '已过期'];

function benefitFromValues(values: CouponFormValues) {
  switch (values.kind) {
    case '特价券': return '1分钱';
    case '满减券': return `满 ${values.threshold || 0} 减 ${values.discountAmount || 0} 元`;
    case '折扣券': return `${values.discountRate || 0}折`;
    case '抵扣券': return `抵扣 ${values.fixedAmount || 0} 元`;
    case '体验权益券': return `${values.rightsCount || 1}次体验`;
  }
}

function localDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function makeRecord(template: CouponTemplate, phone: string): CouponIssueRecord {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + template.validityDays);
  const serial = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    id: `ISS${Date.now()}`,
    couponId: template.id,
    couponName: template.name,
    couponKind: template.kind,
    benefit: template.benefit,
    status: '待使用',
    phone: `${phone.slice(0, 3)}****${phone.slice(-4)}`,
    phoneDigits: phone,
    issuedAt: localDateTime(now),
    expiresAt: localDateTime(expiresAt),
    redeemCode: `CP-${serial}`,
    source: '定向发放',
    totalUses: template.kind === '体验权益券' ? Number.parseInt(template.benefit, 10) || 1 : 1,
    usedTimes: 0,
  };
}

function exportThirdPartyCodes(template: CouponTemplate, channel: string, quantity: number, batchNo: string) {
  const prefix = channel === '美团' ? 'MT' : 'DY';
  const rows = [
    ['兑换码', '优惠券编号', '优惠券名称', '优惠内容', '销售渠道', '批次号', '有效天数'],
    ...Array.from({ length: quantity }, (_, index) => [
      `${prefix}-${template.id.slice(-4)}-${batchNo}-${String(index + 1).padStart(6, '0')}`,
      template.id,
      template.name,
      template.benefit,
      channel,
      batchNo,
      String(template.validityDays),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.name}-${channel}兑换码.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CouponListPage({ templates, setTemplates, issueRecords, setIssueRecords, couponCodeRecords, setCouponCodeRecords }: CouponListPageProps) {
  const [couponForm] = Form.useForm<CouponFormValues>();
  const [searchForm] = Form.useForm<SearchValues>();
  const [phoneForm] = Form.useForm<{ phone: string }>();
  const [codeForm] = Form.useForm<{ channel: string; quantity: number }>();
  const [search, setSearch] = useState<SearchValues>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [detailCoupon, setDetailCoupon] = useState<CouponTemplate | null>(null);
  const [detailTab, setDetailTab] = useState('rules');
  const [issueStatus, setIssueStatus] = useState<CouponStatus | undefined>();
  const [issueCoupon, setIssueCoupon] = useState<CouponTemplate | null>(null);
  const [codeCoupon, setCodeCoupon] = useState<CouponTemplate | null>(null);
  const [createdCoupon, setCreatedCoupon] = useState<CouponTemplate | null>(null);
  const [issuedSummary, setIssuedSummary] = useState<{ template: CouponTemplate; phone: string } | null>(null);
  const [generatedBatch, setGeneratedBatch] = useState<{ template: CouponTemplate; batchNo: string; quantity: number } | null>(null);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const watchedKind = Form.useWatch('kind', couponForm) || '特价券';
  const watchedCategory = Form.useWatch('category', couponForm) || 'price';
  const watchedAllThemes = Form.useWatch('allThemes', couponForm) ?? true;

  const detailRecords = useMemo(() => issueRecords.filter((record) => (
    record.couponId === detailCoupon?.id && (!issueStatus || effectiveCouponStatus(record) === issueStatus)
  )), [detailCoupon, issueRecords, issueStatus]);
  const couponHolders = detailCoupon ? issueRecords.filter((record) => record.couponId === detailCoupon.id) : [];
  const totalDetailRecords = couponHolders.length;
  const usedHolderCount = couponHolders.filter((record) => couponUsedTimes(record) > 0).length;
  const totalCouponCodes = detailCoupon ? couponCodeRecords.filter((record) => record.couponId === detailCoupon.id).length : 0;
  const detailCodes = useMemo(() => couponCodeRecords.filter((record) => record.couponId === detailCoupon?.id), [couponCodeRecords, detailCoupon]);
  const usedCount = (template: CouponTemplate) => issueRecords.filter((record) => record.couponId === template.id && !record.sourceCode).length
    + couponCodeRecords.filter((record) => record.couponId === template.id).length;
  const remainingCount = (template: CouponTemplate) => template.totalLimit === undefined ? Infinity : Math.max(0, template.totalLimit - usedCount(template));
  const filteredTemplates = templates.filter((item) => {
    const keyword = search.keyword?.trim().toLowerCase();
    return (!keyword || item.name.toLowerCase().includes(keyword))
      && (!search.shootingPoint || item.shootingPoints.includes(search.shootingPoint) || item.shootingPoints.includes('全部拍摄点'))
      && (!search.status || (search.status === '已发完'
        ? item.status !== '已停用' && remainingCount(item) < 1
        : search.status === '已停用' ? item.status === '已停用' : item.status !== '已停用' && remainingCount(item) > 0));
  });

  const openCreate = () => {
    couponForm.resetFields();
    couponForm.setFieldsValue({
      category: 'price',
      kind: '特价券',
      fixedAmount: 20,
      threshold: 50,
      discountAmount: 10,
      discountRate: 8,
      rightsCount: 1,
      allThemes: true,
      shootingPoints: ['全部拍摄点'],
      validityDays: 1,
      totalLimit: 1000,
      perUserLimit: 1,
      sponsor: '平台',
    });
    setCreateOpen(true);
  };

  const closeIssueDrawer = () => {
    setIssueCoupon(null);
    phoneForm.resetFields();
  };

  const saveCoupon = async () => {
    const values = await couponForm.validateFields();
    const template: CouponTemplate = {
      id: `CP${Date.now()}`,
      name: values.name,
      kind: values.kind,
      benefit: benefitFromValues(values),
      availableRange: values.allThemes ? ['全部可用'] : values.themes || [],
      shootingPoints: values.shootingPoints,
      validityDays: values.validityDays,
      totalLimit: values.totalLimit,
      perUserLimit: values.perUserLimit,
      sponsor: values.sponsor,
      status: '启用',
      createdAt: localDateTime(new Date()),
    };
    setTemplates((current) => [template, ...current]);
    setCreateOpen(false);
    setCreatedCoupon(template);
  };

  const sendToPhone = async () => {
    const values = await phoneForm.validateFields();
    if (!issueCoupon) return;
    const template = issueCoupon;
    if (template.status === '已停用' || remainingCount(template) < 1) {
      message.error('优惠券已停用或发放量已满');
      return;
    }
    const userIssued = issueRecords.filter((record) => record.couponId === template.id && record.phoneDigits === values.phone).length;
    if (template.perUserLimit !== undefined && userIssued >= template.perUserLimit) {
      message.error(`该用户已达到每人限领 ${template.perUserLimit} 张`);
      return;
    }
    setIssueRecords((current) => [makeRecord(template, values.phone), ...current]);
    phoneForm.resetFields();
    setIssueCoupon(null);
    setIssuedSummary({ template, phone: `${values.phone.slice(0, 3)}****${values.phone.slice(-4)}` });
  };

  const changeCouponStatus = (template: CouponTemplate, status: CouponTemplateStatus) => {
    setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, status } : item));
    setDetailCoupon((current) => current?.id === template.id ? { ...current, status } : current);
    message.success(status === '启用' ? '优惠券已启用' : '优惠券已停用');
  };

  const voidRecord = (record: CouponIssueRecord) => {
    if (effectiveCouponStatus(record) !== '待使用') return;
    setIssueRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: '已作废' } : item));
    message.success('持券记录已作废');
  };

  const makeCodes = async () => {
    const values = await codeForm.validateFields();
    if (!codeCoupon) return;
    if (codeCoupon.status === '已停用' || values.quantity > remainingCount(codeCoupon)) {
      message.error('优惠券已停用或剩余发放量不足');
      return;
    }
    const now = new Date();
    const batchNo = `CB${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const batchRecords: CouponCodeRecord[] = Array.from({ length: values.quantity }, (_, index) => {
      const code = `${values.channel === '美团' ? 'MT' : 'DY'}-${codeCoupon.id.slice(-4)}-${batchNo}-${String(index + 1).padStart(6, '0')}`;
      return {
        id: `${batchNo}-${index + 1}`,
        couponId: codeCoupon.id,
        couponName: codeCoupon.name,
        couponKind: codeCoupon.kind,
        benefit: codeCoupon.benefit,
        status: '未售出',
        code,
        generatedAt: localDateTime(now),
        channel: values.channel,
        batchNo,
        validityDays: codeCoupon.validityDays,
      };
    });
    setCouponCodeRecords((current) => [...batchRecords, ...current]);
    exportThirdPartyCodes(codeCoupon, values.channel, values.quantity, batchNo);
    setCodeCoupon(null);
    setGeneratedBatch({ template: codeCoupon, batchNo, quantity: values.quantity });
  };

  const copyLink = async (template: CouponTemplate) => {
    const link = `https://m.xingying.cn/coupon/${template.id}`;
    try {
      await navigator.clipboard.writeText(link);
      message.success('领取链接已复制');
    } catch {
      message.info(`领取链接：${link}`);
    }
  };

  const openIssueDetails = (template: CouponTemplate) => {
    navigate(`/coupon-issues?couponId=${encodeURIComponent(template.id)}&couponName=${encodeURIComponent(template.name)}&view=holders`);
  };

  const openCodeDetails = (template: CouponTemplate) => {
    navigate(`/coupon-issues?couponId=${encodeURIComponent(template.id)}&couponName=${encodeURIComponent(template.name)}&view=codes`);
  };

  const columns: TableColumnsType<CouponTemplate> = [
    {
      title: '优惠券名称', dataIndex: 'name', width: 190,
      render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
    },
    { title: '券权益', key: 'benefit', width: 190, render: (_, record) => <Space direction="vertical" size={2}><Tag color={record.kind === '体验权益券' ? 'purple' : 'blue'}>{record.kind}</Tag><span>{record.benefit}</span></Space> },
    {
      title: '适用主题', dataIndex: 'availableRange', width: 200,
      render: (values: string[]) => values.includes('全部可用') ? <Tag>全部可用</Tag> : <Space size={[0, 4]} wrap>{values.map((value) => <Tag key={value}>{value}</Tag>)}</Space>,
    },
    {
      title: '适用拍摄点', dataIndex: 'shootingPoints', width: 155,
      render: (values: string[]) => values.includes('全部拍摄点') ? '—' : values.join('、'),
    },
    { title: '有效期', dataIndex: 'validityDays', width: 125, render: (days: number) => `领取后${days}天` },
    { title: '发放占用', key: 'quota', width: 120, render: (_, record) => `${usedCount(record)} / ${record.totalLimit ?? '不限'}` },
    { title: '持券 / 已使用', key: 'usage', width: 120, render: (_, record) => { const holders = issueRecords.filter((item) => item.couponId === record.id); return `${holders.length} / ${holders.filter((item) => couponUsedTimes(item) > 0).length}`; } },
    { title: '状态', key: 'status', width: 95, render: (_, record) => <Tag color={record.status === '已停用' ? 'default' : remainingCount(record) < 1 ? 'gold' : 'green'}>{record.status === '已停用' ? '已停用' : remainingCount(record) < 1 ? '已发完' : '启用'}</Tag> },
    {
      title: '操作', key: 'actions', width: 250, fixed: 'right',
      render: (_, record) => <Space size={4} className="coupon-actions">
        <Button type="link" onClick={() => { setDetailCoupon(record); setDetailTab('rules'); setIssueStatus(undefined); }}>详情</Button>
        <Button type="link" disabled={record.status === '已停用' || remainingCount(record) < 1} onClick={() => setIssueCoupon(record)}>定向发券</Button>
        {record.status === '已停用' ? <Button type="link" onClick={() => changeCouponStatus(record, '启用')}>启用</Button> : (
          <Popconfirm title="停用这张优惠券？" description="停用后将关闭新的领取和定向发券；已发出的券及已导出的兑换码仍可在有效期内使用。" okText="停用" cancelText="取消" onConfirm={() => changeCouponStatus(record, '已停用')}>
            <Button type="link" danger>停用</Button>
          </Popconfirm>
        )}
      </Space>,
    },
  ];

  return (
    <section className="coupon-page admin-list-page">
      <section className="admin-filter-card">
        <div className="coupon-list-toolbar">
          <Form<SearchValues> form={searchForm} layout="inline" onValuesChange={(_, values) => setSearch(values)}>
            <Form.Item name="keyword"><Input allowClear prefix={<SearchOutlined />} placeholder="查询优惠券名称" /></Form.Item>
            <Form.Item name="shootingPoint"><Select allowClear placeholder="拍摄点" options={shootingPointOptions.map((value) => ({ value, label: value }))} /></Form.Item>
            <Form.Item name="status"><Select allowClear placeholder="优惠券状态" options={['启用', '已发完', '已停用'].map((value) => ({ value, label: value }))} /></Form.Item>
            <Form.Item><Button type="link" icon={<ReloadOutlined />} onClick={() => { searchForm.resetFields(); setSearch({}); }}>重置</Button></Form.Item>
          </Form>
        </div>
      </section>
      <section className="coupon-table-card admin-list-card">
        <div className="admin-list-heading">
          <h2>优惠券管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建优惠券</Button>
        </div>
        <div className="coupon-workflow-guide" aria-label="操作流程"><span>操作流程</span><b>1 创建优惠券</b><i>›</i><b>2 选择发放方式</b><i>›</i><b>3 查询明细</b></div>
        <Table<CouponTemplate>
          rowKey="id"
          columns={columns}
          dataSource={filteredTemplates}
          scroll={{ x: 1450 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
          locale={{ emptyText: '暂无优惠券' }}
        />
      </section>

      <Drawer
        className="design-drawer coupon-edit-drawer"
        title="新建优惠券"
        width={720}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        destroyOnHidden
        footer={<Space><Button onClick={() => setCreateOpen(false)}>取消</Button><Button type="primary" onClick={saveCoupon}>保存</Button></Space>}
      >
        <Form<CouponFormValues> form={couponForm} layout="vertical" preserve={false}>
          <section className="coupon-form-section">
            <h3 className="coupon-form-section-title">基础信息</h3>
          <Form.Item name="name" label="优惠券名称" rules={[{ required: true, message: '请输入优惠券名称' }]}><Input maxLength={50} showCount placeholder="请输入优惠券名称" /></Form.Item>
          <Form.Item name="category" label="券类型" rules={[{ required: true }]}>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={[{ value: 'price', label: '价格优惠' }, { value: 'rights', label: '体验权益' }]}
              onChange={(event) => couponForm.setFieldValue('kind', event.target.value === 'rights' ? '体验权益券' : '特价券')}
            />
          </Form.Item>
          {watchedCategory === 'price' && <Form.Item name="kind" label="优惠方式" rules={[{ required: true }]}><Select options={couponKinds.filter((kind) => kind !== '体验权益券').map((kind) => ({ value: kind, label: kind }))} /></Form.Item>}
          <Form.Item label="优惠额度">
            {watchedKind === '特价券' && <Input value="1分钱" disabled />}
            {watchedKind === '满减券' && <Space.Compact block><Form.Item name="threshold" noStyle rules={[{ required: true, message: '请填写门槛金额' }]}><InputNumber min={0.01} precision={2} addonBefore="满" addonAfter="元" className="full-width" /></Form.Item><Form.Item name="discountAmount" noStyle rules={[{ required: true, message: '请填写减免金额' }, { validator: (_, value) => value === undefined || value < couponForm.getFieldValue('threshold') ? Promise.resolve() : Promise.reject(new Error('减免金额须小于使用门槛')) }]}><InputNumber min={0.01} precision={2} addonBefore="减" addonAfter="元" className="full-width" /></Form.Item></Space.Compact>}
            {watchedKind === '折扣券' && <Form.Item name="discountRate" noStyle rules={[{ required: true, message: '请填写折扣' }]}><InputNumber min={1} max={9.9} step={0.1} addonAfter="折" className="full-width" /></Form.Item>}
            {watchedKind === '抵扣券' && <Form.Item name="fixedAmount" noStyle rules={[{ required: true, message: '请填写抵扣金额' }]}><InputNumber min={0.01} precision={2} addonAfter="元" className="full-width" /></Form.Item>}
            {watchedKind === '体验权益券' && <Form.Item name="rightsCount" noStyle rules={[{ required: true, message: '请填写体验次数' }]}><InputNumber min={1} precision={0} addonAfter="次体验" className="full-width" /></Form.Item>}
          </Form.Item>
          </section>
          <section className="coupon-form-section">
            <h3 className="coupon-form-section-title">适用范围</h3>
          <Form.Item name="allThemes" label="适用主题">
            <Radio.Group options={[{ label: '全部可用', value: true }, { label: '指定主题', value: false }]} />
          </Form.Item>
          {!watchedAllThemes && <Form.Item name="themes" label="选择主题" rules={[{ required: true, message: '请选择至少一个主题' }]}><Select mode="multiple" options={themeOptions.map((value) => ({ value, label: value }))} placeholder="请选择适用主题" /></Form.Item>}
          <Form.Item name="shootingPoints" label="适用拍摄点" rules={[{ required: true, message: '请选择适用拍摄点' }]}><Select mode="multiple" options={[{ value: '全部拍摄点', label: '全部拍摄点' }, ...shootingPointOptions.map((value) => ({ value, label: value }))]} onChange={(values: string[]) => { if (values.includes('全部拍摄点')) couponForm.setFieldValue('shootingPoints', ['全部拍摄点']); }} placeholder="请选择拍摄点" /></Form.Item>
          </section>
          <section className="coupon-form-section">
            <h3 className="coupon-form-section-title">有效期与成本</h3>
            <div className="coupon-form-grid">
              <Form.Item name="validityDays" label="有效天数" extra="从用户领取时开始计算，默认 1 天。" rules={[{ required: true, message: '请填写有效天数' }, { type: 'number', min: 1, message: '有效天数至少为 1 天' }]}><InputNumber min={1} precision={0} addonAfter="天" className="full-width" /></Form.Item>
              <Form.Item name="sponsor" label="成本承担方" extra="默认由平台承担，用于后续成本归属。" rules={[{ required: true, message: '请选择成本承担方' }]}><Select options={['平台', '景区', '渠道'].map((value) => ({ value, label: value }))} /></Form.Item>
            </div>
          </section>
          <section className="coupon-form-section">
            <h3 className="coupon-form-section-title">发放控制</h3>
            <div className="coupon-form-grid">
              <Form.Item name="totalLimit" label="发放总量" extra="定向发券和生成第三方兑换码共同占用；作废后不返还。" rules={[{ required: true, message: '请填写发放总量' }, { type: 'number', min: 1, max: 100000, message: '请输入 1 至 100000 的整数' }]}><InputNumber min={1} max={100000} precision={0} addonAfter="张" className="full-width" /></Form.Item>
              <Form.Item name="perUserLimit" label="每人限领" extra="按同一手机号累计发券，含已使用和已作废记录。" dependencies={['totalLimit']} rules={[{ required: true, message: '请填写每人限领数量' }, { type: 'number', min: 1, message: '至少为 1 张' }, { validator: (_, value) => value === undefined || value <= couponForm.getFieldValue('totalLimit') ? Promise.resolve() : Promise.reject(new Error('不能超过发放总量')) }]}><InputNumber min={1} precision={0} addonAfter="张" className="full-width" /></Form.Item>
            </div>
          </section>
        </Form>
      </Drawer>

      <Drawer
        className="coupon-detail-drawer"
        title="优惠券详情"
        width={900}
        open={Boolean(detailCoupon)}
        onClose={() => setDetailCoupon(null)}
      >
        {detailCoupon && <>
          <div className="coupon-detail-summary">
            <div><strong>{detailCoupon.name}</strong><span className="coupon-cell-subtitle">{detailCoupon.id}</span></div>
            <Space size={8}><Tag color={detailCoupon.kind === '体验权益券' ? 'purple' : 'blue'}>{detailCoupon.kind}</Tag><Tag color={detailCoupon.status === '已停用' ? 'default' : remainingCount(detailCoupon) < 1 ? 'gold' : 'green'}>{detailCoupon.status === '已停用' ? '已停用' : remainingCount(detailCoupon) < 1 ? '已发完' : '启用'}</Tag></Space>
          </div>
          <Tabs activeKey={detailTab} onChange={setDetailTab} items={[
            { key: 'rules', label: '券规则', children: <>
              <div className="coupon-metrics">
                <div><span>发放占用</span><strong>{usedCount(detailCoupon)}<small> / {detailCoupon.totalLimit ?? '不限'}</small></strong></div>
                <div><span>已进入用户账户</span><strong>{totalDetailRecords}</strong></div>
                <div><span>已使用持券</span><strong>{usedHolderCount}</strong></div>
                <div><span>持券使用率</span><strong>{totalDetailRecords ? `${Math.round(usedHolderCount / totalDetailRecords * 100)}%` : '—'}</strong></div>
              </div>
              <section className="coupon-detail-section"><h3>基本规则</h3><Descriptions size="small" column={2} items={[
                { key: 'name', label: '优惠券名称', children: detailCoupon.name },
                { key: 'kind', label: '优惠券类型', children: detailCoupon.kind },
                { key: 'benefit', label: '优惠额度', children: detailCoupon.benefit },
                { key: 'range', label: '可用范围', children: detailCoupon.availableRange.join('、') },
                { key: 'points', label: '适用拍摄点', children: detailCoupon.shootingPoints.join('、') },
                { key: 'validity', label: '有效期', children: `领取后${detailCoupon.validityDays}天` },
                { key: 'totalLimit', label: '发放总量', children: detailCoupon.totalLimit === undefined ? '不限（历史券）' : `${detailCoupon.totalLimit} 张` },
                { key: 'usedCount', label: '已占用', children: `${usedCount(detailCoupon)} 张（剩余 ${detailCoupon.totalLimit === undefined ? '不限' : remainingCount(detailCoupon) + ' 张'}）` },
                { key: 'perUserLimit', label: '每人限领', children: detailCoupon.perUserLimit === undefined ? '不限（历史券）' : `${detailCoupon.perUserLimit} 张` },
                { key: 'sponsor', label: '成本承担方', children: detailCoupon.sponsor },
                { key: 'createdAt', label: '创建时间', children: detailCoupon.createdAt },
              ]} /></section>
              <section className="coupon-detail-section"><h3>领取入口</h3>
              <div className="coupon-detail-share">
                {detailCoupon.status === '已停用' || remainingCount(detailCoupon) < 1 ? <div className="coupon-qr-disabled">{detailCoupon.status === '已停用' ? '优惠券已停用' : '发放量已满'}，领取入口不可用</div> : <QRCode value={`https://m.xingying.cn/coupon/${detailCoupon.id}`} size={112} />}
                <div><Typography.Paragraph type="secondary">二维码和链接指向同一领取页面，可用于活动推广。</Typography.Paragraph><Space wrap><Button icon={<CopyOutlined />} disabled={detailCoupon.status === '已停用' || remainingCount(detailCoupon) < 1} onClick={() => copyLink(detailCoupon)}>复制领取链接</Button>{detailCoupon.kind === '体验权益券' && <Button icon={<DownloadOutlined />} disabled={detailCoupon.status === '已停用' || remainingCount(detailCoupon) < 1} onClick={() => { codeForm.setFieldsValue({ channel: '美团', quantity: Math.min(100, remainingCount(detailCoupon)) }); setCodeCoupon(detailCoupon); }}>导出第三方兑换码</Button>}</Space></div>
              </div>
              </section>
            </> },
            { key: 'holders', label: `持券记录（${totalDetailRecords}）`, children: <>
              <div className="coupon-record-query"><Select allowClear placeholder="全部状态" value={issueStatus} onChange={(value) => setIssueStatus(value)} options={issueStates.map((value) => ({ value, label: value }))} /><Button type="link" icon={<ReloadOutlined />} onClick={() => setIssueStatus(undefined)}>重置</Button><Button type="link" onClick={() => openIssueDetails(detailCoupon)}>查看全部持券记录</Button></div>
              <Table<CouponIssueRecord>
                rowKey="id"
                size="small"
                scroll={{ x: 980 }}
                dataSource={detailRecords}
                pagination={{ pageSize: 8, showTotal: (total) => `共 ${total} 条` }}
                locale={{ emptyText: '暂无持券记录' }}
                columns={[
                  { title: '兑换码', dataIndex: 'redeemCode', width: 170 },
                  { title: '持券用户', dataIndex: 'phone', width: 120 },
                  { title: '状态', width: 95, render: (_, record) => { const status = effectiveCouponStatus(record); return <Tag color={status === '待使用' ? 'green' : status === '部分使用' ? 'cyan' : status === '已核销' ? 'blue' : 'default'}>{status}</Tag>; } },
                  { title: '使用次数', width: 100, render: (_, record) => record.couponKind === '体验权益券' ? `${couponUsedTimes(record)} / ${couponTotalUses(record)}` : '—' },
                  { title: '核销订单号', dataIndex: 'orderNo', width: 190, render: (value?: string) => value || '—' },
                  { title: '发放时间', dataIndex: 'issuedAt', width: 165 },
                  { title: '有效期截止', dataIndex: 'expiresAt', width: 165 },
                  { title: '核销拍摄点', dataIndex: 'shootingPoint', width: 120, render: (value?: string) => value || '—' },
                  { title: '操作', key: 'operation', fixed: 'right', width: 85, render: (_, record) => effectiveCouponStatus(record) === '待使用' ? <Popconfirm title="作废这张券？" okText="作废" cancelText="取消" onConfirm={() => voidRecord(record)}><Button type="link" danger>作废</Button></Popconfirm> : '—' },
                ]}
              />
            </> },
            ...(detailCoupon.kind === '体验权益券' ? [{ key: 'codes', label: `第三方兑换码（${totalCouponCodes}）`, children: <>
              <div className="coupon-record-query"><Typography.Text type="secondary">渠道码售出后可兑换；兑换成功才开始计算体验有效期。</Typography.Text><Button type="link" onClick={() => openCodeDetails(detailCoupon)}>查看全部兑换码</Button></div>
              <Table rowKey="id" size="small" scroll={{ x: 900 }} dataSource={detailCodes} pagination={{ pageSize: 6 }} locale={{ emptyText: '暂无第三方兑换码' }} columns={[
                { title: '兑换码', dataIndex: 'code', width: 240 },
                { title: '渠道 / 批次', width: 200, render: (_, record) => <>{record.channel}<div className="coupon-cell-subtitle">{record.batchNo}</div></> },
                { title: '状态', dataIndex: 'status', width: 95, render: (status: string) => <Tag color={status === '待兑换' ? 'gold' : status === '已兑换' ? 'blue' : 'default'}>{status}</Tag> },
                { title: '生成时间', dataIndex: 'generatedAt', width: 165 },
                { title: '兑换用户', dataIndex: 'redeemedPhone', width: 120, render: (value?: string) => value || '—' },
                { title: '权益截止', dataIndex: 'expiresAt', width: 165, render: (value: string | undefined, record) => value || `兑换后${record.validityDays}天` },
              ]} />
            </> }] : []),
          ]} />
        </>}
      </Drawer>

      <Modal title="优惠券创建成功" open={Boolean(createdCoupon)} onCancel={() => setCreatedCoupon(null)} footer={null}>
        {createdCoupon && <div className="coupon-created-next-step">
          <Alert type="success" showIcon message={createdCoupon.name} description={`${createdCoupon.kind} · ${createdCoupon.benefit} · 领取后${createdCoupon.validityDays}天有效`} />
          <Typography.Paragraph>创建完成。你可以继续以下操作，也可以稍后从优惠券详情进入：</Typography.Paragraph>
          <Space wrap>
            <Button type="primary" onClick={() => { setIssueCoupon(createdCoupon); setCreatedCoupon(null); }}>定向发券</Button>
            <Button onClick={() => { setDetailCoupon(createdCoupon); setDetailTab('rules'); setCreatedCoupon(null); }}>查看领取入口</Button>
            {createdCoupon.kind === '体验权益券' && <Button onClick={() => { codeForm.setFieldsValue({ channel: '美团', quantity: 100 }); setCodeCoupon(createdCoupon); setCreatedCoupon(null); }}>导出第三方兑换码</Button>}
          </Space>
        </div>}
      </Modal>

      <Drawer
        className="design-drawer coupon-phone-drawer"
        title="定向发券"
        width={520}
        open={Boolean(issueCoupon)}
        onClose={closeIssueDrawer}
        footer={<Space><Button onClick={closeIssueDrawer}>取消</Button><Button type="primary" icon={<SendOutlined />} onClick={sendToPhone}>确认发券</Button></Space>}
      >
        {issueCoupon && <>
          <div className="coupon-target-summary"><Tag color={issueCoupon.kind === '体验权益券' ? 'purple' : 'blue'}>{issueCoupon.kind}</Tag><Typography.Text strong>{issueCoupon.name}</Typography.Text><Typography.Text type="secondary">{issueCoupon.benefit} · 领取后{issueCoupon.validityDays}天有效</Typography.Text></div>
          <Form form={phoneForm} layout="vertical"><Form.Item label="接收手机号" name="phone" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入有效的 11 位手机号' }]}><Input placeholder="请输入已注册用户手机号" maxLength={11} /></Form.Item></Form>
          <Typography.Paragraph type="secondary">发券后会生成一条待使用的持券记录。</Typography.Paragraph>
        </>}
      </Drawer>

      <Modal title="定向发券成功" open={Boolean(issuedSummary)} onCancel={() => setIssuedSummary(null)} footer={null}>
        {issuedSummary && <div className="coupon-created-next-step">
          <Alert type="success" showIcon message={`已发给 ${issuedSummary.phone}`} description={`${issuedSummary.template.name} · ${issuedSummary.template.benefit}`} />
          <Space className="coupon-next-actions"><Button type="primary" onClick={() => { openIssueDetails(issuedSummary.template); setIssuedSummary(null); }}>查看持券记录</Button><Button onClick={() => setIssuedSummary(null)}>完成</Button></Space>
        </div>}
      </Modal>

      <Modal title="生成第三方兑换码" open={Boolean(codeCoupon)} onCancel={() => setCodeCoupon(null)} onOk={makeCodes} okText="生成并下载">
        {codeCoupon && <>
          <Typography.Paragraph>{codeCoupon.name} · {codeCoupon.benefit}</Typography.Paragraph>
          <Alert className="coupon-code-help" type="info" showIcon message="生成后登记为“未售出”；在发放明细可模拟渠道售出和用户兑换，兑换后才形成持券权益。" />
          <Form form={codeForm} layout="vertical">
            <Form.Item name="channel" label="销售渠道" rules={[{ required: true }]}><Select options={['美团', '抖音'].map((value) => ({ value, label: value }))} /></Form.Item>
            <Form.Item name="quantity" label="兑换码数量" extra={`剩余可发放 ${codeCoupon.totalLimit === undefined ? '不限' : remainingCount(codeCoupon) + ' 张'}；生成后即占用额度，作废不返还，并下载 CSV。`} rules={[{ required: true }, { type: 'number', min: 1, max: 10000, message: '数量需在 1 至 10000 之间' }, { validator: (_, value) => value === undefined || value <= remainingCount(codeCoupon) ? Promise.resolve() : Promise.reject(new Error('超过剩余可发放数量')) }]}><InputNumber min={1} max={Math.min(10000, remainingCount(codeCoupon))} precision={0} className="full-width" /></Form.Item>
          </Form>
        </>}
      </Modal>
      <Modal title="兑换码已生成" open={Boolean(generatedBatch)} onCancel={() => setGeneratedBatch(null)} footer={null}>
        {generatedBatch && <div className="coupon-created-next-step">
          <Alert type="success" showIcon message={`已生成 ${generatedBatch.quantity} 个兑换码`} description={`批次号：${generatedBatch.batchNo}。CSV 已下载，兑换码也已登记到原型明细。`} />
          <Space className="coupon-next-actions"><Button type="primary" onClick={() => { openCodeDetails(generatedBatch.template); setGeneratedBatch(null); }}>查看第三方兑换码</Button><Button onClick={() => setGeneratedBatch(null)}>完成</Button></Space>
        </div>}
      </Modal>
    </section>
  );
}
