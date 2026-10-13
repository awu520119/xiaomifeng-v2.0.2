export type OrderStatus = '待付款' | '待使用' | '已使用' | '已取消' | '已退款';

export type Order = {
  id: string;
  orderNo: string;
  productName: string;
  customer: string;
  phone: string;
  scenicArea: string;
  amount: number;
  status: OrderStatus;
  account: string;
  createdAt: string;
};

const statuses: OrderStatus[] = ['待付款', '待使用', '已使用', '已取消', '已退款'];
const scenicAreas = ['天妃湖飞机体验基地', '云顶观景台', '湖畔栈道'];
const products = ['智能航拍双镜头', '云海日出跟拍', '湖畔轻旅拍'];

export const initialOrders: Order[] = Array.from({ length: 24 }, (_, index) => ({
  id: String(index + 1),
  orderNo: `XF202609${String(110024 - index).padStart(6, '0')}`,
  productName: products[index % products.length],
  customer: ['林女士', '陈先生', '赵女士', '王先生'][index % 4],
  phone: `1380000${String(2901 + index).slice(-4)}`,
  scenicArea: scenicAreas[index % scenicAreas.length],
  amount: [128, 98, 158, 88][index % 4],
  status: statuses[index % statuses.length],
  account: index % 2 ? 'operator01' : 'admin',
  createdAt: `2026-09-${String(11 - Math.floor(index / 8)).padStart(2, '0')} ${String(9 + (index % 8)).padStart(2, '0')}:42:18`,
}));

export const scenicAreaOptions = scenicAreas.map((value) => ({ value, label: value }));
