# Source, Scope, And Functional Flows

Source document: `resources/lineamientos-generacion-validacion-rips-factura-electronica-fev-doc-electronicos.pdf`, Ministerio de Salud y Protección Social, version 3.2, May 2025.

Use this file when deciding which RIPS-FEV operation applies, which files are required, and how the actors interact.

## Scope And External Artifacts

The lineamiento explains process, interpretation, and many validation rules. It explicitly depends on other official artifacts for implementation details. Before hardcoding behavior, inspect the current version of:

- Anexo Tecnico 1 of Resolucion 2275 de 2023 for exact RIPS JSON fields, types, sizes, nullability, and examples.
- Anexo Tecnico 2 / DIAN health extension for exact FEV XML additional health fields.
- JSON Schema used by the MUV for RIPS structure validation.
- SISPRO reference tables and their current versions.
- Guia de autenticacion, Guia de instalacion API Docker, Manual del servicio API Docker, and client/server manual for exact endpoints, payload names, authentication, and response shape.
- DIAN UBL 2.1 / Resolucion 0165 de 2023 documentation for Invoice, CreditNote, DebitNote, ApplicationResponse, CUFE/CUDE, and `AttachedDocument`.

Model these as versioned dependencies. Store their source/version/date where practical.

## Normative Context

The PDF lists a non-exhaustive regulatory context including: Ley 100 de 1993, Ley 1122 de 2007, Ley 1438 de 2011, Ley 1753 de 2015, Ley 1955 de 2019, Ley 1966 de 2019, Ley 2015 de 2020, Resolucion 866 de 2021, Decreto 780 de 2016, Decreto 441 de 2022, Decreto 228 de 2025, Resolucion 3047 de 2008, Resolucion 1405 de 2022, Resolucion 1403 de 2007, Resolucion 2275 de 2023, Resolucion 558 de 2024, Resolucion 2284 de 2023, Resolucion 2335 de 2023, Resolucion 1884/1885/1886 de 2024, and Circular conjunta MinSalud/SNS 007 de 2025.

Use the normative list as context, not as a complete legal basis. Browse or inspect official current sources when a task asks for legal certainty or current compliance.

## Core Actors

- `PSS`: Prestadores de Servicios de Salud. Includes IPS, independent professionals, special patient transport, and eligible entities registered in REPS.
- `PTS`: Proveedores de Tecnologias en Salud. Includes logistic operators, pharmaceutical managers, and other technology suppliers when they invoice/provide health technologies.
- `DIAN`: validates tax/electronic documents first. The DIAN-approved `AttachedDocument` includes the electronic document and `ApplicationResponse`.
- `MinSalud`: receives and validates RIPS + electronic documents through the MUV and returns validation results/CUV.
- `ERP/pagadores`: receive the FEV/NC/ND, RIPS when applicable, support documents, and CUV artifact for radication and payment workflow.

## Functional Sequence

1. The PSS/PTS generates the electronic document under DIAN rules: FEV, NC, or ND.
2. DIAN validates the electronic document and returns `ApplicationResponse`.
3. The PSS/PTS generates the RIPS JSON when the operation requires it.
4. The PSS/PTS sends the DIAN `AttachedDocument` and/or RIPS JSON to MinSalud's MUV through client/server or API Docker.
5. The MUV runs structure, data, cross-document, storage, and consistency checks.
6. If accepted, the MUV returns CUV and validation results. The PSS/PTS stores them and sends them to ERP/pagadores for radication.
7. If rejected, the PSS/PTS corrects the source data/document flow according to the rule and resubmits.

Do not alter the DIAN-approved XML container before MUV submission.

## Operation Types

### FEV + RIPS

Use for regular health FEV where RIPS supports the billed services/technologies.

- Client/server module: Factura Electronica de Venta.
- API Docker method: `CargarFevRips`.
- Required files: XML `AttachedDocument` with FEV + `ApplicationResponse`, and RIPS JSON.
- Supports modalities including event, package/case/canasta, and PGP.

#### FEV Health Operation Types

When parsing or generating the FEV XML health extension, distinguish the operation type because it changes how payment moderators/references behave:

- `SS-Recaudo`: invoice/receipt issued to the user for direct collection of copago, cuota moderadora, cuota de recuperacion, or shared voluntary-plan payment. It is not the ERP service invoice and does not require RIPS support as FEV in salud.
- `SS-CUFE`: accredits payment moderator collection supported by a referenced electronic invoice. RIPS payment moderator detail must reconcile with the value credited in the FEV.
- `SS-CUDE`: accredits collection supported by contingency invoices later transmitted to DIAN.
- `SS-POS`: accredits collection supported by POS/document-equivalent receipts issued to the user.
- `SS-SNum`: accredits collection supported by remaining physical talonario numbering. Treat as legacy/limited.
- `SS-Reporte`: reports references to collections already handled contractually/accountingly, often by the ERP. It informs references but does not activate the health calculation method to subtract values from the FEV.
- `SS-SinAporte`: regular charge to ERP/pagador/patient particular when no payment moderator is collected or referenced.

The RIPS fields for payment moderators (`C18-C20`, `P17-P19`, `M20-M22`, `S13-S15`) must match the chosen operation semantics.

### Nota Credito Total

Use when a full invoice is annulled/fully affected.

- Client/server module: Nota Credito Total.
- API Docker method: `CargarNCTotal`.
- Required files: XML `AttachedDocument` for NC + `ApplicationResponse`.
- RIPS is not required; if transmitted, the MUV may not reject solely for its presence, but implementation should avoid sending unnecessary RIPS.
- Do not report payment moderator/anticipos values again.
- NC XML must reference the affected FEV through `BillingReference.InvoiceDocumentReference`.
- CreditNote `CustomizationID` must be `20` according to the DIAN operation rule cited by the lineamiento.

### Nota Credito Parcial + RIPS

Use for accepted glosas that reduce quantity/value for specific services.

- Client/server module: Nota Credito Parcial.
- API Docker method: `CargarNCParcial`.
- Required files: XML `AttachedDocument` for partial NC + RIPS JSON.
- RIPS must include only the services accepted in glosa and their affected values.
- Payment moderator values must be zero; they were legalized in the original FEV.
- If a service has both NC partial and RIPS quality adjustment, use `tipoNota = "NC"` and include both the value adjustment and data correction for affected records.
- NC XML must reference the affected FEV and use CreditNote `CustomizationID = "20"`.

### Nota Debito + RIPS

Use when the invoice must recognize additional value or quantity after radication.

- Client/server module: Nota Debito.
- API Docker method: `CargarND`.
- Required files: XML `AttachedDocument` for ND + RIPS JSON.
- RIPS can update existing records by consecutive or add complete new user/service records, continuing the original sequence.
- ND must reference the affected FEV.
- DebitNote `CustomizationID` must be `30` according to the DIAN operation rule cited by the lineamiento.

### Nota Ajuste De RIPS

Use for accepted glosas related to data quality that do not alter invoice monetary value.

- Client/server module: Nota Ajuste de RIPS.
- API Docker method: `CargarNAjuste` / `CargarNotaAjuste` depending on official API naming.
- Required files: RIPS JSON only.
- Generate a CUV for the adjusted RIPS to continue the payment process.
- Do not generate NC/ND for this case.

### RIPS Sin Factura

Use for entities legally required to report RIPS without generating FEV, including EOSD and independent professionals under the defined conditions.

- Client/server module: RIPS sin factura.
- API Docker method: `CargarRipsSinFactura`.
- Required files: RIPS JSON only.
- Deadline in the lineamiento: within the first 5 days of the month following the reported activities.
- Transaction guidance and control changes indicate `tipoNota = "RS"` and `numFactura = null`. The PDF has an older example with `SF`; treat `RS` as the expected value unless an official current schema proves otherwise.
- `numNota` is a local unique sending consecutive.

### Capitation

Use for contracts under cápita.

- Initial capitation: first FEV, no RIPS. Client/server module `Capita Inicial`; API method `CargarCapitaInicial`.
- Period capitation: FEV for next period + RIPS for services from previous period. Client/server module `Capita por Periodo`; API method `CargarCapitaPeriodo`.
- Final capitation: final RIPS JSON only. Client/server module `Capita Final`; API method `CargarCapitaFinal`.
- NC capitation: XML NC only for capitation-related value adjustments. Client/server module `Nota Credito Capita`; API method `CargarNCCapita`.
- Service values in RIPS under cápita/PGP/grouped modalities should generally be zero according to the payment modality rules.

### Nota Credito Sin RIPS / Acuerdo De Voluntades

Use for follow-up of contractual execution that affects value but not individual RIPS records: indicators, technical note deviation, quality/management/results metrics.

- Client/server module: Nota Credito Acuerdo de Voluntades.
- API Docker method: `CargarNCAcuerdoVoluntades`.
- Required files: XML `AttachedDocument` for NC + `ApplicationResponse`.
- No RIPS is sent unless a specific capitation final scenario requires it.

### Sobre Ejecucion Del Contrato

When contract overexecution adjusts the contract value, report regular FEV+RIPS for the current period. The overexecution value affects the invoice/contract amount, not the RIPS records already reported for earlier periods.

## Exclusions And Special Cases

- Aesthetic services excluded from public financing and without CUPS are invoiced using conventional electronic invoice without health additional fields and without RIPS/MUV validation.
- Alternative medicine services without CUPS and paid directly by patients follow similar non-RIPS handling.
- Centros de Reconocimiento de Conductores are excluded.
- Clinical research centers are provisionally excluded per the document's 2025 discussion until a final decision is issued.
- Professionals independent billing particular patients must report RIPS sin factura when not obligated to FEV; if they invoice ERP or exceed the tax threshold, use FEV in salud according to the flow.

## API Docker Method Map

- `LoginSISPRO`: authenticate and obtain token.
- `CargarFevRips`: FEV + RIPS.
- `CargarNC` / `CargarNCParcial`: NC parcial + RIPS.
- `CargarNCTotal`: NC total without RIPS.
- `CargarND`: ND + RIPS.
- `CargarNCAcuerdoVoluntades`: NC without RIPS for agreement follow-up.
- `CargarRipsSinFactura`: RIPS JSON only.
- `CargarCapitaInicial`: XML FEV only.
- `CargarCapitaPeriodo`: XML FEV + previous-period RIPS.
- `CargarCapitaFinal`: RIPS JSON only.
- `CargarNCCapita`: XML NC only.
- `CargarNotaAjuste`: RIPS JSON only.

Token sessions are time-limited. The document references a 2-hour authentication window and token expiration rejection `TOT002`.

## Services For ERP And Other Payers

The API Docker solution also exposes payer-facing services:

- CUV consultation: ERP/pagadores can validate CUV for FEV+RIPS, NC parcial+RIPS, NC total, Nota Ajuste, ND+RIPS, RIPS sin factura, factura cápita, and NC acuerdo de voluntades. Depending on operation, the method receives XML and/or RIPS JSON plus CUV, recalculates/validates the CUV, and returns JSON.
- File download: ERP/pagadores can download XML/RIPS artifacts by CUV. The document states a daily cap of 1000 downloads and response URLs for XML and/or RIPS when applicable.
