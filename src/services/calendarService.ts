import type { CalendarEntry } from '../types'

const STORAGE_KEY = 'memory.calendarEntries.v1'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function offsetDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function demoEntries(): CalendarEntry[] {
  return [
    { id: 'demo-1', date: offsetDate(-1), title: 'A little room to think', startTime: '09:00', endTime: '09:30', description: 'A quiet start before the day filled up.', category: 'personal' },
    { id: 'demo-2', date: offsetDate(0), title: 'Hackathon work', startTime: '10:00', endTime: '11:30', description: 'Shape the first version of the memory dashboard.', category: 'notable' },
    { id: 'demo-3', date: offsetDate(0), title: 'Coffee with Arun', startTime: '12:00', endTime: '12:45', description: 'Talk through what should come next.', category: 'general' },
    { id: 'demo-4', date: offsetDate(1), title: 'Make space for a walk', startTime: '17:00', endTime: '17:45', description: 'Step away from the screen for a while.', category: 'personal' },
  ]
}

function readEntries(): CalendarEntry[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed as CalendarEntry[]
    }
    const initial = demoEntries()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  } catch {
    return demoEntries()
  }
}

function writeEntries(entries: CalendarEntry[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) } catch { /* Keep this session usable when storage is unavailable. */ }
}

export const calendarService = {
  getEntries: readEntries,
  addEntry(entry: CalendarEntry) { const entries = [...readEntries(), entry]; writeEntries(entries); return entries },
  removeEntry(id: string) { const entries = readEntries().filter(entry => entry.id !== id); writeEntries(entries); return entries },
}
