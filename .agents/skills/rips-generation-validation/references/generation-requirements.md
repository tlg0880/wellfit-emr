# RIPS Generation Requirements

Use this file when mapping clinical/billing data into RIPS JSON or writing preflight validation.

## Source Principles

- Generate RIPS from primary clinical, administrative, billing, and authorization records.
- Resolve codes through SISPRO/reference catalogs. In this repo, inspect `resources/diccionario_tablas_corregido.json` and the `ripsReference` router before adding new catalog logic.
- Keep codes as codes in persisted/submitted data; labels are for display only.
- Preserve user and service consecutives so glosas, NC, ND, and NA can target the original records.
- Use exact decimal arithmetic for all money.

## JSON Hierarchy

The RIPS payload is hierarchical:

```text
transaccion
  usuarios[]
    servicios
      consultas[]
      procedimientos[]
      urgencias[]
      hospitalizacion[]
      recienNacidos[]
      medicamentos[]
      otrosServicios[]
```

Every reported user must have at least one service object unless the official schema for a special case explicitly permits otherwise.

## Transaction Data

- `T01 numDocumentoIdObligado`: NIT/document of the obligated entity. The lineamiento treats it as string, length 4-12. PSS/PTS should use NIT.
- `T02 numFactura`: invoice number as string according to DIAN rules. Use `null` for allowed RIPS sin FEV.
- `T03 tipoNota`: `NC`, `ND`, `NA`, or `RS` for RIPS sin FEV. If simultaneous NC partial and NA-style data adjustment occurs, use `NC`.
- `T04 numNota`: note number, or local consecutive for RIPS sin FEV.

Important discrepancy: page-level examples in the source still show `SF` for RIPS sin factura, but the control changes and transaction guidance state correction to `RS`. Prefer `RS` and expose the discrepancy if validating legacy payloads.

## User Data

- `U01 tipoDocumentoIdentificacion` and `U02 numDocumentoIdentificacion` depend on age, nationality, and identification availability.
- Adults Colombian age 18+ use `CC`.
- Minors 7-17 use `TI`.
- Children up to 6 use `RC`; up to 3 may use `RC` or `CN`.
- Foreigners may use `CE`, `CD`, `PA`, `SC`, `PE`, `DE`, `PT`, or `SI` according to status and catalog.
- Special populations without identification use `AS` or `MS` according to ADRES/MinSalud rules.
- `TI` and `CC` document numbers must be numeric only.
- If age is 19+, document type cannot be `RC`, `TI`, `MS`, or `CN`. The lineamiento notes a tolerance window around transition ages, so treat the exact official schema as authoritative.
- `AS` requires age over 18.
- Maximum document lengths: `CC` 10, `CE` 6, `CD` 16, `PA` 16, `SC` 16, `PE` 15, `RC` 11, `TI` 11, `CN` 9-20, `AS` 10, `MS` 12, `DE` 20, `PT` 20, `SI` 20.
- `U03 tipoUsuario`: must align with `COBERTURA_PLAN_BENEFICIOS` in the FEV health extension. Use `RIPSTipoUsuarioVersion2`.
- `U05 codSexo`: use SISPRO `Sexo` column/extra intended for user object: `M`, `F`, `I`.
- `U06 codPaisResidencia`: SISPRO `Pais`.
- `U07 codMunicipioResidencia`: SISPRO `Municipio`; required when residence country is Colombia.
- `U08 codZonaTerritorialResidencia`: SISPRO `ZonaVersion2`.
- `U09 incapacidad`: `SI` or `NO`.
- `U10 consecutivo`: starts at 1, increments by 1, unique inside the RIPS.
- `U11 codPaisOrigen`: SISPRO `Pais`.

## Cross-Cutting Service Rules

- Provider/site code fields (`C01`, `P01`, `R01`, `H01`, `N01`, `M01`, `S01`) use the full provider code. For habilitated PSS, the RIPS code includes the 12-character site code, unlike some XML contexts that use 10 characters.
- Service date/time must not be in the future, must be on/after patient birth, and must fit inside the invoice period when tied to FEV/NC/ND.
- Professional document fields must point to ReTHUS or authorized social-service professional records when applicable.
- CUPS codes must come from current CUPS; prestadores must not invent CUPS. If a procedure does not exist, use the closest valid official CUPS only when allowed by the lineamiento/business rule.
- CIE10 diagnosis codes must come from official tables and be coherent with sex/age/service. Avoid `V`, `Y`, `Z`, `R`, `W` categories as principal diagnosis unless clinically/operationally justified by the lineamiento.
- For event modality, service value must be greater than zero. For non-event modalities such as grouped, PGP, or capitation-like reporting, service values are generally zero.
- Payment moderator fields must reconcile with FEV health extension totals. If no payment moderator applies, concept/value fields must explicitly represent that state according to schema/catalog.
- Do not use `Anticipos` in RIPS concept-recaudo fields. Anticipos are XML `PrepaidPayment` only.

## Consultas

Use consultations for medical, dental, nursing, nutrition, optometry, psychology, work/social, therapy, interconsultation, juntas medicas, home/work visits, intrahospital care, and other CUPS consultation categories.

- Do not aggregate multiple consultations into one record.
- `C02 fechaInicioAtencion`: format `YYYY-MM-DD hh:mm`; inside invoice period.
- `C04 codConsulta`: CUPS consultation code.
- `C05 modalidadGrupoServicioTecSal`: `ModalidadAtencion`, typically values such as intramural, extramural, telemedicine variants.
- `C06 grupoServicios`: REPS group, e.g. consulta externa, apoyo diagnostico, internacion, quirurgico, atencion inmediata.
- `C07 codServicio`: three-digit habilitation service code, not CUPS.
- `C08 finalidadTecnologiaSalud`: use `RIPSFinalidadConsultaVersion2`, consultation-allowed column.
- `C09 causaMotivoAtencion`: use `RIPSCausaExternaVersion2` values.
- `C10` principal diagnosis; `C11-C13` related diagnoses; `C14` diagnosis type (`01` impression, `02` confirmed new, `03` confirmed repeated).
- `C15-C16`: professional document type/number.
- `C17 vrServicio`: event value or zero by modality.
- `C18-C20`: concept, value, and FEV number for payment moderator when applicable.
- `C21 consecutivo`: unique within user's consultations.

## Procedimientos

Use procedures for diagnostic, therapeutic, surgical/non-surgical, vaccination, dental procedures, labs, therapies, imaging, and similar CUPS-coded activities.

- `P02 fechaInicioAtencion`: inside invoice period.
- `P03 idMIPRES/entrega`: use when not financed by UPC or where MIPRES applies; otherwise `null`.
- `P04 numAutorizacion`: payer authorization; for presupuesto maximo it should align with MIPRES prescription.
- `P05 codProcedimiento`: valid CUPS procedure code.
- `P06 viaIngresoServicioSalud`: `ViaIngresoUsuario`.
- `P10 finalidadTecnologiaSalud`: use procedure-allowed values in the relevant finalidad catalog.
- `P11-P12`: professional who performed the procedure.
- `P13-P15`: principal, related, and complication diagnosis.
- `P16-P19`: service value and payment moderator details. Event modality requires positive service value; non-event modalities use zero.

## Urgencias With Observation

- Use when the patient remains in emergency observation.
- `R02` ingreso and `R11` egreso must fit invoice period and be coherent.
- Earlier rules required a prior emergency consultation; current lineamiento treats direct observation cases as possible and notes the validation should be notification rather than hard rejection.
- Condition/destination at discharge (`R09`) uses its reference table.
- If patient died, cause-of-death diagnosis is required.

## Hospitalizacion

- Use when the patient is admitted to hospitalization.
- Handle prolonged stays or payer change through the relevant fields (`H03`, `H14`) and discharge condition option for continued stay/cutoff when applicable.
- Admission/discharge dates must be coherent with patient birth, current date, and invoice period.
- If patient died, cause-of-death diagnosis is required.

## Recien Nacidos

- Required in the mother's RIPS when vaginal delivery or cesarean was attended.
- Newborn must have its own identification (`CN`, `RC`, or `MS` for special population), not the mother's document as a substitute in current guidance.
- If newborn is healthy and stays in alojamiento conjunto with mother, procedures in standard newborn protocol can be reported in mother's FEV/RIPS.
- If newborn requires hospitalization, create a separate admission and its own FEV/RIPS.
- `N07 codSexoBiologico`: use the newborn-specific `Sexo` options from the reference table: `01` male, `02` female, `03` indeterminate.

## Medicamentos

- `M04 fechaDispensAdmon`: date/time of administration or delivery.
- `M05-M06`: principal/related diagnosis justifying prescription.
- `M07 tipoMedicamento`: `TipoMedicamentoPOSVersion2`.
- `M08 codTecnologiaSalud`: IUM when available, otherwise CUM; for allowed preparations may use DCI/principle-active rules.
- `M09` may be blank/null when derivable from `M08`.
- `M10-M13`: concentration, unit of measure, pharmaceutical form, and minimum unit; use `UMM`, `FFM`, `UPR`.
- `M14 cantidadMedicamento`: required for billed medications.
- `M15 diasTratamiento`: integer days, no decimals; round up when needed.
- `M16-M17`: prescriber document.
- `M18-M19`: unit and total value; event positive, non-event zero.
- `M20-M22`: payment moderator details. Concept catalog includes `01` copago, `02` cuota moderadora, `03` shared payments in voluntary plans, `04` anticipos, `05` no aplica; do not use `04` in RIPS generation as support of FEV.

### Preparaciones Magistrales

- `M07 = "03"`.
- Generate one record per active principle when multiple principles are involved. Current guidance also allows a single-principle preparation in version context.
- Shared fields such as authorization, dispense date/time, unit, type, and pharmaceutical form must be consistent across the preparation's records.
- `M10` must be present for the preparation principle/concentration.
- Put `cantidadMedicamento`, `diasTratamiento`, `vrServicio`, and `valorPagoModerador` in one principle record, preferably the first; use zero in the others.
- For `M18`, either record each principle's unit value or put the sum in one principle and zero in the others.
- For `M19`, put total value in one principle and zero in the others.

## Otros Servicios

- `S05 tipoOtrosServicios`: SISPRO `TipoOtrosServicios`.
- `S06 codTecnologiaSalud`: devices may use IDM when implemented, otherwise UDI or local provider code if allowed; estancias, honorarios, and traslados use CUPS; complementary services use MIPRES reference.
- Include IVA in RIPS value when the invoiced device/service includes IVA and MUV expects RIPS/FEV value consistency.
- `S07 nomTecnologiaSalud`: required for devices/insumos; otherwise can be `null`.
- `S08 cantidadOS`: quantity; honorarios should use 1.
- For honorarios, use the procedure CUPS and differentiate professional/specialty by professional identity.
- Estancias must be supported by urgencias or hospitalizacion records.

## Reference Tables To Wire

At minimum, support these tables or their current official successors:

- `TipoNota`
- `TipoIdPISIS`
- `RIPSTipoUsuarioVersion2`
- `Sexo`
- `Pais`
- `Municipio`
- `ZonaVersion2`
- `LstSiNo`
- `IPSCodHabilitacion`
- `IPSnoREPS`
- `CUPSRips`
- `ModalidadAtencion`
- `GrupoServicios`
- `Servicios`
- `RIPSFinalidadConsultaVersion2`
- `RIPSCausaExternaVersion2`
- `CIE10`
- `ViaIngresoUsuario`
- `CondicionyDestinoUsuarioEgreso`
- `TipoMedicamentoPOSVersion2`
- `IUM`
- `CatalogoCUMs`
- `DCI`
- `UMM`
- `UPR`
- `FFM`
- `TipoOtrosServicios`
- `conceptoRecaudo`
- `ModalidadContratoyPago`
- `CoberturaPlanBeneficios`
