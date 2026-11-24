// "Naplóm": the logged-in user's saved assessments, the risk over time and what changed.
import { authHeaders } from './auth.js';
import { displayValue, fieldByKey, fields, formatNumber } from './fields.js';
import { create, dateTime, formatPercent, modelName } from './ui.js';

const JOURNAL_URL = '/api/journal';
const PAGE_SIZE = 100;
const SVG = 'http://www.w3.org/2000/svg';
const shortDate = new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' });
const points = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });

const statusLine = document.querySelector('#journal-status');
const content = document.querySelector('#journal-content');

let openEntry = () => {};

/** What to do when the user opens an entry (show it in the assessment view). */
export function onOpenEntry(handler) {
  openEntry = handler;
}

/** The newest entries first; null if the user is not logged in. Throws if the request fails. */
async function fetchEntries(size) {
  const response = await fetch(`${JOURNAL_URL}?size=${size}`, { headers: await authHeaders() });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).content;
}

/** The user's newest entry, or null if there is none or it cannot be loaded. */
export async function fetchLatestEntry() {
  try {
    return (await fetchEntries(1))?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function loadJournal() {
  content.hidden = true;
  statusLine.textContent = 'Napló betöltése…';
  let entries;
  try {
    entries = await fetchEntries(PAGE_SIZE);
    if (entries === null) {
      statusLine.textContent = 'Jelentkezz be a naplód megtekintéséhez.';
      return;
    }
  } catch {
    statusLine.textContent = 'A napló most nem tölthető be. Próbáld újra később.';
    return;
  }
  if (!entries.length) {
    statusLine.textContent = 'Még nincs bejegyzésed. Bejelentkezve minden becslésed ide kerül.';
    return;
  }
  statusLine.textContent = `${entries.length} bejegyzés`;
  renderTrend([...entries].reverse());
  renderChanges(entries[0], entries[1]);
  renderEntries(entries);
  content.hidden = false;
}

function svg(tag, attributes, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Line chart of the probability, oldest entry on the left, entries evenly spaced. */
function renderTrend(entries) {
  const width = 640, height = 220, left = 52, right = 18, top = 14, bottom = 34;
  const highest = Math.max(...entries.map(entry => entry.probability));
  const max = Math.max(0.1, Math.ceil(highest * 10) / 10); // round up to a 10% step
  const last = entries.length - 1;
  const x = index => last === 0 ? (left + width - right) / 2 : left + index * (width - left - right) / last;
  const y = probability => top + (1 - probability / max) * (height - top - bottom);

  const chart = svg('svg', {
    viewBox: `0 0 ${width} ${height}`, class: 'trend', role: 'img',
    'aria-label': `A becsült kockázat alakulása ${entries.length} bejegyzésen át`,
  });
  for (const tick of [0, max / 2, max]) {
    chart.append(
      svg('line', { x1: left, x2: width - right, y1: y(tick), y2: y(tick), class: 'grid' }),
      svg('text', { x: left - 8, y: y(tick) + 4, 'text-anchor': 'end' }, formatPercent(tick)));
  }
  chart.append(svg('polyline', {
    points: entries.map((entry, index) => `${x(index)},${y(entry.probability)}`).join(' '), class: 'line',
  }));
  // Date labels: at most about six, always including the newest.
  const step = Math.ceil(entries.length / 6);
  entries.forEach((entry, index) => {
    const created = new Date(entry.createdAt);
    const point = svg('circle', { cx: x(index), cy: y(entry.probability), r: 5, class: 'point' });
    point.append(svg('title', {}, `${dateTime.format(created)}: ${formatPercent(entry.probability)}`));
    chart.append(point);
    if (index === last || (index % step === 0 && last - index >= step / 2)) {
      // The outermost labels are aligned inwards so they are not cut off.
      const anchor = last === 0 ? 'middle' : index === 0 ? 'start' : index === last ? 'end' : 'middle';
      chart.append(svg('text', { x: x(index), y: height - 10, 'text-anchor': anchor }, shortDate.format(created)));
    }
  });
  document.querySelector('#trend').replaceChildren(chart);
}

/** The newest entry against the one before: risk change, changed values and their effect. */
function renderChanges(latest, previous) {
  const panel = document.querySelector('#change-panel');
  panel.hidden = !previous;
  if (!previous) return;

  const difference = (latest.probability - previous.probability) * 100;
  const sign = difference > 0 ? '+' : difference < 0 ? '−' : '±';
  document.querySelector('#change-summary').textContent =
    `Kockázat: ${formatPercent(previous.probability)} → ${formatPercent(latest.probability)} ` +
    `(${sign}${points.format(Math.abs(difference))} százalékpont) a ${dateTime.format(new Date(previous.createdAt))}-i bejegyzés óta.`;

  const items = fields
    .filter(([key]) => latest.values[key] !== previous.values[key])
    .map(field => {
      const [key, title] = field;
      // A feature's contribution changes only with its own value, so this is that change's effect.
      const effect = (latest.contributions[key] ?? 0) - (previous.contributions[key] ?? 0);
      const item = create('li');
      item.append(
        create('span', title),
        create('span', `${displayValue(field, previous.values[key])} → ${displayValue(field, latest.values[key])}`),
        create('span', effect > 0 ? '▲ növelte a kockázatot' : effect < 0 ? '▼ csökkentette' : '',
               effect > 0 ? 'up' : 'down'));
      return item;
    });
  if (!items.length) items.push(create('li', 'A megadott értékek nem változtak.'));
  if (latest.model !== previous.model) {
    items.push(create('li', 'A két becslés más modellel készült, ezért nem teljesen összevethető.', 'note'));
  }
  document.querySelector('#changes').replaceChildren(...items);
}

function renderEntries(entries) {
  const show = (entry, key) => displayValue(fieldByKey(key), entry.values[key]);
  const rows = entries.map(entry => {
    const created = new Date(entry.createdAt);
    const row = create('tr');
    const date = create('th', dateTime.format(created));
    date.scope = 'row';
    date.title = modelName(entry.model);

    const openButton = create('button', 'Megnyitás');
    const deleteButton = create('button', 'Törlés', 'danger');
    openButton.type = deleteButton.type = 'button';
    openButton.addEventListener('click', () => openEntry(entry));
    deleteButton.addEventListener('click', () => deleteEntry(entry, created));
    const actions = create('td', undefined, 'actions');
    actions.append(openButton, deleteButton);

    row.append(date, create('td', formatPercent(entry.probability)),
      create('td', `${formatNumber(entry.values.sysBP)}/${formatNumber(entry.values.diaBP)} Hgmm`),
      create('td', show(entry, 'totChol')), create('td', show(entry, 'glucose')), actions);
    return row;
  });
  document.querySelector('#entries').replaceChildren(...rows);
}

async function deleteEntry(entry, created) {
  if (!confirm(`Biztosan törlöd a ${dateTime.format(created)}-i bejegyzést? Ez nem vonható vissza.`)) return;
  try {
    const response = await fetch(`${JOURNAL_URL}/${entry.id}`, { method: 'DELETE', headers: await authHeaders() });
    // 404: already gone (e.g. deleted in another tab), which is what the user wanted.
    if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
  } catch {
    statusLine.textContent = 'A bejegyzés törlése nem sikerült. Próbáld újra később.';
    return;
  }
  await loadJournal();
}
