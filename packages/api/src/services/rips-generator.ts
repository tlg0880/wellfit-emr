import {
  diagnosis,
  encounter,
  medicationOrder,
  organization,
  patient,
  procedureRecord,
  serviceRequest,
  serviceUnit,
  site,
} from "@wellfit-emr/db/schema/clinical";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import type { Db } from "../context";

export interface RipsGenerationInput {
  invoiceNumber?: string | null;
  noteNumber?: string | null;
  noteType?: string | null;
  operationType?: string;
  organizationTaxId: string;
  payerId: string;
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
  totalValue: string;
  transaction: RipsTransaction;
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

function toMoneyString(value: number): string {
  return value.toFixed(2);
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
  cupsConsulta: string;
  diagnoses: (typeof diagnosis.$inferSelect)[];
  dxRel1: string | null;
  enc: typeof encounter.$inferSelect & {
    siteCode: string;
    serviceCode: string;
    orgRepsCode: string | null;
  };
  fechaInicio: string;
  medications: (typeof medicationOrder.$inferSelect)[];
  patDocNum: string;
  patDocType: string;
  principalDx: (typeof diagnosis.$inferSelect) | undefined;
  procedures: (typeof procedureRecord.$inferSelect)[];
  providerCode: string;
  relatedDx: (typeof diagnosis.$inferSelect)[];
  serviceRequests: (typeof serviceRequest.$inferSelect)[];
}

interface ServiceBuilderState {
  serviceConsecutive: number;
  services: RipsServicios;
  totalValue: number;
}

function buildConsultas(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  if (
    ctx.enc.encounterClass !== "ambulatory" &&
    ctx.enc.encounterClass !== "outpatient"
  ) {
    return;
  }
  state.serviceConsecutive++;
  const value = 50_000;
  state.totalValue += value;

  if (!state.services.consultas) {
    state.services.consultas = [];
  }
  state.services.consultas.push({
    codPrestador: ctx.providerCode,
    fechaInicioAtencion: ctx.fechaInicio,
    numAutorizacion: null,
    codConsulta: ctx.cupsConsulta,
    modalidadGrupoServicioTecSal: ctx.enc.careModality ?? "01",
    grupoServicios: ctx.enc.modalidadAtencionCode ?? "01",
    codServicio: ctx.enc.serviceCode ?? "101",
    finalidadTecnologiaSalud: ctx.enc.finalidadConsultaCode ?? "10",
    causaMotivoAtencion: ctx.enc.causeExternalCode ?? null,
    codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
    codDiagnosticoRelacionado1: ctx.relatedDx[0]?.code ?? null,
    codDiagnosticoRelacionado2: ctx.relatedDx[1]?.code ?? null,
    codDiagnosticoRelacionado3: ctx.relatedDx[2]?.code ?? null,
    tipoDiagnosticoPrincipal:
      ctx.principalDx?.diagnosisType === "confirmed" ? "02" : "01",
    tipoDocumentoIdentificacion: ctx.patDocType,
    numDocumentoIdentificacion: ctx.patDocNum,
    vrServicio: toMoneyString(value),
    conceptoRecaudo: null,
    valorPagoModerador: null,
    numFEVPagoModerador: null,
    consecutivo: state.serviceConsecutive,
  });
}

function buildUrgencias(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  if (ctx.enc.encounterClass !== "emergency") {
    return;
  }
  state.serviceConsecutive++;
  const value = 75_000;
  state.totalValue += value;

  if (!state.services.urgencias) {
    state.services.urgencias = [];
  }
  state.services.urgencias.push({
    codPrestador: ctx.providerCode,
    fechaInicioAtencion: ctx.fechaInicio,
    fechaEgreso: ctx.enc.endedAt
      ? formatDateTime(new Date(ctx.enc.endedAt))
      : null,
    numAutorizacion: null,
    causaMotivoAtencion: ctx.enc.causeExternalCode ?? null,
    codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
    codDiagnosticoRelacionado1: ctx.relatedDx[0]?.code ?? null,
    codDiagnosticoRelacionado2: ctx.relatedDx[1]?.code ?? null,
    codDiagnosticoRelacionado3: ctx.relatedDx[2]?.code ?? null,
    condicionDestinoUsuarioEgreso: ctx.enc.condicionDestinoCode ?? null,
    codDiagnosticoCausaMuerte: null,
    fechaEgresoObservacion: ctx.enc.endedAt
      ? formatDateTime(new Date(ctx.enc.endedAt))
      : null,
    consecutivo: state.serviceConsecutive,
  });
}

function buildHospitalizacion(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  if (ctx.enc.encounterClass !== "inpatient") {
    return;
  }
  state.serviceConsecutive++;
  const value = 150_000;
  state.totalValue += value;

  if (!state.services.hospitalizacion) {
    state.services.hospitalizacion = [];
  }
  state.services.hospitalizacion.push({
    codPrestador: ctx.providerCode,
    fechaInicioAtencion: ctx.fechaInicio,
    fechaEgreso: ctx.enc.endedAt
      ? formatDateTime(new Date(ctx.enc.endedAt))
      : null,
    numAutorizacion: null,
    causaMotivoAtencion: ctx.enc.causeExternalCode ?? null,
    codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
    codDiagnosticoRelacionado1: ctx.relatedDx[0]?.code ?? null,
    codDiagnosticoRelacionado2: ctx.relatedDx[1]?.code ?? null,
    codDiagnosticoRelacionado3: ctx.relatedDx[2]?.code ?? null,
    condicionDestinoUsuarioEgreso: ctx.enc.condicionDestinoCode ?? null,
    codDiagnosticoCausaMuerte: null,
    consecutivo: state.serviceConsecutive,
  });
}

function buildProcedimientos(
  ctx: EncounterContext,
  state: ServiceBuilderState
): void {
  for (const proc of ctx.procedures) {
    state.serviceConsecutive++;
    const value = 30_000;
    state.totalValue += value;

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
      modalidadGrupoServicioTecSal: ctx.enc.careModality ?? "01",
      grupoServicios: ctx.enc.modalidadAtencionCode ?? "01",
      codServicio: ctx.enc.serviceCode ?? "101",
      finalidadTecnologiaSalud: "01",
      tipoDocumentoIdentificacion: ctx.patDocType,
      numDocumentoIdentificacion: ctx.patDocNum,
      codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: ctx.dxRel1,
      codComplicacion: null,
      vrServicio: toMoneyString(value),
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
    state.serviceConsecutive++;
    const value = 15_000;
    state.totalValue += value;

    if (!state.services.medicamentos) {
      state.services.medicamentos = [];
    }
    state.services.medicamentos.push({
      codPrestador: ctx.providerCode,
      numAutorizacion: null,
      codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: ctx.dxRel1,
      tipoMedicamento: "01",
      codTecnologiaSalud: med.atcCode ?? "000000",
      nomTecnologiaSalud: med.genericName,
      concentracionMedicamento: med.concentration,
      unidadMedida: med.doseUnit,
      formaFarmaceutica: med.dosageForm,
      unidadMinima: med.doseUnit,
      cantidadMedicamento: Number(med.quantityTotal) || 1,
      diasTratamiento: 7,
      tipoDocumentoIdentificacion: ctx.patDocType,
      numDocumentoIdentificacion: ctx.patDocNum,
      vrUnitMedicamento: toMoneyString(value),
      vrServicio: toMoneyString(value),
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
    state.serviceConsecutive++;
    const value = 25_000;
    state.totalValue += value;

    if (!state.services.otrosServicios) {
      state.services.otrosServicios = [];
    }
    state.services.otrosServicios.push({
      codPrestador: ctx.providerCode,
      numAutorizacion: null,
      codDiagnosticoPrincipal: ctx.principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: ctx.dxRel1,
      tipoDocumentoIdentificacion: ctx.patDocType,
      numDocumentoIdentificacion: ctx.patDocNum,
      tipoOtrosServicios: "01",
      codTecnologiaSalud: sr.requestCode,
      nomTecnologiaSalud: null,
      cantidadOS: 1,
      tipoDocumentoIdentificacionOP: null,
      numDocumentoIdentificacionOP: null,
      vrServicio: toMoneyString(value),
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
    .where(
      and(
        gte(encounter.startedAt, periodFrom),
        lte(encounter.startedAt, periodTo),
        eq(encounter.status, "finished")
      )
    )
    .orderBy(encounter.patientId, encounter.startedAt);

  if (encounterRows.length === 0) {
    return {
      transaction: {
        numDocumentoIdObligado: organizationTaxId,
        numFactura: input.invoiceNumber ?? null,
        tipoNota: input.noteType ?? null,
        numNota: input.noteNumber ?? null,
        usuarios: [],
      },
      numUsers: 0,
      totalValue: "0.00",
      encounterIds: [],
    };
  }

  const byPatient = groupEncountersByPatient(encounterRows);
  const allEncounterIds = encounterRows.map((r) => r.encounter.id);
  const bulk = await fetchBulkClinicalData(db, allEncounterIds);

  let userConsecutive = 0;
  const ripsUsuarios: RipsUsuario[] = [];
  const includedEncounterIds: string[] = [];

  for (const [, group] of byPatient) {
    userConsecutive++;
    const { usuario, includedEncounterIds: ids } = buildRipsUsuario(
      group,
      bulk,
      organizationTaxId
    );
    usuario.consecutivo = userConsecutive;
    ripsUsuarios.push(usuario);
    includedEncounterIds.push(...ids);
  }

  const totalValue = calculateTotalValue(ripsUsuarios);

  const transaction: RipsTransaction = {
    numDocumentoIdObligado: organizationTaxId,
    numFactura: input.invoiceNumber ?? null,
    tipoNota: input.noteType ?? null,
    numNota: input.noteNumber ?? null,
    usuarios: ripsUsuarios,
  };

  return {
    transaction,
    numUsers: ripsUsuarios.length,
    totalValue: toMoneyString(totalValue),
    encounterIds: includedEncounterIds,
  };
}

function calculateTotalValue(usuarios: RipsUsuario[]): number {
  let total = 0;
  for (const u of usuarios) {
    for (const c of u.servicios.consultas ?? []) {
      total += Number.parseFloat(c.vrServicio);
    }
    for (const p of u.servicios.procedimientos ?? []) {
      total += Number.parseFloat(p.vrServicio);
    }
    for (const m of u.servicios.medicamentos ?? []) {
      total += Number.parseFloat(m.vrServicio);
    }
    for (const o of u.servicios.otrosServicios ?? []) {
      total += Number.parseFloat(o.vrServicio);
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
  diagnosesByEncounter: Map<string, (typeof diagnosis.$inferSelect)[]>;
  medicationsByEncounter: Map<string, (typeof medicationOrder.$inferSelect)[]>;
  proceduresByEncounter: Map<string, (typeof procedureRecord.$inferSelect)[]>;
  serviceRequestsByEncounter: Map<
    string,
    (typeof serviceRequest.$inferSelect)[]
  >;
}

async function fetchBulkClinicalData(
  db: Db,
  encounterIds: string[]
): Promise<BulkClinicalData> {
  const [diagnosesRows, proceduresRows, medicationsRows, serviceRequestsRows] =
    await Promise.all([
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
    ]);

  return {
    diagnosesByEncounter: groupBy(diagnosesRows, "encounterId"),
    proceduresByEncounter: groupBy(proceduresRows, "encounterId"),
    medicationsByEncounter: groupBy(medicationsRows, "encounterId"),
    serviceRequestsByEncounter: groupBy(serviceRequestsRows, "encounterId"),
  };
}

function buildRipsUsuario(
  group: PatientGroup,
  bulk: BulkClinicalData,
  organizationTaxId: string
): {
  usuario: RipsUsuario;
  includedEncounterIds: string[];
  state: ServiceBuilderState;
} {
  const pat = group.patient;
  const patDocType = mapPatientDocTypeToRips(pat.primaryDocumentType);
  const patDocNum = pat.primaryDocumentNumber;
  const countryCode = pat.countryCode ?? "170";

  const state: ServiceBuilderState = {
    services: {},
    serviceConsecutive: 0,
    totalValue: 0,
  };

  const includedEncounterIds: string[] = [];

  for (const enc of group.encounters) {
    includedEncounterIds.push(enc.id);
    const diagnoses = bulk.diagnosesByEncounter.get(enc.id) ?? [];
    const principalDx =
      diagnoses.find(
        (d) => d.rank === 1 || d.diagnosisType === "principal"
      ) ?? diagnoses[0];
    const relatedDx = diagnoses.filter((d) => d.id !== principalDx?.id);
    const dxRel1 = relatedDx[0]?.code ?? null;
    const procedures = bulk.proceduresByEncounter.get(enc.id) ?? [];
    const cupsConsulta =
      procedures.find((p) => p.cupsCode.startsWith("89"))?.cupsCode ??
      "890201";

    const ctx: EncounterContext = {
      enc,
      diagnoses,
      principalDx,
      relatedDx,
      dxRel1,
      procedures,
      medications: bulk.medicationsByEncounter.get(enc.id) ?? [],
      serviceRequests: bulk.serviceRequestsByEncounter.get(enc.id) ?? [],
      providerCode: enc.orgRepsCode ?? enc.siteCode ?? organizationTaxId,
      fechaInicio: formatDateTime(new Date(enc.startedAt)),
      patDocType,
      patDocNum,
      cupsConsulta,
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
    tipoUsuario: "01",
    fechaNacimiento: formatDate(birthDate),
    codSexo: mapSexToRips(pat.sexAtBirth),
    codPaisResidencia: countryCode,
    codMunicipioResidencia: pat.municipalityCode ?? null,
    codZonaTerritorialResidencia: pat.zoneCode ?? null,
    incapacidad: "NO",
    consecutivo: 0,
    codPaisOrigen: countryCode,
    servicios: state.services,
  };

  return { usuario, includedEncounterIds, state };
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
