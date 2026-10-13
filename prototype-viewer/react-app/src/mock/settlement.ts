export type SettlementStatus = '已完成' | '已使用' | '已退款';

export type SettlementOrder = {
  id: string;
  orderNo: string;
  orderInfo: string;
  point: string;
  status: SettlementStatus;
  createdAt: string;
  completedAt: string;
  amount: number;
  ratio: number;
  payable: number;
};

export const settlementOrders: SettlementOrder[] = [
  { id: '1', orderNo: '20260521101822', orderInfo: '云栖山晨雾旅拍', point: '云栖山观景台', status: '已完成', createdAt: '2026-05-21 10:18:22', completedAt: '2026-05-21 10:32:41', amount: 269, ratio: 100, payable: 269 },
  { id: '2', orderNo: '20260521115603', orderInfo: '云栖山日落旅拍', point: '云栖山游客中心', status: '已完成', createdAt: '2026-05-21 11:56:03', completedAt: '2026-05-21 12:18:25', amount: 329, ratio: 100, payable: 329 },
  { id: '3', orderNo: '20260521193640', orderInfo: '云栖山夜景巡航', point: '云栖山游客中心', status: '已完成', createdAt: '2026-05-21 19:36:40', completedAt: '2026-05-21 19:55:18', amount: 359, ratio: 100, payable: 359 },
  { id: '4', orderNo: '20260522135827', orderInfo: '云栖山旅拍精修', point: '云栖山北门', status: '已完成', createdAt: '2026-05-22 13:58:27', completedAt: '2026-05-22 14:08:52', amount: 189, ratio: 37, payable: 69.93 },
  { id: '5', orderNo: '20260522165811', orderInfo: '云栖山家庭快照', point: '云栖山南门', status: '已使用', createdAt: '2026-05-22 16:58:11', completedAt: '2026-05-22 17:10:36', amount: 159, ratio: 45, payable: 71.55 },
  { id: '6', orderNo: '20260522192441', orderInfo: '云栖山亲子旅拍', point: '云栖山北门', status: '已完成', createdAt: '2026-05-22 19:24:41', completedAt: '2026-05-22 19:46:12', amount: 399, ratio: 37, payable: 147.63 },
  { id: '7', orderNo: '20260523094652', orderInfo: '云栖山亲子旅拍', point: '云栖山观景台', status: '已完成', createdAt: '2026-05-23 09:46:52', completedAt: '2026-05-23 10:02:15', amount: 399, ratio: 100, payable: 399 },
  { id: '8', orderNo: '20260524110519', orderInfo: '云栖山晨雾旅拍', point: '云栖山观景台', status: '已完成', createdAt: '2026-05-24 11:05:19', completedAt: '2026-05-24 11:22:40', amount: 299, ratio: 100, payable: 299 },
  { id: '9', orderNo: '20260524132827', orderInfo: '云栖山家庭快照', point: '云栖山南门', status: '已退款', createdAt: '2026-05-24 13:28:27', completedAt: '2026-05-24 13:42:16', amount: 159, ratio: 45, payable: 0 },
];

export const scenicOptions = ['全部景区', '云栖山景区'].map((value) => ({ value, label: value }));
