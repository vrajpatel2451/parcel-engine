import type { DeliveryPrice, Id, Parcel, Product, QuoteParcel, Store } from './types.js';

type Rect = { length: number; width: number; height: number };
type Shelf = { width: number; depth: number };

const round = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${field} must be a positive finite number`);
}

function copies(products: Product[]): Rect[] {
  const result: Rect[] = [];
  for (const product of products) {
    assertPositive(product.length, `${product.name}.length`);
    assertPositive(product.width, `${product.name}.width`);
    assertPositive(product.breadth, `${product.name}.breadth`);
    assertPositive(product.weight, `${product.name}.weight`);
    const quantity = product.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new RangeError(`${product.name}.quantity must be a positive integer`);
    for (let index = 0; index < quantity; index++) {
      result.push({ length: product.length, width: product.width, height: product.breadth });
    }
  }
  return result;
}

function shelfPack(rectangles: Rect[], limit: number): { length: number; width: number } {
  const shelves: Shelf[] = [];
  for (const rect of rectangles) {
    const orientations = rect.length === rect.width
      ? [[rect.length, rect.width] as const]
      : [[rect.length, rect.width] as const, [rect.width, rect.length] as const];
    let best: { shelf: number; length: number; width: number; score: number } | undefined;
    for (const [length, width] of orientations) {
      if (length > limit) continue;
      for (let shelf = 0; shelf <= shelves.length; shelf++) {
        const current = shelves[shelf];
        if (current && current.width + length > limit) continue;
        const used = current ? current.width + length : length;
        const depth = current ? Math.max(current.depth, width) : width;
        const totalDepth = shelves.reduce((sum, item, i) => sum + (i === shelf ? depth : item.depth), 0)
          + (current ? 0 : depth);
        const score = Math.max(limit, used) * totalDepth;
        if (!best || score < best.score) best = { shelf, length, width, score };
      }
    }
    if (!best) return { length: Infinity, width: Infinity };
    const shelf = shelves[best.shelf];
    if (shelf) {
      shelf.width += best.length;
      shelf.depth = Math.max(shelf.depth, best.width);
    } else shelves.push({ width: best.length, depth: best.width });
  }
  return { length: Math.max(...shelves.map(shelf => shelf.width)), width: shelves.reduce((sum, shelf) => sum + shelf.depth, 0) };
}

function pack(rectangles: Rect[]): { length: number; width: number } {
  const area = rectangles.reduce((sum, item) => sum + item.length * item.width, 0);
  const sides = rectangles.flatMap(item => [item.length, item.width]);
  const maxSide = Math.max(...rectangles.map(item => Math.min(item.length, item.width)));
  const totalSide = rectangles.reduce((sum, item) => sum + Math.max(item.length, item.width), 0);
  const candidates = new Set([maxSide, Math.sqrt(area), totalSide, ...sides]);
  const orders = [
    [...rectangles].sort((a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width)),
    [...rectangles].sort((a, b) => b.length * b.width - a.length * a.width),
  ];
  let best = { length: totalSide, width: Math.max(...rectangles.map(item => Math.min(item.length, item.width))) };
  for (const order of orders) for (const limit of candidates) {
    const result = shelfPack(order, limit);
    if (result.length * result.width < best.length * best.width) best = result;
  }
  return best;
}

/** Builds exactly one non-vertically-stacked parcel for each store. */
export function buildParcels(products: Product[]): Parcel[] {
  const groups = new Map<Id, Product[]>();
  for (const product of products) groups.set(product.storeId, [...(groups.get(product.storeId) ?? []), product]);
  return [...groups].map(([storeId, storeProducts]) => {
    const rectangles = copies(storeProducts);
    const base = pack(rectangles);
    return {
      storeId,
      length: round(base.length),
      width: round(base.width),
      breadth: round(Math.max(...rectangles.map(item => item.height))),
      weight: round(storeProducts.reduce((sum, product) => sum + product.weight * (product.quantity ?? 1), 0)),
    };
  });
}

/** Quotes each store parcel once and adds the returned Shiprocket charges. */
export async function priceDelivery(
  products: Product[],
  stores: Store[],
  customerPincode: string | number,
  quote: QuoteParcel,
): Promise<DeliveryPrice> {
  if (!String(customerPincode).trim()) throw new TypeError('customerPincode is required');
  const storesById = new Map(stores.map(store => [store.id, store]));
  const parcels = buildParcels(products);
  const quotes = await Promise.all(parcels.map(async parcel => {
    const store = storesById.get(parcel.storeId);
    if (!store) throw new Error(`Store ${String(parcel.storeId)} was not provided`);
    const charge = await quote(parcel, store, customerPincode);
    if (!Number.isFinite(charge) || charge < 0) throw new RangeError('Quote charge must be a non-negative finite number');
    return { storeId: parcel.storeId, charge };
  }));
  return { parcels, quotes, total: round(quotes.reduce((sum, item) => sum + item.charge, 0)) };
}

export type * from './types.js';
