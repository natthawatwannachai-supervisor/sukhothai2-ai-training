import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Registration } from '../types';

export const PUBLIC_CALENDAR_ID =
  '7cd344bfeeb54abd258ba5f3dfaa2a6f12bfbbea92b3753745b9474b15f9a112@group.calendar.google.com';

export const PUBLIC_CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/embed?src=7cd344bfeeb54abd258ba5f3dfaa2a6f12bfbbea92b3753745b9474b15f9a112%40group.calendar.google.com&ctz=Asia%2FBangkok';

export const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const calendarProvider = new GoogleAuthProvider();
CALENDAR_SCOPES.forEach((scope) => calendarProvider.addScope(scope));

// In-memory cached OAuth access token (per workspace-integration skill guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

onAuthStateChanged(auth, (user) => {
  if (!user && !isSigningIn) {
    cachedAccessToken = null;
  }
});

export function getCachedCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD (Asia/Bangkok)
  timeRange: string; // e.g. "09:00 - 12:00 น." or "ตลอดทั้งวัน"
  location?: string;
  source: 'google_calendar' | 'registration';
}

export interface PublicCalendarResponse {
  calendarId: string;
  calendarName: string;
  calendarDesc: string;
  events: CalendarEventItem[];
  googleWriteConnected?: boolean;
  fetchedAt: string;
}

function parseIcalTextInBrowser(icsText: string): PublicCalendarResponse {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const calNameMatch = unfolded.match(/X-WR-CALNAME:([^\r\n]+)/);
  const calDescMatch = unfolded.match(/X-WR-CALDESC:([^\r\n]+)/);
  const unescape = (t: string) =>
    t
      .replace(/\\n/gi, ' ')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
      .trim();

  const calendarName = calNameMatch
    ? unescape(calNameMatch[1])
    : 'กลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา';
  const calendarDesc = calDescMatch
    ? unescape(calDescMatch[1])
    : 'ปฏิทินการดำเนินงานของกลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา สพป.สุโขทัย เขต 2';

  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events: CalendarEventItem[] = [];

  const fmtYMD = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const fmtHM = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const toBkk = (rawVal: string, isUtc: boolean) => {
    const clean = rawVal.replace(/Z$/i, '');
    const year = Number(clean.slice(0, 4));
    const month = Number(clean.slice(4, 6));
    const day = Number(clean.slice(6, 8));
    const hours = Number(clean.slice(9, 11) || 0);
    const minutes = Number(clean.slice(11, 13) || 0);
    const seconds = Number(clean.slice(13, 15) || 0);
    if (isUtc) {
      const bkk = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds) + 7 * 3600 * 1000);
      return {
        year: bkk.getUTCFullYear(),
        month: bkk.getUTCMonth() + 1,
        day: bkk.getUTCDate(),
        hours: bkk.getUTCHours(),
        minutes: bkk.getUTCMinutes(),
      };
    }
    return { year, month, day, hours, minutes };
  };

  for (const block of blocks) {
    const endIdx = block.indexOf('END:VEVENT');
    const content = endIdx !== -1 ? block.slice(0, endIdx) : block;
    const lines = content.split(/\r?\n/);

    let uid = '';
    let summary = '';
    let location = '';
    let status = 'CONFIRMED';
    let dtStartKey = '';
    let dtStartVal = '';
    let dtEndVal = '';

    for (const line of lines) {
      if (!line) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const propKey = line.slice(0, colonIdx).toUpperCase();
      const propVal = line.slice(colonIdx + 1).trim();

      if (propKey === 'UID') uid = propVal;
      else if (propKey.startsWith('SUMMARY')) summary = unescape(propVal);
      else if (propKey.startsWith('LOCATION')) location = unescape(propVal);
      else if (propKey === 'STATUS') status = propVal.toUpperCase();
      else if (propKey.startsWith('DTSTART')) {
        dtStartKey = propKey;
        dtStartVal = propVal;
      } else if (propKey.startsWith('DTEND')) {
        dtEndVal = propVal;
      }
    }

    if (status === 'CANCELLED' || !dtStartVal) continue;
    const title = summary || 'มีภารกิจ/กิจกรรมในปฏิทิน';
    const isAllDay = dtStartKey.includes('VALUE=DATE') || /^\d{8}$/.test(dtStartVal);

    if (isAllDay) {
      const sY = Number(dtStartVal.slice(0, 4));
      const sM = Number(dtStartVal.slice(4, 6));
      const sD = Number(dtStartVal.slice(6, 8));
      const cur = new Date(Date.UTC(sY, sM - 1, sD));
      let last = new Date(Date.UTC(sY, sM - 1, sD));

      if (dtEndVal && dtEndVal.length >= 8) {
        const eY = Number(dtEndVal.slice(0, 4));
        const eM = Number(dtEndVal.slice(4, 6));
        const eD = Number(dtEndVal.slice(6, 8));
        const endEx = new Date(Date.UTC(eY, eM - 1, eD));
        endEx.setUTCDate(endEx.getUTCDate() - 1);
        if (endEx >= cur) last = endEx;
      }

      while (cur <= last) {
        const dStr = fmtYMD(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate());
        events.push({
          id: `${uid || title}_${dStr}`,
          title,
          dateStr: dStr,
          timeRange: 'ตลอดทั้งวัน',
          location: location || undefined,
          source: 'google_calendar',
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      const isStartUtc = dtStartVal.endsWith('Z');
      const startBkk = toBkk(dtStartVal, isStartUtc);
      const isEndUtc = dtEndVal ? dtEndVal.endsWith('Z') : isStartUtc;
      const endBkk = dtEndVal ? toBkk(dtEndVal, isEndUtc) : startBkk;
      const sTime = fmtHM(startBkk.hours, startBkk.minutes);
      const eTime = dtEndVal ? fmtHM(endBkk.hours, endBkk.minutes) : '';
      const timeRange = eTime && eTime !== sTime ? `${sTime} - ${eTime} น.` : `${sTime} น.`;

      const cur = new Date(Date.UTC(startBkk.year, startBkk.month - 1, startBkk.day));
      const last = new Date(Date.UTC(endBkk.year, endBkk.month - 1, endBkk.day));
      while (cur <= last) {
        const dStr = fmtYMD(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate());
        events.push({
          id: `${uid || title}_${dStr}_${sTime}`,
          title,
          dateStr: dStr,
          timeRange,
          location: location || undefined,
          source: 'google_calendar',
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
  }

  return {
    calendarId: PUBLIC_CALENDAR_ID,
    calendarName,
    calendarDesc,
    events,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetches events directly from the specified public Google Calendar
 * (7cd344bfeeb54abd258ba5f3dfaa2a6f12bfbbea92b3753745b9474b15f9a112@group.calendar.google.com)
 * via the backend proxy endpoint, with automatic client-side fallback for static hosts (Vercel / GitHub Pages).
 */
export async function fetchPublicGoogleCalendar(
  force = false
): Promise<PublicCalendarResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `/api/calendar/events?t=${Date.now()}${force ? '&force=1' : ''}`,
      {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }

    throw new Error('Backend API not available, falling back to static iCal proxy');
  } catch {
    // Fallback for static hosting (GitHub Pages / Vercel static)
    const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(
      PUBLIC_CALENDAR_ID
    )}/public/basic.ics?nocache=${Date.now()}`;
    const proxyRes = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`,
      { cache: 'no-store' }
    );
    if (!proxyRes.ok) {
      throw new Error('Unable to load public Google Calendar feed');
    }
    const icsText = await proxyRes.text();
    return parseIcalTextInBrowser(icsText);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Connects Google Calendar OAuth token (must be called directly from a user click handler)
 * and registers it with the backend for real-time 2-way Google Calendar event creation.
 */
export async function connectGoogleCalendarOAuth(): Promise<string | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, calendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    if (token) {
      cachedAccessToken = token;
      fetch('/api/calendar/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token }),
      }).catch(() => {});
    }
    return token;
  } catch (err) {
    console.warn('Google Calendar OAuth popup closed or failed:', err);
    return null;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Registers the training booking in real-time on the server & Google Calendar.
 * Has a strict timeout so it can NEVER hang the UI.
 */
export async function registerOnCalendarRealtime(
  regData: Registration,
  explicitToken?: string | null
): Promise<{
  ok: boolean;
  error?: string;
  registration?: Registration;
  googleCalendarSynced?: boolean;
  calendarEventId?: string;
  calendarPayload?: PublicCalendarResponse;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const res = await fetch('/api/calendar/register', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...regData,
        accessToken: explicitToken || cachedAccessToken || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || 'ไม่สามารถบันทึกข้อมูลลงปฏิทินได้',
      };
    }

    return {
      ok: true,
      registration: data.registration,
      googleCalendarSynced: Boolean(data.googleCalendarSynced),
      calendarEventId: data.calendarEventId,
      calendarPayload: data.calendarPayload,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'การเชื่อมต่อเซิร์ฟเวอร์ขัดข้อง',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Syncs an already-saved registration directly into Google Calendar using a newly acquired OAuth token.
 */
export async function syncExistingRegistrationToGoogleCalendar(
  registration: Registration,
  accessToken: string
): Promise<{ ok: boolean; googleCalendarSynced: boolean; calendarEventId?: string }> {
  try {
    const res = await fetch('/api/calendar/sync-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: registration.id,
        registration,
        accessToken,
      }),
    });
    const data = await res.json();
    return {
      ok: Boolean(res.ok && data.ok),
      googleCalendarSynced: Boolean(data.googleCalendarSynced),
      calendarEventId: data.calendarEventId,
    };
  } catch {
    return { ok: false, googleCalendarSynced: false };
  }
}

/**
 * Builds a direct Google Calendar web template URL for adding/viewing the event
 */
export function buildGoogleCalendarTemplateUrl(reg: Registration): string {
  const dateCompact = (reg.trainingDate || '').replace(/-/g, '');
  const timeMatch = (reg.trainingTime || '').match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
  const startHM = timeMatch ? `${timeMatch[1]}${timeMatch[2]}00` : '090000';
  const endHM = timeMatch ? `${timeMatch[3]}${timeMatch[4]}00` : '160000';
  const dates = `${dateCompact}T${startHM}/${dateCompact}T${endHM}`;

  const title = `อบรม: ${reg.courseTitle || 'AI เพื่อการศึกษา'} (${reg.school})`;
  const details = [
    `ผู้ลงทะเบียน: ${reg.name}`,
    `โรงเรียน: ${reg.school} (อ.${reg.district})`,
    `เบอร์โทรศัพท์: ${reg.phone}`,
    `Line ID: ${reg.lineId || '-'}`,
    `หลักสูตร: ${reg.courseTitle}`,
    `เวลาอบรม: ${reg.trainingTime}`,
    reg.suggestions ? `ข้อเสนอแนะ: ${reg.suggestions}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const location = `${reg.school} อ.${reg.district} จ.สุโขทัย`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details,
    location,
    ctz: 'Asia/Bangkok',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Subscribes to real-time updates from the public Google Calendar via:
 * 1. Server-Sent Events (/api/calendar/stream) for instant server push when events change
 * 2. Automatic high-frequency background sync (every 3.5 seconds)
 * 3. Instant sync when browser tab/window regains focus or visibility
 */
export function subscribeToPublicGoogleCalendar(
  onData: (data: PublicCalendarResponse) => void,
  onConnectionChange?: (isLive: boolean) => void
): () => void {
  let isDisposed = false;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const pullLatest = async (force = false) => {
    if (isDisposed) return;
    try {
      const data = await fetchPublicGoogleCalendar(force);
      if (!isDisposed) {
        onData(data);
        onConnectionChange?.(true);
      }
    } catch {
      if (!isDisposed) {
        onConnectionChange?.(false);
      }
    }
  };

  const connectSSE = () => {
    if (isDisposed || typeof EventSource === 'undefined') return;
    try {
      eventSource = new EventSource(`/api/calendar/stream?t=${Date.now()}`);

      eventSource.onopen = () => {
        if (!isDisposed) {
          onConnectionChange?.(true);
        }
      };

      eventSource.onmessage = (event) => {
        if (isDisposed || !event.data) return;
        try {
          const parsed: PublicCalendarResponse = JSON.parse(event.data);
          onData(parsed);
          onConnectionChange?.(true);
        } catch {
          // Ignore malformed message
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isDisposed) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectSSE, 3000);
        }
      };
    } catch {
      // Fallback to polling if EventSource fails
    }
  };

  // Initial immediate fetch + SSE stream connection
  pullLatest(false);
  connectSSE();

  // Automatic silent background sync every 3.5 seconds
  const pollInterval = setInterval(() => pullLatest(false), 3500);

  // Instant sync whenever user switches back to this tab/window from Google Calendar
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible') {
      pullLatest(true);
    }
  };

  window.addEventListener('focus', () => pullLatest(true));
  window.addEventListener('online', () => pullLatest(true));
  document.addEventListener('visibilitychange', handleVisibilityOrFocus);

  return () => {
    isDisposed = true;
    clearInterval(pollInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
  };
}
