import type { CouponIssueRecord } from '../mock/coupons';
import { QRCode } from 'antd';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
export function downloadCouponCodes(records: CouponIssueRecord[], batchNo?: string) {
  if (!records.length) return;
  const rows = [['唯一券号/兑换码', '优惠券名称', '使用规则', '领取时间', '截止时间', '专属领取链接', '二维码内容'], ...records.map((row) => [row.redeemCode, row.couponName, row.benefit, row.issuedAt, row.expiresAt, receiveUrl(`code=${encodeURIComponent(row.redeemCode)}`), receiveUrl(`code=${encodeURIComponent(row.redeemCode)}`)])];
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadUrl(URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), `${batchNo || records[0].couponName}-券码与链接.csv`, true);
}
type ZipEntry = { name: string; data: Uint8Array };
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();
function crc32(data: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of data) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function createZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const write16 = (view: DataView, offset: number, value: number) => view.setUint16(offset, value, true);
  const write32 = (view: DataView, offset: number, value: number) => view.setUint32(offset, value, true);
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800); write16(localView, 8, 0);
    write16(localView, 10, dosTime); write16(localView, 12, dosDate); write32(localView, 14, checksum);
    write32(localView, 18, entry.data.length); write32(localView, 22, entry.data.length); write16(localView, 26, name.length); write16(localView, 28, 0);
    local.set(name, 30);
    localParts.push(local, entry.data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20); write16(centralView, 8, 0x0800); write16(centralView, 10, 0);
    write16(centralView, 12, dosTime); write16(centralView, 14, dosDate); write32(centralView, 16, checksum);
    write32(centralView, 20, entry.data.length); write32(centralView, 24, entry.data.length); write16(centralView, 28, name.length);
    write16(centralView, 30, 0); write16(centralView, 32, 0); write16(centralView, 34, 0); write32(centralView, 36, 0); write32(centralView, 38, 0); write32(centralView, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length + entry.data.length;
  }
  const centralLength = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50); write16(endView, 4, 0); write16(endView, 6, 0); write16(endView, 8, entries.length); write16(endView, 10, entries.length);
  write32(endView, 12, centralLength); write32(endView, 16, localOffset); write16(endView, 20, 0);
  const output = new Uint8Array(localOffset + centralLength + end.length);
  let offset = 0;
  for (const part of [...localParts, ...centralParts, end]) { output.set(part, offset); offset += part.length; }
  return new Blob([output.buffer as ArrayBuffer], { type: 'application/zip' });
}
function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('二维码图片生成失败')), 'image/png'));
}
export async function downloadExperienceCouponZip(records: CouponIssueRecord[], couponName: string) {
  if (!records.length) throw new Error('没有可导出的未领取体验券');
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:256px;height:256px;overflow:hidden;';
  document.body.appendChild(host);
  const root = createRoot(host);
  const entries: ZipEntry[] = [];
  const safeName = (value: string) => value.replace(/[\\/:*?"<>|]/g, '_');
  const rows = [['体验券编号', '唯一券码', '优惠券名称', '使用规则', '领取链接', '二维码文件'], ...records.map((record) => {
    const serial = record.serialNo || record.redeemCode;
    const link = receiveUrl(`code=${encodeURIComponent(record.redeemCode)}`);
    return [serial, record.redeemCode, record.couponName, record.benefit, link, `二维码/${safeName(serial)}.png`];
  })];
  const csv = new TextEncoder().encode('\uFEFF' + rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n'));
  entries.push({ name: '线下发放清单.csv', data: csv });
  try {
    for (const record of records) {
      const serial = safeName(record.serialNo || record.redeemCode);
      const link = receiveUrl(`code=${encodeURIComponent(record.redeemCode)}`);
      flushSync(() => root.render(createElement(QRCode, { key: record.id, value: link, size: 256, bordered: false, type: 'canvas' })));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const canvas = host.querySelector('canvas');
      if (!canvas) throw new Error(`体验券 ${serial} 的二维码生成失败`);
      entries.push({ name: `二维码/${serial}.png`, data: new Uint8Array(await (await canvasBlob(canvas)).arrayBuffer()) });
    }
  } finally {
    root.unmount();
    host.remove();
  }
  downloadUrl(URL.createObjectURL(createZip(entries)), `${safeName(couponName)}-线下发放券码.zip`, true);
}
function downloadUrl(url: string, name: string, revoke = false) { const link = document.createElement('a'); link.href = url; link.download = name; link.click(); if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function receiveUrl(query: string) {
  const url = new URL(location.href);
  if (document.documentElement.dataset.prototypeViewer === 'true' && /\/pages\/[^/]+\.html$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/pages\/[^/]+\.html$/, '/pages/mini-receive.html');
    url.hash = `/demo/export/mini-receive?${query}`;
  } else {
    url.hash = `/coupon-receive?${query}`;
  }
  return url.toString();
}
export function downloadQrCode(containerId: string, name: string) { const canvas = document.getElementById(containerId)?.querySelector('canvas'); if (!canvas) return false; const output = document.createElement('canvas'); output.width = canvas.width + 48; output.height = canvas.height + 48; const context = output.getContext('2d'); if (!context) return false; context.fillStyle = '#fff'; context.fillRect(0, 0, output.width, output.height); context.drawImage(canvas, 24, 24); downloadUrl(output.toDataURL('image/png'), `${name}.png`); return true; }
