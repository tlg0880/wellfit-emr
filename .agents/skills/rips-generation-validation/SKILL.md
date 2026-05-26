---
name: rips-generation-validation
description: "Implementar, auditar o explicar generación, validación, envío, CUV, notas crédito/débito, RIPS sin factura, facturación cápita, catálogos SISPRO, reglas RVC/RVG, estructura JSON RIPS y relacionamiento RIPS-FEV para Colombia. Use when working on RIPS as soporte de Factura Electrónica de Venta en salud, Resolución 2275 de 2023, mecanismo único de validación MinSalud, API Docker/cliente-servidor FEV-RIPS, document electronic XML AttachedDocument/ApplicationResponse, or validation errors from the RIPS-FEV process."
---

# RIPS Generation And Validation

Use this skill to build or review RIPS-FEV functionality for Colombia based on `resources/lineamientos-generacion-validacion-rips-factura-electronica-fev-doc-electronicos.pdf` (MinSalud, versión 3.2, mayo de 2025). Treat it as implementation guidance, not a replacement for current legal review or official schemas.

## First Steps

1. Identify the operation: FEV+RIPS, NC total, NC parcial, ND, Nota Ajuste RIPS, RIPS sin factura, cápita inicial/periodo/final, NC cápita, or NC acuerdo de voluntades.
2. Read the relevant reference:
   - `references/source-scope-and-flows.md` for actors, operation types, files expected by each module/method, and edge cases.
   - `references/generation-requirements.md` for RIPS JSON construction rules, required catalogs, field semantics, values, and service object rules.
   - `references/validation-submission-and-cuv.md` for local validation layers, MinSalud MUV modules/API methods, RVG/RVC rule families, XML checks, CUV storage/recovery, and contingency.
   - `references/pdf-source-extraction.md` when the references do not answer a detailed question and you need to extract/search the source PDF directly.
3. Inspect the codebase before changing anything. In this repo, prefer existing routers/services such as `ripsReference`, `ripsExports`, `facilities`, `encounters`, `clinicalRecords`, and catalog data under `resources/diccionario_tablas_corregido.json`.
4. Implement local validation as a preflight. Do not claim local validation replaces MinSalud's Mecanismo Unico de Validacion (MUV); the MUV response and CUV remain authoritative for radication.
5. If a requirement depends on an external official artifact named by the PDF but not bundled here (Anexo Tecnico 1/2, Guia de autenticacion, Manual API Docker, schema JSON, current SISPRO tables, DIAN UBL docs), verify that artifact before hardcoding behavior.

## Implementation Workflow

### 1. Model The Submission

Represent each RIPS-FEV attempt as an immutable submission with:

- operation type and corresponding MUV module/method;
- source invoice/note identifiers, CUFE/CUDE when applicable, and referenced invoice for NC/ND;
- RIPS JSON payload and XML `AttachedDocument` payload metadata;
- local validation findings split by `rejection` and `notification`;
- MUV response, CUV, `FechaRadicacion`, `ProcesoId`, and raw validation result;
- audit trail for generation, validation, submission, retry, deletion/correction, and CUV recovery.

Use explicit states: `draft`, `locally_invalid`, `ready`, `submitted`, `approved`, `rejected`, `needs_retry`, `cuv_recovered`.

### 2. Generate RIPS From Clinical And Billing Sources

Build RIPS from primary clinical and billing records, not from free-text summaries. Preserve the hierarchy:

`transaccion -> usuarios[] -> servicios.{consultas, procedimientos, urgencias, hospitalizacion, recienNacidos, medicamentos, otrosServicios}`

For each user and service, validate:

- patient identity, age, sex, residence, origin, and user type;
- provider site code, service date/time, group, service code, modality, purpose, diagnosis, professional, values, and payment moderator fields;
- catalogs against SISPRO reference tables, not ad hoc UI labels;
- dates against the XML invoice period and patient date of birth;
- monetary totals against FEV/NC/ND and the payment modality.

### 3. Validate In Layers

Run preflight validation in the same conceptual order as the MUV:

1. JSON structure/syntax and required service presence.
2. Cross-document consistency between RIPS and FEV/NC/ND XML.
3. Reference-data checks against SISPRO tables.
4. Correlated field checks inside a user/service.
5. Coherence between objects: users with services, parto/recien nacido, urgencias/consulta, estancia/hospitalizacion, professionals/RETHUS, etc.

Use `rejection` for issues that should block local submission. Use `notification` for quality warnings that should be visible but may still allow CUV generation if MinSalud classifies them as notifications.

### 4. Submit And Store Evidence

For API Docker flows, send JSON RIPS and XML `AttachedDocument` as required by the selected method. The XML is the DIAN container and must not be modified after DIAN approval.

Persist the complete response. If `ResultState` is true and `CodigoUnicoValidacion` is present, treat it as approved and retain the CUV artifact for transmission to ERP/pagadores. If the connection fails after a successful upload, use the recovery flow instead of generating a new business document.

## Hard Requirements

- Use exact decimal arithmetic for monetary values. Avoid binary floating point for invoice totals, service values, payment moderators, anticipos, NC, and ND.
- Keep RIPS values aligned with payment modality: event-based services carry values; bundled/global/capitation-like modalities generally report service values as zero according to the lineamiento.
- Never mutate DIAN-approved XML before sending it to the MUV.
- Do not include anticipos in RIPS. Anticipos belong in FEV XML `PrepaidPayment`.
- For RIPS sin factura, use the current lineamiento value `tipoNota = "RS"` from transaction guidance and control changes. The PDF also contains an older `SF` example; flag that discrepancy and prefer `RS` unless an official updated schema says otherwise.
- Do not hardcode catalog descriptions as valid values. Store codes and resolve labels through current SISPRO/reference tables.
- Make validation errors actionable: include object path, field id/name, source value, expected constraint, and rule code when known.
- Keep source payloads, normalized payloads, validation results, MUV responses, and CUV recovery attempts auditable.
- Treat the PDF as a living lineamiento: version 3.2 says it may be updated. When implementing production behavior, keep rule severity, table versions, operation names, and external service URLs configurable.

## Testing Checklist

Cover at least:

- FEV+RIPS approved preflight with one user and one event-based consultation.
- Multiuser invoice with unique user consecutives and service consecutives.
- NC total without RIPS.
- NC parcial with only accepted-glosa services and zero payment moderator fields.
- ND with adjusted service quantity/value and referenced invoice.
- Nota Ajuste RIPS with JSON only and no monetary change.
- RIPS sin factura with `numFactura = null`, `tipoNota = "RS"`, `numNota` local consecutive, and service values zero.
- Capitation initial, period, final, and NC capitation file requirements.
- Rejections for invalid JSON shape, missing services, service date outside invoice period, CUPS/CIE/catalog miss, provider code/NIT mismatch, wrong event value, and totals mismatch.
- Notifications for quality rules such as finalidad/sexo/edad, duplicate medications, CUPS diagnosis coherence, and prolonged urgencies observation when treated as notification.

## References

- `references/source-scope-and-flows.md`
- `references/generation-requirements.md`
- `references/validation-submission-and-cuv.md`
- `references/pdf-source-extraction.md`
