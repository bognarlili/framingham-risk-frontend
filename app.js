import {
  authHeaders, initAuth, isAuthAvailable, isLoggedIn, login, logout, onAuthChange, register, userName,
} from './auth.js';
import { fieldOptions, fields, groups } from './fields.js';
import { fetchLatestEntry, loadJournal, onOpenEntry } from './journal.js';
import { create, dateTime, formatPercent, modelName, riskSummary } from './ui.js';

const form = document.querySelector('#patient');
const output = document.querySelector('#result');
const status = document.querySelector('#status');
// Same origin: Nginx forwards /api to the backend.
const ASSESSMENT_URL = '/api/assessments';
const submitButton = form.querySelector('button[type="submit"]');

const demoResult = {
  model: 'Szemléltető példa',
  probability: 0.184,
  summary: 'A példa szerint a koszorúér-betegség becsült esélye 18,4% a következő tíz évben. A becslést leginkább az életkor és a felső vérnyomásérték (138 Hgmm) emelte.',
  contributions: { age: 0.68, sysBP: 0.36, BMI: -0.10 },
};

function addField(container, field) {
  const [key, title, , unit, format] = field;
  const row = create('div', undefined, 'field');
  const label = create('label', title);
  const control = create('div', undefined, 'control');
  label.htmlFor = key;
  const options = fieldOptions(field);
  const input = create(options ? 'select' : 'input');
  input.id = input.name = key;
  input.required = true;

  if (options) {
    input.add(new Option('Válassz…', ''));
    options.forEach(([value, text]) => input.add(new Option(text, value)));
  } else {
    input.type = 'number';
    input.min = '0';
    input.step = format;
  }

  control.append(input);
  if (unit) {
    const suffix = create('span', unit, 'unit');
    suffix.id = key + '-unit';
    input.setAttribute('aria-describedby', suffix.id);
    control.append(suffix);
  }
  row.append(label, control);
  container.append(row);
}

function renderChart(scores) {
  const list = document.querySelector('#chart');
  list.replaceChildren();
  const entries = fields
    .filter(([key]) => Number.isFinite(scores[key]) && scores[key] !== 0)
    .sort(([a], [b]) => Math.abs(scores[b]) - Math.abs(scores[a]))
    .slice(0, 5);
  if (!entries.length) {
    list.append(create('li', 'Nincs megjeleníthető hozzájárulás.'));
    return;
  }
  const max = Math.abs(scores[entries[0][0]]);
  for (const [key, title] of entries) {
    const score = scores[key];
    const item = create('li');
    const track = create('span', undefined, 'track');
    const bar = create('span', undefined, score > 0 ? 'bar positive' : 'bar negative');
    bar.style.setProperty('--size', (100 * Math.abs(score) / max) + '%');
    track.setAttribute('aria-hidden', 'true');
    track.append(bar);
    item.append(create('span', title), track, create('span', score > 0 ? '+' : '−'));
    list.append(item);
  }
}

function renderResult(result) {
  document.querySelector('#model').textContent = modelName(result.model);
  document.querySelector('#risk').textContent = formatPercent(result.probability);
  document.querySelector('#summary').textContent = result.summary;
  renderChart(result.contributions);
  const body = document.querySelector('#interpretations');
  body.replaceChildren();
  for (const [key, title, , unit] of fields) {
    const input = form.elements[key];
    const value = input.tagName === 'SELECT' ? input.selectedOptions[0].text : input.value.replace('.', ',');
    const score = result.contributions[key];
    const direction = score > 0 ? 'Felfelé mozdította a becslést' :
      score < 0 ? 'Lefelé mozdította a becslést' :
      score === 0 ? 'Nulla hozzájárulás' : 'Nincs megjelenített hozzájárulás';
    const row = create('tr');
    row.append(create('th', title), create('td', [value, unit].filter(Boolean).join(' ')), create('td', direction));
    row.firstChild.scope = 'row';
    body.append(row);
  }
  output.hidden = false;
}

for (const [title, list] of groups) {
  const group = create('fieldset');
  group.append(create('legend', title));
  list.forEach(field => addField(group, field));
  document.querySelector('#fields').append(group);
}

// Cigarettes per day only makes sense for smokers: otherwise locked to 0.
const smokerInput = form.elements.currentSmoker;
const cigsInput = form.elements.cigsPerDay;
function syncSmoking() {
  const smokes = smokerInput.value === '1';
  cigsInput.disabled = !smokes;
  cigsInput.min = smokes ? '1' : '0';
  if (!smokes) cigsInput.value = 0;
  else if (cigsInput.value === '0') cigsInput.value = '';
}
smokerInput.addEventListener('change', syncSmoking);
syncSmoking();

// Views: one section per nav button (data-view = section id).
const viewButtons = document.querySelectorAll('[data-view]');
let currentView = 'assessment';
function showView(name) {
  currentView = name;
  for (const tab of viewButtons) {
    const active = tab.dataset.view === name;
    tab.setAttribute('aria-pressed', active);
    document.getElementById(tab.dataset.view).hidden = !active;
  }
  window.scrollTo({ top: 0 });
  if (name === 'journal') loadJournal();
}
for (const button of viewButtons) {
  button.addEventListener('click', () => showView(button.dataset.view));
}

// Header: login/registration for guests, name and logout for logged-in users.
function renderAccount() {
  const account = document.querySelector('#account');
  account.hidden = !isAuthAvailable();
  document.querySelector('[data-view="journal"]').hidden = !isLoggedIn();
  if (!isLoggedIn() && currentView === 'journal') showView('assessment');
  if (isLoggedIn()) {
    const logoutButton = create('button', 'Kijelentkezés');
    logoutButton.type = 'button';
    logoutButton.addEventListener('click', logout);
    account.replaceChildren(create('span', userName(), 'user-name'), logoutButton);
  } else {
    const loginButton = create('button', 'Bejelentkezés');
    const registerButton = create('button', 'Regisztráció');
    loginButton.type = registerButton.type = 'button';
    loginButton.addEventListener('click', login);
    registerButton.addEventListener('click', register);
    account.replaceChildren(loginButton, registerButton);
  }
}
onAuthChange(renderAccount);
initAuth().then(prefillFromJournal);

// A logged-in user starts from their newest journal entry, unless they already began typing.
let formTouched = false;
async function prefillFromJournal() {
  if (!isLoggedIn() || formTouched) return;
  const latest = await fetchLatestEntry();
  if (!latest || formTouched) return;
  fillForm(latest.values);
  status.textContent = `A legutóbbi naplóbejegyzésed adataival töltöttük ki (${dateTime.format(new Date(latest.createdAt))}). `
    + 'Módosítsd, ami változott, és indíts új becslést.';
}

for (const name of ['Logisztikus regresszió', 'EBM', 'XGBoost', 'Random Forest']) {
  const row = create('tr');
  row.append(create('th', name), create('td', 'Tesztadatokra vár'), create('td', 'Tesztadatokra vár'));
  row.firstChild.scope = 'row';
  document.querySelector('#metrics').append(row);
}

function fillForm(values) {
  for (const [key] of fields) form.elements[key].value = values[key] ?? '';
  syncSmoking();
}

// One click: fill in the sample patient and show the illustrative result right away.
document.querySelector('#sample').addEventListener('click', () => {
  formTouched = true;
  fillForm(Object.fromEntries(fields.map(([key, , example]) => [key, example])));
  status.textContent = 'Szemléltető példa – nem valódi modellbecslés.';
  renderResult(demoResult);
});

// A journal entry opens in the assessment view: its values in the form, its result beside it.
onOpenEntry(entry => {
  formTouched = true;
  fillForm(entry.values);
  showView('assessment');
  status.textContent = `Naplóbejegyzés: ${dateTime.format(new Date(entry.createdAt))}`;
  renderResult({ ...entry, summary: riskSummary(entry.probability) });
});

form.addEventListener('input', () => {
  formTouched = true;
  output.hidden = true;
  status.textContent = 'Az adatok változtak. Indíts új becslést.';
});

// JSON body with the dataset field names; every form value is sent as a number.
function readPatient() {
  return Object.fromEntries(fields.map(([key]) => [key, Number(form.elements[key].value)]));
}

// The backend reports field errors by Java name (e.g. sysBp), so match titles case-insensitively.
function fieldTitle(name) {
  const field = fields.find(([key]) => key.toLowerCase() === name.toLowerCase());
  return field ? field[1] : name;
}

function validationMessage(error) {
  const details = Object.entries(error?.details ?? {})
    .map(([name, message]) => `${fieldTitle(name)}: ${message}`);
  return details.length ? 'Hibás adatok – ' + details.join('; ') : 'Hibás adatok.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  output.hidden = true;
  submitButton.disabled = true;
  status.textContent = 'Becslés folyamatban…';
  try {
    const response = await fetch(ASSESSMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await authHeaders() },
      body: JSON.stringify(readPatient()),
    });
    const body = await response.json().catch(() => null);
    if (response.status === 400) {
      status.textContent = validationMessage(body);
    } else if (response.status === 401) {
      status.textContent = 'A bejelentkezésed lejárt. Jelentkezz be újra, vagy frissítsd az oldalt.';
    } else if (!response.ok) {
      status.textContent = `A szerver hibát jelzett (${response.status}). Próbáld újra később.`;
    } else if (body.modelStatus === 'UNAVAILABLE') {
      status.textContent = body.message;
    } else {
      status.textContent = body.saved ? 'Modellbecslés – elmentve a naplódba.'
        : isAuthAvailable() ? 'Modellbecslés – vendégként nem mentjük. Jelentkezz be, ha naplózni szeretnéd.'
        : 'Modellbecslés';
      renderResult(body);
    }
  } catch {
    status.textContent = 'A szerver nem érhető el. Ellenőrizd, hogy fut-e a backend.';
  } finally {
    submitButton.disabled = false;
  }
});
