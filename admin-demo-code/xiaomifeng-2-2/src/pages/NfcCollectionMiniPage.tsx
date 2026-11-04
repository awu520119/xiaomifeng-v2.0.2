import { useState } from 'react';
import { PlayCircleOutlined, MobileOutlined } from '@ant-design/icons';
import demoVideo from '../assets/nfc-demo.mp4';
import './mini/mini.css';

const collections = [
  { id: '001', name: '云海日出', place: '雁荡山 · 灵峰', duration: '01:28', date: '2026.10.18', color: 'sunrise', description: '清晨登临灵峰，记录云海翻涌与日出山巅的瞬间。' },
  { id: '002', name: '古桥晚风', place: '南长街 · 古码头', duration: '00:56', date: '2026.10.12', color: 'bridge', description: '沿古桥缓缓飞行，收藏水巷与晚霞交织的风景。' },
  { id: '003', name: '山间四季', place: '雁荡山 · 北门', duration: '01:16', date: '2026.09.26', color: 'mountain', description: '从山脚到峰顶，珍藏一次穿越山林的航拍旅程。' },
];

export default function NfcCollectionMiniPage() {
  const [selected, setSelected] = useState<typeof collections[number] | null>(null);
  const [entered, setEntered] = useState(false);
  const [page, setPage] = useState(0);
  const turnPage = (direction: number) => setPage(value => (value + direction + collections.length) % collections.length);
  return <main className="mini-root"><div className={`mini-screen nfc-screen${selected ? ' has-immersive' : ''}`}>
    <header className="mini-header"><button className="mini-back" aria-label="返回" onClick={() => selected ? setSelected(null) : setEntered(false)}>{selected || entered ? '‹' : ''}</button><strong>{selected ? '藏品详情' : entered ? '我的藏品' : 'NFC藏品视频'}</strong><span /></header>
    {!entered ? <div className="nfc-entry mini-content"><div className="nfc-entry-art"><span className="nfc-orbit">NFC</span><MobileOutlined /></div><span className="mini-eyebrow">把旅途记忆，收藏成专属影像</span><h1>收藏此刻，重温旅程</h1><p>每一次出发，都有一段值得珍藏的风景。</p><button className="mini-main-button" onClick={() => setEntered(true)}>开启我的珍藏</button></div> : selected ? <div className="mini-content nfc-detail">
      <div className={`nfc-video-player ${selected.color}`}><video src={demoVideo} autoPlay muted loop playsInline controls preload="auto" aria-label={`${selected.name}旅程视频`} /><div className="nfc-video-overlay"><span>{selected.place}</span><strong>{selected.name}</strong><small>{selected.date}</small></div></div><section className="nfc-immersive-story"><span>这一程</span><p>{selected.description}</p></section>
    </div> : <div className="mini-content nfc-list"><div className="nfc-welcome"><span>珍藏于此</span><h1>每一段旅程，都值得珍藏</h1><p>{collections.length} 段美好回忆</p></div><div className="nfc-list-heading"><strong>我的纪念卡册</strong><span>轻轻翻阅</span></div><div className="nfc-deck" key={page}><button className={`nfc-memory-card ${collections[page].color}`} onClick={() => setSelected(collections[page])}><span className="nfc-memory-image"><i><PlayCircleOutlined /></i><small>{collections[page].duration}</small><em>旅程珍藏 · {String(page + 1).padStart(2, '0')}</em></span><span className="nfc-memory-caption"><span>{collections[page].place}</span><strong>{collections[page].name}</strong><small>珍藏于 {collections[page].date}</small></span><span className="nfc-memory-stamp">影像<br/>珍藏</span></button></div><div className="nfc-page-turn"><button aria-label="上一张藏品" onClick={() => turnPage(-1)}>‹</button><span>{String(page + 1).padStart(2, '0')} <i>/</i> {String(collections.length).padStart(2, '0')}</span><button aria-label="下一张藏品" onClick={() => turnPage(1)}>›</button></div><button className="nfc-open-card" onClick={() => setSelected(collections[page])}>重温这段旅程</button><div className="nfc-card-dots">{collections.map((item, index) => <button key={item.id} aria-label={`第${index + 1}张藏品`} className={index === page ? 'active' : ''} onClick={() => setPage(index)} />)}</div></div>}
  </div></main>;
}
