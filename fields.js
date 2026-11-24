// The patient form's fields: [key, title, example, unit, format]. Keys are the dataset column
// names the API uses. format is the number step, or the options of a select.
export const groups = [
  ['Alapadatok', [
    ['age', 'Életkor', 54, 'év', '1'],
    ['male', 'Nem', '0', '', ['Nő', 'Férfi']],
    // Framingham codes: 1 some high school, 2 high school/GED, 3 some college/vocational, 4 college.
    ['education', 'Legmagasabb iskolai végzettség', '2', '', [
      ['1', 'Alapfokú'],
      ['2', 'Középfokú (érettségi)'],
      ['3', 'Szakképzés / megkezdett felsőfokú'],
      ['4', 'Felsőfokú diploma'],
    ]],
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

export const fields = groups.flatMap(([, list]) => list);

export const fieldByKey = key => fields.find(([fieldKey]) => fieldKey === key);

/** A select's options as [value, label] pairs (a plain label's value is its index); null for numbers. */
export function fieldOptions([, , example, , format]) {
  if (typeof example === 'number') return null;
  const options = Array.isArray(format) ? format : ['Nem', 'Igen'];
  return options.map((option, index) => Array.isArray(option) ? option : [String(index), option]);
}

const number = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 });

/** 5.4 -> "5,4"; a missing value -> "–" */
export const formatNumber = value => value === null || value === undefined ? '–' : number.format(value);

/** A stored value as shown to the user, e.g. "Igen", "138 Hgmm", "5,4 mmol/L". */
export function displayValue(field, value) {
  if (value === null || value === undefined) return '–';
  const options = fieldOptions(field);
  if (options) return options.find(([optionValue]) => optionValue === String(value))?.[1] ?? String(value);
  return [formatNumber(value), field[3]].filter(Boolean).join(' ');
}
