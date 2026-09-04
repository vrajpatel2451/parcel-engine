import { expect, it, vi } from 'vitest';
import { priceDelivery, type QuoteParcel } from '../../src/index.js';

it('performs the public products -> parcels -> summed quote flow', async () => {
  const quote = vi.fn<QuoteParcel>(async parcel => parcel.storeId === 'store-a' ? 75 : 125);
  const result = await priceDelivery(
    [
      { id: 'A', name: 'A', storeId: 'store-a', length: 10, width: 5, breadth: 2, weight: 0.5, quantity: 3 },
      { id: 'B', name: 'B', storeId: 'store-b', length: 8, width: 4, breadth: 3, weight: 1, quantity: 2 },
    ],
    [
      { id: 'store-a', pickupPincode: 380001 },
      { id: 'store-b', pickupPincode: 110001 },
    ],
    400001,
    quote,
  );

  expect(result.parcels).toHaveLength(2);
  expect(result.total).toBe(200);
  expect(quote).toHaveBeenCalledTimes(2);
});
