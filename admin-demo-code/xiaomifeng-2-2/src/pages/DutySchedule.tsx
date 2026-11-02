import { LeftOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationsStore, OpsPerson, OpsSchedule } from '../features/operations/types';
import { couponIssuerOptions } from '../mock/coupons';

type Props = { store: OperationsStore; setStore: React.Dispatch<React.SetStateAction<OperationsStore>> };
const scenicOptions = ['雁荡山', '南长街'];
const prototypeToday = dayjs('2026-10-23');
const weekday = (date: Dayjs) => ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][date.day()];
const newId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-8)}`;
const weekStart = (date: Dayjs) => date.startOf('day').subtract((date.day() + 6) % 7, 'day');
const normalizedScope = (scope: string) => scope === '全局' ? '全部拍摄点' : scope;

function LockedScheduleDate({ value }: { value?: string[] }) { return <Input value={value?.[0] || ''} disabled/>; }

type DateSelectorProps = { value?: string[]; onChange?: (dates: string[]) => void; initialDate: string; conflicts: Set<string> };
function ScheduleDateSelector({ value = [], onChange, initialDate, conflicts }: DateSelectorProps) {
  const [month, setMonth] = useState(dayjs(initialDate).startOf('month'));
  const drag = useRef<{ start: string; base: string[]; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => { const stop = () => { if (drag.current?.moved) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 0); } drag.current = null; }; window.addEventListener('mouseup', stop); return () => window.removeEventListener('mouseup', stop); }, []);
  const days = Array.from({ length: 42 }, (_, index) => weekStart(month.startOf('month')).add(index, 'day'));
  const addRange = (first: string, last: string, base: string[]) => { const start = dayjs(first < last ? first : last); const end = dayjs(first < last ? last : first); const additions = Array.from({length: end.diff(start, 'day') + 1}, (_, i) => start.add(i, 'day').format('YYYY-MM-DD')); onChange?.([...new Set([...base, ...additions])].sort()); };
  const anchor = dayjs(initialDate).isSame(month, 'month') ? dayjs(initialDate) : month.startOf('month');
  const selectWeek = (workdays: boolean) => { const start = weekStart(anchor); const dates = Array.from({length: 7}, (_, i) => start.add(i, 'day')).filter(date => !workdays || (date.day() !== 0 && date.day() !== 6)).map(date => date.format('YYYY-MM-DD')); onChange?.([...new Set([...value, ...dates])].sort()); };
  return <div className="ops-date-selector">
    <div className="ops-date-selector-header"><Button size="small" onClick={() => setMonth(month.subtract(1, 'month'))}>上一月</Button><strong>{month.format('YYYY年M月')}</strong><Button size="small" onClick={() => setMonth(month.add(1, 'month'))}>下一月</Button></div>
    <div className="ops-date-selector-shortcuts" title={`以 ${anchor.format('M月D日')} 所在周为准`}><Button size="small" onClick={() => selectWeek(true)}>本周工作日</Button><Button size="small" onClick={() => selectWeek(false)}>本周全部</Button></div>
    <div className="ops-date-selector-week">{'一二三四五六日'.split('').map(day => <span key={day}>{day}</span>)}</div>
    <div className="ops-date-selector-grid">{days.map(date => { const key = date.format('YYYY-MM-DD'); const selected = value.includes(key); const conflict = conflicts.has(key); return <button type="button" key={key} className={[!date.isSame(month,'month')?'outside':'', selected?'selected':'', conflict?'conflict':''].filter(Boolean).join(' ')} aria-label={`${key}${conflict?'，已有排班冲突':''}`} aria-pressed={selected} onMouseDown={event => { if(event.button === 0) { event.preventDefault(); drag.current = {start:key, base:value, moved:false}; } }} onMouseEnter={() => { if(drag.current && drag.current.start !== key) { drag.current.moved = true; addRange(drag.current.start, key, drag.current.base); } }} onClick={() => { if(suppressClick.current) return; onChange?.(selected ? value.filter(item => item !== key) : [...value, key].sort()); }}>{date.date()}{conflict && <i aria-hidden="true"/>}</button>; })}</div>
    <div className="ops-date-selector-info"><span>已选 {value.length} 天 <Button type="link" size="small" onClick={() => onChange?.([])}>清空</Button></span><span>点击选择，拖动选择连续日期</span></div>
    {value.some(date => conflicts.has(date)) && <div className="ops-date-selector-warning">所选日期中有排班冲突，请取消冲突日期或调整班次、负责范围。</div>}
  </div>;
}

export function DutyScheduleNew({ store, setStore }: Props) {
  const { message } = App.useApp();
  const [month, setMonth] = useState(prototypeToday.startOf('month'));
  const [selectedDate, setSelectedDate] = useState(prototypeToday.format('YYYY-MM-DD'));
  const [formOpen, setFormOpen] = useState(false);
  const [lockedDate, setLockedDate] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [form] = Form.useForm();
  const [personForm] = Form.useForm();
  const selectedShift = Form.useWatch('shift', form);
  const selectedScope = Form.useWatch('scope', form);
  const conflictDates = new Set(store.schedules.filter(row => row.shift === selectedShift && normalizedScope(row.scope) === selectedScope).map(row => row.date));
  const [shifts, setShifts] = useState([
    { name: '早班', start: '08:00', end: '16:00', enabled: true },
    { name: '晚班', start: '16:00', end: '00:00', enabled: true },
  ]);
  const days = useMemo(() => {
    const start = weekStart(month.startOf('month'));
    const count = Math.max(35, Math.ceil((month.endOf('month').diff(start, 'day') + 1) / 7) * 7);
    return Array.from({ length: count }, (_, index) => start.add(index, 'day'));
  }, [month]);
  const dayRows = store.schedules.filter((item) => item.date === selectedDate).sort((a,b)=>a.start.localeCompare(b.start));
  const enabledPeople = store.people.filter((person) => person.notification === '已绑定');

  const openForm = (lock = false) => {
    setLockedDate(lock);
    form.setFieldsValue({ dates: [selectedDate], shift: shifts.find((item)=>item.enabled)?.name, scope: '全部拍摄点', person: enabledPeople[0]?.name });
    setFormOpen(true);
  };
  const save = () => form.validateFields().then((values) => {
    const person = store.people.find((item)=>item.name===values.person);
    const shift = shifts.find((item)=>item.name===values.shift);
    if (!person || person.notification !== '已绑定') { message.error('仅可安排已完成飞书绑定的运维人员'); return; }
    const dates = [...values.dates as string[]].sort();
    const conflict = dates.find((date)=>store.schedules.some((row)=>row.date===date && normalizedScope(row.scope)===values.scope && row.shift===values.shift));
    if (conflict) { message.error(`${conflict} 的范围和班次已有排班，请调整后保存`); return; }
    const items: OpsSchedule[] = dates.map((date, index)=>({ id: `${newId('SCH')}-${index}`, date, shift: values.shift, start: shift?.start || '08:00', end: shift?.end || '16:00', scope: values.scope, person: person.name, feishu: person.feishu, phone: person.phone }));
    setStore((current)=>({ ...current, schedules: [...current.schedules, ...items] }));
    setSelectedDate(dates[0]); setMonth(dayjs(dates[0]).startOf('month')); setFormOpen(false);
    message.success(`已新增 ${items.length} 天排班，并通过飞书通知${person.name}`);
  });
  const deleteSchedule = (schedule: OpsSchedule) => {
    setStore((current)=>({ ...current, schedules: current.schedules.filter((row)=>row.id!==schedule.id) }));
    message.success('排班已删除，责任人已收到变更通知');
  };
  const savePerson = () => personForm.validateFields().then((values) => {
    const account = couponIssuerOptions.find(item => item.id === values.accountId);
    if (!account || store.people.some(person => person.accountId === account.id || person.name === account.name)) { message.error('该账号已加入运维人员或不存在'); return; }
    const feishu = String(values.feishu).trim();
    if (store.people.some(person => person.notification === '已绑定' && person.feishu === feishu)) { message.error('该飞书用户标识已被其他运维人员绑定'); return; }
    const person: OpsPerson = { id:newId('P'), accountId:account.id, account:account.account, name:account.name, role:'运维人员', status:'在岗', phone:'—', feishu, scope:'全部拍摄点', notification:'已绑定' };
    setStore(current => ({ ...current, people:[...current.people,person] }));
    setPersonOpen(false); personForm.resetFields(); message.success('运维人员已添加并绑定飞书');
  });
  const updatePerson = (person: OpsPerson, change: Partial<OpsPerson>) => setStore((current)=>({ ...current, people:current.people.map((item)=>item.id===person.id?{...item,...change}:item) }));

  return <div className="admin-page ops-page ops-schedule-page">
    <div className="ops-schedule-command">
      <div className="ops-calendar-nav">
        <Button aria-label="上一月" title="上一月" icon={<LeftOutlined/>} onClick={()=>setMonth(month.subtract(1,'month'))}/>
        <Typography.Text strong>{month.format('YYYY年M月')}</Typography.Text>
        <Button aria-label="下一月" title="下一月" icon={<RightOutlined/>} onClick={()=>setMonth(month.add(1,'month'))}/>
        <Button onClick={()=>{setMonth(prototypeToday.startOf('month'));setSelectedDate(prototypeToday.format('YYYY-MM-DD'));}}>今天</Button>
        <Button type="link" icon={<ReloadOutlined/>} onClick={()=>{setMonth(prototypeToday.startOf('month'));setSelectedDate(prototypeToday.format('YYYY-MM-DD'));}}>重置</Button>
      </div>
      <div className="ops-schedule-actions">
        <Button icon={<TeamOutlined/>} onClick={()=>setPeopleOpen(true)}>运维人员</Button>
        <Button icon={<SettingOutlined/>} onClick={()=>setShiftOpen(true)}>班次设置</Button>
        <Button type="primary" icon={<PlusOutlined/>} onClick={()=>openForm()}>新增排班</Button>
      </div>
    </div>
    <section className="ops-selected-day" aria-label="当日排班">
      <div className="ops-selected-day-header"><strong>{dayjs(selectedDate).format('M月D日')} {weekday(dayjs(selectedDate))}</strong><Button type="link" icon={<PlusOutlined/>} onClick={()=>openForm(true)}>当日新增</Button></div>
      <div className="ops-selected-day-list">{dayRows.length ? dayRows.map(row => { const person=store.people.find(item=>item.name===row.person); return <div className="ops-selected-duty" key={row.id}>
        <div className="ops-selected-duty-main"><strong>{row.person}</strong><span className={`ops-duty-shift ${row.shift==='晚班'?'evening':''}`}>{row.shift}</span><span>{row.start}–{row.end==='00:00'?'次日00:00':row.end}</span>{person?.notification!=='已绑定'&&<span className="ops-duty-bind-warning">飞书未绑定</span>}</div>
        <div className="ops-selected-duty-meta"><span>{row.scope==='全局'?'全部拍摄点':row.scope}</span><Popconfirm title="确认删除这条排班？" description="删除后将通过飞书通知原责任人。" onConfirm={()=>deleteSchedule(row)}><Button type="link" className="ops-duty-delete">删除</Button></Popconfirm></div>
      </div>; }) : <span className="ops-selected-day-empty">暂无排班</span>}</div>
    </section>
    <Card className="ops-calendar-card ops-schedule-calendar">
      <div className="ops-calendar-weekdays">{'一二三四五六日'.split('').map((item)=><span key={item}>周{item}</span>)}</div>
      <div className="ops-calendar-grid">{days.map((date)=>{
        const value=date.format('YYYY-MM-DD'); const rows=store.schedules.filter((row)=>row.date===value).sort((a,b)=>a.start.localeCompare(b.start));
        const classes=['ops-calendar-cell',value===selectedDate?'selected':'',value===prototypeToday.format('YYYY-MM-DD')?'today':'',!date.isSame(month,'month')?'outside':''].filter(Boolean).join(' ');
        const selectDate=()=>{setSelectedDate(value);if(!date.isSame(month,'month'))setMonth(date.startOf('month'));};
        return <div className={classes} key={value} role="button" tabIndex={0} aria-label={`${value}${rows.length?`，${rows.length}条排班`:'，暂无排班'}`} aria-pressed={value===selectedDate} onClick={selectDate} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectDate();}}}>
          <span className="ops-calendar-day"><span>{date.date()}</span>{value===prototypeToday.format('YYYY-MM-DD')&&<em>今天</em>}</span>
          {rows.slice(0,2).map((row)=><span className={`ops-calendar-chip ${row.shift==='晚班'?'evening':''}`} title={`${row.shift} ${row.person}`} key={row.id}>{row.shift} {row.person}</span>)}
          {rows.length>2&&<span className="ops-calendar-more">另有 {rows.length-2} 条</span>}
        </div>;
      })}</div>
    </Card>
    <Modal title="新增排班" width={560} destroyOnClose open={formOpen} onCancel={()=>setFormOpen(false)} onOk={()=>void save()} okText="保存并通知">
      <Form form={form} layout="vertical"><div className="ops-schedule-form-fields"><Form.Item name="person" label="值班责任人" rules={[{required:true,message:'请选择值班责任人'}]}><Select placeholder="请选择值班责任人" options={enabledPeople.map((p)=>({value:p.name,label:p.name}))}/></Form.Item><Form.Item name="shift" label="班次" rules={[{required:true,message:'请选择班次'}]}><Select options={shifts.filter((s)=>s.enabled).map((s)=>({value:s.name,label:`${s.name}（${s.start}—${s.end==='00:00'?'次日00:00':s.end}）`}))}/></Form.Item><Form.Item name="scope" label="负责范围" rules={[{required:true,message:'请选择负责范围'}]}><Select options={['全部拍摄点',...scenicOptions].map((value)=>({value,label:value}))}/></Form.Item></div><Form.Item name="dates" label="值班日期" rules={[{required:true, type:'array', min:1, message:'请选择至少一个值班日期'}]}>{lockedDate ? <LockedScheduleDate/> : <ScheduleDateSelector initialDate={selectedDate} conflicts={conflictDates}/>}</Form.Item>{lockedDate && conflictDates.has(selectedDate) && <div className="ops-date-selector-warning">该日期的班次和负责范围已有排班，请调整班次或负责范围。</div>}</Form>
    </Modal>
    <Modal title="班次设置" open={shiftOpen} onCancel={()=>setShiftOpen(false)} footer={<Button type="primary" onClick={()=>{setShiftOpen(false);message.success('班次设置已保存');}}>保存设置</Button>}><div className="ops-shift-editor">{shifts.map((shift,index)=><div className="ops-shift-setting" key={`${shift.name}-${index}`}><Input value={shift.name} onChange={(e)=>setShifts((all)=>all.map((s,i)=>i===index?{...s,name:e.target.value}:s))}/><Input type="time" value={shift.start} onChange={(e)=>setShifts((all)=>all.map((s,i)=>i===index?{...s,start:e.target.value}:s))}/><Input type="time" value={shift.end} onChange={(e)=>setShifts((all)=>all.map((s,i)=>i===index?{...s,end:e.target.value}:s))}/><Switch checked={shift.enabled} onChange={(checked)=>setShifts((all)=>all.map((s,i)=>i===index?{...s,enabled:checked}:s))}/></div>)}<Button onClick={()=>setShifts((all)=>[...all,{name:`班次${all.length+1}`,start:'08:00',end:'16:00',enabled:true}])}>添加班次</Button></div></Modal>
    <Modal width={860} title="运维人员与飞书通知" open={peopleOpen} onCancel={()=>setPeopleOpen(false)} footer={null}><div className="ops-people-head"><Button type="primary" onClick={()=>{personForm.resetFields();setPersonOpen(true);}}>新增运维人员</Button></div><Table rowKey="id" pagination={false} dataSource={store.people} columns={[{title:'人员',dataIndex:'name'},{title:'账号',render:(_,p)=>p.account||'—'},{title:'联系电话',dataIndex:'phone'},{title:'飞书',render:(_,p)=><Space><Tag color={p.notification==='已绑定'?'success':'error'}>{p.notification}</Tag><span>{p.feishu||'—'}</span></Space>},{title:'操作',render:(_,p)=><Button type="link" onClick={()=>updatePerson(p,p.notification==='已绑定'?{notification:'未绑定',feishu:''}:{notification:'已绑定',feishu:p.feishu||`feishu_${p.id.toLowerCase()}`})}>{p.notification==='已绑定'?'解除绑定':'绑定飞书'}</Button>}]} /></Modal>
    <Modal title="新增运维人员" open={personOpen} onCancel={()=>{setPersonOpen(false);personForm.resetFields();}} onOk={()=>void savePerson()} okText="添加并绑定"><Form form={personForm} layout="vertical"><Form.Item name="accountId" label="用户账号" rules={[{required:true,message:'请选择用户账号'}]}><Select showSearch optionFilterProp="label" placeholder="选择已有用户账号" options={couponIssuerOptions.filter(account=>!store.people.some(person=>person.accountId===account.id||person.name===account.name)).map(account=>({value:account.id,label:`${account.name}（${account.account}）`}))} notFoundContent="暂无可添加的用户账号"/></Form.Item><Form.Item name="feishu" label="飞书用户标识" rules={[{required:true,whitespace:true,message:'请输入飞书用户标识'}]}><Input placeholder="请输入飞书用户标识"/></Form.Item></Form></Modal>
  </div>;
}
