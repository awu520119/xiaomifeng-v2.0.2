import type { CouponIssueRecord } from '../mock/coupons';
export function downloadCouponCodes(records: CouponIssueRecord[], batchNo?: string) {
  if (!records.length) return;
  const rows = [['唯一券号/兑换码', '优惠券名称', '使用规则', '生效日期', '失效日期', '专属领取链接', '二维码内容'], ...records.map((row) => [row.redeemCode, row.couponName, row.benefit, row.startsAt, row.expiresAt, receiveUrl(`code=${encodeURIComponent(row.redeemCode)}`), receiveUrl(`code=${encodeURIComponent(row.redeemCode)}`)])];
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadUrl(URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), `${batchNo || records[0].couponName}-券码与链接.csv`, true);
}
function downloadUrl(url: string, name: string, revoke = false) { const link = document.createElement('a'); link.href = url; link.download = name; link.click(); if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function receiveUrl(query: string) { const url = new URL(location.href); url.hash = `/coupon-receive?${query}`; return url.toString(); }
export function downloadQrCode(containerId: string, name: string) { const canvas = document.getElementById(containerId)?.querySelector('canvas'); if (!canvas) return false; const output = document.createElement('canvas'); output.width = canvas.width + 48; output.height = canvas.height + 48; const context = output.getContext('2d'); if (!context) return false; context.fillStyle = '#fff'; context.fillRect(0, 0, output.width, output.height); context.drawImage(canvas, 24, 24); downloadUrl(output.toDataURL('image/png'), `${name}.png`); return true; }
