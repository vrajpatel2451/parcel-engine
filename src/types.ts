export type Id = string | number;

/** Dimensions are centimetres and weight is kilograms. */
export interface Product {
  id: Id;
  name: string;
  storeId: Id;
  length: number;
  width: number;
  /** Product height; named breadth to match the requested contract. */
  breadth: number;
  weight: number;
  quantity?: number;
}

export interface Store {
  id: Id;
  pickupPincode: string | number;
}

export interface Parcel {
  storeId: Id;
  length: number;
  width: number;
  breadth: number;
  weight: number;
}

export interface DeliveryQuote {
  storeId: Id;
  charge: number;
}

export interface DeliveryPrice {
  parcels: Parcel[];
  quotes: DeliveryQuote[];
  total: number;
}

export type QuoteParcel = (
  parcel: Parcel,
  store: Store,
  customerPincode: string | number,
) => number | Promise<number>;
