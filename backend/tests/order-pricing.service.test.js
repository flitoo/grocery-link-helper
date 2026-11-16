const {
  priceOrderLines,
  catalogIdsOf,
  displayName,
  toCents,
  toMilli,
  lineCents,
} = require('../src/services/order-pricing.service');

const milk = { item_id: 11, name: '2% Milk, 4 L', brand: 'Neilson', unit: 'each', unit_price: 6.29 };
const bananas = { item_id: 12, name: 'Bananas', brand: 'Fresh', unit: 'lb', unit_price: 0.69 };
const pork = { item_id: 13, name: 'Pork Loin Chops', brand: 'No Name', unit: 'kg', unit_price: 11.99 };
const salmon = { item_id: 14, name: 'Atlantic Salmon Fillet', brand: 'No Name', unit: 'lb', unit_price: 10.99 };
const catalog = [milk, bananas, pork, salmon];

describe('money helpers', () => {
  it.each([
    [0.69, 69],
    [6.29, 629],
    [1.1, 110],
    [19.99, 1999],
    [0.1 + 0.2, 30], // 0.30000000000000004
    [1.005, 100], // not a value a 2-decimal price can hold; rounds, never throws
  ])('toCents(%s) = %s', (price, cents) => {
    expect(toCents(price)).toBe(cents);
  });

  it.each([
    [1.5, 1500],
    [0.333, 333],
    [2, 2000],
    [0.001, 1],
    [2.3, 2300], // 2.3 * 1000 = 2299.9999999999995
  ])('toMilli(%s) = %s', (quantity, milli) => {
    expect(toMilli(quantity)).toBe(milli);
  });

  it.each([
    [1500, 399, 599], // 1.5 x $3.99 = $5.985 -> half rounds up
    [1000, 399, 399],
    [3000, 110, 330], // 3 x $1.10, which floats get wrong as 3.3000000000000003
    [333, 399, 133], // 0.333 x $3.99 = $1.32867
    [100, 99, 10], // 0.1 x $0.99 = $0.099 -> 10
    [2300, 1000, 2300],
  ])('lineCents(%s, %s) = %s', (milli, unitCents, expected) => {
    expect(lineCents(milli, unitCents)).toBe(expected);
  });
});

describe('displayName', () => {
  it('puts the brand first', () => {
    expect(displayName('2% Milk, 4 L', 'Neilson')).toBe('Neilson 2% Milk, 4 L');
  });

  it('leaves out the placeholder brand for loose produce', () => {
    expect(displayName('Bananas', 'Fresh')).toBe('Bananas');
  });

  it('leaves out an empty brand', () => {
    expect(displayName('Bananas', '')).toBe('Bananas');
  });

  it('never exceeds the 150 character column', () => {
    expect(displayName('x'.repeat(200), 'Brand')).toHaveLength(150);
  });
});

describe('catalogIdsOf', () => {
  it('lists distinct catalog ids and skips custom lines', () => {
    const ids = catalogIdsOf([
      { catalog_item_id: 11, quantity: 1 },
      { item_name: 'Cake', quantity: 1, estimated_price: 5 },
      { catalog_item_id: 11, quantity: 2 },
      { catalog_item_id: 14, quantity: 1 },
    ]);

    expect(ids).toEqual([11, 14]);
  });
});

describe('priceOrderLines: catalog lines', () => {
  it('prices a weight line by the catalog price per unit', () => {
    const { lines, totalCents } = priceOrderLines([{ catalog_item_id: 14, quantity: 1.5 }], catalog);

    expect(totalCents).toBe(1649); // 1.5 x $10.99 = $16.485 -> $16.49
    expect(lines).toEqual([
      {
        catalogItemId: 14,
        itemName: 'No Name Atlantic Salmon Fillet',
        quantity: '1.500',
        unit: 'lb',
        unitPrice: '10.99',
        allowSubstitution: false,
      },
    ]);
  });

  it('takes the name, unit and price from the catalog, ignoring what the client sends', () => {
    const { lines, totalCents } = priceOrderLines(
      [{ catalog_item_id: 11, quantity: 2, item_name: 'Free milk', estimated_price: 0.01, unit: 'kg' }],
      catalog
    );

    expect(totalCents).toBe(1258);
    expect(lines[0]).toMatchObject({
      itemName: 'Neilson 2% Milk, 4 L',
      unit: 'each',
      unitPrice: '6.29',
    });
  });

  it('accepts decimal quantities for lb and kg items', () => {
    const { totalCents } = priceOrderLines(
      [
        { catalog_item_id: 12, quantity: 2.25 }, // 2.25 lb bananas = $1.5525
        { catalog_item_id: 13, quantity: 0.75 }, // 0.75 kg pork = $8.9925
      ],
      catalog
    );

    expect(totalCents).toBe(155 + 899);
  });

  it('rejects a decimal quantity for an item sold per piece', () => {
    expect(() => priceOrderLines([{ catalog_item_id: 11, quantity: 1.5 }], catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_QUANTITY' })
    );
  });

  it('accepts a whole number written as a float for an item sold per piece', () => {
    const { lines } = priceOrderLines([{ catalog_item_id: 11, quantity: 3.0 }], catalog);

    expect(lines[0].quantity).toBe('3.000');
  });

  it('names every catalog id that is missing from the store', () => {
    expect(() =>
      priceOrderLines(
        [
          { catalog_item_id: 11, quantity: 1 },
          { catalog_item_id: 99, quantity: 1 },
          { catalog_item_id: 98, quantity: 1 },
        ],
        catalog
      )
    ).toThrow(expect.objectContaining({ code: 'ITEM_NOT_IN_STORE', message: expect.stringContaining('99, 98') }));
  });

  it('keeps the substitution choice per line', () => {
    const { lines } = priceOrderLines(
      [
        { catalog_item_id: 11, quantity: 1, allow_substitution: true },
        { catalog_item_id: 12, quantity: 1 },
      ],
      catalog
    );

    expect(lines.map((l) => l.allowSubstitution)).toEqual([true, false]);
  });
});

describe('priceOrderLines: custom lines', () => {
  it('prices the legacy shape: whole quantity at the given price each', () => {
    const { lines, totalCents } = priceOrderLines(
      [{ item_name: ' Milk ', quantity: 2, estimated_price: 4.5, allow_substitution: true }],
      []
    );

    expect(totalCents).toBe(900);
    expect(lines[0]).toEqual({
      catalogItemId: null,
      itemName: 'Milk',
      quantity: '2.000',
      unit: 'each',
      unitPrice: '4.50',
      allowSubstitution: true,
    });
  });

  it('supports a weighted custom line priced per unit', () => {
    const { lines, totalCents } = priceOrderLines(
      [{ item_name: 'Deli ham', quantity: 0.5, unit: 'lb', estimated_price: 12.99 }],
      []
    );

    expect(totalCents).toBe(650); // 0.5 x $12.99 = $6.495 -> $6.50
    expect(lines[0]).toMatchObject({ unit: 'lb', quantity: '0.500', unitPrice: '12.99' });
  });

  it('rejects decimals for a custom line sold per piece', () => {
    expect(() =>
      priceOrderLines([{ item_name: 'Cake', quantity: 1.5, estimated_price: 5 }], [])
    ).toThrow(expect.objectContaining({ code: 'INVALID_QUANTITY' }));
  });

  it('rejects an unknown unit', () => {
    expect(() =>
      priceOrderLines([{ item_name: 'Cake', quantity: 1, unit: 'oz', estimated_price: 5 }], [])
    ).toThrow(expect.objectContaining({ code: 'INVALID_QUANTITY' }));
  });

  it.each([0, -1, NaN, 0.0004])('rejects quantity %s', (quantity) => {
    expect(() =>
      priceOrderLines([{ item_name: 'Cake', quantity, unit: 'lb', estimated_price: 5 }], [])
    ).toThrow(expect.objectContaining({ code: 'INVALID_QUANTITY' }));
  });
});

describe('priceOrderLines: totals', () => {
  it('sums rounded line totals, mixing catalog and custom lines', () => {
    const { totalCents } = priceOrderLines(
      [
        { catalog_item_id: 11, quantity: 2 }, // 1258
        { catalog_item_id: 14, quantity: 1.5 }, // 1649
        { item_name: 'Cake', quantity: 1, estimated_price: 5.25 }, // 525
      ],
      catalog
    );

    expect(totalCents).toBe(1258 + 1649 + 525);
  });

  it('has no floating point drift over many small lines', () => {
    const lines = Array.from({ length: 100 }, () => ({
      item_name: 'Candy',
      quantity: 3,
      estimated_price: 1.1,
    }));

    expect(priceOrderLines(lines, []).totalCents).toBe(33000);
  });

  it('matches the old integer-quantity total for legacy orders', () => {
    const items = [
      { item_name: 'Milk', quantity: 2, estimated_price: 4.5 },
      { item_name: 'Bread', quantity: 1, estimated_price: 3.0 },
    ];

    expect(priceOrderLines(items, []).totalCents).toBe(1200);
  });

  it('prices a free custom line at zero', () => {
    expect(priceOrderLines([{ item_name: 'Sample', quantity: 1, estimated_price: 0 }], []).totalCents).toBe(0);
  });
});
