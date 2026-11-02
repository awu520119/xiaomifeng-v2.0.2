import { Descriptions, Empty, Tag, Timeline } from 'antd';
import type { OpsWorkOrder } from '../features/operations/types';

export function WorkOrderDetail({ order }: { order?: OpsWorkOrder }) {
  if (!order) return <Empty description="未找到关联工单" />;
  return <div className="ops-alert-detail ops-work-order-detail">
    <section><h3>工单信息</h3><Descriptions column={{ xs: 1, sm: 2 }} size="small" colon={false} items={[
      { key: 'id', label: '工单编号', children: order.id },
      { key: 'title', label: '工单标题', children: order.title },
      { key: 'status', label: '处理状态', children: <Tag color={order.status === '已完成' ? 'success' : order.status === '处理中' ? 'processing' : 'default'}>{order.status}</Tag> },
      { key: 'person', label: '负责人', children: order.assignee },
      { key: 'device', label: '所属设备', children: order.device },
      { key: 'created', label: '创建时间', children: order.createdAt },
      ...(order.description ? [{ key: 'description', label: '故障描述', span: 2, children: order.description }] : []),
    ]} /></section>
    {(order.result || order.cancelReason) && <section><h3>处理结果</h3><div className="ops-detail-text">{order.result || order.cancelReason}</div></section>}
    {order.records.length > 0 && <section><h3>处理记录</h3><Timeline items={order.records.map(record => ({ children: <div className="ops-timeline-item"><span>{record.at}</span><strong>{record.actor}，{record.action}</strong>{record.description && <div>{record.description}</div>}</div> }))} /></section>}
  </div>;
}
