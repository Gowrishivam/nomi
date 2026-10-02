import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AudioLines, Bold, Bookmark, Brain, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Code2, Command, Compass, Feather, FolderKanban, Goal, Headphones, Home, Italic, Lightbulb, List, LockKeyhole, Menu, Mic, MoreHorizontal, Paperclip, Pause, Play, Plus, Search, Settings2, Sparkles, Square, Sun, Underline, Users, WandSparkles, X } from 'lucide-react'
import type { DiaryEntry, Memory, Page, TimelineEvent } from './types'
import { memoryService } from './services/memoryService'
import { aiService } from './services/aiService'
import CalendarSection from './components/CalendarSection'

const primary: { label: Page; icon: typeof Home }[] = [
  { label: 'Home', icon: Home }, { label: 'Diary', icon: Feather }, { label: 'Memories', icon: Bookmark }, { label: 'Ask AI', icon: Sparkles }, { label: 'Timeline', icon: CalendarDays }, { label: 'Insights', icon: Compass }, { label: 'Goals', icon: Goal }, { label: 'Experiences', icon: WandSparkles },
]
const secondary: { label: Page; icon: typeof Home }[] = [{ label: 'People', icon: Users }, { label: 'Projects', icon: FolderKanban }, { label: 'Tasks', icon: Check }]
const demoTranscript = 'Today felt like the first time this project started to become real. I met Arun for coffee and we finally got clear about what the first version needs to do. I was getting frustrated with the huge list of ideas, but talking it out helped. Tomorrow I want to finish the diary view and try the recording flow. Also had an idea for a time capsule feature—maybe something to come back to later.'
const prompts = ['What was I working on last Tuesday?', 'Why was I frustrated this week?', 'How have my priorities changed?']

export default function App() {
  const [page, setPage] = useState<Page>('Home')
  const [memories, setMemories] = useState<Memory[]>([])
  const [diary, setDiary] = useState<DiaryEntry[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null)
  const [recording, setRecording] = useState(false)
  const [micRequesting, setMicRequesting] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [showFindings, setShowFindings] = useState(false)
  const [latestEntry, setLatestEntry] = useState<DiaryEntry | null>(null)
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<{ kind: string; date: string; id: string }[]>([])
  const [asking, setAsking] = useState(false)
  const [mode, setMode] = useState('Recall')
  const [contextOpen, setContextOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [queryError, setQueryError] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    memoryService.getMemories().then(setMemories)
    memoryService.getDiary().then(setDiary)
    memoryService.getTimeline().then(setTimeline)
  }, [])
  const saveDiaryEntry = (entry: DiaryEntry) => setDiary(current => current.some(item => item.id === entry.id) ? current.map(item => item.id === entry.id ? entry : item) : [entry, ...current])
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(id) }, [])
  useEffect(() => {
    if (!recording || paused) return
    const id = window.setInterval(() => setSeconds(value => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [recording, paused])
  useEffect(() => () => {
    const activeRecorder = recorderRef.current
    if (activeRecorder && activeRecorder.state !== 'inactive') activeRecorder.stop()
    activeRecorder?.stream.getTracks().forEach(track => track.stop())
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl)
  }, [recordedAudioUrl])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 2500); return () => window.clearTimeout(id) }, [toast])
  const navigate = (next: Page) => { setPage(next); setSelectedMemory(null); setSelectedDiary(null); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setToast('Microphone recording is not supported in this browser.')
      return
    }
    setMicRequesting(true)
    setToast('Waiting for microphone permission…')
    let stream: MediaStream | null = null
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicRequesting(false)
      setToast('')
      stream = currentStream
      const recorder = new MediaRecorder(currentStream)
      audioChunksRef.current = []
      recorder.ondataavailable = event => { if (event.data.size > 0) audioChunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setRecordedAudioUrl(previous => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob) })
        currentStream.getTracks().forEach(track => track.stop())
      }
      recorderRef.current = recorder
      recorder.start()
      setSeconds(0)
      setRecording(true)
      setPaused(false)
    } catch (error) {
      setMicRequesting(false)
      stream?.getTracks().forEach(track => track.stop())
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow it in this site’s browser settings, then try again.'
        : 'The microphone could not be started. Check that it is connected and try again.'
      setToast(message)
    }
  }
  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    recorderRef.current = null
    setRecording(false)
    setPaused(false)
    setProcessing(true)
    setProcessingStep(0)
    window.setTimeout(() => setProcessingStep(1), 1500)
    window.setTimeout(() => setProcessingStep(2), 3200)
    window.setTimeout(() => setProcessingStep(3), 5000)
    window.setTimeout(async () => { const entry = await memoryService.saveRecording(demoTranscript); setDiary(await memoryService.getDiary()); setMemories(await memoryService.getMemories()); setLatestEntry(entry); setProcessing(false); setShowFindings(true) }, 6500)
  }
  const toggleRecordingPause = () => {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') { recorder.pause(); setPaused(true) }
    else if (recorder?.state === 'paused') { recorder.resume(); setPaused(false) }
  }
  const ask = async (value = query) => { if (!value.trim()) { setToast('Add a question to begin.'); return } setQuery(value); setAnswer(''); setAsking(true); setQueryError(false); try { const result = await aiService.ask(value); setAnswer(result.answer); setSources(result.sources) } catch { setQueryError(true) } finally { setAsking(false) } }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <button className="brand" onClick={() => navigate('Home')}><span className="brand-symbol"><i/><i/><i/></span><span>memory</span></button>
      <div className="nav-label">YOUR SPACE</div>
      <nav className="nav-group" aria-label="Primary navigation">{primary.map(item => <NavButton key={item.label} item={item} active={page === item.label} onClick={() => navigate(item.label)} />)}</nav>
      <div className="nav-label secondary-label">YOUR LIFE</div>
      <nav className="nav-group secondary-nav" aria-label="Your life">{secondary.map(item => <NavButton key={item.label} item={item} active={page === item.label} onClick={() => navigate(item.label)} />)}</nav>
      <div className="sidebar-bottom"><button className={`nav-button ${page === 'Settings' ? 'active' : ''}`} onClick={() => navigate('Settings')}><Settings2 size={17}/><span>Settings</span></button><div className="privacy-mini"><div className="privacy-icon"><LockKeyhole size={15}/></div><div><b>Your space, your pace</b><small>Private by design</small></div></div><button className="profile-button" onClick={() => navigate('Settings')}><span className="avatar">A</span><span className="profile-copy"><b>Alex Morgan</b><small>Personal space</small></span><MoreHorizontal size={18} className="profile-more"/></button></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><span className="crumb-dot"/><span>{page === 'Home' ? 'A quieter way to remember' : page}</span></div><div className="topbar-right"><span className="date-today">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(now).toUpperCase()}</span><button className="help-button" aria-label="About Memory" onClick={() => setToast('Memory helps you capture moments and find them again.') }><CircleHelp size={17}/></button></div></header>
      {page === 'Home' && <HomePage now={now} onRecord={startRecording} onNavigate={navigate} memories={memories} onOpenMemory={setSelectedMemory} micRequesting={micRequesting} />}
      {recording && <RecordingModal seconds={seconds} paused={paused} onPause={toggleRecordingPause} onStop={stopRecording} />}
      {processing && <ProcessingModal step={processingStep} />}
      {showFindings && <FindingsModal entry={latestEntry} onClose={() => setShowFindings(false)} onNavigate={destination => { setShowFindings(false); navigate(destination); if (destination === 'Diary') setSelectedDiary(latestEntry) }} />}
      {page === 'Diary' && <DiaryPage diary={diary} selected={selectedDiary} onSelect={setSelectedDiary} onSave={saveDiaryEntry} onRecord={startRecording} />}
      {page === 'Diary' && recordedAudioUrl && selectedDiary?.id === latestEntry?.id && <div className="captured-audio"><div className="captured-audio-label"><AudioLines size={15}/><span><b>Your recording</b><small>Audio is held in this browser session</small></span></div><audio controls src={recordedAudioUrl}/></div>}
      {page === 'Memories' && <MemoriesPage memories={memories} onOpen={setSelectedMemory} />}
      {page === 'Ask AI' && <AskPage query={query} setQuery={setQuery} onAsk={ask} answer={answer} sources={sources} asking={asking} mode={mode} setMode={setMode} contextOpen={contextOpen} setContextOpen={setContextOpen} onOpenSource={source => { if (source.kind === 'Memory') { const found = memories.find(item => item.id === source.id); if (found) { setSelectedMemory(found); setPage('Memories') } else setPage('Memories') } else if (source.kind === 'Diary entry') { setSelectedDiary(diary.find(entry => entry.id === source.id) ?? diary[0]); setPage('Diary') } else setPage('Timeline') }} error={queryError} />}
      {page === 'Timeline' && <TimelinePage events={timeline} />}
      {page === 'Insights' && <InsightsPage />}
      {['Goals', 'Experiences', 'People', 'Projects', 'Tasks', 'Settings'].includes(page) && <SupportPage page={page} />}
      {selectedMemory && <MemoryDetail memory={selectedMemory} onClose={() => setSelectedMemory(null)} onDiary={() => { setSelectedDiary(diary[0]); setPage('Diary'); setSelectedMemory(null) }} />}
      <footer className="app-footer"><span>Memory is a place to return to yourself.</span><span><LockKeyhole size={12}/> Your moments stay yours</span></footer>
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

function NavButton({ item, active, onClick }: { item: { label: Page; icon: typeof Home }; active: boolean; onClick: () => void }) { const Icon = item.icon; return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={17} strokeWidth={1.7}/><span>{item.label}</span>{item.label === 'Tasks' && <span className="nav-count">2</span>}</button> }
function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div> }

function HomePage({ now, onRecord, onNavigate, memories, onOpenMemory, micRequesting }: { now: Date; onRecord: () => void; onNavigate: (page: Page) => void; memories: Memory[]; onOpenMemory: (memory: Memory) => void; micRequesting: boolean }) {
  const recent = memories[0]
  const greeting = now.getHours() < 12 ? 'Good morning,' : now.getHours() < 18 ? 'Good afternoon,' : 'Good evening,'
  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(now).toUpperCase()
  return <div className="home-page">
    <div className="home-topline"><span className="day-mark"><Sun size={14}/> {todayLabel}</span><span>TAKE A BREATH. YOU’RE HERE.</span></div>
    <section className="home-hero"><div className="hero-copy"><div className="hero-eyebrow"><span/> YOUR PERSONAL MEMORY SPACE</div><h1>{greeting}<br/><em>Alex.</em></h1><p>What would you like to remember today?</p><div className="hero-actions"><button className="primary-action" onClick={onRecord} disabled={micRequesting}><span className="mic-disc"><Mic size={18}/></span><span><b>{micRequesting ? 'Waiting for mic access…' : 'Talk about today'}</b><small>Capture a moment, just as it happened</small></span><ChevronRight size={18}/></button><button className="secondary-action" onClick={() => onNavigate('Diary')}><Plus size={17}/> New diary entry</button><button className="text-action" onClick={() => onNavigate('Ask AI')}><Sparkles size={16}/> Ask AI</button></div></div><div className="hero-art" aria-hidden="true"><div className="sun-disc"/><div className="horizon h1"/><div className="horizon h2"/><div className="horizon h3"/><span className="art-star star-a">✳</span><span className="art-star star-b">·</span><span className="art-caption">A moment becomes a memory</span></div></section>
    <section className="day-glance"><div className="section-caption"><span>YOUR DAY</span><span className="caption-rule"/><span className="soft-note">So far, today</span></div><div className="glance-items"><button onClick={() => onNavigate('Memories')}><span className="glance-value">{memories.length > 0 ? 3 : 0}</span><span>memories</span><Bookmark size={16}/></button><i/><button onClick={() => onNavigate('Tasks')}><span className="glance-value">2</span><span>tasks</span><Check size={16}/></button><i/><button onClick={() => onNavigate('Diary')}><span className="glance-value">1</span><span>diary entry</span><Feather size={16}/></button></div></section>
    <div className="home-lower"><section className="recent-memory"><div className="section-caption"><span>RECENT MEMORY</span><button onClick={() => onNavigate('Memories')}>All memories <ChevronRight size={14}/></button></div>{recent && <button className="memory-feature" onClick={() => onOpenMemory(recent)}><div className="memory-feature-top"><span className="memory-icon"><Bookmark size={16}/></span><span className="memory-age">2 HOURS AGO <span>·</span> OCT 1</span><MoreHorizontal size={18}/></div><blockquote>“{recent.content}”</blockquote><div className="tag-row">{recent.topics.map(tag => <span className="topic-tag" key={tag}>{tag}</span>)}</div><div className="memory-source"><AudioLines size={14}/> From a voice recording <ChevronRight size={14}/></div></button>}</section><section className="noticing-card"><div className="notice-icon"><Lightbulb size={17}/></div><div className="notice-kicker">SOMETHING I NOTICED</div><p>You’ve mentioned the hackathon <em>7 times</em> this week.</p><button onClick={() => onNavigate('Insights')}>Explore this thread <ChevronRight size={14}/></button><span className="notice-spark">✳</span></section></div>
    <CalendarSection now={now} />
  </div>
}

function RecordingModal({ seconds, paused, onPause, onStop }: { seconds: number; paused: boolean; onPause: () => void; onStop: () => void }) { return <div className="overlay recording-overlay"><div className="recording-panel"><button className="modal-close" onClick={onStop} aria-label="Stop recording"><X size={18}/></button><div className="recording-orbit"><span className="orbit o1"/><span className="orbit o2"/><span className="orbit o3"/><button className={`recording-mic ${paused ? 'is-paused' : ''}`} onClick={onPause}><Mic size={28}/></button><span className="live-dot"/></div><div className="recording-status"><span className={paused ? 'status-paused' : ''}/>{paused ? 'Paused' : 'Listening...'}</div><h2>Speak naturally.<br/><em>I’ll take care of the rest.</em></h2><div className="waveform" aria-label="Audio waveform">{Array.from({ length: 41 }, (_, i) => <i key={i} style={{ height: `${8 + ((i * 13 + 7) % 27)}px`, animationDelay: `${(i % 11) * -0.12}s` }}/>)}</div><div className="record-time">00:{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</div><div className="record-controls"><button onClick={onPause}><Pause size={15}/>{paused ? 'Resume' : 'Pause'}</button><button className="stop-record" onClick={onStop}><Square size={13} fill="currentColor"/> Finish for today</button></div><span className="recording-footnote"><LockKeyhole size={12}/> Your recording stays in your personal space</span></div></div> }

function ProcessingModal({ step }: { step: number }) { const lines = ['Your thoughts are taking shape...', 'Finding the moments that matter...', 'Connecting this with what you already remember...', 'Your entry is ready.']; return <div className="overlay processing-overlay"><div className="processing-panel"><div className="processing-visual"><div className="process-ring r1"/><div className="process-ring r2"/><div className="process-ring r3"/><div className="process-core"><AudioLines size={25}/></div><span className="concept c1">Hackathon</span><span className="concept c2">Arun</span><span className="concept c3">Progress</span><span className="concept c4">An idea</span><span className="concept c5">Tomorrow</span><i className="particle p1"/><i className="particle p2"/><i className="particle p3"/></div><div className="eyebrow">A LITTLE TIME TO SETTLE</div><h2>{lines[step]}</h2><p>{step < 2 ? 'Gathering the moments you shared into something you can return to.' : 'A few things are finding their place.'}</p><small className="processing-demo-note">The audio stays in this browser; transcript and memory examples are simulated.</small><div className="processing-pips">{[0, 1, 2, 3].map(i => <i className={step >= i ? 'lit' : ''} key={i}/>)}</div><span className="processing-quiet"><LockKeyhole size={12}/> This can take a moment</span></div></div> }
function FindingsModal({ entry, onClose, onNavigate }: { entry: DiaryEntry | null; onClose: () => void; onNavigate: (page: Page) => void }) { const findings = [{ title: 'Hackathon', text: 'Made progress on the project architecture.' }, { title: 'Arun', text: 'Talked through the next step over coffee.' }, { title: 'Intention', text: 'Finish the diary view tomorrow.' }, { title: 'An idea', text: 'A future time capsule feature.' }]; return <div className="overlay findings-overlay"><div className="findings-panel"><button className="modal-close" onClick={onClose} aria-label="Close findings"><X size={18}/></button><div className="eyebrow">A FEW THINGS CAME THROUGH</div><h2>I found <em>4 things</em><br/>worth remembering.</h2><div className="findings-list">{findings.map((item, i) => <article className="finding-item" key={item.title} style={{ animationDelay: `${i * .16}s` }}><span className="finding-number">0{i + 1}</span><div><b>{item.title}</b><p>{item.text}</p></div><span className="finding-dot"/></article>)}</div><div className="findings-actions"><button className="primary-action" onClick={() => onNavigate('Diary')}><span><b>View my entry</b><small>{entry?.title ?? 'A day taking shape'}</small></span><ChevronRight size={17}/></button><button className="findings-memory-link" onClick={() => onNavigate('Memories')}>See my memories <ChevronRight size={14}/></button></div></div></div> }

function DiaryPage({ diary, selected, onSelect, onSave, onRecord }: { diary: DiaryEntry[]; selected: DiaryEntry | null; onSelect: (entry: DiaryEntry | null) => void; onSave: (entry: DiaryEntry) => void; onRecord: () => void }) {
  const [search, setSearch] = useState('')
  const [attachment, setAttachment] = useState('')
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const createEntry = () => {
    const date = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
    onSelect({ id: 'new', date, title: '', content: '', mood: 'Thoughtful', energy: 'Steady', topics: [], people: [], memoryIds: [] })
    setAttachment('')
  }
  const updateEntry = (changes: Partial<DiaryEntry>) => {
    if (!selected) return
    const updated = { ...selected, ...changes }
    if (updated.id === 'new' && (updated.title.trim() || updated.content.trim())) updated.id = `d${Date.now()}`
    onSelect(updated)
    if (updated.id !== 'new') onSave(updated)
  }
  const addFormatting = (before: string, after = before) => {
    const editor = editorRef.current
    if (!editor || !selected) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const value = selected.content
    const selectedText = value.slice(start, end)
    const insertion = `${before}${selectedText || 'text'}${after}`
    const content = `${value.slice(0, start)}${insertion}${value.slice(end)}`
    updateEntry({ content })
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start + before.length, start + before.length + (selectedText || 'text').length) })
  }
  const insertList = () => {
    const editor = editorRef.current
    if (!editor || !selected) return
    const start = editor.selectionStart
    const content = `${selected.content.slice(0, start)}\n• ${selected.content.slice(start)}`
    updateEntry({ content })
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start + 3, start + 3) })
  }

  if (selected) return <section className="page-content diary-notebook">
    <button className="back-link diary-back-link" onClick={() => onSelect(null)}><ChevronLeft size={15}/> All diary entries</button>
    <div className="notebook-heading"><div className="eyebrow">{selected.date.toUpperCase()}</div><input aria-label="Entry title" value={selected.title} onChange={event => updateEntry({ title: event.target.value })} placeholder="A day taking shape" maxLength={100}/><span className="notebook-save-state">{selected.id === 'new' ? 'DRAFT' : 'SAVED IN YOUR DIARY'}</span></div>
    <div className="notebook-writing"><textarea ref={editorRef} aria-label="Diary entry" value={selected.content} onChange={event => updateEntry({ content: event.target.value })} placeholder="Start writing your thoughts…" spellCheck /></div>
    {attachment && <div className="notebook-attachment"><Paperclip size={13}/>{attachment}<button onClick={() => setAttachment('')} aria-label="Remove attachment"><X size={13}/></button></div>}
    <div className="notebook-toolbar" role="toolbar" aria-label="Diary formatting">
      <div className="notebook-tool-group"><button title="Bold" aria-label="Bold" onClick={() => addFormatting('**')}><Bold size={17}/></button><button title="Italic" aria-label="Italic" onClick={() => addFormatting('*')}><Italic size={17}/></button><button title="Underline" aria-label="Underline" onClick={() => addFormatting('<u>', '</u>')}><Underline size={17}/></button></div>
      <span className="notebook-tool-divider"/><div className="notebook-tool-group"><button title="Bulleted list" aria-label="Bulleted list" onClick={insertList}><List size={18}/></button><button title="Code" aria-label="Code" onClick={() => addFormatting('`')}><Code2 size={17}/></button></div>
      <span className="notebook-tool-spacer"/><label className="notebook-attach" title="Attach a file"><Paperclip size={16}/><span>Attach</span><input type="file" onChange={event => setAttachment(event.target.files?.[0]?.name ?? '')}/></label><span className="notebook-tool-divider"/><button className="notebook-mic" title="Record a thought" aria-label="Record a thought" onClick={onRecord}><Mic size={18}/></button>
    </div>
  </section>

  const filteredDiary = diary.filter(entry => `${entry.title} ${entry.content} ${entry.date}`.toLowerCase().includes(search.toLowerCase()))
  return <section className="page-content diary-library">
    <PageHeading eyebrow="YOUR OWN WORDS, HELD GENTLY" title="Your diary" subtitle="A space for your thoughts, plans, and everything in between." />
    <button className="diary-new-entry" onClick={createEntry}><Plus size={19}/><span>New entry</span><ChevronRight size={16}/></button>
    <label className="diary-search"><Search size={15}/><input aria-label="Search entries" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search entries"/><span>{filteredDiary.length} entries</span></label>
    {filteredDiary.length ? <div className="diary-library-list">{filteredDiary.map((entry, index) => <button className="diary-library-row" onClick={() => { onSelect(entry); setAttachment('') }} key={entry.id}>
      <span className="diary-library-icon"><Feather size={16}/></span><span className="diary-library-copy"><span className="diary-library-meta">{entry.date}{entry.mood ? ` · ${entry.mood}` : ''}</span><b>{entry.title || 'Untitled entry'}</b><small>{entry.content.slice(0, 150)}{entry.content.length > 150 ? '…' : ''}</small></span><ChevronRight size={16} className="diary-library-arrow"/>
    </button>)}</div> : <div className="diary-library-empty"><div className="note-mark">“</div><h3>{search ? 'No entries found.' : 'Your diary is waiting.'}</h3><p>{search ? 'Try a different search.' : 'Start with one small moment from today.'}</p></div>}
    <aside className="diary-library-note"><span>✳</span>These are your moments, in your own words.</aside>
  </section>
}

function MemoriesPage({ memories, onOpen }: { memories: Memory[]; onOpen: (memory: Memory) => void }) { const [filter, setFilter] = useState('All memories'); return <section className="page-content"><PageHeading eyebrow="THE MOMENTS THAT STAY WITH YOU" title="Memories" subtitle="Small things, gathered over time. Here whenever you need them."/><div className="filter-row"><button className="search-trigger"><Search size={15}/> Find a memory <span>⌘ K</span></button><button className="filter-button" onClick={() => setFilter(filter === 'All memories' ? 'Recent' : 'All memories')}>{filter} <ChevronDown size={14}/></button></div><div className="memories-list">{memories.map(memory => <button className="memory-row" key={memory.id} onClick={() => onOpen(memory)}><div className="memory-row-mark"><Bookmark size={16}/></div><div className="memory-row-main"><div className="memory-row-date">{memory.date}</div><p>“{memory.content}”</p><div className="tag-row">{memory.topics.map(topic => <span className="topic-tag" key={topic}>{topic}</span>)}</div><div className="source-inline"><AudioLines size={13}/>{memory.source.kind}<span>·</span>{memory.source.date}</div></div><ChevronRight className="memory-row-chevron" size={17}/></button>)}{memories.length === 0 && <div className="empty-state"><Bookmark/><h3>Nothing to remember yet.</h3><p>Capture a moment and it will find its place here.</p></div>}</div></section> }

function MemoryDetail({ memory, onClose, onDiary }: { memory: Memory; onClose: () => void; onDiary: () => void }) { return <div className="overlay detail-overlay"><article className="detail-panel"><button className="modal-close" onClick={onClose} aria-label="Close detail"><X size={18}/></button><button className="back-link" onClick={onClose}><ChevronLeft size={15}/> Back to memories</button><div className="eyebrow">A MEMORY · {memory.date.toUpperCase()}</div><h1>{memory.content}</h1><div className="tag-row">{memory.topics.map(t => <span className="topic-tag" key={t}>{t}</span>)}</div><div className="detail-facts"><div><small>PROJECT</small><b>{memory.project || 'Personal'}</b></div><div><small>PEOPLE</small><b>{memory.people?.join(', ') || 'Just you'}</b></div><div><small>REMEMBERED</small><b>{memory.date}</b></div></div><div className="why-remember"><div className="section-caption"><span>WHY DO I REMEMBER THIS?</span><ChevronDown size={14}/></div><p>Remembered because it captures a meaningful moment in your day.</p><div className="why-source"><AudioLines size={15}/><span><b>{memory.source.kind}</b><small>{memory.source.date}</small></span><ChevronRight size={15}/></div><button className="why-source" onClick={onDiary}><Feather size={15}/><span><b>Diary entry</b><small>{memory.source.date}</small></span><ChevronRight size={15}/></button></div><button className="subtle-button"><span>More about this memory</span><ChevronDown size={15}/></button></article></div> }

function AskPage({ query, setQuery, onAsk, answer, sources, asking, mode, setMode, contextOpen, setContextOpen, onOpenSource, error }: { query: string; setQuery: (value: string) => void; onAsk: (value?: string) => void; answer: string; sources: { kind: string; date: string; id: string }[]; asking: boolean; mode: string; setMode: (value: string) => void; contextOpen: boolean; setContextOpen: (value: boolean) => void; onOpenSource: (source: { kind: string; date: string; id: string }) => void; error: boolean }) { return <section className="ask-page page-content"><div className="ask-heading"><div className="eyebrow">A QUESTION FOR YOUR PAST</div><h1>Ask about <em>your life.</em></h1><p>Answers grounded in your memories and experiences.</p></div><div className="ask-modes">{['Recall', 'Reflect', 'Plan', 'Search', 'General'].map(m => <button className={mode === m ? 'selected' : ''} onClick={() => setMode(m)} key={m}>{m}</button>)}</div><div className="ask-composer"><textarea value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAsk() } }} placeholder="Ask about your life..."/><div className="ask-composer-bottom"><span><LockKeyhole size={12}/> Answers draw from what you’ve saved</span><button onClick={() => onAsk()} disabled={asking}>{asking ? 'Thinking…' : <>Ask Memory <ChevronRight size={15}/></>}</button></div></div>{!answer && !asking && <div className="suggestions"><div className="section-caption"><span>QUESTIONS TO GET YOU STARTED</span></div>{prompts.map(q => <button onClick={() => onAsk(q)} key={q}><span>{q}</span><ChevronRight size={15}/></button>)}</div>}{asking && <div className="answer-loading"><span className="loading-orb"><Sparkles size={20}/></span><p>Looking back through your memories...</p></div>}{error && <div className="inline-error">Memory couldn’t find an answer just now. Try again in a moment.</div>}{answer && <div className="answer-block"><div className="answer-meta"><span className="answer-mark"><Sparkles size={15}/></span><span>MEMORY FOUND A THREAD</span><span className="answer-mode">{mode}</span></div><p className="answer-copy">{answer}</p><div className="sources-block"><div className="section-caption"><span>SOURCES</span><span className="soft-note">3 moments helped shape this answer</span></div><div className="source-cards">{sources.map(source => <button onClick={() => onOpenSource(source)} key={`${source.id}${source.kind}`}><span className="source-type-icon">{source.kind === 'Diary entry' ? <Feather size={15}/> : source.kind === 'Memory' ? <Bookmark size={15}/> : <AudioLines size={15}/>}</span><span><b>{source.kind}</b><small>{source.date}</small></span><ChevronRight size={14}/></button>)}</div></div><button className="context-toggle" onClick={() => setContextOpen(!contextOpen)}>{contextOpen ? 'Hide retrieval context' : 'View retrieval context'} <ChevronDown size={14}/></button>{contextOpen && <div className="context-flow"><div><b>Your question</b><small>{query}</small></div><i>↓</i><div><b>Relevant memories</b><small>3 moments selected from your library</small></div><i>↓</i><div><b>Personal memory assistant</b><small>Answer shaped from saved sources</small></div></div>}</div>}</section> }

function TimelinePage({ events }: { events: TimelineEvent[] }) { const [open, setOpen] = useState<string | null>(null); return <section className="page-content"><PageHeading eyebrow="A LIFE, IN MOMENTS" title="Timeline" subtitle="A gentle way to see where your days have taken you." action={<button className="filter-button">2026 <ChevronDown size={14}/></button>}/><div className="timeline-month"><span>OCTOBER 2026</span><i/></div><div className="timeline">{events.map((event, i) => <div key={event.id}>{i === 1 && <div className="timeline-month timeline-month-inline"><span>SEPTEMBER 2026</span><i/></div>}<article className="timeline-item"><div className="timeline-rail"><span className={i === 0 ? 'timeline-dot current' : 'timeline-dot'}/>{i < events.length - 1 && <i/>}</div><div className="timeline-card"><button className="timeline-event" onClick={() => setOpen(open === event.id ? null : event.id)}><div className="timeline-date">{event.date}</div><div className="timeline-event-content"><h3>{event.title}</h3><p>{event.summary}</p><div className="timeline-counts"><span><AudioLines size={13}/>{event.recordings} recording{event.recordings > 1 ? 's' : ''}</span><span><Bookmark size={13}/>{event.memories} memories</span></div></div><ChevronDown size={15} className={open === event.id ? 'rotate' : ''}/></button>{open === event.id && <div className="timeline-expanded"><div><small>PEOPLE</small><b>{event.people.join(', ') || 'Just you'}</b></div><div><small>PROJECT</small><b>{event.project}</b></div><div><small>IN THIS MOMENT</small><b>Recording · Diary · {event.memories} memories</b></div></div>}</div></article></div>)}</div></section> }

function InsightsPage() { return <section className="page-content"><PageHeading eyebrow="GENTLE CONNECTIONS OVER TIME" title="What your days are telling you." subtitle="Not conclusions. Just small patterns you might recognize."/><div className="insight-intro"><div className="insight-illustration"><span/><i/><i/><i/><b>✳</b></div><div><span className="eyebrow">A REFLECTION, NOT A RULE</span><p>Some moments become clearer when you see them together.</p></div></div><div className="insight-list"><article className="insight-item"><span className="insight-number">01</span><div><small>A REPEATING THREAD · THIS WEEK</small><h2>You find momentum when the next step feels small.</h2><p>When the hackathon started to feel like too much, you picked one thing to finish. A conversation with Arun helped turn a long list into a clear next step.</p><div className="insight-tags"><span>Sep 27</span><span>Sep 30</span><span>Oct 1</span></div></div><ChevronRight size={16}/></article><article className="insight-item"><span className="insight-number">02</span><div><small>A QUIETER SIGNAL · LAST 2 WEEKS</small><h2>The ordinary pauses seem to stay with you.</h2><p>A slower walk, coffee with a friend, a lunch without an agenda. Your memories often hold the moments when you had room to breathe.</p><div className="insight-tags"><span>Sep 23</span><span>Sep 28</span></div></div><ChevronRight size={16}/></article></div><p className="insight-footnote">Patterns are invitations to reflect, not conclusions about you.</p></section> }

function SupportPage({ page }: { page: Page }) { const content: Record<string, { eyebrow: string; title: string; subtitle: string; rows: string[] }> = {
  Goals: { eyebrow: 'WHAT YOU’RE MOVING TOWARD', title: 'Goals', subtitle: 'Intentions worth making a little room for.', rows: ['Finish the first Memory prototype · This week', 'Make time for a slower morning · Ongoing', 'Reconnect with college friends · This month'] },
  Experiences: { eyebrow: 'LIFE, AS IT HAPPENS', title: 'Experiences', subtitle: 'The bigger moments and the everyday in between.', rows: ['Building something new · Hackathon', 'A full week at college · September', 'A weekend with friends · August'] },
  People: { eyebrow: 'THE PEOPLE IN YOUR STORY', title: 'People', subtitle: 'The names that show up in your memories.', rows: ['Arun · 8 moments together', 'Rahul · 5 moments together', 'Maya · 3 moments together'] },
  Projects: { eyebrow: 'WHAT HAS YOUR ATTENTION', title: 'Projects', subtitle: 'Ideas and work you’ve been giving your time to.', rows: ['Memory · 7 memories', 'College · 5 memories', 'Personal · 3 memories'] },
  Tasks: { eyebrow: 'SMALL STEPS, HELD LIGHTLY', title: 'Tasks', subtitle: 'Things you meant to come back to.', rows: ['Finish the diary view · Today', 'Try the recording flow · Today', 'Ask Arun about the time capsule idea · Tomorrow'] },
  Settings: { eyebrow: 'YOUR SPACE, YOUR CHOICES', title: 'Settings', subtitle: 'Decide what feels right for your personal memory space.', rows: ['Personal space · This prototype uses local demo data', 'Your memories · Review and manage saved moments', 'Privacy controls · Interface preview only'] },
  }
  const data = content[page]
  return <section className="page-content"><PageHeading eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle}/><div className="support-list">{data.rows.map((row, i) => <div className="support-row" key={row}><span className="support-index">0{i + 1}</span><span>{row}</span><ChevronRight size={15}/></div>)}</div>{page === 'Settings' && <div className="privacy-note-large"><LockKeyhole size={17}/><p>This demo shows privacy settings as interface states. No privacy or encryption behavior is verified by this prototype.</p></div>}</section>
}
