import express from 'express';
import https from 'https';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Force IPv4 first to prevent 7-8s IPv6 timeouts on Google domains in container environments
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const PUBLIC_CALENDAR_ID =
  '7cd344bfeeb54abd258ba5f3dfaa2a6f12bfbbea92b3753745b9474b15f9a112@group.calendar.google.com';
const PUBLIC_ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(
  PUBLIC_CALENDAR_ID
)}/public/basic.ics`;

const DATA_DIR = path.join(__dirname, 'data');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');
const TOKEN_FILE = path.join(DATA_DIR, 'google-token.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface StoredRegistration {
  id: string;
  name: string;
  school: string;
  district: string;
  phone: string;
  lineId: string;
  trainingDate: string;
  trainingTime: string;
  courseId: string;
  courseTitle: string;
  suggestions?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  calendarEventId?: string;
  googleCalendarSynced?: boolean;
  createdAt: string;
}

interface ParsedCalendarEvent {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD in Asia/Bangkok
  timeRange: string;
  location?: string;
  source: 'google_calendar' | 'registration';
}

interface CalendarPayload {
  calendarId: string;
  calendarName: string;
  calendarDesc: string;
  events: ParsedCalendarEvent[];
  googleWriteConnected: boolean;
  fetchedAt: string;
}

const DEFAULT_CALENDAR_NAME = 'กลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา';
const DEFAULT_CALENDAR_DESC =
  'ปฏิทินการดำเนินงานของกลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา สพป.สุโขทัย เขต 2';

function loadStoredRegistrations(): StoredRegistration[] {
  try {
    if (fs.existsSync(REGISTRATIONS_FILE)) {
      const raw = fs.readFileSync(REGISTRATIONS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore read error
  }
  return [];
}

function saveStoredRegistrations(list: StoredRegistration[]) {
  try {
    fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch {
    // Ignore write error
  }
}

function loadCachedGoogleToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const raw = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (raw?.accessToken && typeof raw.accessToken === 'string') {
        return raw.accessToken;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

function saveCachedGoogleToken(accessToken: string | null) {
  try {
    if (!accessToken) {
      if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
      return;
    }
    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ accessToken, savedAt: new Date().toISOString() }, null, 2),
      'utf8'
    );
  } catch {
    // Ignore
  }
}

let serverRegistrations: StoredRegistration[] = loadStoredRegistrations();
let cachedGoogleAccessToken: string | null = loadCachedGoogleToken();

function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseIcalDateTimeToBangkok(
  rawVal: string,
  isUtc: boolean
): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const clean = rawVal.replace(/Z$/i, '');
  const year = Number(clean.slice(0, 4));
  const month = Number(clean.slice(4, 6));
  const day = Number(clean.slice(6, 8));
  const hours = Number(clean.slice(9, 11) || 0);
  const minutes = Number(clean.slice(11, 13) || 0);
  const seconds = Number(clean.slice(13, 15) || 0);

  if (isUtc) {
    const utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);
    const bkkDate = new Date(utcMs + 7 * 3600 * 1000);
    return {
      year: bkkDate.getUTCFullYear(),
      month: bkkDate.getUTCMonth() + 1,
      day: bkkDate.getUTCDate(),
      hours: bkkDate.getUTCHours(),
      minutes: bkkDate.getUTCMinutes(),
    };
  }

  return { year, month, day, hours, minutes };
}

function formatYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatHM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parsePublicIcal(icsText: string): {
  calendarName: string;
  calendarDesc: string;
  events: ParsedCalendarEvent[];
} {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const calNameMatch = unfolded.match(/X-WR-CALNAME:([^\r\n]+)/);
  const calDescMatch = unfolded.match(/X-WR-CALDESC:([^\r\n]+)/);
  const calendarName = calNameMatch
    ? unescapeIcalText(calNameMatch[1])
    : DEFAULT_CALENDAR_NAME;
  const calendarDesc = calDescMatch
    ? unescapeIcalText(calDescMatch[1])
    : DEFAULT_CALENDAR_DESC;

  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events: ParsedCalendarEvent[] = [];

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
      else if (propKey.startsWith('SUMMARY')) summary = unescapeIcalText(propVal);
      else if (propKey.startsWith('LOCATION')) location = unescapeIcalText(propVal);
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
        const endExclusive = new Date(Date.UTC(eY, eM - 1, eD));
        endExclusive.setUTCDate(endExclusive.getUTCDate() - 1);
        if (endExclusive >= cur) {
          last = endExclusive;
        }
      }

      while (cur <= last) {
        const dStr = formatYMD(
          cur.getUTCFullYear(),
          cur.getUTCMonth() + 1,
          cur.getUTCDate()
        );
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
      const startBkk = parseIcalDateTimeToBangkok(dtStartVal, isStartUtc);

      const isEndUtc = dtEndVal ? dtEndVal.endsWith('Z') : isStartUtc;
      const endBkk = dtEndVal
        ? parseIcalDateTimeToBangkok(dtEndVal, isEndUtc)
        : startBkk;

      const startTimeStr = formatHM(startBkk.hours, startBkk.minutes);
      const endTimeStr = dtEndVal ? formatHM(endBkk.hours, endBkk.minutes) : '';
      const timeRange =
        endTimeStr && endTimeStr !== startTimeStr
          ? `${startTimeStr} - ${endTimeStr} น.`
          : `${startTimeStr} น.`;

      const cur = new Date(Date.UTC(startBkk.year, startBkk.month - 1, startBkk.day));
      const last = new Date(Date.UTC(endBkk.year, endBkk.month - 1, endBkk.day));

      while (cur <= last) {
        const dStr = formatYMD(
          cur.getUTCFullYear(),
          cur.getUTCMonth() + 1,
          cur.getUTCDate()
        );
        events.push({
          id: `${uid || title}_${dStr}_${startTimeStr}`,
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

  return { calendarName, calendarDesc, events };
}

/**
 * Reliable IPv4 HTTPS fetcher using Node's native `https` module with fresh connections
 */
function fetchTextViaHttps(urlStr: string, timeoutMs = 6000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      urlStr,
      {
        family: 4, // Force IPv4 so Google Calendar responds in ~180ms without IPv6 hang
        agent: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SukhothaiAI2CalendarSync/3.0)',
          Accept: 'text/calendar,text/plain,*/*',
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          Pragma: 'no-cache',
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          fetchTextViaHttps(res.headers.location, timeoutMs).then(resolve, reject);
          return;
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP status ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
        res.on('error', reject);
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', reject);
  });
}

/**
 * Helper to POST JSON over IPv4 HTTPS to Google Calendar API v3
 */
function postGoogleCalendarEventViaHttps(
  calendarId: string,
  accessToken: string,
  eventBody: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: any }> {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(eventBody);
    const encodedCalId = encodeURIComponent(calendarId);
    const req = https.request(
      `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events`,
      {
        method: 'POST',
        family: 4,
        agent: false,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 6000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed: any = {};
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = { raw: text };
          }
          resolve({
            ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
            status: res.statusCode || 500,
            data: parsed,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 408, data: { error: 'timeout' } });
    });
    req.on('error', (err) => {
      resolve({ ok: false, status: 500, data: { error: String(err) } });
    });
    req.write(bodyStr);
    req.end();
  });
}

function parseTimeRangeToStartEnd(trainingTime: string): { start: string; end: string } {
  const match = trainingTime.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (match) {
    return { start: match[1], end: match[2] };
  }
  return { start: '09:00', end: '16:00' };
}

async function createEventInGoogleCalendar(
  reg: StoredRegistration,
  explicitToken?: string
): Promise<{ synced: boolean; eventId?: string; htmlLink?: string }> {
  const token = explicitToken || cachedGoogleAccessToken;
  if (!token) {
    return { synced: false };
  }

  const { start, end } = parseTimeRangeToStartEnd(reg.trainingTime || '09:00 - 16:00 น.');
  const eventBody = {
    summary: `อบรม: ${reg.courseTitle || 'AI เพื่อการศึกษา'} (${reg.school})`,
    location: `${reg.school} อ.${reg.district} จ.สุโขทัย`,
    description: [
      `ผู้ลงทะเบียน: ${reg.name}`,
      `โรงเรียน: ${reg.school} (อ.${reg.district})`,
      `เบอร์โทรศัพท์: ${reg.phone}`,
      `Line ID: ${reg.lineId || '-'}`,
      `หลักสูตร: ${reg.courseTitle}`,
      `ช่วงเวลาอบรม: ${reg.trainingTime}`,
      reg.suggestions ? `ข้อเสนอแนะ: ${reg.suggestions}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    start: {
      dateTime: `${reg.trainingDate}T${start}:00+07:00`,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: `${reg.trainingDate}T${end}:00+07:00`,
      timeZone: 'Asia/Bangkok',
    },
  };

  // 1. Try inserting into the target public group calendar first
  const groupRes = await postGoogleCalendarEventViaHttps(PUBLIC_CALENDAR_ID, token, eventBody);
  if (groupRes.ok && groupRes.data?.id) {
    return {
      synced: true,
      eventId: groupRes.data.id,
      htmlLink: groupRes.data.htmlLink,
    };
  }

  // If token expired (401), clear cached token
  if (groupRes.status === 401 && !explicitToken) {
    cachedGoogleAccessToken = null;
    saveCachedGoogleToken(null);
    return { synced: false };
  }

  // 2. Fallback to the authenticated user's primary calendar if they don't own the group calendar
  const primaryRes = await postGoogleCalendarEventViaHttps('primary', token, eventBody);
  if (primaryRes.ok && primaryRes.data?.id) {
    return {
      synced: true,
      eventId: primaryRes.data.id,
      htmlLink: primaryRes.data.htmlLink,
    };
  }

  return { synced: false };
}

// Real-Time In-Memory State & SSE Subscribers
let latestGoogleEvents: ParsedCalendarEvent[] = [];
let latestCalendarName = DEFAULT_CALENDAR_NAME;
let latestCalendarDesc = DEFAULT_CALENDAR_DESC;
let latestCalendarSignature = '';
let lastFetchTimestampMs = 0;
let activeFetchPromise: Promise<CalendarPayload> | null = null;
const sseClients = new Set<express.Response>();

function buildCombinedEvents(): ParsedCalendarEvent[] {
  const combined: ParsedCalendarEvent[] = [...latestGoogleEvents];

  for (const reg of serverRegistrations) {
    if (!reg.trainingDate || reg.status === 'cancelled') continue;
    const titleLabel = `อบรม: ${reg.courseTitle || 'AI เพื่อการศึกษา'} (${reg.school || reg.name})`;
    const alreadyInGoogle = combined.some(
      (ev) =>
        ev.dateStr === reg.trainingDate &&
        (ev.id === reg.calendarEventId ||
          ev.title.includes(reg.school) ||
          ev.title === titleLabel)
    );
    if (!alreadyInGoogle) {
      combined.push({
        id: `reg_${reg.id}`,
        title: titleLabel,
        dateStr: reg.trainingDate,
        timeRange: reg.trainingTime || '09:00 - 16:00 น.',
        location: reg.school ? `${reg.school} (อ.${reg.district})` : undefined,
        source: 'registration',
      });
    }
  }

  return combined;
}

function buildCurrentPayload(): CalendarPayload {
  return {
    calendarId: PUBLIC_CALENDAR_ID,
    calendarName: latestCalendarName,
    calendarDesc: latestCalendarDesc,
    events: buildCombinedEvents(),
    googleWriteConnected: Boolean(cachedGoogleAccessToken),
    fetchedAt: new Date().toISOString(),
  };
}

function computeSignature(events: ParsedCalendarEvent[], calName: string): string {
  return (
    calName +
    '|' +
    Boolean(cachedGoogleAccessToken) +
    '|' +
    events
      .map((e) => `${e.id}:${e.dateStr}:${e.title}:${e.timeRange}:${e.location || ''}`)
      .sort()
      .join('||')
  );
}

function broadcastCalendarUpdate(payload: CalendarPayload) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function syncFromGoogleCalendar(force = false): Promise<CalendarPayload> {
  const now = Date.now();
  if (!force && latestGoogleEvents.length > 0 && now - lastFetchTimestampMs < 2000) {
    return buildCurrentPayload();
  }

  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const cacheBustedUrl = `${PUBLIC_ICAL_URL}?nocache=${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      const icsText = await fetchTextViaHttps(cacheBustedUrl, 6000);
      const parsed = parsePublicIcal(icsText);

      latestGoogleEvents = parsed.events;
      latestCalendarName = parsed.calendarName;
      latestCalendarDesc = parsed.calendarDesc;
      lastFetchTimestampMs = Date.now();

      const payload = buildCurrentPayload();
      const newSig = computeSignature(payload.events, payload.calendarName);
      const hasChanged = newSig !== latestCalendarSignature;
      latestCalendarSignature = newSig;

      if (hasChanged && sseClients.size > 0) {
        broadcastCalendarUpdate(payload);
      }

      return payload;
    } catch {
      return buildCurrentPayload();
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

// Background sync every 4 seconds when SSE clients are listening
setInterval(() => {
  if (sseClients.size > 0) {
    syncFromGoogleCalendar(true);
  }
}, 4000);

// Initial warm-up fetch on server start
syncFromGoogleCalendar(true);

// Real-Time Server-Sent Events (SSE) stream for instant calendar updates
app.get('/api/calendar/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sseClients.add(res);

  // Immediately push current known state
  res.write(`data: ${JSON.stringify(buildCurrentPayload())}\n\n`);

  syncFromGoogleCalendar(true).then((payload) => {
    if (sseClients.has(res)) {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        sseClients.delete(res);
      }
    }
  });

  const heartbeat = setInterval(() => {
    if (sseClients.has(res)) {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Public Google Calendar JSON endpoint (always fresh, no cache)
app.get('/api/calendar/events', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const force = req.query.force === '1' || req.query.force === 'true';
  const payload = await syncFromGoogleCalendar(force);
  res.json(payload);
});

// Save Google OAuth Access Token for automatic real-time Google Calendar writes
app.post('/api/calendar/token', (req, res) => {
  const { accessToken } = req.body || {};
  if (!accessToken || typeof accessToken !== 'string') {
    res.status(400).json({ error: 'Missing accessToken' });
    return;
  }
  cachedGoogleAccessToken = accessToken;
  saveCachedGoogleToken(accessToken);
  broadcastCalendarUpdate(buildCurrentPayload());
  res.json({ ok: true, googleWriteConnected: true });
});

// Real-time Registration + Instant Calendar Lock + Google Calendar Sync
app.post('/api/calendar/register', async (req, res) => {
  try {
    const body = req.body || {};
    const trainingDate = String(body.trainingDate || '').trim();
    const name = String(body.name || '').trim();
    const school = String(body.school || '').trim();

    if (!trainingDate || !name || !school) {
      res.status(400).json({ error: 'กรุณากรอกข้อมูลวันที่ ชื่อ และโรงเรียนให้ครบถ้วน' });
      return;
    }

    // Check current combined events to ensure the date is still free
    const currentEvents = buildCombinedEvents();
    const existingOnDate = currentEvents.filter((e) => e.dateStr === trainingDate);
    if (existingOnDate.length > 0) {
      res.status(409).json({
        error: `วันที่ ${trainingDate} มีกิจกรรมหรืองานในปฏิทินแล้ว ไม่สามารถลงทะเบียนซ้ำได้`,
        eventsOnDate: existingOnDate,
      });
      return;
    }

    const newReg: StoredRegistration = {
      id: body.id || `reg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      school,
      district: String(body.district || '').trim(),
      phone: String(body.phone || '').trim(),
      lineId: String(body.lineId || '-').trim(),
      trainingDate,
      trainingTime: String(body.trainingTime || '09:00 - 16:00 น. (อบรมเต็มวัน)').trim(),
      courseId: String(body.courseId || 'general-course').trim(),
      courseTitle: String(
        body.courseTitle || 'หลักสูตรการอบรมเทคโนโลยีและ AI เพื่อการศึกษา'
      ).trim(),
      suggestions: String(body.suggestions || '').trim(),
      status: 'confirmed',
      createdAt: body.createdAt || new Date().toISOString(),
    };

    if (body.accessToken && typeof body.accessToken === 'string') {
      cachedGoogleAccessToken = body.accessToken;
      saveCachedGoogleToken(body.accessToken);
    }

    // Try writing directly to Google Calendar if we have an OAuth token
    const gcalResult = await createEventInGoogleCalendar(newReg, body.accessToken);
    if (gcalResult.synced) {
      newReg.googleCalendarSynced = true;
      newReg.calendarEventId = gcalResult.eventId;
    }

    serverRegistrations.push(newReg);
    saveStoredRegistrations(serverRegistrations);

    // Immediately broadcast updated calendar to all connected clients in real-time
    const updatedPayload = buildCurrentPayload();
    latestCalendarSignature = computeSignature(
      updatedPayload.events,
      updatedPayload.calendarName
    );
    broadcastCalendarUpdate(updatedPayload);

    // Trigger a fresh Google Calendar iCal pull in the background
    if (gcalResult.synced) {
      setTimeout(() => {
        syncFromGoogleCalendar(true);
      }, 1000);
    }

    res.json({
      ok: true,
      registration: newReg,
      googleCalendarSynced: Boolean(gcalResult.synced),
      calendarEventId: gcalResult.eventId,
      calendarPayload: updatedPayload,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Endpoint to sync an existing registration to Google Calendar with a fresh OAuth token
app.post('/api/calendar/sync-event', async (req, res) => {
  try {
    const { registrationId, registration, accessToken } = req.body || {};
    if (accessToken && typeof accessToken === 'string') {
      cachedGoogleAccessToken = accessToken;
      saveCachedGoogleToken(accessToken);
    }

    let target = serverRegistrations.find((r) => r.id === registrationId);
    if (!target && registration) {
      target = registration as StoredRegistration;
    }

    if (!target) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    const gcalResult = await createEventInGoogleCalendar(target, accessToken);
    if (gcalResult.synced) {
      target.googleCalendarSynced = true;
      target.calendarEventId = gcalResult.eventId;
      saveStoredRegistrations(serverRegistrations);
      setTimeout(() => syncFromGoogleCalendar(true), 1000);
    }

    const updatedPayload = buildCurrentPayload();
    broadcastCalendarUpdate(updatedPayload);

    res.json({
      ok: true,
      googleCalendarSynced: gcalResult.synced,
      calendarEventId: gcalResult.eventId,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// CRUD endpoints for server-stored registrations (synced with Admin Dashboard)
app.get('/api/registrations', (_req, res) => {
  res.json({ registrations: serverRegistrations });
});

app.put('/api/registrations/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  let found = false;
  serverRegistrations = serverRegistrations.map((r) => {
    if (r.id === id) {
      found = true;
      return { ...r, ...updates };
    }
    return r;
  });
  if (found) {
    saveStoredRegistrations(serverRegistrations);
    broadcastCalendarUpdate(buildCurrentPayload());
  }
  res.json({ ok: true, found });
});

app.delete('/api/registrations/:id', (req, res) => {
  const { id } = req.params;
  const before = serverRegistrations.length;
  serverRegistrations = serverRegistrations.filter((r) => r.id !== id);
  if (serverRegistrations.length !== before) {
    saveStoredRegistrations(serverRegistrations);
    broadcastCalendarUpdate(buildCurrentPayload());
  }
  res.json({ ok: true });
});

// ============================================================================
// REAL-TIME EMAIL NOTIFICATION SYSTEM FOR NEW REGISTRATIONS
// Recipients:
// 1. natthawat.wannachai@gmail.com
// 2. krujaddee2521@gmail.com
// 3. khuntangmokfc@gmail.com
// ============================================================================
const ADMIN_NOTIFICATION_EMAILS = [
  'natthawat.wannachai@gmail.com',
  'krujaddee2521@gmail.com',
  'khuntangmokfc@gmail.com',
];

const EMAIL_CONFIG_FILE = path.join(DATA_DIR, 'email-config.json');

interface ServerEmailConfig {
  smtpUser?: string;
  smtpPass?: string;
  webhookUrl?: string;
}

function loadServerEmailConfig(): ServerEmailConfig {
  try {
    if (fs.existsSync(EMAIL_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(EMAIL_CONFIG_FILE, 'utf8'));
    }
  } catch {
    // Ignore
  }
  return {};
}

function saveServerEmailConfig(cfg: ServerEmailConfig) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EMAIL_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch {
    // Ignore
  }
}

function buildRegistrationEmailText(params: {
  name: string;
  school: string;
  trainingDate: string;
  courseTitle: string;
}): string {
  return `มีผู้ลงทะเบียนเข้ารับการอบรมในระบบเพิ่มเติม ดังนี้ครับ/ค่ะ\n\n👤 ชื่อ-สกุล: ${params.name}\n🏫 โรงเรียน: ${params.school}\n📅 วันที่ต้องการอบรม: ${params.trainingDate}\n📚 หลักสูตร: ${params.courseTitle}\n\n📌 สามารถตรวจสอบข้อมูลและรายละเอียดเพิ่มเติมได้ที่ระบบ Admin Dashboard ครับ/ค่ะ`;
}

function buildRegistrationEmailHtml(params: {
  name: string;
  school: string;
  trainingDate: string;
  courseTitle: string;
}): string {
  return `
    <div style="font-family: 'Prompt', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border-radius: 16px; border: 2px solid #fed7aa; background-color: #fffaf5; color: #1e293b; line-height: 1.7;">
      <h2 style="margin-top: 0; color: #ea580c; font-size: 20px;">📢 แจ้งเตือนการลงทะเบียนใหม่!</h2>
      <p style="font-size: 15px; margin-bottom: 16px;">มีผู้ลงทะเบียนเข้ารับการอบรมในระบบเพิ่มเติม ดังนี้ครับ/ค่ะ</p>
      <div style="background: #ffffff; padding: 16px 20px; border-radius: 12px; border: 1px solid #ffedd5; margin-bottom: 16px; font-size: 15px;">
        <p style="margin: 6px 0;">👤 <strong>ชื่อ-สกุล:</strong> ${params.name}</p>
        <p style="margin: 6px 0;">🏫 <strong>โรงเรียน:</strong> ${params.school}</p>
        <p style="margin: 6px 0;">📅 <strong>วันที่ต้องการอบรม:</strong> ${params.trainingDate}</p>
        <p style="margin: 6px 0;">📚 <strong>หลักสูตร:</strong> ${params.courseTitle}</p>
      </div>
      <p style="font-size: 14px; color: #475569; margin-bottom: 0;">📌 สามารถตรวจสอบข้อมูลและรายละเอียดเพิ่มเติมได้ที่ระบบ Admin Dashboard ครับ/ค่ะ</p>
    </div>
  `;
}

function postFormSubmitEmail(
  recipient: string,
  subject: string,
  bodyText: string,
  params: { name: string; school: string; trainingDate: string; courseTitle: string },
  ccList?: string[]
): Promise<boolean> {
  return new Promise((resolve) => {
    const appOrigin =
      process.env.APP_URL ||
      'https://ais-dev-f5yhckl5lgusntb2m2nduq-715650121027.asia-east1.run.app';
    const payload = JSON.stringify({
      _subject: subject,
      _template: 'box',
      _captcha: 'false',
      ...(ccList && ccList.length > 0 ? { _cc: ccList.join(',') } : {}),
      ข้อความแจ้งเตือน: bodyText,
      '👤 ชื่อ-สกุล': params.name,
      '🏫 โรงเรียน': params.school,
      '📅 วันที่ต้องการอบรม': params.trainingDate,
      '📚 หลักสูตร': params.courseTitle,
    });

    const req = https.request(
      `https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`,
      {
        method: 'POST',
        agent: false,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: appOrigin,
          Referer: `${appOrigin}/`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 6000,
      },
      (res) => {
        res.resume();
        resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

app.get('/api/email-config', (_req, res) => {
  const saved = loadServerEmailConfig();
  res.json({
    recipients: ADMIN_NOTIFICATION_EMAILS,
    smtpUser: saved.smtpUser || process.env.SMTP_USER || '',
    hasSmtpPass: Boolean(saved.smtpPass || process.env.SMTP_PASS),
    webhookUrl: saved.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || '',
  });
});

app.post('/api/email-config', (req, res) => {
  const { smtpUser, smtpPass, webhookUrl } = req.body || {};
  const current = loadServerEmailConfig();
  const updated: ServerEmailConfig = {
    smtpUser: smtpUser !== undefined ? String(smtpUser).trim() : current.smtpUser,
    smtpPass: smtpPass ? String(smtpPass).trim() : current.smtpPass,
    webhookUrl: webhookUrl !== undefined ? String(webhookUrl).trim() : current.webhookUrl,
  };
  saveServerEmailConfig(updated);
  res.json({ ok: true });
});

app.post('/api/notify-registration', async (req, res) => {
  try {
    const reqBody = req.body || {};
    const name = String(reqBody.name || '-').trim();
    const school = String(reqBody.school || '-').trim();
    const trainingDate = String(reqBody.trainingDate || '-').trim();
    const courseTitle = String(
      reqBody.courseTitle || 'หลักสูตรการอบรมเชิงปฏิบัติการ AI เพื่อการศึกษา'
    ).trim();

    const subject = '📢 แจ้งเตือนการลงทะเบียนใหม่!';
    const textBody = buildRegistrationEmailText({ name, school, trainingDate, courseTitle });
    const htmlBody = buildRegistrationEmailHtml({ name, school, trainingDate, courseTitle });

    const savedCfg = loadServerEmailConfig();
    const smtpUser = reqBody.smtpUser || savedCfg.smtpUser || process.env.SMTP_USER;
    const smtpPass = reqBody.smtpPass || savedCfg.smtpPass || process.env.SMTP_PASS;
    const webhookUrl =
      reqBody.webhookUrl || savedCfg.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL;

    if (reqBody.smtpUser || reqBody.smtpPass || reqBody.webhookUrl) {
      saveServerEmailConfig({
        smtpUser: reqBody.smtpUser || savedCfg.smtpUser,
        smtpPass: reqBody.smtpPass || savedCfg.smtpPass,
        webhookUrl: reqBody.webhookUrl || savedCfg.webhookUrl,
      });
    }

    const dispatchedChannels: string[] = [];

    // 1. Direct Gmail SMTP via Nodemailer (if credentials provided)
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass.replace(/\s+/g, ''),
          },
        });

        await transporter.sendMail({
          from: `"ระบบแจ้งเตือนการอบรม สพป.สุโขทัย เขต 2" <${smtpUser}>`,
          to: ADMIN_NOTIFICATION_EMAILS.join(', '),
          subject,
          text: textBody,
          html: htmlBody,
        });
        dispatchedChannels.push('gmail_smtp');
      } catch (smtpErr) {
        console.warn('SMTP send warning:', smtpErr);
      }
    }

    // 2. Google Apps Script Webhook (if configured)
    if (webhookUrl && webhookUrl.startsWith('https://')) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ADMIN_NOTIFICATION_EMAILS.join(','),
            recipients: ADMIN_NOTIFICATION_EMAILS,
            subject,
            body: textBody,
            htmlBody,
            name,
            school,
            trainingDate,
            courseTitle,
          }),
        });
        dispatchedChannels.push('apps_script_webhook');
      } catch {
        // Ignore webhook error
      }
    }

    // 3. FormSubmit AJAX Relay to all 3 admin email addresses
    const relayResults = await Promise.allSettled(
      ADMIN_NOTIFICATION_EMAILS.map((email, idx) =>
        postFormSubmitEmail(
          email,
          subject,
          textBody,
          { name, school, trainingDate, courseTitle },
          idx === 0 ? ADMIN_NOTIFICATION_EMAILS.slice(1) : undefined
        )
      )
    );
    if (relayResults.some((r) => r.status === 'fulfilled' && r.value)) {
      dispatchedChannels.push('formsubmit_relay');
    }

    res.json({
      ok: true,
      subject,
      body: textBody,
      recipients: ADMIN_NOTIFICATION_EMAILS,
      dispatchedChannels,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
