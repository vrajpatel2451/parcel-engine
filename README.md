# Parcel Engine

Framework-independent TypeScript library that turns cart products into one Shiprocket parcel per store. Products are packed side-by-side (with 90° rotation), never vertically stacked. Dimensions use centimetres and weight uses kilograms.

```ts
import { priceDelivery } from '@vrajpatel2451/parcel-engine';

const result = await priceDelivery(products, stores, customerPincode, async (parcel, store, pincode) => {
  const response = await shiprocket.couriers.serviceability({
    pickup_postcode: store.pickupPincode,
    delivery_postcode: pincode,
    weight: parcel.weight,
    // Also send parcel.length, parcel.width and parcel.breadth to the rate API/order flow.
  });
  return chooseCourierCharge(response);
});

console.log(result.parcels); // one parcel per store
console.log(result.total);   // parcel quote A + parcel quote B + ...
```

`breadth` is treated as product/parcel height to preserve the requested API contract. `quantity` defaults to `1`.

The supplied rate-card workbook is not hard-coded: actual charges depend on pickup/delivery zone, courier, weight slabs, COD and surcharges. Inject the live Shiprocket quote as shown so rate changes do not require publishing a new packing library.
