const { checkMigrationOrder, LATE_COLLECTIONS } = require('../scripts/migration-order');
const baseline = '1789602611067_baseline-existing-schema';
const seed = '1789700697841_seed-stores';
const ratings = '1794182400000_ratings-and-substitution-requests';
const items = '1794700000000_items-catalog';
const delays = '1794873600000_delivery-delay-notifications';
const available = [baseline, seed, ratings, LATE_COLLECTIONS, items, delays];

it.each([[], [baseline], available].map(applied => [applied]))('keeps normal ordering for history %j', applied => {
  expect(checkMigrationOrder(applied, available)).toEqual({ checkOrder: true });
});
it('allows missing Collections after Items has already run', () => {
  expect(checkMigrationOrder([baseline, seed, ratings, items], available)).toEqual({ checkOrder: false });
});
it('allows missing Collections after delay notifications have already run', () => {
  expect(checkMigrationOrder([baseline, seed, ratings, items, delays], available)).toEqual({ checkOrder: false });
});
it('recognizes history after the late migration has been applied', () => {
  expect(checkMigrationOrder([baseline, seed, ratings, items, delays, LATE_COLLECTIONS], available))
    .toEqual({ checkOrder: false });
});
it.each([
  [baseline, items],
  [baseline, seed, ratings, delays, items],
  [baseline, seed, ratings, items, 'unknown'],
  [baseline, seed, seed],
  [LATE_COLLECTIONS, baseline, seed, ratings, items],
].map(applied => [applied]))('rejects unrelated gaps, reordered, unknown or duplicate migrations: %j', applied => {
  expect(() => checkMigrationOrder(applied, available)).toThrow();
});
