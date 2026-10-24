export type AlertLevel = '严重' | '一般' | '提示';
export type AlertState = '待处理' | '处理中' | '已关闭';
export type WorkOrderState = '待接单' | '处理中' | '已完成' | '已取消';

export type OpsDevice = {
  id: string; name: string; code: string; type: '机场' | '无人机'; scenic: string; airportId?: string;
  connection: '在线' | '离线'; health: '正常' | '异常'; lastReport: string;
  fault?: string; errorCode?: string; weather?: { condition: string; temperature: string; wind: string; rain: string; updatedAt: string; unavailable?: boolean };
  x: number; y: number;
};
export type OpsAlert = {
  id: string; name: string; level: AlertLevel; status: AlertState; scenic: string; airport: string; device: string;
  deviceId: string; faultType: string; errorCode?: string; firstAt: string; latestAt: string; description: string;
  assigned: string; responseAt?: string; workOrderId?: string; notification: string; timeline: Array<{ at: string; actor: string; action: string }>;
};
export type OpsSchedule = { id: string; date: string; shift: string; start: string; end: string; scope: string; person: string; feishu: string; phone: string };
export type OpsWorkRecord = { at: string; actor: string; action: string; description: string };
export type OpsWorkOrder = {
  id: string; title: string; source: '告警转入' | '人工上报'; scenic: string; airport: string; device: string; deviceId: string;
  description: string; priority: '高' | '中' | '低'; assignee: string; status: WorkOrderState; createdAt: string; updatedAt: string;
  sourceAlertId?: string; cause?: string; result?: string; cancelReason?: string; records: OpsWorkRecord[];
};
export type OpsSolution = {
  id: string; name: string; faultType: string; deviceType: string; model: string; errorCode: string;
  phenomenon: string; causes: string; steps: string[]; notes: string; status: '已启用' | '已停用'; updatedAt: string;
};
export type OperationsStore = { devices: OpsDevice[]; alerts: OpsAlert[]; schedules: OpsSchedule[]; workOrders: OpsWorkOrder[]; solutions: OpsSolution[] };
