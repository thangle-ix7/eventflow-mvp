export const stripHiddenSuggestionKeys = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripHiddenSuggestionKeys);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !HIDDEN_SUGGESTION_KEYS.has(key))
        .map(([key, nestedValue]) => [key, stripHiddenSuggestionKeys(nestedValue)])
    );
  }
  return value;
};

export const HIDDEN_SUGGESTION_KEYS = new Set([
  'key',
  'selected',
  '__detailTitle',
  '__suggestionIndex',
  '__rowId',
  '__phaseIndex',
]);
