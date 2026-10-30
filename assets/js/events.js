// Events calendar: upcoming list, month grid, past events, .ics + Google Calendar links.
import { loadJSON, h, link, pageHead, emptyState, fmtDate, parseDate, todayISO, icon, md, url, img } from './core.js';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const compact = (dateStr, time) => dateStr.replace(/-/g, '') + (time ? `T${time.replace(':', '')}00` : '');
function addDays(dateStr, n) { const d = parseDate(dateStr); d.setDate(d.getDate() + n); return iso(d); }
function endOf(e) {
  if (e.endTime) return { date: e.endDate || e.date, time: e.endTime };
  const [hh, mm] = e.startTime.split(':').map(Number);
  const d = parseDate(e.date); d.setHours(hh + 2, mm);
  return { date: iso(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
const STATUS = { cancelled: 'Cancelled', canceled: 'Cancelled', 'sold-out': 'Sold out', soldout: 'Sold out' };
const statusOf = (e) => STATUS[String(e.status || '').toLowerCase()] || '';
const where = (e) => [e.venue, e.city, e.country].filter(Boolean).join(', ');

export function isPast(e, today = todayISO()) { return (e.endDate || e.date) < today; }
export function upcomingEvents(data) {
  const today = todayISO();
  return (data.items || []).filter((e) => parseDate(e.date) && !isPast(e, today))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));
}

function icsText(e, siteUrl) {
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nihiramusic//events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${e.id || compact(e.date)}@nihiramusic`, `DTSTAMP:${stamp}`];
  if (e.startTime) {
    const tz = e.timezone ? `;TZID=${e.timezone}` : '';
    const end = endOf(e);
    L.push(`DTSTART${tz}:${compact(e.date, e.startTime)}`, `DTEND${tz}:${compact(end.date, end.time)}`);
  } else {
    L.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(addDays(e.endDate || e.date, 1))}`);
  }
  L.push(`SUMMARY:${esc(e.title)}`);
  const loc = [e.venue, e.address, e.city, e.country].filter(Boolean).join(', ');
  if (loc) L.push(`LOCATION:${esc(loc)}`);
  if (e.description) L.push(`DESCRIPTION:${esc(e.description)}`);
  const u = e.ticketUrl || (siteUrl ? `${siteUrl}events/#${e.id}` : '');
  if (u) L.push(`URL:${u}`);
  if (statusOf(e) === 'Cancelled') L.push('STATUS:CANCELLED');
  L.push('END:VEVENT', 'END:VCALENDAR');
  // Fold long lines (RFC 5545: 75 octets; approximated by characters).
  return L.map((line) => line.length <= 74 ? line : line.match(/.{1,73}/g).join('\r\n ')).join('\r\n') + '\r\n';
}

function googleUrl(e) {
  let dates;
  if (e.startTime) { const end = endOf(e); dates = `${compact(e.date, e.startTime)}/${compact(end.date, end.time)}`; }
  else dates = `${compact(e.date)}/${compact(addDays(e.endDate || e.date, 1))}`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.title || '', dates, details: e.description || '', location: [e.venue, e.address, e.city, e.country].filter(Boolean).join(', ') });
  if (e.startTime && e.timezone) p.set('ctz', e.timezone);
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function eventCard(e, { site, past = false, headingLevel = 3 } = {}) {
  const d = parseDate(e.date);
  const st = statusOf(e);
  const cancelled = st === 'Cancelled';
  const dl = h('button', { type: 'button', class: 'linkish' }, icon('calendar'), 'Download .ics');
  dl.addEventListener('click', () => {
    const blob = new Blob([icsText(e, site && site.siteUrl)], { type: 'text/calendar;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${e.id || 'event'}.ics` });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  const time = e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ''}${e.timezone ? ` (${e.timezone.split('/').pop().replace(/_/g, ' ')} time)` : ''}` : '';
  return h('article', { class: `event${cancelled ? ' event--cancelled' : ''}${past ? ' event--past' : ''}`, id: e.id || null },
    h('p', { class: 'event__date', 'aria-hidden': 'true' },
      h('span', { class: 'event__day', text: d.getDate() }),
      h('span', { class: 'event__month', text: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) })),
    h('div', { class: 'event__body' },
      h(`h${headingLevel}`, { class: 'event__title', text: e.title }),
      st ? h('p', { class: `badge badge--${cancelled ? 'cancelled' : 'soldout'}`, text: st }) : null,
      h('p', { class: 'event__when' }, h('time', { datetime: e.date }, fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
        e.endDate ? ` to ${fmtDate(e.endDate)}` : '', time ? `, ${time}` : ''),
      where(e) ? h('p', { class: 'event__where', text: where(e) }) : null,
      e.image ? img(e.image, { alt: e.imageAlt || '', cls: 'event__img', sizes: '(min-width: 48rem) 60vw, 100vw' }) : null,
      e.description ? h('div', { class: 'prose' }, md(e.description)) : null,
      !past ? h('p', { class: 'event__actions' },
        e.ticketUrl && !cancelled && st !== 'Sold out' ? link(e.ticketUrl, 'Tickets', { class: 'btn btn--small' }) : null,
        !cancelled ? dl : null,
        !cancelled ? link(googleUrl(e), 'Add to Google Calendar') : null) : null));
}

function calendar(events, site, startMonth) {
  const byDay = new Map();
  for (const e of events) {
    let d = e.date;
    const last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
    for (let n = 0; d <= last && n < 31; n++, d = addDays(d, 1)) { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(e); }
  }
  let cur = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
  const caption = h('h2', { class: 'cal__month', 'aria-live': 'polite' });
  const prev = h('button', { type: 'button', class: 'cal__nav', 'aria-label': 'Previous month' }, '‹');
  const next = h('button', { type: 'button', class: 'cal__nav', 'aria-label': 'Next month' }, '›');
  const table = h('table', { class: 'cal__grid' });
  const detail = h('div', { class: 'cal__detail', 'aria-live': 'polite' });
  const today = todayISO();
  const dayNames = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i)); // 1 Jan 2024 = Monday

  function draw() {
    caption.textContent = cur.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    table.replaceChildren(
      h('caption', { class: 'visually-hidden', text: `Events in ${caption.textContent}` }),
      h('thead', {}, h('tr', {}, dayNames.map((d) => h('th', { scope: 'col' },
        h('abbr', { title: d.toLocaleDateString('en-GB', { weekday: 'long' }) }, d.toLocaleDateString('en-GB', { weekday: 'short' })))))));
    const body = h('tbody');
    const first = new Date(cur);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    let row = h('tr');
    for (let i = 0; i < offset; i++) row.append(h('td', { class: 'cal__empty' }));
    for (let day = 1; day <= days; day++) {
      const key = iso(new Date(cur.getFullYear(), cur.getMonth(), day));
      const evs = byDay.get(key) || [];
      const cell = h('td', { class: `${key === today ? 'is-today' : ''}${evs.length ? ' has-events' : ''}`.trim() || null });
      if (evs.length) {
        const b = h('button', { type: 'button', class: 'cal__day', 'aria-label': `${fmtDate(key)}, ${evs.length} ${evs.length === 1 ? 'event' : 'events'}` },
          h('span', { text: day }), h('span', { class: 'cal__dot', 'aria-hidden': 'true' }));
        b.addEventListener('click', () => {
          table.querySelectorAll('.cal__day[aria-pressed]').forEach((x) => x.removeAttribute('aria-pressed'));
          b.setAttribute('aria-pressed', 'true');
          detail.replaceChildren(h('h3', { class: 'cal__detail-title', text: fmtDate(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }),
            ...evs.map((e) => eventCard(e, { site, past: isPast(e), headingLevel: 4 })));
        });
        cell.append(b);
      } else {
        cell.append(h('span', { class: 'cal__num', text: day }));
      }
      if (key === today) cell.append(h('span', { class: 'visually-hidden', text: ' (today)' }));
      row.append(cell);
      if ((offset + day) % 7 === 0) { body.append(row); row = h('tr'); }
    }
    if (row.childNodes.length) { while (row.childNodes.length < 7) row.append(h('td', { class: 'cal__empty' })); body.append(row); }
    table.append(body);
    detail.replaceChildren(h('p', { class: 'muted', text: [...byDay.keys()].some((k) => k.startsWith(iso(cur).slice(0, 7))) ? 'Choose a highlighted day to see its events.' : 'No events this month.' }));
  }
  prev.addEventListener('click', () => { cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1); draw(); });
  next.addEventListener('click', () => { cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); draw(); });
  draw();
  return h('div', { class: 'cal' }, h('div', { class: 'cal__bar' }, prev, caption, next), h('div', { class: 'cal__scroll' }, table), detail);
}

export default async function ({ app, site }) {
  const data = await loadJSON('events');
  app.append(pageHead(data.pageTitle, data.intro));
  const wrap = h('div', { class: 'wrap section section--tight' });
  app.append(wrap);
  const all = (Array.isArray(data.items) ? data.items : []).filter((e) => parseDate(e.date) && e.title);
  const upcoming = upcomingEvents({ items: all });
  const past = all.filter((e) => isPast(e)).sort((a, b) => b.date.localeCompare(a.date));

  const listView = h('div', { class: 'events', id: 'events-list' },
    upcoming.length ? upcoming.map((e) => eventCard(e, { site })) : emptyState(data.emptyText || 'New events will be announced soon.',
      link('https://www.instagram.com/nihiramusic/', 'Follow on Instagram for announcements')));
  const calView = h('div', { id: 'events-calendar', hidden: true }, calendar(all, site, upcoming[0] ? parseDate(upcoming[0].date) : new Date()));
  const bList = h('button', { type: 'button', class: 'chip', 'aria-pressed': 'true', 'aria-controls': 'events-list' }, 'List');
  const bCal = h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', 'aria-controls': 'events-calendar' }, 'Calendar');
  const setView = (cal) => {
    listView.hidden = cal; calView.hidden = !cal;
    bList.setAttribute('aria-pressed', String(!cal)); bCal.setAttribute('aria-pressed', String(cal));
  };
  bList.addEventListener('click', () => setView(false));
  bCal.addEventListener('click', () => setView(true));
  wrap.append(h('div', { class: 'filters' }, h('div', { class: 'chips', role: 'group', 'aria-label': 'View' }, bList, bCal)),
    h('h2', { class: 'visually-hidden', text: 'Upcoming events' }), listView, calView);
  if (past.length) {
    wrap.append(h('details', { class: 'past' },
      h('summary', {}, `Past events (${past.length})`),
      h('div', { class: 'events' }, past.map((e) => eventCard(e, { site, past: true })))));
  }
}
