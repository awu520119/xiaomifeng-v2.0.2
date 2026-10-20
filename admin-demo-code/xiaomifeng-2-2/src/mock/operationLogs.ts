export type ParameterChange = {
  field: string;
  before: string;
  after: string;
};

export const operationTypes = ['新增', '编辑', '删除', '执行'] as const;
export type OperationType = typeof operationTypes[number];

export type OperationLog = {
  id: string;
  time: string;
  operator: string;
  operatorId: string;
  operatorAccount: string;
  operatorRole: string;
  operationType: OperationType;
  operatorOrg: string;
  backend: '平台后台' | '租户后台';
  targetTenant: string | null;
  targetTenantId: string | null;
  module: string;
  page: string;
  actionCode: string;
  action: string;
  object: string;
  objectName: string;
  objectSuffix?: string;
  objectId: string;
  changes: ParameterChange[];
};

export const initialOperationLogs: OperationLog[] = [
  {
    id: 'OP202610160012', time: '2026-10-16 16:12:05', operator: '林若溪', operatorId: 'u_1024', operatorOrg: '平台运营', backend: '平台后台', targetTenant: null, targetTenantId: null,
    operatorAccount: 'lin_ruoxi', operatorRole: '平台运营主管', operationType: '编辑',
    module: '角色管理', page: '角色管理', actionCode: 'platform_role.update_permissions', action: '配置平台角色', object: '平台角色', objectName: '平台运营专员', objectSuffix: '权限', objectId: 'PLATFORM-ROLE-1001',
    changes: [{ field: '租户管理权限', before: '只读', after: '可编辑' }],
  },
  {
    id: 'OP202610160001', time: '2026-10-16 15:42:18', operator: '孙佳宁', operatorId: 'u_1025', operatorOrg: '云栖影像', backend: '租户后台', targetTenant: '云栖影像', targetTenantId: 'TENANT-1001',
    operatorAccount: 'sun_jianing', operatorRole: '租户管理员', operationType: '编辑',
    module: '角色管理', page: '角色管理', actionCode: 'role.update_permissions', action: '配置角色', object: '角色', objectName: '运营主管', objectSuffix: '权限', objectId: 'ROLE-2001',
    changes: [{ field: '数据导出权限', before: '关闭', after: '开启' }],
  },
  {
    id: 'OP202610160002', time: '2026-10-16 15:26:03', operator: '周明远', operatorId: 'u_1048', operatorOrg: '云栖影像', backend: '租户后台', targetTenant: '云栖影像', targetTenantId: 'TENANT-1001',
    operatorAccount: 'zhou_mingyuan', operatorRole: '运营主管', operationType: '执行',
    module: '优惠券管理', page: '优惠券列表', actionCode: 'coupon.issue', action: '向「新会员」定向发放优惠券', object: '优惠券', objectName: '秋日双人体验券', objectId: 'CP-2002',
    changes: [{ field: '数量', before: '—', after: '100' }],
  },
  {
    id: 'OP202610160005', time: '2026-10-16 13:17:55', operator: '林若溪', operatorId: 'u_1024', operatorOrg: '平台运营', backend: '平台后台', targetTenant: null, targetTenantId: null,
    operatorAccount: 'lin_ruoxi', operatorRole: '平台运营主管', operationType: '新增',
    module: '成员管理', page: '成员管理', actionCode: 'platform_member.create', action: '新增平台成员', object: '平台成员', objectName: 'ops_xia', objectId: 'USER-2005',
    changes: [{ field: '姓名', before: '—', after: '夏晓' }, { field: '角色', before: '—', after: '运营专员' }],
  },
  {
    id: 'OP202610160006', time: '2026-10-16 11:48:22', operator: '周明远', operatorId: 'u_1048', operatorOrg: '云栖影像', backend: '租户后台', targetTenant: '云栖影像', targetTenantId: 'TENANT-1001',
    operatorAccount: 'zhou_mingyuan', operatorRole: '运营主管', operationType: '删除',
    module: '主题管理', page: '主题管理', actionCode: 'theme.delete', action: '删除主题', object: '主题', objectName: '夏日海边主题', objectId: 'THEME-2006',
    changes: [],
  },
  {
    id: 'OP202610150008', time: '2026-10-15 18:24:37', operator: '陈一诺', operatorId: 'u_1091', operatorOrg: '海岛旅拍', backend: '租户后台', targetTenant: '海岛旅拍', targetTenantId: 'TENANT-1002',
    operatorAccount: 'chen_yinuo', operatorRole: '租户管理员', operationType: '编辑',
    module: '角色管理', page: '角色管理', actionCode: 'role.update_permissions', action: '配置角色', object: '角色', objectName: '景区财务', objectSuffix: '权限', objectId: 'ROLE-2008',
    changes: [{ field: '退款记录查看权限', before: '无权限', after: '可查看' }],
  },
  {
    id: 'OP202610150009', time: '2026-10-15 16:09:04', operator: '赵子涵', operatorId: 'u_1173', operatorOrg: '星河文旅', backend: '租户后台', targetTenant: '星河文旅', targetTenantId: 'TENANT-1003',
    operatorAccount: 'zhao_zihan', operatorRole: '景区管理员', operationType: '编辑',
    module: '景区管理', page: '景区管理', actionCode: 'scenic.update', action: '编辑景区', object: '景区', objectName: '星河森林公园', objectId: 'SCENIC-2009',
    changes: [
      { field: '地址', before: '杭州市星河路18号', after: '杭州市星河路18号森林公园东门游客中心' },
      { field: '描述', before: '城市近郊森林景区', after: '城市近郊森林景区，新增东门游客中心与亲子徒步路线介绍' },
    ],
  },
  {
    id: 'OP202610150011', time: '2026-10-15 11:23:19', operator: '林若溪', operatorId: 'u_1024', operatorOrg: '平台运营', backend: '平台后台', targetTenant: '海岛旅拍', targetTenantId: 'TENANT-1002',
    operatorAccount: 'lin_ruoxi', operatorRole: '平台运营主管', operationType: '编辑',
    module: '租户列表', page: '租户列表', actionCode: 'tenant.disable', action: '停用租户', object: '租户', objectName: '海岛旅拍', objectId: 'TENANT-1002',
    changes: [{ field: '租户状态', before: '正常', after: '已停用' }],
  },
];
