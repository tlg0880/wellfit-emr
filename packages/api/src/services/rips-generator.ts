import {
  billingItem,
  coverage,
  diagnosis,
  encounter,
  encounterParticipant,
  medicationOrder,
  organization,
  patient,
  practitioner,
  procedureRecord,
  serviceRequest,
  serviceUnit,
  site,
} from "@wellfit-emr/db/schema/clinical";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { Db } from "../context";

const MONEY_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

export interface RipsGenerationInput {
  invoiceNumber?: string | null;
  noteNumber?: string | null;
  noteType?: string | null;
  operationType?: string;
  organizationTaxId: string;
  payerId?: string;
  periodFrom: Date;
  periodTo: Date;
}

export interface RipsTransaction {
  numDocumentoIdObligado: string;
  numFactura: string | null;
  numNota: string | null;
  tipoNota: string | null;
  usuarios: RipsUsuario[];
}

export interface RipsUsuario {
  codMunicipioResidencia: string | null;
  codPaisOrigen: string;
  codPaisResidencia: string;
  codSexo: string;
  codZonaTerritorialResidencia: string | null;
  consecutivo: number;
  fechaNacimiento: string;
  incapacidad: string;
  numDocumentoIdentificacion: string;
  servicios: RipsServicios;
  tipoDocumentoIdentificacion: string;
  tipoUsuario: string;
}

export interface RipsServicios {
  consultas?: RipsConsulta[];
  hospitalizacion?: RipsHospitalizacion[];
  medicamentos?: RipsMedicamento[];
  otrosServicios?: RipsOtroServicio[];
  procedimientos?: RipsProcedimiento[];
  recienNacidos?: RipsRecienNacido[];
  urgencias?: RipsUrgencia[];
}

export interface RipsConsulta {
  causaMotivoAtencion: string | null;
  codConsulta: string;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  codPrestador: string;
  codServicio: string;
  conceptoRecaudo: string | null;
  consecutivo: number;
  fechaInicioAtencion: string;
  finalidadTecnologiaSalud: string;
  grupoServicios: string;
  modalidadGrupoServicioTecSal: string;
  numAutorizacion: string | null;
  numDocumentoIdentificacion: string;
  numFEVPagoModerador: string | null;
  tipoDiagnosticoPrincipal: string;
  tipoDocumentoIdentificacion: string;
  valorPagoModerador: string | null;
  vrServicio: string;
}

export interface RipsProcedimiento {
  codComplicacion: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado: string | null;
  codPrestador: string;
  codProcedimiento: string;
  codServicio: string;
  conceptoRecaudo: string | null;
  consecutivo: number;
  fechaInicioAtencion: string;
  finalidadTecnologiaSalud: string;
  grupoServicios: string;
  idMIPRES: string | null;
  modalidadGrupoServicioTecSal: string;
  numAutorizacion: string | null;
  numDocumentoIdentificacion: string;
  numFEVPagoModerador: string | null;
  tipoDocumentoIdentificacion: string;
  valorPagoModerador: string | null;
  viaIngresoServicioSalud: string;
  vrServicio: string;
}

export interface RipsUrgencia {
  causaMotivoAtencion: string | null;
  codDiagnosticoCausaMuerte: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  codPrestador: string;
  condicionDestinoUsuarioEgreso: string | null;
  consecutivo: number;
  fechaEgreso: string | null;
  fechaEgresoObservacion: string | null;
  fechaInicioAtencion: string;
  numAutorizacion: string | null;
}

export interface RipsHospitalizacion {
  causaMotivoAtencion: string | null;
  codDiagnosticoCausaMuerte: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  codPrestador: string;
  condicionDestinoUsuarioEgreso: string | null;
  consecutivo: number;
  fechaEgreso: string | null;
  fechaInicioAtencion: string;
  numAutorizacion: string | null;
}

export interface RipsRecienNacido {
  codDiagnosticoCausaMuerte: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codPrestador: string;
  codSexoBiologico: string;
  condicionDestinoUsuarioEgreso: string | null;
  consecutivo: number;
  edadGestacional: number;
  fechaNacimiento: string;
  numeroConsultasCPN: number;
  peso: number;
}

export interface RipsMedicamento {
  cantidadMedicamento: number;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado: string | null;
  codPrestador: string;
  codTecnologiaSalud: string;
  concentracionMedicamento: string | null;
  conceptoRecaudo: string | null;
  consecutivo: number;
  diasTratamiento: number;
  formaFarmaceutica: string | null;
  nomTecnologiaSalud: string | null;
  numAutorizacion: string | null;
  numDocumentoIdentificacion: string;
  numFEVPagoModerador: string | null;
  tipoDocumentoIdentificacion: string;
  tipoMedicamento: string;
  unidadMedida: string | null;
  unidadMinima: string | null;
  valorPagoModerador: string | null;
  vrServicio: string;
  vrUnitMedicamento: string;
}

export interface RipsOtroServicio {
  cantidadOS: number;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado: string | null;
  codPrestador: string;
  codTecnologiaSalud: string;
  conceptoRecaudo: string | null;
  consecutivo: number;
  nomTecnologiaSalud: string | null;
  numAutorizacion: string | null;
  numDocumentoIdentificacion: string;
  numDocumentoIdentificacionOP: string | null;
  numFEVPagoModerador: string | null;
  tipoDocumentoIdentificacion: string;
  tipoDocumentoIdentificacionOP: string | null;
  tipoOtrosServicios: string;
  valorPagoModerador: string | null;
  vrServicio: string;
}

export interface GeneratedRipsResult {
  encounterIds: string[];
  numUsers: number;
  serviceLinks: GeneratedRipsServiceLink[];
  totalValue: string;
  transaction: RipsTransaction;
}

export interface GeneratedRipsServiceLink {
  encounterId: string;
  patientId: string;
  serviceConsecutive: number;
  serviceType: string;
  userConsecutive: number;
}

export interface RipsGenerationIssue {
  field: string;
  message: string;
  path: string;
  sourceValue: unknown;
}

export class RipsGenerationError extends Error {
  issues: RipsGenerationIssue[];

  constructor(issues: RipsGenerationIssue[]) {
    const firstIssue = issues[0];
    super(
      firstIssue
        ? `Generacion RIPS bloqueada por ${issues.length} problema${issues.length === 1 ? "" : "s"} de calidad de datos. Primer problema: ${firstIssue.path}.${firstIssue.field}: ${firstIssue.message}`
        : "Generacion RIPS bloqueada por problemas de calidad de datos."
    );
    this.name = "RipsGenerationError";
    this.issues = issues;
  }
}

function addGenerationIssue(
  issues: RipsGenerationIssue[],
  path: string,
  field: string,
  message: string,
  sourceValue: unknown
): void {
  issues.push({ path, field, message, sourceValue });
}

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseMoneyToCents(value: string): bigint | null {
  const normalized = value.trim();
  const match = MONEY_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [units = "0", decimals = ""] = unsigned.split(".");
  const cents = BigInt(units) * 100n + BigInt(decimals.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function centsToMoneyString(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const units = absolute / 100n;
  const decimals = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "-" : ""}${units}.${decimals}`;
}

function isConsultaCups(code: string): boolean {
  return code.startsWith("89") || code.startsWith("87");
}

function requiresInvoice(input: RipsGenerationInput): boolean {
  return !["RIPS_SIN_FACTURA", "NOTA_AJUSTE_RIPS", "CAPITA_FINAL"].includes(
    input.operationType ?? "FEV_RIPS"
  );
}

function resolveNoteType(input: RipsGenerationInput): string | null {
  if (input.operationType === "RIPS_SIN_FACTURA") {
    return "RS";
  }
  if (input.operationType === "NC_PARCIAL") {
    return "NC";
  }
  if (input.operationType === "ND") {
    return "ND";
  }
  if (input.operationType === "NOTA_AJUSTE_RIPS") {
    return "NA";
  }
  return input.noteType ?? null;
}

function resolveInvoiceNumber(input: RipsGenerationInput): string | null {
  return requiresInvoice(input) ? (input.invoiceNumber ?? null) : null;
}

function mapPatientDocTypeToRips(docType: string): string {
  const map: Record<string, string> = {
    CC: "CC",
    TI: "TI",
    RC: "RC",
    CE: "CE",
    PA: "PA",
    CD: "CD",
    SC: "SC",
    PE: "PE",
    CN: "CN",
    AS: "AS",
    MS: "MS",
    DE: "DE",
    PT: "PT",
    SI: "SI",
  };
  return map[docType] ?? "CC";
}

function mapSexToRips(sex: string): string {
  if (sex === "male") {
    return "M";
  }
  if (sex === "female") {
    return "F";
  }
  return "I";
}

interface EncounterContext {
  billingItems: (typeof billingItem.$inferSelect)[];
  consultationProcedures: (typeof procedureRecord.$inferSelect)[];
  diagnoses: (typeof diagnosis.$inferSelect)[];
  dxRel1: string | null;
  enc: typeof encounter.$inferSelect & {
    siteCode: string;
    serviceCode: string;
    orgRepsCode: string | null;
  };
  fechaInicio: string;
  issues: RipsGenerationIssue[];
  medications: (typeof medicationOrder.$inferSelect)[];
  patDocNum: string;
  patDocType: string;
  payerId?: string;
  practitionerById: Map<string, typeof practitioner.$inferSelect>;
  primaryPractitioner: typeof practitioner.$inferSelect | undefined;
  principalDx: typeof diagnosis.$inferSelect | undefined;
  procedures: (typeof procedureRecord.$inferSelect)[];
  providerCode: string;
  relatedDx: (typeof diagnosis.$inferSelect)[];
  serviceRequests: (typeof serviceRequest.$inferSelect)[];
}

interface ServiceBuilderState {
  patientId: string;
  serviceConsecutive: number;
  serviceLinks: GeneratedRipsServiceLink[];
  services: RipsServicios;
  totalValueCents: bigint;
  userConsecutive: number;
}

function findBillingItem(
  billingItems: (typeof billingItem.$inferSelect)[],
  serviceType: string,
  serviceCode: string,
  payerId: string | undefined
): typeof billingItem.$inferSelect | undefined {
  return billingItems.find(
    (b) =>
      b.serviceType === serviceType &&
      b.serviceCode === serviceCode &&
      (!payerId || b.payerId === payerId)
  );
}

function getBillingValueCents(
  billingItems: (typeof billingItem.$inferSelect)[],
  serviceType: string,
  serviceCode: string,
  payerId: string | undefined,
  issues: RipsGenerationIssue[],
  path: string
): bigint | null {
  const item = findBillingItem(billingItems, serviceType, serviceCode, payerId);
  if (!item) {
    addGenerationIssue(
      issues,
      path,
      "billingItem",
      "No existe item de facturacion para el servicio y pagador seleccionados",
      { serviceType, serviceCode, payerId }
    );
    return null;
  }
  const cents = parseMoneyToCents(item.totalValue);
  if (cents === null) {
    addGenerationIssue(
      issues,
      path,
      "totalValue",
      "El valor facturado debe ser decimal exacto con maximo dos decimales",
      item.totalValue
    );
    return null;
  }
  return cents;
}

function resolvePractitioner(
  ctx: EncounterContext,
  practitionerId: string | null | undefined,
  path: string
): typeof practitioner.$inferSelect | null {
  const resolved =
    (practitionerId ? ctx.practitionerById.get(practitionerId) : undefined) ??
    ctx.primaryPractitioner;

  if (!resolved) {
    addGenerationIssue(
      ctx.issues,
      path,
      "practitionerId",
      "El servicio no tiene profesional asociado para reportar documento RIPS/ReTHUS",
      practitionerId ?? null
    );
    return null;
  }

  return resolved;
}

function getDiagnosisTypeCode(dx: typeof diagnosis.$inferSelect | undefined) {
  return dx?.diagnosisType ?? "01";
}

function buildConsultas(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  for (const proc of ctx.consultationProcedures) {
    const path = `encounters.${ctx.enc.id}.consultas.${proc.id}`;
    const value = getBillingValueCents(
      ctx.billingItems,
      "consulta",
      proc.cupsCode,
      ctx.payerId,
      ctx.issues,
      path
    );
    const professional = resolvePractitioner(ctx, proc.performerId, path);
    if (value === null || !professional) {
      continue;
    }

    state.serviceConsecutive++;
    state.totalValueCents += value;
    state.serviceLinks.push({
      encounterId: ctx.enc.id,
      patientId: state.patientId,
      serviceConsecutive: state.serviceConsecutive,
      serviceType: "consultas",
      userConsecutive: state.userConsecutive,
    });

    if (!state.services.consultas) {
      state.services.consultas = [];
    }
    state.services.consultas.push({
      codPrestador: ctx.providerCode,
      fechaInicioAtencion: proc.performedAt
        ? formatDateTime(new Date(proc.performedAt))
        : ctx.fechaInicio,
      numAutorizacion: null,
      codConsulta: proc.cupsCode,
      modalidadGrupoServicioTecSal: ctx.enc.careModality,
      grupoServicios: ctx.enc.encounterClass,
      codServicio: ctx.enc.serviceCode,
      finalidadTecnologiaSalud: ctx.enc.finalidadConsultaCode ?? "10",
      causaMotivoAtencion: ctx.enc.causeExternalCode ?? null,
      codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado1: ctx.relatedDx[0]?.code ?? null,
      codDiagnosticoRelacionado2: ctx.relatedDx[1]?.code ?? null,
      codDiagnosticoRelacionado3: ctx.relatedDx[2]?.code ?? null,
      tipoDiagnosticoPrincipal: getDiagnosisTypeCode(ctx.principalDx),
      tipoDocumentoIdentificacion: professional.documentType,
      numDocumentoIdentificacion: professional.documentNumber,
      vrServicio: centsToMoneyString(value),
      conceptoRecaudo: null,
      valorPagoModerador: null,
      numFEVPagoModerador: null,
      consecutivo: state.serviceConsecutive,
    });
  }
}

function buildUrgencias(
  _ctx: EncounterContext,
  _state: ServiceBuilderState
): void {
  // Urgencias with observation needs dedicated clinical source fields before
  // it can be generated safely. Do not synthesize it from encounter class.
}

function buildHospitalizacion(
  _ctx: EncounterContext,
  _state: ServiceBuilderState
): void {
  // Hospitalization requires admission/discharge evidence beyond the generic
  // encounter record. Do not synthesize it from encounter class.
}

function buildProcedimientos(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  for (const proc of ctx.procedures.filter(
    (p) => !isConsultaCups(p.cupsCode)
  )) {
    const path = `encounters.${ctx.enc.id}.procedimientos.${proc.id}`;
    const value = getBillingValueCents(
      ctx.billingItems,
      "procedimiento",
      proc.cupsCode,
      ctx.payerId,
      ctx.issues,
      path
    );
    const professional = resolvePractitioner(ctx, proc.performerId, path);
    if (value === null || !professional) {
      continue;
    }

    state.serviceConsecutive++;
    state.totalValueCents += value;
    state.serviceLinks.push({
      encounterId: ctx.enc.id,
      patientId: state.patientId,
      serviceConsecutive: state.serviceConsecutive,
      serviceType: "procedimientos",
      userConsecutive: state.userConsecutive,
    });

    if (!state.services.procedimientos) {
      state.services.procedimientos = [];
    }
    state.services.procedimientos.push({
      codPrestador: ctx.providerCode,
      fechaInicioAtencion: proc.performedAt
        ? formatDateTime(new Date(proc.performedAt))
        : ctx.fechaInicio,
      idMIPRES: null,
      numAutorizacion: null,
      codProcedimiento: proc.cupsCode,
      viaIngresoServicioSalud: "01",
      modalidadGrupoServicioTecSal: ctx.enc.careModality,
      grupoServicios: ctx.enc.encounterClass,
      codServicio: ctx.enc.serviceCode,
      finalidadTecnologiaSalud: "01",
      tipoDocumentoIdentificacion: professional.documentType,
      numDocumentoIdentificacion: professional.documentNumber,
      codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: ctx.dxRel1,
      codComplicacion: null,
      vrServicio: centsToMoneyString(value),
      conceptoRecaudo: null,
      valorPagoModerador: null,
      numFEVPagoModerador: null,
      consecutivo: state.serviceConsecutive,
    });
  }
}

function buildMedicamentos(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  for (const med of ctx.medications) {
    const code = med.atcCode ?? "";
    const path = `encounters.${ctx.enc.id}.medicamentos.${med.id}`;
    if (!code) {
      addGenerationIssue(
        ctx.issues,
        path,
        "codTecnologiaSalud",
        "El medicamento no tiene codigo de tecnologia en salud para RIPS",
        med.atcCode
      );
      continue;
    }
    const billing = findBillingItem(
      ctx.billingItems,
      "medicamento",
      code,
      ctx.payerId
    );
    if (!billing) {
      addGenerationIssue(
        ctx.issues,
        path,
        "billingItem",
        "No existe item de facturacion para el medicamento y pagador seleccionados",
        { serviceType: "medicamento", serviceCode: code, payerId: ctx.payerId }
      );
      continue;
    }
    const totalValue = parseMoneyToCents(billing.totalValue);
    const unitValue = parseMoneyToCents(billing.unitValue);
    if (totalValue === null || unitValue === null) {
      addGenerationIssue(
        ctx.issues,
        path,
        "billingItem",
        "Los valores facturados del medicamento deben ser decimales exactos con maximo dos decimales",
        { unitValue: billing.unitValue, totalValue: billing.totalValue }
      );
      continue;
    }
    const professional = resolvePractitioner(ctx, med.prescriberId, path);
    if (!professional) {
      continue;
    }

    state.serviceConsecutive++;
    state.totalValueCents += totalValue;
    state.serviceLinks.push({
      encounterId: ctx.enc.id,
      patientId: state.patientId,
      serviceConsecutive: state.serviceConsecutive,
      serviceType: "medicamentos",
      userConsecutive: state.userConsecutive,
    });

    if (!state.services.medicamentos) {
      state.services.medicamentos = [];
    }
    state.services.medicamentos.push({
      codPrestador: ctx.providerCode,
      numAutorizacion: null,
      codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: ctx.dxRel1,
      tipoMedicamento: "01",
      codTecnologiaSalud: code,
      nomTecnologiaSalud: med.genericName,
      concentracionMedicamento: med.concentration,
      unidadMedida: med.doseUnit,
      formaFarmaceutica: med.dosageForm,
      unidadMinima: med.doseUnit,
      cantidadMedicamento: Number(med.quantityTotal) || 1,
      diasTratamiento: 7,
      tipoDocumentoIdentificacion: professional.documentType,
      numDocumentoIdentificacion: professional.documentNumber,
      vrUnitMedicamento: centsToMoneyString(unitValue),
      vrServicio: centsToMoneyString(totalValue),
      conceptoRecaudo: null,
      valorPagoModerador: null,
      numFEVPagoModerador: null,
      consecutivo: state.serviceConsecutive,
    });
  }
}

function buildOtrosServicios(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  for (const sr of ctx.serviceRequests) {
    const path = `encounters.${ctx.enc.id}.otrosServicios.${sr.id}`;
    const value = getBillingValueCents(
      ctx.billingItems,
      "otro_servicio",
      sr.requestCode,
      ctx.payerId,
      ctx.issues,
      path
    );
    const professional = resolvePractitioner(ctx, sr.requestedBy, path);
    if (value === null || !professional) {
      continue;
    }

    state.serviceConsecutive++;
    state.totalValueCents += value;
    state.serviceLinks.push({
      encounterId: ctx.enc.id,
      patientId: state.patientId,
      serviceConsecutive: state.serviceConsecutive,
      serviceType: "otrosServicios",
      userConsecutive: state.userConsecutive,
    });

    if (!state.services.otrosServicios) {
      state.services.otrosServicios = [];
    }
    state.services.otrosServicios.push({
      codPrestador: ctx.providerCode,
      numAutorizacion: null,
      codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: ctx.dxRel1,
      tipoDocumentoIdentificacion: professional.documentType,
      numDocumentoIdentificacion: professional.documentNumber,
      tipoOtrosServicios: "01",
      codTecnologiaSalud: sr.requestCode,
      nomTecnologiaSalud: null,
      cantidadOS: 1,
      tipoDocumentoIdentificacionOP: null,
      numDocumentoIdentificacionOP: null,
      vrServicio: centsToMoneyString(value),
      conceptoRecaudo: null,
      valorPagoModerador: null,
      numFEVPagoModerador: null,
      consecutivo: state.serviceConsecutive,
    });
  }
}

export async function generateRipsPayload(
  db: Db,
  input: RipsGenerationInput
): Promise<GeneratedRipsResult> {
  const { periodFrom, periodTo, organizationTaxId } = input;
  const issues: RipsGenerationIssue[] = [];

  if (requiresInvoice(input) && !input.invoiceNumber) {
    addGenerationIssue(
      issues,
      "transaccion",
      "invoiceNumber",
      "El numero de factura es obligatorio para operaciones FEV/NC/ND con RIPS",
      input.invoiceNumber ?? null
    );
  }

  if (
    ["RIPS_SIN_FACTURA", "NC_PARCIAL", "ND", "NOTA_AJUSTE_RIPS"].includes(
      input.operationType ?? ""
    ) &&
    !input.noteNumber
  ) {
    addGenerationIssue(
      issues,
      "transaccion",
      "noteNumber",
      "La operacion seleccionada requiere numero de nota o consecutivo local",
      input.noteNumber ?? null
    );
  }

  if (issues.length > 0) {
    throw new RipsGenerationError(issues);
  }

  const baseFilters = [
    gte(encounter.startedAt, periodFrom),
    lte(encounter.startedAt, periodTo),
    eq(encounter.status, "finished"),
  ];

  if (input.payerId) {
    const coveredPatientIds = await db
      .select({ patientId: coverage.patientId })
      .from(coverage)
      .where(
        and(
          eq(coverage.payerId, input.payerId),
          lte(coverage.effectiveFrom, periodTo),
          or(
            isNull(coverage.effectiveTo),
            gte(coverage.effectiveTo, periodFrom)
          )
        )
      );

    const patientIds = coveredPatientIds.map((c) => c.patientId);
    if (patientIds.length === 0) {
      return {
        transaction: {
          numDocumentoIdObligado: organizationTaxId,
          numFactura: resolveInvoiceNumber(input),
          tipoNota: resolveNoteType(input),
          numNota: input.noteNumber ?? null,
          usuarios: [],
        },
        numUsers: 0,
        serviceLinks: [],
        totalValue: "0.00",
        encounterIds: [],
      };
    }

    baseFilters.push(inArray(encounter.patientId, patientIds));
  }

  const encounterRows = await db
    .select({
      encounter,
      patient,
      site,
      serviceUnit,
      organization,
    })
    .from(encounter)
    .innerJoin(patient, eq(encounter.patientId, patient.id))
    .innerJoin(site, eq(encounter.siteId, site.id))
    .innerJoin(serviceUnit, eq(encounter.serviceUnitId, serviceUnit.id))
    .innerJoin(organization, eq(site.organizationId, organization.id))
    .where(and(...baseFilters))
    .orderBy(encounter.patientId, encounter.startedAt);

  if (encounterRows.length === 0) {
    return {
      transaction: {
        numDocumentoIdObligado: organizationTaxId,
        numFactura: resolveInvoiceNumber(input),
        tipoNota: resolveNoteType(input),
        numNota: input.noteNumber ?? null,
        usuarios: [],
      },
      numUsers: 0,
      serviceLinks: [],
      totalValue: "0.00",
      encounterIds: [],
    };
  }

  const byPatient = groupEncountersByPatient(encounterRows);
  const allEncounterIds = encounterRows.map((r) => r.encounter.id);
  const allPatientIds = [...byPatient.keys()];
  const bulk = await fetchBulkClinicalData(
    db,
    allEncounterIds,
    allPatientIds,
    periodFrom,
    periodTo,
    input.payerId
  );

  let userConsecutive = 0;
  const ripsUsuarios: RipsUsuario[] = [];
  const includedEncounterIds: string[] = [];
  const serviceLinks: GeneratedRipsServiceLink[] = [];

  for (const [, group] of byPatient) {
    userConsecutive++;
    const {
      usuario,
      includedEncounterIds: ids,
      serviceLinks: links,
    } = buildRipsUsuario(
      group,
      bulk,
      organizationTaxId,
      userConsecutive,
      input.payerId,
      issues
    );
    ripsUsuarios.push(usuario);
    includedEncounterIds.push(...ids);
    serviceLinks.push(...links);
  }

  if (issues.length > 0) {
    throw new RipsGenerationError(issues);
  }

  const totalValue = calculateTotalValueCents(ripsUsuarios);

  const transaction: RipsTransaction = {
    numDocumentoIdObligado: organizationTaxId,
    numFactura: resolveInvoiceNumber(input),
    tipoNota: resolveNoteType(input),
    numNota: input.noteNumber ?? null,
    usuarios: ripsUsuarios,
  };

  return {
    transaction,
    numUsers: ripsUsuarios.length,
    serviceLinks,
    totalValue: centsToMoneyString(totalValue),
    encounterIds: includedEncounterIds,
  };
}

function calculateTotalValueCents(usuarios: RipsUsuario[]): bigint {
  let total = 0n;
  for (const u of usuarios) {
    for (const c of u.servicios.consultas ?? []) {
      total += parseMoneyToCents(c.vrServicio) ?? 0n;
    }
    for (const p of u.servicios.procedimientos ?? []) {
      total += parseMoneyToCents(p.vrServicio) ?? 0n;
    }
    for (const m of u.servicios.medicamentos ?? []) {
      total += parseMoneyToCents(m.vrServicio) ?? 0n;
    }
    for (const o of u.servicios.otrosServicios ?? []) {
      total += parseMoneyToCents(o.vrServicio) ?? 0n;
    }
  }
  return total;
}

interface PatientGroup {
  encounters: (typeof encounter.$inferSelect & {
    siteCode: string;
    serviceCode: string;
    orgRepsCode: string | null;
  })[];
  patient: typeof patient.$inferSelect;
}

function groupEncountersByPatient(
  encounterRows: {
    encounter: typeof encounter.$inferSelect;
    patient: typeof patient.$inferSelect;
    site: typeof site.$inferSelect;
    serviceUnit: typeof serviceUnit.$inferSelect;
    organization: typeof organization.$inferSelect;
  }[]
): Map<string, PatientGroup> {
  const byPatient = new Map<string, PatientGroup>();
  for (const row of encounterRows) {
    const pid = row.patient.id;
    if (!byPatient.has(pid)) {
      byPatient.set(pid, { patient: row.patient, encounters: [] });
    }
    const group = byPatient.get(pid);
    if (group) {
      group.encounters.push({
        ...row.encounter,
        siteCode: row.site.siteCode,
        serviceCode: row.serviceUnit.serviceCode,
        orgRepsCode: row.organization.repsCode,
      });
    }
  }
  return byPatient;
}

interface BulkClinicalData {
  billingItemsByEncounter: Map<string, (typeof billingItem.$inferSelect)[]>;
  coverageByPatient: Map<string, typeof coverage.$inferSelect>;
  diagnosesByEncounter: Map<string, (typeof diagnosis.$inferSelect)[]>;
  encounterPractitionersByEncounter: Map<
    string,
    (typeof practitioner.$inferSelect)[]
  >;
  medicationsByEncounter: Map<string, (typeof medicationOrder.$inferSelect)[]>;
  practitionerById: Map<string, typeof practitioner.$inferSelect>;
  proceduresByEncounter: Map<string, (typeof procedureRecord.$inferSelect)[]>;
  serviceRequestsByEncounter: Map<
    string,
    (typeof serviceRequest.$inferSelect)[]
  >;
}

async function fetchBulkClinicalData(
  db: Db,
  encounterIds: string[],
  patientIds: string[],
  periodFrom: Date,
  periodTo: Date,
  payerId?: string
): Promise<BulkClinicalData> {
  const [
    diagnosesRows,
    proceduresRows,
    medicationsRows,
    serviceRequestsRows,
    billingItemsRows,
    encounterPractitionerRows,
    coverageRows,
  ] = await Promise.all([
    db
      .select()
      .from(diagnosis)
      .where(inArray(diagnosis.encounterId, encounterIds)),
    db
      .select()
      .from(procedureRecord)
      .where(inArray(procedureRecord.encounterId, encounterIds)),
    db
      .select()
      .from(medicationOrder)
      .where(inArray(medicationOrder.encounterId, encounterIds)),
    db
      .select()
      .from(serviceRequest)
      .where(inArray(serviceRequest.encounterId, encounterIds)),
    db
      .select()
      .from(billingItem)
      .where(
        payerId
          ? and(
              inArray(billingItem.encounterId, encounterIds),
              eq(billingItem.payerId, payerId)
            )
          : inArray(billingItem.encounterId, encounterIds)
      ),
    db
      .select({
        encounterId: encounterParticipant.encounterId,
        practitioner,
      })
      .from(encounterParticipant)
      .innerJoin(
        practitioner,
        eq(encounterParticipant.practitionerId, practitioner.id)
      )
      .where(inArray(encounterParticipant.encounterId, encounterIds)),
    db
      .select()
      .from(coverage)
      .where(
        and(
          inArray(coverage.patientId, patientIds),
          ...(payerId ? [eq(coverage.payerId, payerId)] : []),
          lte(coverage.effectiveFrom, periodTo),
          or(
            isNull(coverage.effectiveTo),
            gte(coverage.effectiveTo, periodFrom)
          )
        )
      ),
  ]);

  const practitionerIds = new Set<string>();
  for (const proc of proceduresRows) {
    if (proc.performerId) {
      practitionerIds.add(proc.performerId);
    }
  }
  for (const med of medicationsRows) {
    practitionerIds.add(med.prescriberId);
  }
  for (const request of serviceRequestsRows) {
    practitionerIds.add(request.requestedBy);
  }
  for (const row of encounterPractitionerRows) {
    practitionerIds.add(row.practitioner.id);
  }

  const practitionerRows =
    practitionerIds.size > 0
      ? await db
          .select()
          .from(practitioner)
          .where(inArray(practitioner.id, [...practitionerIds]))
      : [];

  return {
    billingItemsByEncounter: groupBy(billingItemsRows, "encounterId"),
    coverageByPatient: new Map(coverageRows.map((c) => [c.patientId, c])),
    diagnosesByEncounter: groupBy(diagnosesRows, "encounterId"),
    encounterPractitionersByEncounter: groupByNestedPractitioners(
      encounterPractitionerRows
    ),
    proceduresByEncounter: groupBy(proceduresRows, "encounterId"),
    medicationsByEncounter: groupBy(medicationsRows, "encounterId"),
    practitionerById: new Map(practitionerRows.map((p) => [p.id, p])),
    serviceRequestsByEncounter: groupBy(serviceRequestsRows, "encounterId"),
  };
}

function buildRipsUsuario(
  group: PatientGroup,
  bulk: BulkClinicalData,
  organizationTaxId: string,
  userConsecutive: number,
  payerId: string | undefined,
  issues: RipsGenerationIssue[]
): {
  usuario: RipsUsuario;
  includedEncounterIds: string[];
  serviceLinks: GeneratedRipsServiceLink[];
  state: ServiceBuilderState;
} {
  const pat = group.patient;
  const patDocType = mapPatientDocTypeToRips(pat.primaryDocumentType);
  const patDocNum = pat.primaryDocumentNumber;
  const countryCode = pat.countryCode ?? "170";
  const patientCoverage = bulk.coverageByPatient.get(pat.id);

  if (!patientCoverage) {
    addGenerationIssue(
      issues,
      `usuarios.${pat.id}`,
      "tipoUsuario",
      "El paciente no tiene cobertura vigente para el pagador del RIPS",
      pat.id
    );
  }

  if (patDocType !== pat.primaryDocumentType) {
    addGenerationIssue(
      issues,
      `usuarios.${pat.id}`,
      "tipoDocumentoIdentificacion",
      "Tipo de documento del paciente no mapea a un codigo RIPS valido",
      pat.primaryDocumentType
    );
  }

  const state: ServiceBuilderState = {
    patientId: pat.id,
    services: {},
    serviceConsecutive: 0,
    serviceLinks: [],
    totalValueCents: 0n,
    userConsecutive,
  };

  const includedEncounterIds: string[] = [];

  for (const enc of group.encounters) {
    includedEncounterIds.push(enc.id);
    const diagnoses = bulk.diagnosesByEncounter.get(enc.id) ?? [];
    const principalDx =
      diagnoses.find((d) => d.rank === 1 || d.diagnosisType === "principal") ??
      diagnoses[0];
    const relatedDx = diagnoses.filter((d) => d.id !== principalDx?.id);
    const dxRel1 = relatedDx[0]?.code ?? null;
    const procedures = bulk.proceduresByEncounter.get(enc.id) ?? [];
    const consultationProcedures = procedures.filter((p) =>
      isConsultaCups(p.cupsCode)
    );
    const encounterPractitioners =
      bulk.encounterPractitionersByEncounter.get(enc.id) ?? [];
    const primaryPractitioner = encounterPractitioners[0];

    if (!enc.siteCode || enc.siteCode.length < 4) {
      addGenerationIssue(
        issues,
        `encounters.${enc.id}`,
        "codPrestador",
        "La sede debe tener codigo de prestador habilitado para reportar RIPS",
        enc.siteCode
      );
    }

    const ctx: EncounterContext = {
      enc,
      diagnoses,
      principalDx,
      relatedDx,
      dxRel1,
      procedures,
      consultationProcedures,
      medications: bulk.medicationsByEncounter.get(enc.id) ?? [],
      serviceRequests: bulk.serviceRequestsByEncounter.get(enc.id) ?? [],
      billingItems: bulk.billingItemsByEncounter.get(enc.id) ?? [],
      providerCode: enc.siteCode || enc.orgRepsCode || organizationTaxId,
      fechaInicio: formatDateTime(new Date(enc.startedAt)),
      patDocType,
      patDocNum,
      payerId,
      issues,
      practitionerById: bulk.practitionerById,
      primaryPractitioner,
    };

    buildConsultas(ctx, state);
    buildUrgencias(ctx, state);
    buildHospitalizacion(ctx, state);
    buildProcedimientos(ctx, state);
    buildMedicamentos(ctx, state);
    buildOtrosServicios(ctx, state);
  }

  const birthDate = new Date(pat.birthDate);
  const usuario: RipsUsuario = {
    tipoDocumentoIdentificacion: patDocType,
    numDocumentoIdentificacion: patDocNum,
    tipoUsuario: patientCoverage?.affiliateType ?? "01",
    fechaNacimiento: formatDate(birthDate),
    codSexo: mapSexToRips(pat.sexAtBirth),
    codPaisResidencia: countryCode,
    codMunicipioResidencia: pat.municipalityCode ?? null,
    codZonaTerritorialResidencia: pat.zoneCode ?? null,
    incapacidad: "NO",
    consecutivo: userConsecutive,
    codPaisOrigen: countryCode,
    servicios: state.services,
  };

  const hasServices = Object.values(state.services).some(
    (arr) => Array.isArray(arr) && arr.length > 0
  );
  if (!hasServices) {
    addGenerationIssue(
      issues,
      `usuarios.${pat.id}`,
      "servicios",
      "El paciente tiene encuentros en el periodo, pero ningun servicio RIPS generable con datos completos",
      pat.id
    );
  }

  return {
    usuario,
    includedEncounterIds,
    serviceLinks: state.serviceLinks,
    state,
  };
}

function groupBy<T extends Record<string, unknown>>(
  arr: T[],
  key: keyof T
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = String(item[key]);
    if (!map.has(k)) {
      map.set(k, []);
    }
    const list = map.get(k);
    if (list) {
      list.push(item);
    }
  }
  return map;
}

function groupByNestedPractitioners(
  rows: {
    encounterId: string;
    practitioner: typeof practitioner.$inferSelect;
  }[]
): Map<string, (typeof practitioner.$inferSelect)[]> {
  const map = new Map<string, (typeof practitioner.$inferSelect)[]>();
  for (const row of rows) {
    if (!map.has(row.encounterId)) {
      map.set(row.encounterId, []);
    }
    map.get(row.encounterId)?.push(row.practitioner);
  }
  return map;
}
