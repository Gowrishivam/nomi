import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal, Plus, X } from 'lucide-react'
import type { CalendarCategory, CalendarEntry } from '../types'
import { calendarService } from '../services/calendarService'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const sameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b)
const monthLabel = (date: Date) => new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
const selectedLabel = (date: Date) => `${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date)}, ${date.getDate()} ${new Intl.DateTimeFormat('en', { month: 'short' }).format(date)} ${date.getFullYear()}`
const timeLabel = (value: string) => { const [hour, minute] = value.split(':').map(Number); const suffix = hour >= 12 ? 'PM' : 'AM'; return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}` }

export default function CalendarSection({ now }: { now: Date }) {
  const [viewMonth, setViewMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>(() => calendarService.getEntries())
  const [adding, setAdding] = useState(false)
  const [menuEntry, setMenuEntry] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CalendarCategory>('general')

  const dates = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
    const count = Math.ceil((first.getDay() + daysInMonth) / 7) * 7
    return Array.from({ length: count }, (_, index) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), index - first.getDay() + 1))
  }, [viewMonth])
  const dayEntries = entries.filter(entry => entry.date === dateKey(selectedDate)).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const moveMonth = (amount: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + amount, 1)
    const day = Math.min(selectedDate.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())
    setViewMonth(next)
    setSelectedDate(new Date(next.getFullYear(), next.getMonth(), day))
  }
  const goToday = () => { const current = new Date(); setViewMonth(new Date(current.getFullYear(), current.getMonth(), 1)); setSelectedDate(current) }
  const addEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (endTime <= startTime) return
    const entry = { id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: dateKey(selectedDate), title: title.trim(), startTime, endTime, description: description.trim(), category }
    setEntries(calendarService.addEntry(entry))
    setTitle(''); setDescription(''); setAdding(false)
  }

  return <section className="calendar-section" aria-labelledby="calendar-title">
    <div className="calendar-heading"><div><div className="section-caption"><span>MAKE ROOM FOR THE MOMENTS</span><span className="caption-rule"/></div><h2 id="calendar-title">Your calendar</h2><p>A gentle view of the days you want to remember.</p></div><div className="calendar-month-controls"><button className="calendar-today" onClick={goToday}>Today</button><button className="calendar-nav" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={17}/></button><strong>{monthLabel(viewMonth)}</strong><button className="calendar-nav" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={17}/></button></div></div>
    <div className="calendar-layout"><div className="calendar-grid-panel"><div className="calendar-weekdays">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{dates.map(date => {
      const key = dateKey(date); const dayEvents = entries.filter(entry => entry.date === key); const isToday = sameDay(date, now); const isSelected = sameDay(date, selectedDate); const inMonth = date.getMonth() === viewMonth.getMonth()
      return <button key={key} className={`calendar-date ${inMonth ? '' : 'outside-month'} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => { setSelectedDate(date); if (!inMonth) setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setAdding(false) }} aria-label={`${new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(date)}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? 'entry' : 'entries'}` : ''}`} aria-pressed={isSelected}>
        <span className="calendar-day-number">{date.getDate()}</span><span className="calendar-dots" aria-hidden="true">{dayEvents.slice(0, 3).map(entry => <i className={`calendar-dot ${entry.category}`} key={entry.id}/>)}</span>
      </button>
    })}</div><div className="calendar-legend"><span><i className="calendar-dot personal"/> Personal</span><span><i className="calendar-dot general"/> General</span><span><i className="calendar-dot notable"/> Notable</span></div></div>
    <aside className="calendar-day-panel" aria-live="polite"><div className="calendar-day-heading"><div><span className="calendar-panel-label"><CalendarDays size={13}/> SELECTED DAY</span><h3>{selectedLabel(selectedDate)}</h3><p>{dayEntries.length ? `${dayEntries.length} ${dayEntries.length === 1 ? 'moment' : 'moments'} on this day` : 'A little space in your day'}</p></div><button className="calendar-add-button" aria-label="Add entry" title="Add entry" onClick={() => { setAdding(true); setMenuEntry(null) }}><Plus size={18}/></button></div>
      {adding ? <form className="calendar-entry-form" onSubmit={addEntry}><div className="calendar-form-top"><b>New entry</b><button type="button" aria-label="Close form" onClick={() => setAdding(false)}><X size={16}/></button></div><label>Title<input autoFocus required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} placeholder="A moment to remember"/></label><div className="calendar-time-fields"><label>Start<input type="time" required value={startTime} onChange={event => setStartTime(event.target.value)}/></label><label>End<input type="time" required value={endTime} onChange={event => setEndTime(event.target.value)}/></label></div><label>Description<textarea rows={2} maxLength={180} value={description} onChange={event => setDescription(event.target.value)} placeholder="A little context…"/></label><label>Type<select value={category} onChange={event => setCategory(event.target.value as CalendarCategory)}><option value="personal">Personal</option><option value="general">General</option><option value="notable">Notable</option></select></label>{endTime <= startTime && <span className="calendar-form-error">End time should be after start time.</span>}<button className="calendar-save-button" type="submit">Add to this day</button></form> : dayEntries.length ? <div className="calendar-entry-list">{dayEntries.map(entry => <article className="calendar-entry" key={entry.id}><i className={`calendar-entry-dot ${entry.category}`}/><div className="calendar-entry-copy"><span className="calendar-entry-time">{timeLabel(entry.startTime)} – {timeLabel(entry.endTime)}</span><h4>{entry.title}</h4>{entry.description && <p>{entry.description}</p>}</div><div className="calendar-entry-menu"><button aria-label={`Options for ${entry.title}`} onClick={() => setMenuEntry(menuEntry === entry.id ? null : entry.id)}><MoreHorizontal size={17}/></button>{menuEntry === entry.id && <div className="calendar-entry-popover"><button onClick={() => { setEntries(calendarService.removeEntry(entry.id)); setMenuEntry(null) }}>Remove entry</button></div>}</div></article>)}</div> : <div className="calendar-empty"><span className="calendar-empty-mark"><Plus size={17}/></span><b>Nothing planned yet.</b><p>Add a memory or event for this day.</p><button onClick={() => setAdding(true)}><Plus size={14}/> Add entry</button></div>}
    </aside></div>
  </section>
}
