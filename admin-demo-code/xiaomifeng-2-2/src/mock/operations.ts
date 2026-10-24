import type { OperationsStore } from '../features/operations/types';

export const opsPeople = [
  { name: '陈立', feishu: 'chenli', phone: '138****0216' },
  { name: '王珊', feishu: 'wangshan', phone: '139****3381' },
  { name: '赵启明', feishu: 'zhaoqiming', phone: '186****0709' },
  { name: '刘工', feishu: 'liugong', phone: '137****6128' },
];

export const initialOperationsStore: OperationsStore = {
  devices: [
    { id: 'AP-001', code: 'AP-001', name: '雁荡山北门机场', type: '机场', scenic: '雁荡山', connection: '在线', health: '正常', lastReport: '2026-10-23 10:28:12', x: 26, y: 27, weather: { condition: '多云', temperature: '19°C', wind: '3.2 m/s', rain: '无降水', updatedAt: '10:25' } },
    { id: 'AP-002', code: 'AP-002', name: '雁荡山灵峰机场', type: '机场', scenic: '雁荡山', connection: '在线', health: '异常', lastReport: '2026-10-23 10:27:45', fault: '机场网络连接不稳定', errorCode: 'NET-021', x: 49, y: 49, weather: { condition: '多云', temperature: '18°C', wind: '4.1 m/s', rain: '无降水', updatedAt: '10:20' } },
    { id: 'AP-003', code: 'AP-003', name: '南长街游客中心机场', type: '机场', scenic: '南长街', connection: '离线', health: '异常', lastReport: '2026-10-23 09:42:07', fault: '机场超过 30 分钟未上报', errorCode: 'COM-001', x: 72, y: 26, weather: { condition: '数据不可用', temperature: '—', wind: '—', rain: '—', updatedAt: '09:40', unavailable: true } },
    { id: 'AP-004', code: 'AP-004', name: '南长街古码头机场', type: '机场', scenic: '南长街', connection: '在线', health: '正常', lastReport: '2026-10-23 10:26:31', x: 76, y: 70, weather: { condition: '晴', temperature: '21°C', wind: '2.4 m/s', rain: '无降水', updatedAt: '10:24' } },
    { id: 'DR-101', code: 'DR-101', name: 'DJI M350 RTK', type: '无人机', scenic: '雁荡山', airportId: 'AP-001', connection: '在线', health: '正常', lastReport: '2026-10-23 10:28:08', x: 20, y: 22 },
    { id: 'DR-102', code: 'DR-102', name: 'DJI M350 RTK', type: '无人机', scenic: '雁荡山', airportId: 'AP-002', connection: '在线', health: '异常', lastReport: '2026-10-23 10:27:41', fault: '电池健康度低于阈值', errorCode: 'BAT-008', x: 52, y: 46 },
    { id: 'DR-103', code: 'DR-103', name: 'DJI Mavic 3E', type: '无人机', scenic: '南长街', airportId: 'AP-003', connection: '离线', health: '异常', lastReport: '2026-10-23 09:41:59', fault: '设备连接中断', errorCode: 'COM-001', x: 69, y: 30 },
    { id: 'DR-104', code: 'DR-104', name: 'DJI M350 RTK', type: '无人机', scenic: '南长街', airportId: 'AP-004', connection: '在线', health: '正常', lastReport: '2026-10-23 10:26:20', x: 80, y: 66 },
  ],
  alerts: [
    { id: 'AL-20261023-018', name: '机场网络连接不稳定', level: '严重', status: '待处理', scenic: '雁荡山', airport: '雁荡山灵峰机场', device: '雁荡山灵峰机场', deviceId: 'AP-002', faultType: '网络异常', errorCode: 'NET-021', firstAt: '2026-10-23 09:58:21', latestAt: '2026-10-23 10:27:45', description: '机场连续多次心跳延迟，最近 5 分钟内出现 8 次连接超时。', assigned: '陈立', notification: '已发送给陈立', timeline: [{ at: '10:27:45', actor: '系统', action: '告警再次触发' }, { at: '09:58:21', actor: '飞控平台', action: '首次发现网络连接异常' }] },
    { id: 'AL-20261023-017', name: '无人机电池健康度偏低', level: '一般', status: '处理中', scenic: '雁荡山', airport: '雁荡山灵峰机场', device: 'DJI M350 RTK', deviceId: 'DR-102', faultType: '电池异常', errorCode: 'BAT-008', firstAt: '2026-10-23 09:34:08', latestAt: '2026-10-23 10:21:54', description: '电池健康度为 61%，建议检查电池循环次数并安排更换。', assigned: '王珊', responseAt: '2026-10-23 09:41:16', workOrderId: 'WO-20261023-006', notification: '已发送给王珊', timeline: [{ at: '09:41:16', actor: '王珊', action: '确认响应' }, { at: '09:34:08', actor: '系统', action: '创建告警' }] },
    { id: 'AL-20261023-016', name: '机场数据上报中断', level: '严重', status: '处理中', scenic: '南长街', airport: '南长街游客中心机场', device: '南长街游客中心机场', deviceId: 'AP-003', faultType: '设备离线', errorCode: 'COM-001', firstAt: '2026-10-23 09:42:07', latestAt: '2026-10-23 09:42:07', description: '机场及关联无人机均已超过 30 分钟未上报运行数据。', assigned: '赵启明', responseAt: '2026-10-23 09:49:32', notification: '发送失败，可重试', timeline: [{ at: '09:49:32', actor: '赵启明', action: '确认响应' }, { at: '09:42:07', actor: '系统', action: '创建告警，飞书通知失败' }] },
    { id: 'AL-20261022-044', name: '无人机定位信号弱', level: '提示', status: '已关闭', scenic: '雁荡山', airport: '雁荡山北门机场', device: 'DJI M350 RTK', deviceId: 'DR-101', faultType: '定位异常', firstAt: '2026-10-22 16:18:40', latestAt: '2026-10-22 16:26:03', description: '定位信号短暂减弱，检查后已恢复。', assigned: '陈立', responseAt: '2026-10-22 16:21:03', workOrderId: 'WO-20261022-031', notification: '已发送给陈立', timeline: [{ at: '16:31:20', actor: '陈立', action: '填写处置结果并关闭告警' }, { at: '16:21:03', actor: '陈立', action: '确认响应' }] },
    { id: 'AL-20261022-041', name: '机场舱门状态异常', level: '一般', status: '待处理', scenic: '南长街', airport: '南长街古码头机场', device: '南长街古码头机场', deviceId: 'AP-004', faultType: '硬件异常', errorCode: 'DOOR-004', firstAt: '2026-10-22 14:06:18', latestAt: '2026-10-22 14:12:42', description: '机场舱门关闭状态反馈异常，请远程检查舱门传感器。', assigned: '赵启明', notification: '已发送给赵启明', timeline: [{ at: '14:12:42', actor: '系统', action: '告警升级并通知值班人员' }] },
  ],
  schedules: [
    { id: 'SCH-01', date: '2026-10-23', shift: '早班', start: '08:00', end: '16:00', scope: '全局', person: '陈立', feishu: 'chenli', phone: '138****0216' },
    { id: 'SCH-02', date: '2026-10-23', shift: '晚班', start: '16:00', end: '00:00', scope: '全局', person: '王珊', feishu: 'wangshan', phone: '139****3381' },
    { id: 'SCH-03', date: '2026-10-24', shift: '早班', start: '08:00', end: '16:00', scope: '雁荡山', person: '赵启明', feishu: 'zhaoqiming', phone: '186****0709' },
    { id: 'SCH-04', date: '2026-10-24', shift: '晚班', start: '16:00', end: '00:00', scope: '全局', person: '刘工', feishu: 'liugong', phone: '137****6128' },
    { id: 'SCH-05', date: '2026-10-25', shift: '早班', start: '08:00', end: '16:00', scope: '全局', person: '陈立', feishu: 'chenli', phone: '138****0216' },
    { id: 'SCH-06', date: '2026-10-26', shift: '晚班', start: '16:00', end: '00:00', scope: '南长街', person: '王珊', feishu: 'wangshan', phone: '139****3381' },
  ],
  workOrders: [
    { id: 'WO-20261023-006', title: '检查无人机电池健康度', source: '告警转入', scenic: '雁荡山', airport: '雁荡山灵峰机场', device: 'DJI M350 RTK', deviceId: 'DR-102', description: '电池健康度为 61%，检查电池循环次数、外观及充放电记录，评估是否需要更换。', priority: '高', assignee: '王珊', status: '处理中', createdAt: '2026-10-23 09:41:16', updatedAt: '2026-10-23 10:15:22', sourceAlertId: 'AL-20261023-017', records: [{ at: '2026-10-23 10:15:22', actor: '王珊', action: '添加处理记录', description: '已通知现场人员暂停使用该电池，正在核查循环次数。' }, { at: '2026-10-23 09:41:16', actor: '王珊', action: '接单', description: '开始检查电池状态。' }] },
    { id: 'WO-20261022-031', title: '排查无人机定位信号', source: '告警转入', scenic: '雁荡山', airport: '雁荡山北门机场', device: 'DJI M350 RTK', deviceId: 'DR-101', description: '定位信号短暂减弱，检查机场周边遮挡及定位天线连接。', priority: '中', assignee: '陈立', status: '已完成', createdAt: '2026-10-22 16:21:03', updatedAt: '2026-10-22 16:31:20', sourceAlertId: 'AL-20261022-044', cause: '机场附近临时施工遮挡定位天线。', result: '调整天线位置后信号恢复正常。', records: [{ at: '2026-10-22 16:31:20', actor: '陈立', action: '完成工单', description: '调整天线位置，复测定位信号正常。' }, { at: '2026-10-22 16:24:11', actor: '陈立', action: '添加处理记录', description: '现场发现附近施工设备形成遮挡。' }] },
    { id: 'WO-20261022-029', title: '更换机场舱门传感器', source: '人工上报', scenic: '南长街', airport: '南长街古码头机场', device: '南长街古码头机场', deviceId: 'AP-004', description: '舱门状态反馈间歇异常，需要检查传感器接线并准备备件。', priority: '中', assignee: '赵启明', status: '待接单', createdAt: '2026-10-22 13:50:04', updatedAt: '2026-10-22 13:50:04', records: [] },
    { id: 'WO-20261021-018', title: '恢复机场网络连接', source: '人工上报', scenic: '雁荡山', airport: '雁荡山北门机场', device: '雁荡山北门机场', deviceId: 'AP-001', description: '例行巡检发现网络设备配置需要复核。', priority: '低', assignee: '刘工', status: '已取消', createdAt: '2026-10-21 11:18:33', updatedAt: '2026-10-21 11:42:09', cancelReason: '现场复核后确认网络运行正常。', records: [{ at: '2026-10-21 11:42:09', actor: '刘工', action: '取消工单', description: '现场复核后确认无需处理。' }] },
  ],
  solutions: [
    { id: 'SOL-001', name: '机场网络连接异常排查', faultType: '网络异常', deviceType: '机场', model: 'XH-Station V2', errorCode: 'NET-021', phenomenon: '机场心跳延迟、频繁断连或状态长时间未更新。', causes: '网络设备供电异常、网线松动、现场网络波动或路由器配置变化。', steps: ['确认机场供电指示灯及网络设备状态。', '检查网线和接口是否松动，重新插拔并观察连接状态。', '重启网络设备，等待 3 分钟观察心跳恢复。', '仍未恢复时记录设备日志并联系网络维护人员。'], notes: '重启前确认机场当前没有执行中的飞行任务。', status: '已启用', updatedAt: '2026-10-20 16:20:00' },
    { id: 'SOL-002', name: '无人机电池健康度异常处置', faultType: '电池异常', deviceType: '无人机', model: 'DJI M350 RTK', errorCode: 'BAT-008', phenomenon: '电池健康度低于 70%，续航时间明显缩短或电压波动。', causes: '电池循环次数较高、长期满电存放、温度异常或电芯衰减。', steps: ['停止使用告警电池并标记编号。', '查看电池循环次数、温度和电芯电压差。', '检查电池外观是否鼓包、破损或渗液。', '符合更换条件时登记电池编号并替换，复测后更新设备状态。'], notes: '外观异常或电芯压差过大时禁止继续充电。', status: '已启用', updatedAt: '2026-10-22 11:05:00' },
    { id: 'SOL-003', name: '无人机定位信号弱检查', faultType: '定位异常', deviceType: '无人机', model: '通用', errorCode: 'GPS-003', phenomenon: '定位卫星数量少、定位精度降低或飞行器提示定位信号弱。', causes: '周边遮挡、天线连接异常、强电磁干扰或天气影响。', steps: ['确认飞行器已降落并停止自动任务。', '检查起降点周边遮挡和电磁干扰源。', '检查定位天线外观及连接。', '在开阔区域重新上电测试定位状态。'], notes: '定位状态未恢复前不得启动飞行任务。', status: '已停用', updatedAt: '2026-10-18 09:12:00' },
  ],
};
