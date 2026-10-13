import { PlusOutlined, RedoOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Form, Input, InputNumber, Radio, Select, Space, Table, Tabs, Tag, Upload } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gotoViewerNode } from '../viewer';

type PromotionRule = { point?: string; rate?: number };
type FormValues = {
  name: string;
  contact: string;
  phone: string;
  license?: unknown;
  bankOwner: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  splitMode: 'system' | 'thirdParty';
  rules: PromotionRule[];
};

type Promotion = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  source: string;
  audit: '已通过' | '待审核' | '已驳回';
  enabled: boolean;
  account: string[];
};

const promotions: Promotion[] = [
  { id: '1', name: '湖畔旅拍推广', contact: '金国华', phone: '137****2288', source: '小程序申请', audit: '已通过', enabled: true, account: ['开户名：杭州湖畔旅拍有限公司', '银行名称：杭州银行', '银行账号：622202********5521', '开户行地址：西湖支行'] },
  { id: '2', name: '云栖竹径推广', contact: '郑小燕', phone: '150****6621', source: '小程序申请', audit: '待审核', enabled: false, account: ['开户名：杭州云栖竹径文创有限公司', '银行名称：农业银行', '银行账号：622848********6621', '开户行地址：西湖支行'] },
  { id: '3', name: '灵隐素斋推广', contact: '陈志强', phone: '186****5521', source: '后台创建', audit: '已通过', enabled: true, account: ['开户名：杭州灵隐素斋馆', '银行名称：中国银行', '银行账号：621661********5521', '开户行地址：灵隐支行'] },
  { id: '4', name: '钱塘亲子游推广', contact: '沈乐乐', phone: '139****1846', source: '小程序申请', audit: '待审核', enabled: false, account: ['开户名：杭州钱塘亲子游有限公司', '银行名称：招商银行', '银行账号：621483********1846', '开户行地址：钱江支行'] },
];

const pointOptions = ['云栖山游客中心', '云栖山观景台', '云栖山北门', '云栖山南门'].map((value) => ({ value, label: value }));

function PromotionBackdrop() {
  const columns: TableColumnsType<Promotion> = [
    { title: '推广方名称', dataIndex: 'name', width: 180 },
    { title: '联系人', dataIndex: 'contact', width: 96 },
    { title: '手机号', dataIndex: 'phone', width: 120 },
    { title: '开通方式', dataIndex: 'source', width: 108, render: (value: string) => <Tag bordered={false}>{value}</Tag> },
    { title: '审核状态', dataIndex: 'audit', width: 96, render: (value: string) => <Tag bordered={false}>{value}</Tag> },
    { title: '状态', dataIndex: 'enabled', width: 84, render: (value: boolean) => <Tag color={value ? 'blue' : 'default'}>{value ? '启用' : '禁用'}</Tag> },
    { title: '收款账户', dataIndex: 'account', width: 250, render: (values: string[]) => <div className="account-lines">{values.map((value) => <span key={value}>{value}</span>)}</div> },
    { title: '操作', width: 120, render: (_, row) => <Space size={4}><Button type="link" size="small">{row.audit === '待审核' ? '审核' : '编辑'}</Button><Button type="link" danger size="small">删除</Button></Space> },
  ];

  return (
    <div className="admin-page promotion-page">
      <section className="white-card filter-panel promotion-filter">
        <Input prefix={<SearchOutlined />} placeholder="推广方名称 / 联系人 / 手机号" />
        <Select placeholder="状态" options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '禁用' }]} />
        <Button icon={<RedoOutlined />}>重置</Button>
      </section>
      <section className="white-card list-panel">
        <div className="list-toolbar promotion-toolbar">
          <Tabs activeKey="全部" items={['全部', '待审核', '已通过', '已驳回'].map((label) => ({ key: label, label }))} />
          <Button type="primary">＋ 新增推广方</Button>
        </div>
        <Table rowKey="id" className="promotion-table" columns={columns} dataSource={promotions} pagination={false} scroll={{ x: 1054 }} />
      </section>
    </div>
  );
}

export default function DrawerFormPage() {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const selectedRules = Form.useWatch('rules', form) ?? [];
  const close = () => gotoViewerNode('admin-list', () => navigate('/orders'));

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      message.success(`推广方“${values.name}”保存成功`);
      close();
    }, 500);
  };

  return (
    <div className="drawer-page">
      <PromotionBackdrop />
      <Drawer
        className="design-drawer promotion-drawer"
        title="新增推广方"
        size={720}
        open
        maskClosable={false}
        onClose={close}
        footer={<><Button onClick={close}>取消</Button><Button type="primary" loading={submitting} onClick={submit}>保存</Button></>}
      >
        <Form<FormValues> form={form} layout="vertical" initialValues={{ splitMode: 'system', rules: [] }} requiredMark>
          <section className="drawer-section">
            <h3 className="drawer-section-title">基础信息</h3>
            <div className="promotion-form-grid">
              <Form.Item label="推广方名称" name="name" rules={[{ required: true, message: '请输入推广方名称' }]}><Input placeholder="请输入推广方名称" /></Form.Item>
              <Form.Item label="联系人" name="contact" rules={[{ required: true, message: '请输入联系人姓名' }]}><Input placeholder="请输入联系人姓名" /></Form.Item>
            </div>
            <Form.Item label="手机号" name="phone" rules={[{ required: true, message: '请输入负责人手机号' }, { pattern: /^1\d{10}$/, message: '请输入有效的 11 位手机号' }]}><Input placeholder="请输入负责人手机号" maxLength={11} /></Form.Item>
            <Form.Item label="营业执照" name="license" rules={[{ required: true, message: '请上传营业执照文件' }]} extra="上传营业执照复印件，用于资质备案。">
              <div className="license-upload">
                <Upload accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" maxCount={1} beforeUpload={(file) => {
                  const extension = file.name.split('.').pop()?.toLowerCase();
                  if (!extension || !['jpg', 'jpeg', 'png', 'pdf'].includes(extension) || file.size > 2 * 1024 * 1024) {
                    message.error('文件格式或大小不符合要求，请上传 jpg、jpeg、png、pdf 文件，且文件不超过 2MB');
                    return Upload.LIST_IGNORE;
                  }
                  form.setFieldValue('license', file);
                  return false;
                }}><Button icon={<UploadOutlined />}>上传图片</Button></Upload>
                <span className="field-sub">单张 ≤ 2MB</span>
              </div>
            </Form.Item>
          </section>

          <section className="drawer-section">
            <h3 className="drawer-section-title">收款账户</h3>
            <div className="promotion-form-grid">
              <Form.Item label="开户名" name="bankOwner" rules={[{ required: true, message: '请输入开户名' }]}><Input placeholder="请输入开户名" /></Form.Item>
              <Form.Item label="银行名称" name="bankName" rules={[{ required: true, message: '请输入银行名称' }]}><Input placeholder="请输入银行名称" /></Form.Item>
              <Form.Item label="银行账号" name="bankAccount" rules={[{ required: true, message: '请输入银行账号' }]}><Input placeholder="请输入银行账号" /></Form.Item>
              <Form.Item label="开户行地址" name="bankBranch" rules={[{ required: true, message: '请输入开户行地址' }]}><Input placeholder="请输入开户行地址，如：杭州湖滨支行" /></Form.Item>
            </div>
          </section>

          <section className="drawer-section">
            <h3 className="drawer-section-title">分成配置 <span className="cell-subtitle">（非必填）</span></h3>
            <Form.Item label="分账方式" name="splitMode"><Radio.Group options={[{ value: 'system', label: '线下对公结算' }, { value: 'thirdParty', label: '线上自动分账' }]} /></Form.Item>
            <Form.Item label="分成规则">
              <Form.List name="rules">
                {(fields, { add, remove }) => (
                  <>
                    <div className="rule-table-wrap">
                      {fields.length === 0 && <div className="empty-panel">暂无分成规则</div>}
                      {fields.map((field) => (
                        <div className="promotion-rule-row" key={field.key}>
                          <div className="promotion-rule-grid">
                            <Form.Item {...field} label="拍摄点" name={[field.name, 'point']} rules={[{ required: true, message: '请选择拍摄点' }]}>
                              <Select
                                placeholder="请选择拍摄点"
                                options={pointOptions.map((option) => ({
                                  ...option,
                                  disabled: selectedRules.some((rule: PromotionRule, index: number) => index !== field.name && rule?.point === option.value),
                                }))}
                              />
                            </Form.Item>
                            <Form.Item {...field} label="分成比例(%)" name={[field.name, 'rate']} rules={[{ required: true, message: '请输入分成比例' }]}><InputNumber min={0} max={100} precision={0} addonAfter="%" /></Form.Item>
                            <div className="rule-action"><Button type="link" danger size="small" onClick={() => remove(field.name)}>删除</Button></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ rate: 0 })}>新增规则</Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </section>
        </Form>
      </Drawer>
    </div>
  );
}
