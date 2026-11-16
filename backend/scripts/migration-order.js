// This independent compatibility migration was merged after items-catalog had
// already shipped. Allow only this known exception, not arbitrary history gaps.
const LATE_COLLECTIONS = '1794355200000_grocery-collections';

function isPrefix(applied, available) {
  return applied.every((name, index) => available[index] === name);
}

function checkMigrationOrder(applied, available) {
  if (new Set(applied).size !== applied.length) {
    throw new Error('Duplicate migration history entries; review the database history.');
  }
  if (isPrefix(applied, available)) return { checkOrder: true };
  const withoutCollections = names => names.filter(name => name !== LATE_COLLECTIONS);
  const collectionIndex = applied.indexOf(LATE_COLLECTIONS);
  if (available.includes(LATE_COLLECTIONS) &&
      (collectionIndex === -1 || collectionIndex >= available.indexOf(LATE_COLLECTIONS)) &&
      isPrefix(withoutCollections(applied), withoutCollections(available))) {
    return { checkOrder: false };
  }
  throw new Error('Unexpected migration order; only the late Collections compatibility migration is allowed.');
}

module.exports = { checkMigrationOrder, LATE_COLLECTIONS };
