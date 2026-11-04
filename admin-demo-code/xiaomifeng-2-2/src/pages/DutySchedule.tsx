import { LeftOutlined, PlusOutlined, RightOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationsStore, OpsPerson, OpsSchedule } from '../features/operations/types';
import { couponIssuerOptions } from '../mock/coupons';

type Props = { store: OperationsStore; setStore: React.Dispatch<React.SetStateAction<OperationsStore>> };
const demoAccounts: Record<string, { phone: string; feishuName: string; feishuId: string }> = { 'current-admin': { phone: '13800000001', feishuName: '系统管理员', feishuId: 'ou_demo_admin' }, 'issuer-wanglin': { phone: '13800000002', feishuName: '王琳', feishuId: 'ou_demo_wanglin' }, 'issuer-chenjie': { phone: '13800000003', feishuName: '陈杰', feishuId: 'ou_demo_chenjie' }, 'P-001': { phone: '138****0216', feishuName: '陈立', feishuId: 'ou_demo_chenli' }, 'P-002': { phone: '139****3381', feishuName: '王珊', feishuId: 'ou_demo_wangshan' }, 'P-003': { phone: '186****0709', feishuName: '赵启明', feishuId: 'ou_demo_zhaoqiming' }, 'P-004': { phone: '13700006128', feishuName: '刘工', feishuId: 'ou_demo_liugong' } };
const prototypeToday = dayjs().startOf('day');
const weekday = (date: Dayjs) => ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][date.day()];
const newId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-8)}`;
const weekStart = (date: Dayjs) => date.startOf('day').subtract((date.day() + 6) % 7, 'day');
type Shift = { name: string; start: string; end: string };
const maxShifts = 5;
const defaultShifts: Shift[] = [{ name: '早班', start: '08:00', end: '16:00' }, { name: '晚班', start: '16:00', end: '00:00' }];
const interval = (date: string, start: string, end: string) => { const from = dayjs(`${date}T${start}`); let to = dayjs(`${date}T${end}`); if (!to.isAfter(from)) to = to.add(1, 'day'); return { from, to }; };
const overlap = (a: {from: Dayjs; to: Dayjs}, b: {from: Dayjs; to: Dayjs}) => a.from.isBefore(b.to) && b.from.isBefore(a.to);
const timeLabel = (start: string, end: string) => `${start}–${end <= start ? '次日' : ''}${end}`;
const rowBelongs = (row: OpsSchedule, person: OpsPerson) => row.personId ? row.personId === person.id : row.person === person.name;

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
    <div className="ops-date-selector-shortcuts" title={`以 ${anchor.format('M月D日')} 所在周为准`}><Button size="small" onClick={() => selectWeek(true)}>{anchor.format('M月D日')}所在周工作日</Button><Button size="small" onClick={() => selectWeek(false)}>所在周全部</Button></div>
    <div className="ops-date-selector-week">{'一二三四五六日'.split('').map(day => <span key={day}>{day}</span>)}</div>
    <div className="ops-date-selector-grid">{days.map(date => { const key = date.format('YYYY-MM-DD'); const selected = value.includes(key); const conflict = conflicts.has(key); return <button type="button" key={key} className={[!date.isSame(month,'month')?'outside':'', selected?'selected':'', conflict?'conflict':''].filter(Boolean).join(' ')} aria-label={`${key}${conflict?'，已有排班冲突':''}`} aria-pressed={selected} onMouseDown={event => { if(event.button === 0) { event.preventDefault(); drag.current = {start:key, base:value, moved:false}; } }} onMouseEnter={() => { if(drag.current && drag.current.start !== key) { drag.current.moved = true; addRange(drag.current.start, key, drag.current.base); } }} onClick={() => { if(suppressClick.current) return; onChange?.(selected ? value.filter(item => item !== key) : [...value, key].sort()); }}>{date.date()}{conflict && <i aria-hidden="true"/>}</button>; })}</div>
    <div className="ops-date-selector-info"><span>已选 {value.length} 天 <Button type="link" size="small" onClick={() => onChange?.([])}>清空</Button></span><span>点击选择，拖动选择连续日期</span></div>
    {value.length > 0 && <div style={{marginTop:8, lineHeight:'24px'}}>已选日期：{[...value].sort().map(date => <Tag closable key={date} onClose={event => { event.preventDefault(); onChange?.(value.filter(item => item !== date)); }}>{date}</Tag>)}</div>}
    {value.some(date => conflicts.has(date)) && <div className="ops-date-selector-warning">以下日期有排班冲突：{value.filter(date => conflicts.has(date)).sort().join('、')}。请移除冲突日期；如为跨天时间冲突，可调整班次。</div>}
  </div>;
}

export function DutyScheduleNew({ store, setStore }: Props) {
  const { message, modal } = App.useApp();
  const [inlineEdit, setInlineEdit] = useState<{row: OpsSchedule; personId: string; shiftName: string; initialPersonId: string} | null>(null);
  const [inlineError, setInlineError] = useState('');
  const [month, setMonth] = useState(prototypeToday.startOf('month'));
  const [selectedDate, setSelectedDate] = useState(prototypeToday.format('YYYY-MM-DD'));
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lockedDate, setLockedDate] = useState(false);
  const [editing, setEditing] = useState<OpsSchedule | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [form] = Form.useForm();
  const [personForm] = Form.useForm();
  const [bindingPerson, setBindingPerson] = useState<OpsPerson | null>(null);
  const [match, setMatch] = useState<{ phone: string; feishuName: string; feishuId: string } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const accountId = Form.useWatch('accountId', personForm);
  const selectedAccount = couponIssuerOptions.find(item => item.id === accountId);
  const bindingSample = bindingPerson ? (demoAccounts[bindingPerson.accountId || ''] || demoAccounts[bindingPerson.id]) : demoAccounts[accountId];
  const maskPhone = (phone: string) => phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  const startBinding = (person?: OpsPerson) => { personForm.resetFields(); setBindingPerson(person || null); setMatch(null); setLookupError(''); setPersonOpen(true); };
  const lookupPerson = () => { setMatch(null); if (!bindingPerson && !selectedAccount) { setLookupError('请先选择系统账号'); return; } const phone = bindingPerson ? bindingPerson.phone : bindingSample?.phone; if (!phone || phone === '—') { setLookupError('该账号未配置手机号，请先完善系统账号信息'); return; } if (!bindingSample || maskPhone(bindingSample.phone) !== maskPhone(phone)) { setLookupError('未找到匹配的飞书账号，请核对手机号或联系管理员'); return; } setLookupError(''); setMatch({ ...bindingSample, phone }); };
  const selectedShift = Form.useWatch('shift', form);
  const [shifts, setShifts] = useState<Shift[]>(() => { try { const saved = JSON.parse(localStorage.getItem('ops-duty-shifts') || 'null'); return Array.isArray(saved) ? saved.map(({name,start,end}: Shift) => ({name,start,end})) : defaultShifts; } catch { return defaultShifts; } });
  const [shiftDraft, setShiftDraft] = useState<Shift[]>([]);
  const selectedShiftData = editing && selectedShift === editing.shift ? {name:editing.shift,start:editing.start,end:editing.end} : shifts.find(item => item.name === selectedShift);
  const conflictFor = (date: string, shift: Shift) => store.schedules.find(row => row.id !== editing?.id && overlap(interval(date, shift.start, shift.end), interval(row.date, row.start, row.end)));
  const conflictDates = new Set<string>();
  store.schedules.filter(row => row.id !== editing?.id).forEach(row => { if (selectedShiftData) for (const offset of [-1, 0, 1]) { const date = dayjs(row.date).add(offset, 'day').format('YYYY-MM-DD'); if (conflictFor(date, selectedShiftData)) conflictDates.add(date); } });
  const openShifts = () => { setShiftDraft(shifts.map(item => ({...item}))); setShiftOpen(true); };
  const saveShifts = () => {
    const names = shiftDraft.map(item => item.name.trim());
    if (names.some(name => !name) || new Set(names).size !== names.length) { message.error('班次名称不能为空或重复'); return; }
    if (shiftDraft.some(item => !item.start || !item.end || item.start === item.end)) { message.error('请填写有效的开始和结束时间，二者不能相同'); return; }
    const saved = shiftDraft.map((item, index) => ({...item, name:names[index]})); setShifts(saved); localStorage.setItem('ops-duty-shifts', JSON.stringify(saved)); setShiftOpen(false); message.success('班次设置已保存，已有排班保持原时间');
  };
  const days = useMemo(() => {
    const start = weekStart(month.startOf('month'));
    const count = Math.max(35, Math.ceil((month.endOf('month').diff(start, 'day') + 1) / 7) * 7);
    return Array.from({ length: count }, (_, index) => start.add(index, 'day'));
  }, [month]);
  const dayRows = store.schedules.filter((item) => item.date === selectedDate).sort((a,b)=>a.start.localeCompare(b.start));
  const enabledPeople = store.people.filter(person => person.status === '在岗');

  const openForm = (lock = false, row?: OpsSchedule, date = selectedDate) => {
    setEditing(row || null); setLockedDate(lock || !!row);
    const person = row && store.people.find(item => rowBelongs(row, item));
    form.resetFields(); form.setFieldsValue({ dates: lock || row ? [row?.date || date] : [], shift: row?.shift || shifts[0]?.name, person: person?.id }); setFormOpen(true);
  };
  const save = () => form.validateFields().then((values) => {
    const person = store.people.find(item => item.id === values.person);
    const shift = editing && values.shift === editing.shift ? { name: editing.shift, start: editing.start, end: editing.end } : shifts.find(item => item.name === values.shift);
    if (!person || person.status !== '在岗') { message.error('请选择在岗的运维人员'); return; }
    if (!shift) { message.error('请选择班次'); return; }
    const dates = [...values.dates as string[]].sort();
    for (const date of dates) { const existing = conflictFor(date, shift); if (existing) { message.error(`${date} 的${shift.name}与 ${existing.date} ${existing.person} 的${existing.shift}（${timeLabel(existing.start, existing.end)}）时间重叠，请调整` ); return; } }
    for (let i = 1; i < dates.length; i++) if (overlap(interval(dates[i-1],shift.start,shift.end), interval(dates[i],shift.start,shift.end))) { message.error('所选日期的班次时间重叠，请调整'); return; }
    const items: OpsSchedule[] = dates.map((date, index)=>({ id: editing?.id || `${newId('SCH')}-${index}`, date, shift:shift.name, start:shift.start, end:shift.end, scope:editing?.scope || '全部拍摄点', person:person.name, personId:person.id, feishu:person.feishu, phone:person.phone }));
    setStore(current=>({ ...current, schedules: [...current.schedules.filter(row=>row.id!==editing?.id), ...items] }));
    setSelectedDate(dates[0]); setMonth(dayjs(dates[0]).startOf('month')); setFormOpen(false); if (lockedDate) setDetailOpen(true); message.success(editing ? '排班已调整' : `已新增 ${items.length} 天排班`);
  });
  const beginInlineEdit = (row: OpsSchedule) => { const person = store.people.find(item => rowBelongs(row,item)); const personId = person?.id || ''; setInlineEdit({row,personId,initialPersonId:personId,shiftName:row.shift}); setInlineError(''); };
  const inlineDirty = Boolean(inlineEdit && (inlineEdit.personId !== inlineEdit.initialPersonId || inlineEdit.shiftName !== inlineEdit.row.shift));
  const closeDetail = () => { if (inlineDirty) { modal.confirm({title:'放弃本次调整？',content:'未保存的修改将丢失。',okText:'放弃修改',cancelText:'继续编辑',onOk:()=>{setInlineEdit(null);setDetailOpen(false);}}); } else {setInlineEdit(null);setDetailOpen(false);} };
  const saveInline = () => {
    if (!inlineEdit) return; const {row,personId,shiftName} = inlineEdit;
    const person=store.people.find(item=>item.id===personId && item.status==='在岗');
    const shift=shiftName===row.shift ? {name:row.shift,start:row.start,end:row.end} : shifts.find(item=>item.name===shiftName);
    if (!person) {setInlineError('请选择在岗的值班人员');return;} if (!shift) {setInlineError('请选择有效班次');return;}
    const conflict=store.schedules.find(item=>item.id!==row.id && overlap(interval(row.date,shift.start,shift.end),interval(item.date,item.start,item.end)));
    if (conflict) {setInlineError(`${conflict.date} ${conflict.person} 已有 ${conflict.shift}（${timeLabel(conflict.start,conflict.end)}）排班，请调整。`);return;}
    setStore(current=>({...current,schedules:current.schedules.map(item=>item.id===row.id?{...item,person:person.name,personId:person.id,phone:person.phone,feishu:person.feishu,shift:shift.name,start:shift.start,end:shift.end}:item)}));setInlineEdit(null);setInlineError('');message.success('排班已调整');
  };
  const deleteSchedule = (schedule: OpsSchedule) => { setStore(current=>({ ...current, schedules: current.schedules.filter(row=>row.id!==schedule.id) })); message.success('排班已删除'); if (dayRows.length === 1) setDetailOpen(false); };
  const savePerson = () => {
    if (!match) { message.error('请先查找并核对飞书账号'); return; }
    if (store.people.some(person => person.id !== bindingPerson?.id && person.notification === '已绑定' && person.feishu === match.feishuId)) { message.error('该飞书账号已绑定其他运维人员'); return; }
    if (bindingPerson) {
      setStore(current => ({ ...current, people: current.people.map(person => person.id === bindingPerson.id ? { ...person, feishu: match.feishuId, notification: '已绑定' } : person) }));
    } else {
      if (!selectedAccount || store.people.some(person => person.accountId === selectedAccount.id)) { message.error('该账号已加入运维人员或不存在'); return; }
      const person: OpsPerson = { id:newId('P'), accountId:selectedAccount.id, account:selectedAccount.account, name:selectedAccount.name, role:'运维人员', status:'在岗', phone:maskPhone(match.phone), feishu:match.feishuId, scope:'全部拍摄点', notification:'已绑定' };
      setStore(current => ({ ...current, people:[...current.people,person] }));
    }
    setPersonOpen(false); personForm.resetFields(); setMatch(null); message.success('飞书账号绑定成功');
  };
  const deletePerson = (person: OpsPerson) => { if (store.schedules.some(row => rowBelongs(row, person) && row.date >= dayjs().format('YYYY-MM-DD'))) { message.error('该人员还有待执行排班，请先调整或删除排班'); return; } setStore(current => ({ ...current, people: current.people.filter(item => item.id !== person.id) })); message.success('运维人员已删除'); };
  const unbindPerson = (person: OpsPerson) => { setStore(current => ({ ...current, people: current.people.map(item => item.id === person.id ? { ...item, notification: '未绑定', feishu: '' } : item) })); message.success('已解除飞书绑定'); };

  const scheduleForm = (
      <Form form={form} layout="vertical"><div className="ops-schedule-form-fields"><Form.Item name="person" label="值班责任人" rules={[{required:true,message:'请选择值班责任人'}]}><Select placeholder="请选择值班责任人" options={store.people.filter(p=>enabledPeople.includes(p) || (editing && rowBelongs(editing,p))).map(p=>({value:p.id,disabled:p.status!=='在岗',label:`${p.name}（${p.account || '账号未配置'}）`}))}/></Form.Item><Form.Item name="shift" label="班次" rules={[{required:true,message:'请选择班次'}]}><Select placeholder="请选择班次" options={[...(editing ? [{value:editing.shift,label:`${editing.shift}（${timeLabel(editing.start,editing.end)}，当前排班）`}] : []), ...shifts.filter(s=>s.name!==editing?.shift).map(s=>({value:s.name,label:`${s.name}（${timeLabel(s.start,s.end)}）`}))]}/></Form.Item><Form.Item label="负责范围"><Select aria-label="负责范围" disabled value={editing?.scope === '全局' ? '全部拍摄点' : editing?.scope || '全部拍摄点'} options={[{value:editing?.scope === '全局' ? '全部拍摄点' : editing?.scope || '全部拍摄点',label:editing?.scope === '全局' ? '全部拍摄点' : editing?.scope || '全部拍摄点'}]}/></Form.Item></div>
      {!enabledPeople.length && <Alert type="warning" showIcon message="暂无在岗运维人员" action={<Button type="link" onClick={()=>{setFormOpen(false);setPeopleOpen(true);}}>管理运维人员</Button>}/>}
      {!shifts.length && <Alert type="warning" showIcon message="暂无班次" action={<Button type="link" onClick={()=>{setFormOpen(false);openShifts();}}>设置班次</Button>}/>}
      <Form.Item name="dates" label="值班日期" rules={[{required:true, type:'array', min:1, message:'请选择至少一个值班日期'}]}>{lockedDate ? <LockedScheduleDate/> : <ScheduleDateSelector initialDate={selectedDate} conflicts={conflictDates}/>}</Form.Item>{lockedDate && conflictDates.has(selectedDate) && <div className="ops-date-selector-warning">该班次与已有排班时间重叠，请调整班次。</div>}</Form>
  );

  return <div className="admin-page ops-page ops-schedule-page">
    <div className="ops-schedule-command">
      <div className="ops-calendar-nav">
        <Button aria-label="上一月" title="上一月" icon={<LeftOutlined/>} onClick={()=>{const next=month.subtract(1,'month');setMonth(next);setSelectedDate(next.date(Math.min(dayjs(selectedDate).date(),next.daysInMonth())).format('YYYY-MM-DD'));}}/>
        <Typography.Text strong>{month.format('YYYY年M月')}</Typography.Text>
        <Button aria-label="下一月" title="下一月" icon={<RightOutlined/>} onClick={()=>{const next=month.add(1,'month');setMonth(next);setSelectedDate(next.date(Math.min(dayjs(selectedDate).date(),next.daysInMonth())).format('YYYY-MM-DD'));}}/>
        <Button onClick={()=>{setMonth(prototypeToday.startOf('month'));setSelectedDate(prototypeToday.format('YYYY-MM-DD'));}}>今天</Button>
      </div>
      <div className="ops-schedule-actions">
        <Button icon={<TeamOutlined/>} onClick={()=>setPeopleOpen(true)}>运维人员</Button>
        <Button icon={<ClockCircleOutlined/>} onClick={openShifts}>班次设置</Button>
        <Button type="primary" icon={<PlusOutlined/>} onClick={()=>openForm()}>批量排班</Button>
      </div>
    </div>
    <Card className="ops-calendar-card ops-schedule-calendar">
      <div className="ops-calendar-weekdays">{'一二三四五六日'.split('').map((item)=><span key={item}>周{item}</span>)}</div>
      <div className="ops-calendar-grid">{days.map((date)=>{
        const value=date.format('YYYY-MM-DD'); const rows=store.schedules.filter((row)=>row.date===value).sort((a,b)=>a.start.localeCompare(b.start));
        const classes=['ops-calendar-cell',rows.length?'has-duty':'no-duty',value===selectedDate?'selected':'',value===prototypeToday.format('YYYY-MM-DD')?'today':'',!date.isSame(month,'month')?'outside':''].filter(Boolean).join(' ');
        const selectDate=()=>{setSelectedDate(value);if(!date.isSame(month,'month'))setMonth(date.startOf('month'));if(rows.length) setDetailOpen(true);else openForm(true,undefined,value);};
        return <div className={classes} key={value} role="button" tabIndex={0} aria-label={`${value}${rows.length?`，${rows.length}条排班`:'，暂无排班'}`} aria-pressed={value===selectedDate} onClick={selectDate} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectDate();}}}>
          <span className="ops-calendar-day"><span>{date.date()}</span>{value===prototypeToday.format('YYYY-MM-DD')&&<em>今天</em>}</span>
          {rows.slice(0,2).map(row=><span className={`ops-calendar-chip ops-calendar-person ${row.shift==='晚班'?'evening':''}`} key={row.id}><strong>{row.person}</strong><span>{row.shift} {timeLabel(row.start,row.end)}</span></span>)}
          {!rows.length && <span className="ops-calendar-empty"><span>未安排</span><span className="ops-calendar-add">＋ 安排值班</span></span>}
          {rows.length>2&&<span className="ops-calendar-more">另有 {rows.length-2} 条</span>}
        </div>;
      })}</div>
    </Card>
    <Modal className="ops-duty-detail-modal" title="排班详情" width={520} open={detailOpen} onCancel={closeDetail} maskClosable={false} footer={null}>
      <div className="ops-duty-detail-date">{dayjs(selectedDate).format('YYYY年M月D日')} <span>{weekday(dayjs(selectedDate))}</span>{!inlineEdit && <Button type="link" icon={<PlusOutlined/>} style={{float:'right'}} onClick={()=>{setDetailOpen(false);openForm(true,undefined,selectedDate);}}>添加排班</Button>}</div>
      <div className="ops-duty-detail-list">{inlineEdit && dayRows.length > 1 && <div className="ops-duty-edit-context">正在调整 {inlineEdit.row.person} 的排班，保存或取消后返回当日全部排班</div>}{dayRows.length ? dayRows.filter(row => !inlineEdit || row.id === inlineEdit.row.id).map(row => { const person=store.people.find(item=>rowBelongs(row,item)); return <div className="ops-duty-detail-card" key={row.id}>
        {inlineEdit?.row.id === row.id ? <div ref={element=>{if(element) element.scrollIntoView({block:'nearest'});}}>
          {!person && <Alert type="warning" showIcon message="原值班人员已移除" description="请选择新的值班人员后保存。" style={{marginBottom:16}}/>}<Form layout="vertical"><Form.Item label="值班人员" required><Select value={inlineEdit.personId || undefined} placeholder={row.person + '（人员已移除，请重新选择）'} onChange={value=>{setInlineEdit({...inlineEdit,personId:value});setInlineError('');}} options={store.people.filter(p=>p.status==='在岗').map(p=>({value:p.id,label:`${p.name}（${p.account || '账号未配置'}）`}))}/></Form.Item>
          <Form.Item label="班次" required><Select value={inlineEdit.shiftName} onChange={value=>{setInlineEdit({...inlineEdit,shiftName:value});setInlineError('');}} options={[{value:row.shift,label:`${row.shift}（${timeLabel(row.start,row.end)}${shifts.some(item=>item.name===row.shift)?'':'，班次已删除'}）`},...shifts.filter(item=>item.name!==row.shift).map(item=>({value:item.name,label:`${item.name}（${timeLabel(item.start,item.end)}）`}))]}/></Form.Item>
          <Typography.Text type="secondary">负责范围：{row.scope==='全局'?'全部拍摄点':row.scope}</Typography.Text>{inlineError && <Alert type="error" showIcon message={inlineError} style={{marginTop:12}}/>}</Form>
          <div className="ops-duty-detail-actions"><Button onClick={()=>{setInlineEdit(null);setInlineError('');}}>取消</Button><Button type="primary" disabled={!inlineDirty} onClick={saveInline}>保存调整</Button></div>
        </div> : <>
        <div className="ops-duty-detail-heading"><div><div className="ops-duty-detail-label">值班责任人</div><strong>{row.person}</strong><div className="ops-duty-detail-label">飞书账号：{person?.notification === '已绑定' && person.feishu ? `${person.feishu}（${person.name}）` : '—'}</div></div>{!person ? <Tag color="error">人员已移除</Tag> : person.notification!=='已绑定' ? <Tag color="warning">飞书未绑定</Tag> : null}</div>{!person && <Alert type="warning" showIcon message="该人员已移除" description="如需调整此排班，请选择新的值班人员。" style={{marginTop:12}}/>}
        <div className="ops-duty-detail-fields"><div><span>班次</span><strong>{row.shift}</strong></div><div><span>值班时间</span><strong>{timeLabel(row.start,row.end)}</strong></div><div><span>负责范围</span><strong>{row.scope==='全局'?'全部拍摄点':row.scope}</strong></div></div>
        <div className="ops-duty-detail-actions"><Popconfirm title="确认删除这条排班？" description={`${row.date}，${row.person}，${row.shift} ${timeLabel(row.start,row.end)}`} okText="删除" cancelText="取消" okButtonProps={{danger:true}} onConfirm={()=>deleteSchedule(row)}><Button danger disabled={Boolean(inlineEdit)}>删除排班</Button></Popconfirm><Button type="primary" disabled={Boolean(inlineEdit)} onClick={()=>beginInlineEdit(row)}>调整排班</Button></div></>}

      </div>; }) : <span className="ops-selected-day-empty">暂无排班</span>}</div>
    </Modal>
    {lockedDate ? <Modal title={editing?'调整排班':'新增排班'} width={600} forceRender maskClosable={false} open={formOpen} onCancel={()=>{setFormOpen(false);if(editing || dayRows.length > 0)setDetailOpen(true);}} onOk={()=>void save()} okText={editing?'保存调整':'保存排班'}>{scheduleForm}</Modal> : <Drawer className="ops-batch-drawer" title="批量排班" size="min(600px, 100vw)" forceRender maskClosable open={formOpen} onClose={()=>setFormOpen(false)} footer={<div className="ops-batch-footer"><Button onClick={()=>setFormOpen(false)}>取消</Button><Button type="primary" onClick={()=>void save()}>保存排班</Button></div>}>{scheduleForm}</Drawer>}
    <Modal title="班次设置" open={shiftOpen} onCancel={()=>setShiftOpen(false)} onOk={saveShifts} okText="保存设置"><Typography.Paragraph type="secondary">修改或删除班次不影响已保存排班，保存设置后生效。</Typography.Paragraph><div className="ops-shift-editor"><div className="ops-shift-setting"><span>班次名称</span><span>开始时间</span><span>结束时间</span><span>操作</span></div>{shiftDraft.map((shift,index)=><div className="ops-shift-setting" key={index}><Input aria-label={`班次名称 ${index+1}`} value={shift.name} onChange={e=>setShiftDraft(all=>all.map((s,i)=>i===index?{...s,name:e.target.value}:s))}/><Input aria-label={`开始时间 ${index+1}`} type="time" value={shift.start} onChange={e=>setShiftDraft(all=>all.map((s,i)=>i===index?{...s,start:e.target.value}:s))}/><Input aria-label={`结束时间 ${index+1}`} type="time" value={shift.end} onChange={e=>setShiftDraft(all=>all.map((s,i)=>i===index?{...s,end:e.target.value}:s))}/><Popconfirm title="删除此班次？" description="保存设置后生效，已有排班不受影响。" okText="删除" cancelText="取消" onConfirm={()=>setShiftDraft(all=>all.filter((_,i)=>i!==index))}><Button type="link" danger>删除</Button></Popconfirm>{shift.end<=shift.start && shift.end!==shift.start && <span className="ops-shift-next-day">次日结束</span>}</div>)}<Button disabled={shiftDraft.length >= maxShifts} onClick={()=>setShiftDraft(all=>all.length >= maxShifts ? all : [...all,{name:`班次${all.length+1}`,start:'08:00',end:'16:00'}])}>添加班次</Button><Typography.Text type="secondary">{shiftDraft.length >= maxShifts ? `已达到 ${maxShifts} 个班次上限` : `最多可添加 ${maxShifts} 个班次`}</Typography.Text></div></Modal>
    <Modal width={860} title="运维人员管理" open={peopleOpen} onCancel={()=>setPeopleOpen(false)} footer={null}><div className="ops-people-head"><Button type="primary" onClick={()=>startBinding()}>新增运维人员</Button></div><Table rowKey="id" pagination={false} dataSource={store.people} columns={[{title:'人员',render:(_,p)=><div><strong>{p.name}</strong><div style={{color:'#8f9499',fontSize:12}}>账号：{p.account||'—'}</div></div>},{title:'联系电话',dataIndex:'phone'},{title:'飞书',render:(_,p)=><Space><Tag color={p.notification==='已绑定'?'success':'default'}>{p.notification}</Tag><span>{p.notification==='已绑定'?p.name:'—'}</span></Space>},{title:'操作',render:(_,p)=><Space>{p.notification==='已绑定'?<Popconfirm title="确认解除飞书绑定？" description={`该人员有 ${store.schedules.filter(row=>rowBelongs(row,p) && row.date>=prototypeToday.format('YYYY-MM-DD')).length} 条待执行排班，解绑后仍保留排班。`} onConfirm={()=>unbindPerson(p)}><Button type="link">解除绑定</Button></Popconfirm>:<Button type="link" onClick={()=>startBinding(p)}>绑定飞书</Button>}<Popconfirm title={`确认删除 ${p.name}？`} description={store.schedules.some(row=>rowBelongs(row,p) && row.date>=dayjs().format('YYYY-MM-DD'))?'该人员还有待执行排班，请先调整或删除排班。':'删除后无法继续为该人员排班，历史排班保留。'} okText="删除" cancelText="取消" okButtonProps={{danger:true,disabled:store.schedules.some(row=>rowBelongs(row,p) && row.date>=dayjs().format('YYYY-MM-DD'))}} onConfirm={()=>deletePerson(p)}><Button type="link" danger>删除</Button></Popconfirm></Space>}]} /></Modal>
    <Modal title={bindingPerson?'绑定飞书':'新增运维人员'} open={personOpen} onCancel={()=>{setPersonOpen(false);personForm.resetFields();setMatch(null);}} onOk={savePerson} okText="确认绑定" okButtonProps={{disabled:!match}}>
      <Form form={personForm} layout="vertical"><Form.Item name={bindingPerson ? undefined : "accountId"} label="系统账号" required={!bindingPerson}>{bindingPerson?<Input value={`${bindingPerson.name}（${bindingPerson.account || '—'}）`} disabled/>:<Select showSearch optionFilterProp="label" placeholder="选择已有系统账号" onChange={()=>{setMatch(null);setLookupError('');}} options={couponIssuerOptions.filter(account=>!store.people.some(person=>person.accountId===account.id)).map(account=>({value:account.id,label:`${account.name}（${account.account}）`}))} notFoundContent="暂无可添加的用户账号"/>}</Form.Item></Form>
      {(bindingPerson || selectedAccount) && <p>系统手机号：{bindingPerson ? (bindingPerson.phone && bindingPerson.phone !== '—' ? maskPhone(bindingPerson.phone) : '未配置') : (bindingSample?.phone ? maskPhone(bindingSample.phone) : '未配置')}</p>}
      <Button onClick={lookupPerson}>查找飞书账号</Button>
      {lookupError && <Alert style={{marginTop:16}} type="warning" showIcon message={lookupError}/>}
      {match && <div style={{marginTop:16}}><Alert type="info" showIcon message="请核对是否为同一人，确认后完成绑定"/><Descriptions style={{marginTop:16}} column={1} size="small" items={[{key:'system',label:'系统账号',children:bindingPerson?.name || selectedAccount?.name},{key:'phone',label:'系统手机号',children:maskPhone(match.phone)},{key:'name',label:'飞书姓名',children:match.feishuName},{key:'id',label:'飞书用户标识',children:match.feishuId}]}/></div>}
    </Modal>
  </div>;
}
