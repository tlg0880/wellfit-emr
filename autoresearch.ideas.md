# Autoresearch Ideas — RIPS-FEV Optimization

## Implemented (2026-05-26)
- RIPS JSON generator from clinical tables with patient grouping and consecutives
- Preflight validation engine with RVG/RVC rule families
- Structured RIPS viewer in frontend with transaction/users/services breakdown
- Validation panel with rejections (red) and notifications (amber)
- Inline generate/validate actions in RIPS exports list

## Deferred Optimizations / Next Steps
- **Query optimization**: Use `with` CTEs or single complex query with joins instead of N+1 lookups in generator
- **Batch validation**: Validate catalog lookups in batch (single query per table with `IN (...)`) instead of per-item queries to reduce DB roundtrips
- **Caching SISPRO catalogs**: Load reference tables into memory once per validation batch instead of querying SQLite repeatedly
- **Parallel service builders**: Build consultas/procedimientos/medicamentos in parallel per encounter instead of sequential
- **Incremental generation**: Only regenerate changed encounters instead of full recompute on `generatePayload` re-run
- **XML AttachedDocument generation**: Build DIAN XML container for FEV+RIPS submission to MUV
- **CUV recovery flow**: Implement `RecuperarCUV` endpoint and contingency plan
- **Real service values**: Replace placeholder values (50K/30K/15K) with actual billing data from future `billing_item` table
- **Capitation support**: Extend generator for cápita initial/period/final flows with zero service values
- **NC/ND/NA flows**: Support partial credit notes, debit notes, and data adjustment notes
- **MUV API Docker integration**: Add client for `CargarFevRips`, `CargarNC`, `CargarND`, etc.
- **RIPS sin factura**: Support `tipoNota = "RS"` with `numFactura = null`
