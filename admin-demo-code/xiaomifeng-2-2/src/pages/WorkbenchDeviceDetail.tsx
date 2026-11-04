import { CameraOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Descriptions, Empty, Tag } from 'antd';
import type { OpsDevice } from '../features/operations/types';

type Metric = [string, string];
const Metrics = ({ items }: { items: Metric[] }) => <div className="ops-device-metrics">{items.map(([label, value]) => <div className="ops-device-metric" key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}</div>;
const Video = ({ airport }: { airport?: boolean }) => <div className="ops-device-video"><div className="ops-device-video-title">{airport ? <CameraOutlined /> : <VideoCameraOutlined />} {airport ? '机场画面' : '无人机画面'}</div><div className="ops-device-video-empty">暂无画面</div></div>;

function DroneInfo({ device }: { device: OpsDevice }) {
  return <section><h3>无人机信息</h3><Descriptions column={{ xs: 1, sm: 2 }} size="small" colon={false} items={[
    { key: 'name', label: '无人机名称', children: device.name }, { key: 'sn', label: '无人机编号', children: device.code },
    { key: 'model', label: '无人机型号', children: '—' }, { key: 'firmware', label: '固件版本', children: '—' },
    { key: 'battery', label: '可起飞电量', children: '—' }, { key: 'report', label: '上报时间', children: device.lastReport || '—' },
    { key: 'connection', label: '连接状态', children: device.connection }, { key: 'health', label: '健康状态', children: device.health },
    ...(device.fault ? [{ key: 'fault', label: '故障信息', children: device.fault, span: 2 }] : []),
  ]} /><Metrics items={['飞行时长', '飞行架次', '电量', '容量信息', '开关状态', '经度', '纬度', '高度'].map(label => [label, '—'])} /></section>;
}

export function WorkbenchDeviceDetail({ device, drones }: { device: OpsDevice; drones: OpsDevice[] }) {
  const airport = device.type === '机场';
  const weather = device.weather;
  return <div className="ops-alert-detail ops-device-detail">
    <section><h3>实时画面</h3><div className={`ops-device-videos${airport ? '' : ' is-single'}`}><Video />{airport && <Video airport />}</div></section>
    {airport ? <><section><h3>机场信息</h3><Descriptions column={{ xs: 1, sm: 2 }} size="small" colon={false} items={[
      { key: 'name', label: '机场名称', children: device.name }, { key: 'sn', label: '机场编号', children: device.code },
      { key: 'model', label: '机场型号', children: '—' }, { key: 'firmware', label: '固件版本号', children: '—' },
      { key: 'location', label: '所属拍摄点', children: device.scenic }, { key: 'position', label: '位置信息', children: '—' },
      { key: 'coordinates', label: '经纬度', children: '—' }, { key: 'altitude', label: '高度', children: '—' },
      { key: 'report', label: '上报时间', children: device.lastReport || '—' }, { key: 'notification', label: '告警通知', children: '—' },
      { key: 'connection', label: '连接状态', children: <Tag color={device.connection === '在线' ? 'success' : 'error'}>{device.connection}</Tag> },
      { key: 'health', label: '健康状态', children: <Tag color={device.health === '正常' ? 'success' : 'error'}>{device.health}</Tag> },
      ...(device.fault ? [{ key: 'fault', label: '故障信息', children: device.fault, span: 2 }] : []),
    ]} /><Metrics items={[
      ['累计时长', '—'], ['作业架次', '—'], ['网络', '—'], ['电量', '—'], ['风速', weather?.wind || '—'],
      ['降雨量', weather?.rain || '—'], ['是否在舱', '—'], ['舱内温度', '—'], ['舱内湿度', '—'], ['舱外温度', weather?.temperature || '—'],
      ['蓄电池电压', '—'], ['蓄电池温度', '—'], ['RTK档位', '—'], ['搜星状态', '—'], ['搜星数量', '—'], ['容量信息', '—'],
    ]} /></section>{drones.length ? drones.map(drone => <DroneInfo key={drone.id} device={drone} />) : <section><h3>无人机信息</h3><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关联无人机" /></section>}<section><h3>关联盒子信息</h3><Descriptions column={{ xs: 1, sm: 2 }} size="small" colon={false} items={[{ key: 'box', label: '绑定盒子', children: '—' }, { key: 'account', label: '所属账号', children: '—' }, { key: 'software', label: 'PSDK软件包', children: '—', span: 2 }]} /></section></> : <DroneInfo device={device} />}
  </div>;
}
