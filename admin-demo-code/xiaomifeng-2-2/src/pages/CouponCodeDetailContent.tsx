import { Button, Popover, QRCode, Space, Tag, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { CouponIssueRecord } from '../mock/coupons';
import { downloadQrCode, receiveUrl } from '../utils/couponExport';

type Props = {
  ticket: CouponIssueRecord;
  serial: string;
  kindLabel: string;
  statusTone: string;
  statusClass: string;
  children?: ReactNode;
};

const qrId = (ticket: CouponIssueRecord) => `coupon-code-detail-qr-${ticket.id}`;

export default function CouponCodeDetailContent({ ticket, serial, kindLabel, statusTone, statusClass, children }: Props) {
  const copyCodeLink = async () => {
    const url = receiveUrl('code=' + encodeURIComponent(ticket.redeemCode));
    try { await navigator.clipboard.writeText(url); } catch { /* 复制失败时仍保留可见链接入口 */ }
  };
  return <div className="coupon-code-detail">
    <div className="coupon-code-detail-overview"><div className="coupon-code-detail-heading"><strong>{serial}</strong><span>{ticket.couponName}，{kindLabel}</span></div><Tag className={`coupon-status-tag coupon-status-tag-${statusClass}`}>{statusTone}</Tag></div>
    <div className="coupon-code-detail-info">
      <div className="coupon-code-detail-item"><span className="coupon-code-detail-label">领取用户</span><span className="coupon-code-detail-value">{ticket.phone || '未领取'}</span></div>
      <div className="coupon-code-detail-item"><span className="coupon-code-detail-label">领取时间</span><span className="coupon-code-detail-value">{ticket.issuedAt || '—'}</span></div>
      <div className="coupon-code-detail-item coupon-code-detail-validity"><span className="coupon-code-detail-label">有效期</span><span className="coupon-code-detail-value">领取后 {ticket.validityDays} 天可用{ticket.expiresAt ? `，截止 ${ticket.expiresAt}` : ''}</span></div>
    </div>
    <div className="coupon-code-detail-credential"><div className="coupon-code-detail-credential-main"><span>券码</span><Typography.Text copyable>{ticket.redeemCode}</Typography.Text></div><Space size={8}><Popover trigger="click" placement="bottomRight" content={<div className="coupon-code-qr-popover"><div id={qrId(ticket)}><QRCode value={receiveUrl('code=' + encodeURIComponent(ticket.redeemCode))} size={176} /></div><Button block icon={<DownloadOutlined />} onClick={() => downloadQrCode(qrId(ticket), ticket.redeemCode + '-二维码')}>下载二维码</Button></div>}><Button>查看二维码</Button></Popover><Button icon={<CopyOutlined />} onClick={() => void copyCodeLink()}>复制领取链接</Button></Space></div>
    {children}
  </div>;
}
