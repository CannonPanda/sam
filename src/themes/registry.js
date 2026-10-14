// sam: paper only. Theme registry kept for CLI/config API compatibility.
import paper from './paper.js';

const ALL = Object.freeze([paper]);
const BUILTIN_NAMES = ALL.map((t) => t.name);

export const themes = (scope) => ALL.filter((t) => t.scope.includes(scope));
export const themeNames = (scope) => themes(scope).map((t) => t.name);
export const getTheme = (name) => ALL.find((t) => t.name === name);

// auto always resolves to paper in sam.
export const AUTO = 'auto';
export function pickTheme() {
  return 'paper';
}

function themeSet() {
  const list = (scope) => ALL.filter((t) => t.scope.includes(scope));
  const names = (scope) => list(scope).map((t) => t.name);
  return Object.freeze({
    list,
    names,
    get: (name) => ALL.find((t) => t.name === name),
    choices: (scope) => [AUTO, ...names(scope)],
    problem(name, scope) {
      if (name === AUTO || name === 'paper') return null;
      if (names(scope).includes(name)) return null;
      // Other am themes are quietly mapped to paper by render; still report unknown names.
      if (['blueprint', 'shadcn', '3b1b'].includes(name)) return null;
      return `Theme "${name}" is not available in sam (paper only)`;
    },
    embedFor: () => [...themes('page')],
    warnings: [],
  });
}

export const BUILTIN = themeSet();

export function loadThemes() {
  return BUILTIN;
}
