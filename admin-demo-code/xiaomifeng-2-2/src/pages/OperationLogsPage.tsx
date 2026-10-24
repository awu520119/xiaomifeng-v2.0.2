import { Button, DatePicker, Select, Table, Tag, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { OperationLog, OperationType } from '../mock/operationLogs';
import { initialOperationLogs, operationTypes } from '../mock/operationLogs';

const operatorOptions = Array.from(new Map(initialOperationLogs.map((log) => [log.operatorId, {
  value: log.operatorId,
  label: `${log.operatorAccount}（${log.operator}）`,
}])).values());

const operationTypeTone = (type: OperationType) => ({ 新增: 'create', 编辑: 'edit', 删除: 'delete', 执行: 'execute' }[type]);

function OperationContent({ log }: { log: OperationLog }) {
  const changeTexts = log.changes.map((change) => `${change.field}：${change.before === '未创建' || change.before === '—' ? change.after : `${change.before} → ${change.after}`}`);
  const crossTenant = log.targetTenant && log.operatorOrg !== log.targetTenant && log.objectName !== log.targetTenant;
  const actionText = `${log.action}「${log.objectName}」${log.objectSuffix ?? ''}`;
  const fullText = [actionText, ...changeTexts, crossTenant ? `作用租户：${log.targetTenant}` : null].filter(Boolean).join('；');

  return <Tooltip
    placement="topLeft"
    trigger={['hover', 'focus']}
    overlayClassName="operation-log-tooltip"
    title={<div className="operation-log-tooltip-content">
      <div>{actionText}</div>
      {changeTexts.map((change, index) => <div key={`${change}-${index}`}>{change}</div>)}
      {crossTenant && <div>作用租户：{log.targetTenant}</div>}
    </div>}
  >
    <div className="operation-log-content" tabIndex={0} aria-label={fullText}>
      <span>{log.action}「<strong className="operation-log-object">{log.objectName}</strong>」{log.objectSuffix}</span>
      {changeTexts.length > 0 && <span className="operation-log-content-changes">；{changeTexts.join('；')}</span>}
      {crossTenant && <span className="operation-log-target-tenant">；作用租户：{log.targetTenant}</span>}
    </div>
  </Tooltip>;
}

const columns: TableColumnsType<OperationLog> = [
  { title: '操作时间', dataIndex: 'time', width: 180 },
  { title: '操作人', dataIndex: 'operatorAccount', width: 160 },
  { title: '操作类型', dataIndex: 'operationType', width: 110, render: (value: OperationType) => <Tag className={`operation-log-type-tag operation-log-type-tag-${operationTypeTone(value)}`}>{value}</Tag> },
  { title: '操作模块', dataIndex: 'module', width: 140, render: (value: string) => <Tag className="operation-log-module-tag">{value}</Tag> },
  { title: '操作内容', key: 'content', width: 420, render: (_, row) => <OperationContent log={row} /> },
];

export default function OperationLogsPage() {
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [datePickerKey, setDatePickerKey] = useState(0);
  const [operationType, setOperationType] = useState<OperationType>();
  const [operatorId, setOperatorId] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const hasFilters = !!dateRange || !!operationType || !!operatorId;

  const rows = useMemo(() => initialOperationLogs.filter((item) => (
    (!operationType || item.operationType === operationType)
    && (!operatorId || item.operatorId === operatorId)
    && (!dateRange || (item.time.slice(0, 10) >= dateRange[0] && item.time.slice(0, 10) <= dateRange[1]))
  )).sort((a, b) => b.time.localeCompare(a.time)), [dateRange, operationType, operatorId]);

  const reset = () => {
    setDateRange(null);
    setDatePickerKey((key) => key + 1);
    setOperationType(undefined);
    setOperatorId(undefined);
    setCurrentPage(1);
  };

  return (
    <section className="operation-log-page admin-list-page">
      <section className="admin-filter-card">
        <div className="operation-log-filters" aria-label="操作记录筛选">
          <div className="operation-log-filter">
            <DatePicker.RangePicker key={datePickerKey} aria-label="操作时间范围" format="YYYY-MM-DD" placeholder={['开始日期', '结束日期']} onChange={(range) => {
              setDateRange(range?.[0] && range?.[1] ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')] : null);
              setCurrentPage(1);
            }} />
          </div>
          <Select<OperationType> className="operation-log-type-select" aria-label="操作类型" allowClear placeholder="操作类型" value={operationType} options={operationTypes.map((type) => ({ label: type, value: type }))} onChange={(value) => { setOperationType(value); setCurrentPage(1); }} />
          <Select<string> className="operation-log-operator-select" aria-label="操作人账号" showSearch optionFilterProp="label" allowClear placeholder="操作人账号" notFoundContent="没有匹配的账号" value={operatorId} options={operatorOptions} onChange={(value) => { setOperatorId(value); setCurrentPage(1); }} />
          <Button type="link" icon={<ReloadOutlined />} disabled={!hasFilters} onClick={reset}>重置</Button>
        </div>
      </section>
      <section className="operation-log-card admin-list-card">
        <Table<OperationLog> rowKey="id" columns={columns} dataSource={rows} scroll={{ x: 1010, y: 'calc(100vh - 320px)' }} pagination={{ current: currentPage, onChange: setCurrentPage, pageSize: 10, showSizeChanger: false, showTotal: (total) => `共 ${total} 条记录` }} locale={{ emptyText: hasFilters ? <span>没有找到匹配的操作记录<Button type="link" onClick={reset}>清除筛选</Button></span> : '暂无操作记录' }} />
      </section>
    </section>
  );
}
