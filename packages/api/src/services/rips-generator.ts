import type { Db } from "../context";
import {
  diagnosis,
  encounter,
  medicationOrder,
  organization,
  patient,
  procedureRecord,
  serviceRequest,
  site,
  serviceUnit,
} from "@wellfit-emr/db/schema/clinical";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

export interface RipsGenerationInput {
  payerId: string;
  periodFrom: Date;
  periodTo: Date;
  organizationTaxId: string;
  invoiceNumber?: string | null;
  noteType?: string | null;
  noteNumber?: string | null;
  operationType?: string;
}

export interface RipsTransaction {
  numDocumentoIdObligado: string;
  numFactura: string | null;
  tipoNota: string | null;
  numNota: string | null;
  usuarios: RipsUsuario[];
}

export interface RipsUsuario {
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  tipoUsuario: string;
  fechaNacimiento: string;
  codSexo: string;
  codPaisResidencia: string;
  codMunicipioResidencia: string | null;
  codZonaTerritorialResidencia: string | null;
  incapacidad: string;
  consecutivo: number;
  codPaisOrigen: string;
  servicios: RipsServicios;
}

export interface RipsServicios {
  consultas?: RipsConsulta[];
  procedimientos?: RipsProcedimiento[];
  urgencias?: RipsUrgencia[];
  hospitalizacion?: RipsHospitalizacion[];
  recienNacidos?: RipsRecienNacido[];
  medicamentos?: RipsMedicamento[];
  otrosServicios?: RipsOtroServicio[];
}

export interface RipsConsulta {
  codPrestador: string;
  fechaInicioAtencion: string;
  numAutorizacion: string | null;
  codConsulta: string;
  modalidadGrupoServicioTecSal: string;
  grupoServicios: string;
  codServicio: string;
  finalidadTecnologiaSalud: string;
  causaMotivoAtencion: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  tipoDiagnosticoPrincipal: string;
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  vrServicio: string;
  conceptoRecaudo: string | null;
  valorPagoModerador: string | null;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

export interface RipsProcedimiento {
  codPrestador: string;
  fechaInicioAtencion: string;
  idMIPRES: string | null;
  numAutorizacion: string | null;
  codProcedimiento: string;
  viaIngresoServicioSalud: string;
  modalidadGrupoServicioTecSal: string;
  grupoServicios: string;
  codServicio: string;
  finalidadTecnologiaSalud: string;
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado: string | null;
  codComplicacion: string | null;
  vrServicio: string;
  conceptoRecaudo: string | null;
  valorPagoModerador: string | null;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

export interface RipsUrgencia {
  codPrestador: string;
  fechaInicioAtencion: string;
  fechaEgreso: string | null;
  numAutorizacion: string | null;
  causaMotivoAtencion: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  condicionDestinoUsuarioEgreso: string | null;
  codDiagnosticoCausaMuerte: string | null;
  fechaEgresoObservacion: string | null;
  consecutivo: number;
}

export interface RipsHospitalizacion {
  codPrestador: string;
  fechaInicioAtencion: string;
  fechaEgreso: string | null;
  numAutorizacion: string | null;
  causaMotivoAtencion: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  condicionDestinoUsuarioEgreso: string | null;
  codDiagnosticoCausaMuerte: string | null;
  consecutivo: number;
}

export interface RipsRecienNacido {
  codPrestador: string;
  fechaNacimiento: string;
  edadGestacional: number;
  numeroConsultasCPN: number;
  codSexoBiologico: string;
  peso: number;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado1: string | null;
  condicionDestinoUsuarioEgreso: string | null;
  codDiagnosticoCausaMuerte: string | null;
  consecutivo: number;
}

export interface RipsMedicamento {
  codPrestador: string;
  numAutorizacion: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado: string | null;
  tipoMedicamento: string;
  codTecnologiaSalud: string;
  nomTecnologiaSalud: string | null;
  concentracionMedicamento: string | null;
  unidadMedida: string | null;
  formaFarmaceutica: string | null;
  unidadMinima: string | null;
  cantidadMedicamento: number;
  diasTratamiento: number;
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  vrUnitMedicamento: string;
  vrServicio: string;
  conceptoRecaudo: string | null;
  valorPagoModerador: string | null;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

export interface RipsOtroServicio {
  codPrestador: string;
  numAutorizacion: string | null;
  codDiagnosticoPrincipal: string;
  codDiagnosticoRelacionado: string | null;
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  tipoOtrosServicios: string;
  codTecnologiaSalud: string;
  nomTecnologiaSalud: string | null;
  cantidadOS: number;
  tipoDocumentoIdentificacionOP: string | null;
  numDocumentoIdentificacionOP: string | null;
  vrServicio: string;
  conceptoRecaudo: string | null;
  valorPagoModerador: string | null;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

export interface GeneratedRipsResult {
  transaction: RipsTransaction;
  numUsers: number;
  totalValue: string;
  encounterIds: string[];
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
  if (sex === "male") { return "M"; }
  if (sex === "female") { return "F"; }
  return "I";
}

interface EncounterContext {
  enc: typeof encounter.$inferSelect & {
    siteCode: string;
    serviceCode: string;
    orgRepsCode: string | null;
  };
  diagnoses: (typeof diagnosis.$inferSelect)[];
  procedures: (typeof procedureRecord.$inferSelect)[];
  medications: (typeof medicationOrder.$inferSelect)[];
  serviceRequests: (typeof serviceRequest.$inferSelect)[];
  providerCode: string;
  fechaInicio: string;
  patDocType: string;
  patDocNum: string;
}

interface ServiceBuilderState {
  services: RipsServicios;
  serviceConsecutive: number;
  totalValue: number;
}

function buildConsultas(ctx: EncounterContext, state: ServiceBuilderState): void {
  if (ctx.enc.encounterClass !== "ambulatory" && ctx.enc.encounterClass !== "outpatient") {
    return;
  }
  state.serviceConsecutive++;
  const principalDx = ctx.diagnoses.find((d) => d.rank === 1 || d.diagnosisType === "principal") ?? ctx.diagnoses[0];
  const relatedDx = ctx.diagnoses.filter((d) => d.id !== principalDx?.id);
  const cupsConsulta = ctx.procedures.find((p) => p.cupsCode.startsWith("89"))?.cupsCode ?? "890201";
  const value = 50_000;
  state.totalValue += value;

  if (!state.services.consultas) { state.services.consultas = []; }
  state.services.consultas.push({
    codPrestador: ctx.providerCode,
    fechaInicioAtencion: ctx.fechaInicio,
    numAutorizacion: null,
    codConsulta: cupsConsulta,
    modalidadGrupoServicioTecSal: ctx.enc.careModality ?? "01",
    grupoServicios: ctx.enc.modalidadAtencionCode ?? "01",
    codServicio: ctx.enc.serviceCode ?? "101",
    finalidadTecnologiaSalud: ctx.enc.finalidadConsultaCode ?? "10",
    causaMotivoAtencion: ctx.enc.causeExternalCode ?? null,
    codDiagnosticoPrincipal: principalDx?.code ?? "Z000",
    codDiagnosticoRelacionado1: relatedDx[0]?.code ?? null,
    codDiagnosticoRelacionado2: relatedDx[1]?.code ?? null,
    codDiagnosticoRelacionado3: relatedDx[2]?.code ?? null,
    tipoDiagnosticoPrincipal: principalDx?.diagnosisType === "confirmed" ? "02" : "01",
    tipoDocumentoIdentificacion: ctx.patDocType,
    numDocumentoIdentificacion: ctx.patDocNum,
    vrServicio: toMoneyString(value),
    conceptoRecaudo: null,
    valorPagoModerador: null,
    numFEVPagoModerador: null,
    consecutivo: state.serviceConsecutive,
  });
}

function buildUrgencias(ctx: EncounterContext, state: ServiceBuilderState): void {
  if (ctx.enc.encounterClass !== "emergency") { return; }
  state.serviceConsecutive++;
  const principalDx = ctx.diagnoses.find((d) => d.rank === 1 || d.diagnosisType === "principal") ?? ctx.diagnoses[0];
  const relatedDx = ctx.diagnoses.filter((d) => d.id !== principalDx?.id);
  const value = 75_000;
  state.totalValue += value;

  if (!state.services.urgencias) { state.services.urgencias = []; }
  state.services.urgencias.push({
    codPrestador: ctx.providerCode,
    fechaInicioAtencion: ctx.fechaInicio,
    fechaEgreso: ctx.enc.endedAt ? formatDateTime(new Date(ctx.enc.endedAt)) : null,
    numAutorizacion: null,
    causaMotivoAtencion: ctx.enc.causeExternalCode ?? null,
    codDiagnosticoPrincipal: principalDx?.code ?? "Z000",
    codDiagnosticoRelacionado1: relatedDx[0]?.code ?? null,
    codDiagnosticoRelacionado2: relatedDx[1]?.code ?? null,
    codDiagnosticoRelacionado3: relatedDx[2]?.code ?? null,
    condicionDestinoUsuarioEgreso: ctx.enc.condicionDestinoCode ?? null,
    codDiagnosticoCausaMuerte: null,
    fechaEgresoObservacion: ctx.enc.endedAt ? formatDateTime(new Date(ctx.enc.endedAt)) : null,
    consecutivo: state.serviceConsecutive,
  });
}

function buildHospitalizacion(ctx: EncounterContext, state: ServiceBuilderState): void {
  if (ctx.enc.encounterClass !== "inpatient") { return; }
  state.serviceConsecutive++;
  const principalDx = ctx.diagnoses.find((d) => d.rank === 1 || d.diagnosisType === "principal") ?? ctx.diagnoses[0];
  const relatedDx = ctx.diagnoses.filter((d) => d.id !== principalDx?.id);
  const value = 150_000;
  state.totalValue += value;

  if (!state.services.hospitalizacion) { state.services.hospitalizacion = []; }
  state.services.hospitalizacion.push({
    codPrestador: ctx.providerCode,
    fechaInicioAtencion: ctx.fechaInicio,
    fechaEgreso: ctx.enc.endedAt ? formatDateTime(new Date(ctx.enc.endedAt)) : null,
    numAutorizacion: null,
    causaMotivoAtencion: ctx.enc.causeExternalCode ?? null,
    codDiagnosticoPrincipal: principalDx?.code ?? "Z000",
    codDiagnosticoRelacionado1: relatedDx[0]?.code ?? null,
    codDiagnosticoRelacionado2: relatedDx[1]?.code ?? null,
    codDiagnosticoRelacionado3: relatedDx[2]?.code ?? null,
    condicionDestinoUsuarioEgreso: ctx.enc.condicionDestinoCode ?? null,
    codDiagnosticoCausaMuerte: null,
    consecutivo: state.serviceConsecutive,
  });
}

function buildProcedimientos(ctx: EncounterContext, state: ServiceBuilderState): void {
  const principalDx = ctx.diagnoses.find((d) => d.rank === 1 || d.diagnosisType === "principal") ?? ctx.diagnoses[0];
  const dxRel1 = ctx.diagnoses.filter((d) => d.id !== principalDx?.id)[0]?.code ?? null;

  for (const proc of ctx.procedures) {
    state.serviceConsecutive++;
    const value = 30_000;
    state.totalValue += value;

    if (!state.services.procedimientos) { state.services.procedimientos = []; }
    state.services.procedimientos.push({
      codPrestador: ctx.providerCode,
      fechaInicioAtencion: proc.performedAt ? formatDateTime(new Date(proc.performedAt)) : ctx.fechaInicio,
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
      codDiagnosticoPrincipal: principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: dxRel1,
      codComplicacion: null,
      vrServicio: toMoneyString(value),
      conceptoRecaudo: null,
      valorPagoModerador: null,
      numFEVPagoModerador: null,
      consecutivo: state.serviceConsecutive,
    });
  }
}

function buildMedicamentos(ctx: EncounterContext, state: ServiceBuilderState): void {
  const principalDx = ctx.diagnoses.find((d) => d.rank === 1 || d.diagnosisType === "principal") ?? ctx.diagnoses[0];
  const dxRel1 = ctx.diagnoses.filter((d) => d.id !== principalDx?.id)[0]?.code ?? null;

  for (const med of ctx.medications) {
    state.serviceConsecutive++;
    const value = 15_000;
    state.totalValue += value;

    if (!state.services.medicamentos) { state.services.medicamentos = []; }
    state.services.medicamentos.push({
      codPrestador: ctx.providerCode,
      numAutorizacion: null,
      codDiagnosticoPrincipal: principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: dxRel1,
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

function buildOtrosServicios(ctx: EncounterContext, state: ServiceBuilderState): void {
  const principalDx = ctx.diagnoses.find((d) => d.rank === 1 || d.diagnosisType === "principal") ?? ctx.diagnoses[0];
  const dxRel1 = ctx.diagnoses.filter((d) => d.id !== principalDx?.id)[0]?.code ?? null;

  for (const sr of ctx.serviceRequests) {
    state.serviceConsecutive++;
    const value = 25_000;
    state.totalValue += value;

    if (!state.services.otrosServicios) { state.services.otrosServicios = []; }
    state.services.otrosServicios.push({
      codPrestador: ctx.providerCode,
      numAutorizacion: null,
      codDiagnosticoPrincipal: principalDx?.code ?? "Z000",
      codDiagnosticoRelacionado: dxRel1,
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
    for (const c of u.servicios.consultas ?? []) { total += Number.parseFloat(c.vrServicio); }
    for (const p of u.servicios.procedimientos ?? []) { total += Number.parseFloat(p.vrServicio); }
    for (const m of u.servicios.medicamentos ?? []) { total += Number.parseFloat(m.vrServicio); }
    for (const o of u.servicios.otrosServicios ?? []) { total += Number.parseFloat(o.vrServicio); }
  }
  return total;
}

interface PatientGroup {
  patient: typeof patient.$inferSelect;
  encounters: (typeof encounter.$inferSelect & {
    siteCode: string;
    serviceCode: string;
    orgRepsCode: string | null;
  })[];
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
  diagnosesByEncounter: Map<string, typeof diagnosis.$inferSelect[]>;
  proceduresByEncounter: Map<string, typeof procedureRecord.$inferSelect[]>;
  medicationsByEncounter: Map<string, typeof medicationOrder.$inferSelect[]>;
  serviceRequestsByEncounter: Map<string, typeof serviceRequest.$inferSelect[]>;
}

async function fetchBulkClinicalData(
  db: Db,
  encounterIds: string[]
): Promise<BulkClinicalData> {
  const [diagnosesRows, proceduresRows, medicationsRows, serviceRequestsRows] = await Promise.all([
    db.select().from(diagnosis).where(inArray(diagnosis.encounterId, encounterIds)),
    db.select().from(procedureRecord).where(inArray(procedureRecord.encounterId, encounterIds)),
    db.select().from(medicationOrder).where(inArray(medicationOrder.encounterId, encounterIds)),
    db.select().from(serviceRequest).where(inArray(serviceRequest.encounterId, encounterIds)),
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
): { usuario: RipsUsuario; includedEncounterIds: string[]; state: ServiceBuilderState } {
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
    const ctx: EncounterContext = {
      enc,
      diagnoses: bulk.diagnosesByEncounter.get(enc.id) ?? [],
      procedures: bulk.proceduresByEncounter.get(enc.id) ?? [],
      medications: bulk.medicationsByEncounter.get(enc.id) ?? [],
      serviceRequests: bulk.serviceRequestsByEncounter.get(enc.id) ?? [],
      providerCode: enc.orgRepsCode ?? enc.siteCode ?? organizationTaxId,
      fechaInicio: formatDateTime(new Date(enc.startedAt)),
      patDocType,
      patDocNum,
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
    if (!map.has(k)) { map.set(k, []); }
    const list = map.get(k);
    if (list) { list.push(item); }
  }
  return map;
}
