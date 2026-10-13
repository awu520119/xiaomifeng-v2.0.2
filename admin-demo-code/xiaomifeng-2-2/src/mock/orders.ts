export type OrderStatus = '待付款' | '待使用' | '已使用' | '已取消' | '已退款';

export type Order = {
  id: string;
  orderNo: string;
  scenicArea: string;
  productName: string;
  customer: string;
  phone: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
};

const statuses: OrderStatus[] = ['待付款', '待使用', '已使用', '已取消', '已退款'];

export const initialOrders: Order[] = statuses.map((status, index) => ({
  id: String(index + 1),
  orderNo: `ORD${10001 + index}`,
  scenicArea: '天妃湖飞机体验基地',
  productName: '天妃湖智能航拍双镜头',
  customer: `体验用户${index + 1}`,
  phone: `1666666777${index}`,
  amount: 99 + index * 20,
  status,
  createdAt: `2025-04-0${index + 1} 12:34:34`,
}));
