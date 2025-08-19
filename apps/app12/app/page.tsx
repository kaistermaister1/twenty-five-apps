"use client";

// Static replica of the provided calendar screen (visual only)
// One bottom tab item: Calendar

import { useEffect, useMemo, useRef, useState } from "react";

function formatHeader(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function addDays(base: Date, delta: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function dayNum(date: Date) {
  return date.getDate();
}

function formatHourLabel(hour: number) {
  const suffix = hour < 12 || hour === 24 ? "AM" : "PM";
  const base = hour % 12;
  const display = base === 0 ? 12 : base;
  return `${display} ${suffix}`;
}

export default function Page() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [selectedDate, setSelectedDate] = useState(today);
  type EventType = 'Meal' | 'Class' | 'Other';
  type CalendarEvent = {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    // Legacy backups
    start?: Date;
    end?: Date;
    // Canonical fields used for math/rendering
    dateKey: string; // YYYY-MM-DD
    startMinutes: number; // minutes from midnight local
    endMinutes: number; // minutes from midnight local
    color: string;
  };
  type PersistedEvent = {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    date: string; // YYYY-MM-DD local date key
    startMinutes: number; // minutes from midnight local
    endMinutes: number; // minutes from midnight local
    color: string;
  };
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const storageKey = 'app12_calendar_events_v1';
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  // Default times: start now rounded to next 15 minutes on selected date; end = +30m
  const now = new Date();
  const roundedNow = useMemo(() => {
    const n = new Date();
    const m = n.getMinutes();
    const rounded = m % 15 === 0 ? m : m + (15 - (m % 15));
    n.setMinutes(rounded, 0, 0);
    return n;
  }, []);
  const [startTime, setStartTime] = useState<string>(() => {
    const hh = String(roundedNow.getHours()).padStart(2, '0');
    const mm = String(roundedNow.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [endTime, setEndTime] = useState<string>(() => {
    const e = new Date(roundedNow);
    e.setMinutes(e.getMinutes() + 30);
    const hh = String(e.getHours()).padStart(2, '0');
    const mm = String(e.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const pastDays = 90;
  const futureDays = 365;
  const dates = useMemo(() => {
    // Ordered from past -> future anchored at today
    return Array.from({ length: pastDays + 1 + futureDays }).map((_, i) => addDays(today, i - pastDays));
  }, [today]);
  const todayIndex = pastDays;
  const dayItemWidth = 80;
  const ribbonRef = useRef<HTMLDivElement | null>(null);
  const appBarRef = useRef<HTMLDivElement | null>(null);
  const [appBarHeight, setAppBarHeight] = useState<number>(56);
  const [dateStripHeight, setDateStripHeight] = useState<number>(48);
  useEffect(() => {
    // Start with today as the first visible item
    if (ribbonRef.current) {
      ribbonRef.current.scrollLeft = todayIndex * dayItemWidth;
    }
  }, [todayIndex]);
  
  useEffect(() => {
    function isStandaloneMode() {
      // iOS Safari exposes navigator.standalone; other platforms support display-mode query
      return (
        (typeof window !== 'undefined' && (window.navigator as any).standalone) ||
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      );
    }

    function updateSafeAreaFallback() {
      const root = document.documentElement;
      const raw = getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom');
      const numeric = parseInt(raw, 10);
      if (isStandaloneMode() && (!Number.isFinite(numeric) || numeric <= 0)) {
        // Most iPhones with a home indicator have a 34px bottom inset in portrait
        root.style.setProperty('--safe-area-inset-bottom', '34px');
      }
    }

    updateSafeAreaFallback();
    window.addEventListener('resize', updateSafeAreaFallback);
    return () => window.removeEventListener('resize', updateSafeAreaFallback);
  }, []);
  const bottomBarHeight = 68; // px (not including safe area)
  const appBarBaseHeight = appBarHeight; // measured visual height (includes safe-area top)
  const dateStripBaseHeight = dateStripHeight; // measured
  const hourHeight = 60; // pixels per hour for perfect alignment
  const labelW = 64;
  const minuteHeight = hourHeight / 60; // 1px per minute
  const tapStateRef = useRef<{pointerId:number|null,startX:number,startY:number,moved:boolean}>({pointerId:null,startX:0,startY:0,moved:false});
  const TAP_MOVE_TOLERANCE_PX = 6;
  // Drag state
  const dragPreviewRef = useRef<{ id: string|null; previewStart: number; active: boolean }>({ id: null, previewStart: 0, active: false });
  const [dragTick, setDragTick] = useState(0); // force re-render while dragging
  const dragMetaRef = useRef<{ id: string|null; pointerId: number|null; startY: number; origStart: number; duration: number; longPress: boolean; moved: boolean; timer: number | null; target: HTMLElement | null }>({ id: null, pointerId: null, startY: 0, origStart: 0, duration: 0, longPress: false, moved: false, timer: null, target: null });
  // Persistence loaded flag
  const [hasLoaded, setHasLoaded] = useState(false);

  function formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  useEffect(() => {
    function measureHeights() {
      if (appBarRef.current) setAppBarHeight(appBarRef.current.offsetHeight);
      if (ribbonRef.current) setDateStripHeight(ribbonRef.current.offsetHeight);
    }
    measureHeights();
    window.addEventListener('resize', measureHeights);
    return () => window.removeEventListener('resize', measureHeights);
  }, []);

  function colorForType(t: EventType): string {
    switch (t) {
      case 'Meal': return '#d97706'; // amber-700
      case 'Class': return '#7c3aed'; // violet-600
      case 'Other': return '#6b7280'; // gray-500
    }
  }

  function openTypePicker() {
    setShowTypeModal(true);
  }

  function chooseType(t: EventType) {
    setSelectedType(t);
    setShowTypeModal(false);
    setShowDetailsModal(true);
    if (!draftTitle) setDraftTitle(t);
  }

  function setTimeToNow() {
    const n = new Date();
    const m = n.getMinutes();
    const rounded = m % 15 === 0 ? m : m + (15 - (m % 15));
    n.setMinutes(rounded, 0, 0);
    const e = new Date(n);
    e.setMinutes(e.getMinutes() + 30);
    const hh = String(n.getHours()).padStart(2, '0');
    const mm = String(n.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    setStartTime(`${hh}:${mm}`);
    setEndTime(`${eh}:${em}`);
  }

  function saveEvent() {
    if (!selectedType) return;
    // Parse time inputs as simple hours:minutes, no Date objects with timezone issues
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const dateKey = formatDateKey(selectedDate);
    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) endMinutes = startMinutes + 30;
    // Optional Date copies for legacy compatibility only
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), Math.floor(startMinutes/60), startMinutes%60, 0, 0);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), Math.floor(endMinutes/60), endMinutes%60, 0, 0);

    if (editingEventId) {
      setEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...ev, type: selectedType, title: draftTitle || selectedType, description: draftDesc, start, end, dateKey, startMinutes, endMinutes, color: colorForType(selectedType) } : ev));
    } else {
      const ev: CalendarEvent = {
        id: Math.random().toString(36).slice(2),
        type: selectedType,
        title: draftTitle || selectedType,
        description: draftDesc,
        start,
        end,
        dateKey,
        startMinutes,
        endMinutes,
        color: colorForType(selectedType)
      };
      setEvents(prev => [...prev, ev]);
    }
    // reset modal states
    setShowDetailsModal(false);
    setSelectedType(null);
    setDraftTitle("");
    setDraftDesc("");
    setEditingEventId(null);
  }

  // Persist to localStorage whenever events change (after initial load)
  useEffect(() => {
    if (!hasLoaded) return;
    try {
      const serializable: PersistedEvent[] = events.map(e => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        date: e.dateKey ?? (e.start ? formatDateKey(e.start) : formatDateKey(selectedDate)),
        startMinutes: e.startMinutes ?? (e.start ? e.start.getHours() * 60 + e.start.getMinutes() : 0),
        endMinutes: e.endMinutes ?? (e.end ? e.end.getHours() * 60 + e.end.getMinutes() : 30),
        color: e.color,
      }));
      localStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch {}
  }, [events, hasLoaded]);

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const loaded: CalendarEvent[] = parsed.map((p: any) => {
          if (p && typeof p.date === 'string') {
            const [y, m, d] = p.date.split('-').map(Number);
            const start = new Date(y, (m - 1), d, Math.floor((p.startMinutes||0)/60), (p.startMinutes||0)%60, 0, 0);
            const end = new Date(y, (m - 1), d, Math.floor((p.endMinutes||0)/60), (p.endMinutes||0)%60, 0, 0);
            return { id: p.id, type: p.type, title: p.title, description: p.description, start, end, dateKey: p.date, startMinutes: p.startMinutes||0, endMinutes: p.endMinutes||0, color: p.color } as CalendarEvent;
          } else {
            // Back-compat for older ISO storage
            const start = new Date(p.start);
            const end = new Date(p.end);
            return { id: p.id, type: p.type, title: p.title, description: p.description, start, end, dateKey: formatDateKey(start), startMinutes: start.getHours()*60+start.getMinutes(), endMinutes: end.getHours()*60+end.getMinutes(), color: p.color } as CalendarEvent;
          }
        });
        setEvents(loaded);
      }
    } catch {}
    setHasLoaded(true);
  }, []);

  function openEventForEdit(ev: CalendarEvent) {
    setSelectedType(ev.type);
    setDraftTitle(ev.title);
    setDraftDesc(ev.description || "");
    const startM = ev.startMinutes ?? (ev.start ? ev.start.getHours()*60 + ev.start.getMinutes() : 0);
    const endM = ev.endMinutes ?? (ev.end ? ev.end.getHours()*60 + ev.end.getMinutes() : startM + 30);
    const sh = String(Math.floor(startM/60)).padStart(2, '0');
    const sm = String(startM%60).padStart(2, '0');
    const eh = String(Math.floor(endM/60)).padStart(2, '0');
    const em = String(endM%60).padStart(2, '0');
    setStartTime(`${sh}:${sm}`);
    setEndTime(`${eh}:${em}`);
    setEditingEventId(ev.id);
    setShowDetailsModal(true);
  }

  function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    setShowDetailsModal(false);
    setEditingEventId(null);
  }

  return (
    <div className="app-root" style={{ display: "flex", flexDirection: "column", background: "#eeeeee", overflow: 'hidden' }}>
      {/* App bar with extra top padding to respect iOS status area */}
      <div ref={appBarRef} style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 20, background: "#7b1b3a", color: "#fff", padding: "10px 12px", paddingTop: "calc(var(--safe-area-inset-top) + 14px)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 4, border: "2px solid rgba(255,255,255,0.8)", position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 14, height: 2, background: 'rgba(255,255,255,0.9)', transform: 'translate(-50%, -50%)' }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{formatHeader(selectedDate)}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, border: "2px solid rgba(255,255,255,0.9)" }} />
          <div style={{ width: 22, height: 22, borderRadius: 4, border: "2px solid rgba(255,255,255,0.9)", position: 'relative' }}>
            <div style={{ position: 'absolute', left: 5, top: 9, width: 12, height: 2, background: 'rgba(255,255,255,0.9)' }} />
            <div style={{ position: 'absolute', left: 5, top: 13, width: 12, height: 2, background: 'rgba(255,255,255,0.9)' }} />
          </div>
          <div style={{ width: 22, height: 22, borderRadius: 4, border: "2px solid rgba(255,255,255,0.9)" }} />
        </div>
      </div>

      {/* Date strip - horizontally scrollable, clickable */}
      <div ref={ribbonRef} style={{ position: 'fixed', left: 0, right: 0, top: `${appBarBaseHeight}px`, zIndex: 19, background: '#eeeeee', color: '#111827', borderBottom: '1px solid #d4d4d8', overflowX: 'auto', overflowY: 'hidden', touchAction: 'pan-x' as any, marginTop: 0 }}>
        <div style={{ display: 'flex', minWidth: 560 }}>
          {dates.map((d, i) => {
            const isActive = d.toDateString() === selectedDate.toDateString();
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                style={{
                  flex: '0 0 auto', width: dayItemWidth, padding: '10px 0 12px', textAlign: 'center', position: 'relative', background: 'transparent', cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>{dayLabel(d)}</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{dayNum(d)}</div>
                {isActive && (
                  <>
                    <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: -1, height: 3, background: '#1976d2', borderRadius: 2 }} />
                    <div style={{ position: 'absolute', top: 4, left: '50%', width: 28, height: 4, background: '#1976d2', borderRadius: 2, transform: 'translateX(-50%)' }} />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline - scrollable 12am to 12am; lines stop before time column; labels centered on the line */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#f3f4f6',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        // Ensure scrollable area clears the bottom and top bars plus safe area
        paddingBottom: `calc(${bottomBarHeight + 20}px + var(--safe-area-inset-bottom))`,
        paddingTop: `${appBarBaseHeight + dateStripBaseHeight}px`
      }}>
        {/* Container for the entire timeline grid - exactly 24 hours × 60px */}
        <div style={{ position: 'relative', height: 24 * hourHeight }}>
          {/* Hour lines and labels inside the same container as events to share the exact coordinate space */}
          {Array.from({ length: 25 }).map((_, i) => {
            const hour = i; // 0..24
            const label = formatHourLabel(hour);
            const y = Math.round(hour * 60 * minuteHeight);
            return (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y }}>
                <div style={{ position: 'absolute', left: labelW, right: 0, top: 0, borderTop: '1px solid #e5e7eb' }} />
                <div style={{ position: 'absolute', left: 0, width: labelW, top: 0, transform: 'translateY(-50%)', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>{label}</div>
              </div>
            );
          })}
          {/* Render events for the selected date */}
          {events.filter(e => (e.dateKey ?? (e.start && formatDateKey(e.start))) === formatDateKey(selectedDate)).map((e) => {
            const startMinutes = e.startMinutes ?? (e.start ? e.start.getHours() * 60 + e.start.getMinutes() : 0);
            const endMinutes = e.endMinutes ?? (e.end ? e.end.getHours() * 60 + e.end.getMinutes() : 30);
            const durationMin = Math.max(15, endMinutes - startMinutes);
            
            // Use exact pixel positioning: each minute = 1 pixel
            const effectiveStart = dragPreviewRef.current.active && dragPreviewRef.current.id === e.id ? dragPreviewRef.current.previewStart : startMinutes;
            const topPx = effectiveStart * minuteHeight;
            const heightPx = durationMin * minuteHeight;
            
            return (
              <div
                key={e.id}
                role="button"
                onPointerDown={(pe) => {
                  // Setup for tap detection and potential long-press drag
                  tapStateRef.current = { pointerId: pe.pointerId, startX: pe.clientX, startY: pe.clientY, moved: false };
                  dragMetaRef.current = { id: e.id, pointerId: pe.pointerId, startY: pe.clientY, origStart: startMinutes, duration: durationMin, longPress: false, moved: false, timer: null, target: pe.currentTarget as HTMLElement };
                  // Start long-press timer
                  dragMetaRef.current.timer = window.setTimeout(() => {
                    // Begin drag (avoid pointer capture to prevent scroll issues after release)
                    dragMetaRef.current.longPress = true;
                    dragPreviewRef.current = { id: e.id, previewStart: startMinutes, active: true };
                    setDragTick(t => t + 1);
                  }, 250);
                }}
                onPointerMove={(pe) => {
                  const tap = tapStateRef.current; if (tap.pointerId !== pe.pointerId) return;
                  const dx = Math.abs(pe.clientX - tap.startX); const dy = Math.abs(pe.clientY - tap.startY);
                  if (!dragMetaRef.current.longPress) {
                    if (dx > TAP_MOVE_TOLERANCE_PX || dy > TAP_MOVE_TOLERANCE_PX) { tap.moved = true; }
                    return;
                  }
                  // Dragging: update preview start in 5-minute increments
                  dragMetaRef.current.moved = true;
                  const deltaY = pe.clientY - (dragMetaRef.current.startY);
                  const deltaMinRaw = deltaY / minuteHeight;
                  const deltaMin = Math.round(deltaMinRaw / 5) * 5;
                  let newStart = dragMetaRef.current.origStart + deltaMin;
                  const maxStart = 24 * 60 - dragMetaRef.current.duration;
                  if (newStart < 0) newStart = 0; if (newStart > maxStart) newStart = maxStart;
                  dragPreviewRef.current = { id: e.id, previewStart: newStart, active: true };
                  setDragTick(t => t + 1);
                }}
                onPointerUp={(pe) => {
                  const tap = tapStateRef.current; const drag = dragMetaRef.current;
                  if (drag.timer) { clearTimeout(drag.timer); drag.timer = null; }
                  if (drag.longPress && drag.moved && dragPreviewRef.current.active && dragPreviewRef.current.id === e.id) {
                    // Commit drag result
                    const newStart = dragPreviewRef.current.previewStart;
                    const newEnd = newStart + drag.duration;
                    setEvents(prev => prev.map(ev => ev.id === e.id ? { ...ev, startMinutes: newStart, endMinutes: newEnd, dateKey: ev.dateKey ?? (ev.start ? formatDateKey(ev.start) : formatDateKey(selectedDate)), start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), Math.floor(newStart/60), newStart%60), end: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), Math.floor(newEnd/60), newEnd%60) } : ev));
                    dragPreviewRef.current = { id: null, previewStart: 0, active: false };
                    setDragTick(t => t + 1);
                  } else if (tap.pointerId === pe.pointerId && !tap.moved) {
                    // Treat as tap to edit
                    openEventForEdit(e);
                  }
                  dragMetaRef.current = { id: null, pointerId: null, startY: 0, origStart: 0, duration: 0, longPress: false, moved: false, timer: null, target: null };
                  tapStateRef.current.pointerId = null;
                }}
                onPointerCancel={() => {
                  // Ensure we always reset state so scrolling isn't blocked
                  if (dragMetaRef.current.timer) { clearTimeout(dragMetaRef.current.timer); }
                  dragPreviewRef.current = { id: null, previewStart: 0, active: false };
                  dragMetaRef.current = { id: null, pointerId: null, startY: 0, origStart: 0, duration: 0, longPress: false, moved: false, timer: null, target: null };
                  tapStateRef.current.pointerId = null;
                }}
                style={{ 
                  position: 'absolute', 
                  left: labelW, 
                  right: 0, 
                  top: topPx, 
                  height: heightPx, 
                  background: e.color, 
                  borderRadius: 0, 
                  color: '#fff', 
                  padding: '4px 6px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  textAlign: 'left', 
                  // While dragging, disable touch-action to allow vertical drag without scrolling the container
                  touchAction: (dragPreviewRef.current.active && dragPreviewRef.current.id === e.id ? 'none' : 'pan-y') as any, 
                  userSelect: 'none', 
                  WebkitUserSelect: 'none',
                  // Ensure events sit exactly on the grid
                  border: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating blue + button */}
      <button aria-label="Add" onClick={openTypePicker} style={{ position: 'fixed', right: 18, bottom: `calc(${bottomBarHeight + 16}px + var(--safe-area-inset-bottom))`, width: 56, height: 56, borderRadius: '50%', background: '#1976d2', color: '#fff', boxShadow: '0 6px 12px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Bottom ribbon with single Calendar tab - fixed full-width bar with centered pill */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        // Include safe area in the total height so the white background extends all the way down
        height: `calc(${bottomBarHeight}px + var(--safe-area-inset-bottom))`,
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        // Center the pill in the actual visible area (not including safe area)
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 'var(--safe-area-inset-bottom)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}>
            {/* Calendar icon (inline SVG) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="3" stroke="#7b1b3a" strokeWidth="2"/>
              <path d="M3 9H21" stroke="#7b1b3a" strokeWidth="2"/>
              <path d="M8 3V7" stroke="#7b1b3a" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 3V7" stroke="#7b1b3a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 12, color: '#7b1b3a' }}>Calendar</div>
        </div>
      </div>

      {/* TYPE PICKER MODAL */}
      {showTypeModal && (
        <div role="dialog" aria-modal style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 320, background: '#f3f4f6', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: 16, fontWeight: 700, color: '#111827' }}>Select Event Type</div>
            {([
              { label: 'Meal', color: colorForType('Meal') },
              { label: 'Class', color: colorForType('Class') },
              { label: 'Other', color: colorForType('Other') },
            ] as const).map((opt) => (
              <button key={opt.label} onClick={() => chooseType(opt.label)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: 'transparent', cursor: 'pointer' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: opt.color }} />
                <span style={{ color: '#111827' }}>{opt.label}</span>
              </button>
            ))}
            <div style={{ textAlign: 'right', padding: '8px 16px 14px' }}>
              <button onClick={() => setShowTypeModal(false)} style={{ color: '#1976d2', fontWeight: 600 }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && (
        <div role="dialog" aria-modal style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', zIndex: 50, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 520, background: '#f9fafb', height: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', overflowY: 'auto', paddingBottom: 'var(--safe-area-inset-bottom)' }}>
            {/* Modal app bar */}
            <div style={{ position: 'sticky', top: 0, background: '#7b1b3a', color: '#fff', padding: '12px 14px', paddingTop: 'calc(var(--safe-area-inset-top) + 12px)', display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}>
              <div style={{ fontWeight: 700 }}>{editingEventId ? 'Edit Event' : 'Add Event'}</div>
              {editingEventId && (
                <button onClick={() => deleteEvent(editingEventId)} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600 }}>Delete</button>
              )}
              <button aria-label="Save" onClick={saveEvent} style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M20 6L9 17l-5-5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Form content */}
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ color: '#374151', fontSize: 12 }}>Title</div>
                <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Title" style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' }} />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ color: '#374151', fontSize: 12 }}>Description</div>
                <textarea value={draftDesc} onChange={e => setDraftDesc(e.target.value)} placeholder="Description" rows={3} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', resize: 'vertical' }} />
              </label>

              <div style={{ color: '#374151', fontSize: 12 }}>Date</div>
              <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' }}>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>

              <button onClick={setTimeToNow} style={{ color: '#0ea5e9', fontWeight: 700, alignSelf: 'start', marginTop: 4 }}>SET TIME TO NOW</button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div style={{ color: '#374151', fontSize: 12 }}>Start Time</div>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' }} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div style={{ color: '#374151', fontSize: 12 }}>End Time</div>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


