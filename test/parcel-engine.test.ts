import { describe, expect, it, vi } from 'vitest';
import { buildParcels, priceDelivery, type Product, type QuoteParcel } from '../src/index.js';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1, name: 'Product', storeId: 'A', length: 10, width: 5, breadth: 2, weight: 0.25, ...overrides,
});

describe('parcel engine', () => {
  it('groups quantities into one parcel per store without vertical stacking', () => {
    expect(buildParcels([
      product({ id: 'A', storeId: 'store-a', quantity: 3 }),
      product({ id: 'B', storeId: 'store-a', length: 6, width: 4, breadth: 3, weight: 0.5, quantity: 5 }),
      product({ id: 'C', storeId: 'store-b', quantity: 2 }),
    ])).toEqual([
      expect.objectContaining({ storeId: 'store-a', breadth: 3, weight: 3.25 }),
      expect.objectContaining({ storeId: 'store-b', breadth: 2, weight: 0.5 }),
    ]);
  });

  it('quotes once per store parcel and sums the charges', async () => {
    const quote = vi.fn<QuoteParcel>(async (_parcel, store) => store.id === 'A' ? 40 : 60);
    const result = await priceDelivery(
      [product({ storeId: 'A', quantity: 3 }), product({ id: 2, storeId: 'B', quantity: 5 })],
      [{ id: 'A', pickupPincode: 380001 }, { id: 'B', pickupPincode: 110001 }],
      400001,
      quote,
    );
    expect(result.total).toBe(100);
    expect(quote).toHaveBeenCalledTimes(2);
  });

  it('passes 200 deterministic random packing scenarios', () => {
    let seed = 0x5eed;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let scenario = 0; scenario < 200; scenario++) {
      const products = Array.from({ length: 1 + Math.floor(random() * 12) }, (_, index) => product({
        id: index,
        storeId: `store-${Math.floor(random() * 4)}`,
        length: 1 + Math.floor(random() * 50),
        width: 1 + Math.floor(random() * 50),
        breadth: 1 + Math.floor(random() * 20),
        weight: 0.1 + Math.floor(random() * 100) / 10,
        quantity: 1 + Math.floor(random() * 8),
      }));
      const parcels = buildParcels(products);
      expect(parcels).toHaveLength(new Set(products.map(item => item.storeId)).size);
      for (const parcel of parcels) {
        const items = products.filter(item => item.storeId === parcel.storeId);
        expect(parcel.weight).toBeCloseTo(items.reduce((sum, item) => sum + item.weight * (item.quantity ?? 1), 0), 3);
        expect(parcel.breadth).toBe(Math.max(...items.map(item => item.breadth)));
        const singleRowArea = items.reduce((sum, item) => sum + Math.max(item.length, item.width) * (item.quantity ?? 1), 0)
          * Math.max(...items.map(item => Math.min(item.length, item.width)));
        expect(parcel.length * parcel.width).toBeLessThanOrEqual(singleRowArea + 0.001);
      }
    }
  });

  it('rejects invalid physical data', () => {
    expect(() => buildParcels([product({ quantity: 0 })])).toThrow(/quantity/);
    expect(() => buildParcels([product({ weight: -1 })])).toThrow(/weight/);
  });
});
