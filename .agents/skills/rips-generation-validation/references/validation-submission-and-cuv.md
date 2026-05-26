# Validation, Submission, And CUV

Use this file when implementing validation engines, MUV integration, response handling, or error displays.

## Validation Authority

Local validation is preflight. The authoritative result for radication is the MinSalud Mecanismo Unico de Validacion (MUV) response and CUV.

Still implement local validation to avoid preventable MUV rejections, improve UI feedback, and protect data quality before submission.

## Validation Layers

Implement validation in this order:

1. Structure/syntax: JSON Schema, required objects, data types, length, nullability, arrays.
2. Cross-document consistency: RIPS transaction, service values, payment moderators, NIT, invoice/note numbers, invoice period, and referenced invoice must match XML FEV/NC/ND.
3. Reference data: values must exist in SISPRO/current reference tables.
4. Correlated fields: age vs document type, date order, sex/age vs finalidad/CIE/CUPS, modality vs values, payer/cobertura vs user type.
5. Object coherence: users must have services, urgencies must be coherent with consults where applicable, childbirth with newborn data/procedures, estancias with hospitalizacion/urgencias, professionals with ReTHUS/MIPRES social-service records.

## Rejection vs Notification

- `RECHAZO`: block submission locally when the rule is deterministic and current. MUV will not issue CUV on active rejection.
- `NOTIFICACION`: do not block unless business policy says otherwise. Show clearly and persist for audit/quality improvement.
- Some rules changed from rejection to notification in the lineamiento. When uncertain, model rule severity as data so it can be updated without code changes.

## General RIPS Rules (RVG Family)

Implement these as rule families rather than one-off checks:

- `RVG01`: RIPS must match established JSON structure.
- `RVG02`: RIPS data must match FEV/electronic documents.
- `RVG03`: RIPS must include provided services.
- `RVG04-RVG05`: data type and length must match requirements.
- `RVG06`: content requirements and preparation magistral consistency. Often notification; include detailed medication checks.
- `RVG07`: users in user classification must be related to service data.
- `RVG08`: service totals must match FEV/related electronic document.
- `RVG09`: payment moderator values must match FEV.
- `RVG10`: only one health electronic biller per RIPS/invoice.
- `RVG11`: professionals for consultations, procedures, prescriptions, or orders must be in ReTHUS or authorized MIPRES/social-service source.
- `RVG12`: duplicate users with identical data.
- `RVG13`: duplicate medications for same user, usually notification.
- `RVG14`: multiple births may require corresponding multiple birth procedure.
- `RVG15`: urgencies observation should be coherent with emergency consultation; current guidance recognizes direct observation and treats this as notification rather than hard rejection.
- `RVG16`: cause that originates service should match between urgencies observation and emergency consultation.
- `RVG17`: if newborn receives services, newborn must also appear as a user and receive service records.
- `RVG18`: previously approved document/RIPS combination already has CUV.
- `RVG19`: PSS/PTS-to-PSS/PTS billing is not contemplated; treat as notification/rejection according to current official validator behavior.

## Field Rule Families (RVC)

Implement high-value RVC families first:

### Transaction And Biller

- `T01`: NIT must match FEV supplier NIT and exist in habilitation/provider references.
- `T02`: invoice number in RIPS must match FEV.
- Provider codes in service objects must exist and relate to `numDocumentoIdObligado`.
- PTS can only report user, medication, and other-service records when applicable.

### Users

- Birth date cannot be future and must align with document type.
- User type can be checked against ERP/cobertura in FEV.
- Newborn/maternal records should align with age/sex where relevant.
- Duplicate users should be rejected or flagged.

### Dates

- Service date/time cannot be future, cannot predate patient birth, and must fall inside invoice period for FEV-backed operations.
- Admission <= discharge; newborn birth <= newborn discharge; discharge cannot be future.
- If patient died, later services after death should be notified/rejected according to current rule severity.

### CUPS And CIE

- CUPS must correspond to the service object: consultation, procedure, traslado/estancia, otros servicios, etc.
- CUPS can be checked against sex, age, benefit plan/cobertura, service group, service code, finalidad, causa, diagnosis, quantity/day, and stay time.
- CIE can be checked against sex/age and against CUPS/finalidad.
- Related diagnoses should not duplicate principal diagnosis or each other.
- For promotion/maintenance finalidad, principal CIE should be coherent with `Z00-Z99` or the official current equivalent when that rule applies.

### Values And Payment Moderators

- Event modality: service value > 0.
- Other modalities: service value = 0 when the lineamiento requires it.
- RIPS sin FEV: monetary service values should be zero.
- Payment moderator sum in RIPS must match the FEV health-extension value.
- If no payment moderator applies, value must be zero.
- Subsidized users cannot be charged cuota moderadora; voluntary-plan moderator values must be coherent with user/cobertura.
- `Anticipos` applies only in FEV XML and must not be used in RIPS support.

### Clinical Object Coherence

- Parto/cesarea procedures should have newborn data when applicable.
- Surgical procedures in surgical group should have operating room/sala data in other services when rule applies.
- Estancias must be supported by urgencias/hospitalizacion.
- Hospital admission path can be validated against prior services.
- If condition at discharge is patient dead, cause-of-death diagnosis is required.

### Medications

- IUM/CUM/DCI should exist in current catalog.
- UNIRS and MVND should be checked against current competent lists when available.
- Preparaciones magistrales require consistent grouped records and one-record allocation of quantities/days/total values.
- Medication type `03` requires preparation-specific fields.

## Electronic Document XML Validations

Validate XML before MUV upload:

- File exists, extension is XML, not empty, and size <= 6 MB when using the documented client/server constraints.
- Required RIPS JSON file exists when operation requires it.
- XML is a DIAN `AttachedDocument` containing the correct document type (`Invoice`, `CreditNote`, or `DebitNote`) and `ApplicationResponse`.
- The document type selected by operation matches XML: FEV, NC, or ND.
- UBL 2.1 structure is valid enough to locate required paths.
- Required nodes exist: customization ID, ID, UUID/CUFE/CUDE, issue date, type code, monetary totals, supplier/customer tax IDs, supplier/customer names, invoice period, and health extension fields.
- `ApplicationResponse` must not indicate DIAN rejection.
- For NC/ND, `BillingReference.InvoiceDocumentReference` must reference the affected invoice.
- For NC, CreditNote `CustomizationID` should be `20`; for ND, DebitNote `CustomizationID` should be `30`.
- For FEV, validate the health operation type (`SS-CUFE`, `SS-CUDE`, `SS-POS`, `SS-SNum`, `SS-Reporte`, `SS-SinAporte`, or `SS-Recaudo`) and enforce the payment moderator/references behavior associated with that operation.
- Health extension fields such as `CODIGO_PRESTADOR`, `MODALIDAD_PAGO`, `COBERTURA_PLAN_BENEFICIOS`, `NUMERO_CONTRATO`, and `NUMERO_POLIZA` should be validated according to operation and current severity.
- The MUV validates relationship with DIAN-approved content; local code must not modify approved XML to make checks pass.

## Operation-Specific File Requirements

| Operation | XML | RIPS JSON | Notes |
| --- | --- | --- | --- |
| FEV+RIPS | yes | yes | Regular billing |
| NC total | yes | no | Full annulment/affectation |
| NC partial | yes | yes | Only accepted-glosa services |
| ND | yes | yes | Additional value/quantity or omitted services |
| NA RIPS | no | yes | No monetary change |
| RIPS sin factura | no | yes | `numFactura = null`, `tipoNota = "RS"` |
| Capita inicial | yes | no | First capitation FEV |
| Capita periodo | yes | yes | FEV current period + previous-period RIPS |
| Capita final | no | yes | Final RIPS |
| NC capita | yes | no | Capitation NC |
| NC acuerdo voluntades | yes | no | Contract follow-up, no RIPS effect |

## API Submission Pattern

For API Docker:

1. Authenticate with `LoginSISPRO`.
2. Send the selected method payload.
3. Include RIPS JSON in `rips`/`RIPS` field when required.
4. Include `XMLFEVFile` as Base64/byte array for `AttachedDocument` when required.
5. Store raw request metadata, response JSON, and timestamps.

## Digital Certificate Requirements

For API Docker deployments, require operational support for a client digital certificate. The source PDF states it must:

- authenticate the online identity of the user/entity;
- support digital signing of electronic documents for integrity and authenticity;
- support encryption of sensitive data sent to MinSalud services;
- be issued by a trusted certification authority accepted by the MinSalud platform.

The certificate requirement applies to entities choosing API Docker. The client/server solution does not require this certificate according to the lineamiento. Do not store private keys in source control; use secrets management and document rotation/expiry handling.

Typical successful response includes:

```json
{
  "ResultState": true,
  "ProcesoId": 1024,
  "NumFactura": "W5",
  "CodigoUnicoValidacion": "...",
  "FechaRadicacion": "2025-03-10T17:25:54.7705162+00:00",
  "RutaArchivos": null,
  "ResultadosValidacion": []
}
```

Do not discard notifications in an approved response. They remain useful for quality and payer traceability.

## CUV Handling

- Persist `CodigoUnicoValidacion`, response timestamp, process id, invoice/note number, operation type, and validation details.
- Treat a returned CUV as the evidence needed for radication with ERP/pagadores.
- For client/server, expected output files include local results and MSPS results files; the MSPS result file with CUV is transmitted to payer.
- For API Docker, store the response as JSON or txt according to internal document retention requirements.
- The document references CUV recovery when connectivity interruptions prevent the original CUV response from returning.

## CUV Recovery

If upload succeeded but the caller did not receive CUV due to connectivity:

- Do not generate a new invoice/note solely to retry the business event.
- Re-send/recover according to solution type.
- Client/server: re-send the files; solution should generate the CUV file when it detects prior successful processing.
- API Docker: call `api/ConsultasFevRips/RecuperarCUV` with body `{ "codigoUnicoValidacion": "CUV" }` when the response/rejection contains recoverable CUV evidence.
- Store recovery attempts and recovered responses.

## Contingency

Implement a contingency plan around:

- critical systems and data dependencies;
- risk analysis for data loss, hardware/software failures, cyberattacks, disasters, and connectivity;
- roles, responsibilities, vendor coordination, resources, and recovery steps;
- security controls, backups, monitoring, and antivirus/firewalls where applicable;
- periodic drills and staff training;
- updates when the FEV-RIPS model or technology changes.

When the facturador's own platform prevents transmission to the MUV, the facturador must execute its contingency plan and maintain evidence for delayed validation/submission.

## Help Desk Metadata

For operational screens or documentation, include MinSalud support references only if current:

- Email in the source: `soporte-fev-rips@minsalud.gov.co`.
- Phone in the source: Bogota `(601) 330 5043`, national `018000960020`.

These support channels are time-sensitive; verify before embedding in production UI.
