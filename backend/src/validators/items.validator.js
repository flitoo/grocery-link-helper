const { CATEGORIES, DIETARY_TAGS } = require('../constants/catalog');
const { parseId } = require('./ids.validator');

const MAX_QUERY_LENGTH = 100;
const MAX_TERMS = 8;
const MAX_IDS = 100;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10000;

/** A repeated query param (?a=1&a=2) arrives as an array; scalars must be single. */
function single(value, name, errors) {
  if (Array.isArray(value)) {
    errors.push(`${name} must be given once.`);
    return undefined;
  }
  return value;
}

/** Accepts ?tag=a&tag=b and ?tag=a,b alike. Returns a flat, de-duplicated list. */
function splitList(value) {
  if (value === undefined) {
    return [];
  }
  const parts = (Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(','));
  return [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
}

function parseInteger(value, name, { min, max, fallback }, errors) {
  if (value === undefined || value === '') {
    return fallback;
  }
  if (!/^\d+$/.test(String(value))) {
    errors.push(`${name} must be an integer.`);
    return fallback;
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    errors.push(`${name} must be between ${min} and ${max}.`);
    return fallback;
  }
  return parsed;
}

function parseSearchText(raw, errors) {
  const value = single(raw, 'q', errors);
  if (value === undefined) {
    return [];
  }
  const text = String(value).trim();
  if (text.length > MAX_QUERY_LENGTH) {
    errors.push(`q must be at most ${MAX_QUERY_LENGTH} characters.`);
    return [];
  }
  const terms = text.split(/\s+/).filter(Boolean);
  if (terms.length > MAX_TERMS) {
    errors.push(`q can have at most ${MAX_TERMS} words.`);
    return [];
  }
  return terms;
}

function parseCategory(raw, errors) {
  const value = single(raw, 'category', errors);
  if (value === undefined || value === '') {
    return undefined;
  }
  if (!CATEGORIES.includes(value)) {
    errors.push(`category must be one of: ${CATEGORIES.join(', ')}.`);
    return undefined;
  }
  return value;
}

function parseTags(raw, errors) {
  const tags = splitList(raw);
  const unknown = tags.filter((t) => !DIETARY_TAGS.includes(t));
  if (unknown.length > 0) {
    errors.push(`Unknown dietary tag: ${unknown.join(', ')}. Use: ${DIETARY_TAGS.join(', ')}.`);
    return [];
  }
  return tags;
}

function parseIds(raw, errors) {
  const parts = splitList(raw);
  const ids = parts.map(parseId);
  if (parts.length > MAX_IDS) {
    errors.push(`ids can list at most ${MAX_IDS} items.`);
    return [];
  }
  if (ids.some((id) => id === undefined)) {
    errors.push('ids must be a comma-separated list of positive integers.');
    return [];
  }
  return [...new Set(ids)];
}

/**
 * Validates GET /api/items query params. Returns { errors, filters } where
 * filters is { storeId, terms, category, tags, ids, limit, offset }.
 */
function validateSearchQuery(query) {
  const errors = [];

  const rawStore = single(query.store_id, 'store_id', errors);
  const storeId = rawStore === undefined ? undefined : parseId(rawStore);
  if (!storeId && !errors.some((e) => e.startsWith('store_id'))) {
    errors.push('store_id is required and must be a positive integer.');
  }

  const filters = {
    storeId,
    terms: parseSearchText(query.q, errors),
    category: parseCategory(query.category, errors),
    tags: parseTags(query.tag, errors),
    ids: parseIds(query.ids, errors),
    limit: parseInteger(
      single(query.limit, 'limit', errors),
      'limit',
      { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT },
      errors
    ),
    offset: parseInteger(
      single(query.offset, 'offset', errors),
      'offset',
      { min: 0, max: MAX_OFFSET, fallback: 0 },
      errors
    ),
  };

  return { errors, filters };
}

module.exports = { validateSearchQuery, DEFAULT_LIMIT, MAX_LIMIT };
