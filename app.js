'use strict';

const groups = [
  ['Alapadatok', [
    ['age', 'Életkor', 54, 'év', '1'],
    ['male', 'Nem', '0', '', ['Nő', 'Férfi']],
    ['education', 'Iskolázottsági kategória', '2', '', ['1', '2', '3', '4']],
    ['BMI', 'BMI', 27.4, 'kg/m²', 'any'],
  ]],
  ['Dohányzás és előzmények', [
    ['currentSmoker', 'Jelenleg dohányzik', '0'],
    ['cigsPerDay', 'Napi cigarettaszám', 0, 'szál/nap', '1'],
    ['BPMeds', 'Vérnyomáscsökkentőt szed', '0'],
    ['prevalentStroke', 'Korábbi stroke', '0'],
    ['prevalentHyp', 'Ismert hipertónia', '0'],
    ['diabetes', 'Ismert diabétesz', '0'],
  ]],
  ['Vérnyomás és pulzus', [
    ['sysBP', 'Szisztolés vérnyomás', 138, 'Hgmm', 'any'],
    ['diaBP', 'Diasztolés vérnyomás', 86, 'Hgmm', 'any'],
    ['heartRate', 'Pulzus', 76, 'ütés/perc', 'any'],
  ]],
  ['Laborértékek', [
    ['totChol', 'Összkoleszterin', 6.0, 'mmol/L', 'any'],
    ['glucose', 'Glükóz', 5.1, 'mmol/L', 'any'],
  ]],
];

const fields = groups.flatMap(([, list]) => list);
const form = document.querySelector('#patient');
const output = document.querySelector('#result');
const status = document.querySelector('#status');
const percent = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });
const demoScores = { age: 0.68, sysBP: 0.36, BMI: -0.10 };

function create(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function addField(container, [key, title, example, unit, format]) {
  const row = create('div', undefined, 'field');
  const label = create('label', title);
  const control = create('div', undefined, 'control');
  label.htmlFor = key;
  const input = create(typeof example === 'number' ? 'input' : 'select');
  input.id = input.name = key;
  input.required = true;

  if (input.tagName === 'INPUT') {
    input.type = 'number';
    input.min = '0';
    input.step = format;
  } else {
    const options = Array.isArray(format) ? format : ['Nem', 'Igen'];
    input.add(new Option('Válassz…', ''));
    options.forEach((option, index) => {
      const value = key === 'education' ? option : index;
      input.add(new Option(option, value));
    });
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
  document.querySelector('#model').textContent = result.model;
  document.querySelector('#risk').textContent = percent.format(result.probability * 100) + '%';
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
    row.append(create('th', title), create('td', [value, unit].filter(Boolean).join(' ')),
      create('td', result.interpretations?.[key] || direction));
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

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    for (const tab of document.querySelectorAll('[data-view]')) {
      const active = tab === button;
      tab.setAttribute('aria-pressed', active);
      document.getElementById(tab.dataset.view).hidden = !active;
    }
  });
}
for (const name of ['Logisztikus regresszió', 'EBM', 'XGBoost', 'Random Forest']) {
  const row = create('tr');
  row.append(create('th', name), create('td', 'Tesztadatokra vár'), create('td', 'Tesztadatokra vár'));
  row.firstChild.scope = 'row';
  document.querySelector('#metrics').append(row);
}

document.querySelector('#sample').addEventListener('click', () => {
  for (const [key, , value] of fields) form.elements[key].value = value;
  output.hidden = true;
  status.textContent = 'Példapáciens betöltve.';
});
form.addEventListener('input', () => {
  output.hidden = true;
  status.textContent = 'Az adatok változtak. Indíts új becslést.';
});
form.addEventListener('submit', event => {
  event.preventDefault();
  output.hidden = true;
  const isSample = fields.every(([key, , example]) => Number(form.elements[key].value) === Number(example));
  if (!isSample) {
    status.textContent = 'Az egyéni becsléshez modellkapcsolat szükséges. A bemutató a példapácienssel próbálható ki.';
    return;
  }
  status.textContent = 'Szemléltető eredmény';
  renderResult({
    model: 'EBM · teljes modell',
    probability: 0.184,
    summary: 'A példa szerint a koszorúér-betegség becsült esélye 18,4% a következő tíz évben. A becslést leginkább az életkor és a felső vérnyomásérték (138 Hgmm) emelte.',
    contributions: demoScores,
  });
});
