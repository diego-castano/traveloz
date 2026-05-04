// ---------------------------------------------------------------------------
// Single-tenant brand constant.
//
// The product is single-tenant TravelOz. Multi-brand support was removed in
// Fase 7 — all queries now hardcode this brandId rather than reading it from
// the user session. Existing tables keep the `brandId` column as a vestigial
// FK that always equals "brand-1"; a future migration may drop it once we're
// confident nothing reads it.
//
// If you find yourself wanting to query a different brandId, you're probably
// reintroducing multi-brand. Talk to the product owner first.
// ---------------------------------------------------------------------------

export const BRAND_ID = "brand-1";
