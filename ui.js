// Small helpers shared by the views.

export function create(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

const percent = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });

/** 0.184 -> "18,4%" */
export const formatPercent = probability => percent.format(probability * 100) + '%';

export const riskSummary = probability =>
  `A becsült 10 éves koszorúér-betegség kockázat ${formatPercent(probability)}.`;

// Readable names for the backend's model keys; unknown keys are shown as they are.
const MODEL_NAMES = {
  'logistic-regression-full': 'Logisztikus regresszió (teljes)',
  'logistic-regression-reduced': 'Logisztikus regresszió (glükóz és koleszterin nélkül)',
};

export const modelName = key => MODEL_NAMES[key] ?? key;

export const dateTime = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' });
