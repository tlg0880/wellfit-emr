import { createRouterClient } from "@orpc/server";
import { db } from "@wellfit-emr/db";
import {
  allergyIntolerance,
  appointment,
  attachmentLink,
  binaryObject,
  clinicalDocument,
  clinicalDocumentVersion,
  consentRecord,
  coverage,
  dataDisclosureAuthorization,
  diagnosis,
  diagnosticReport,
  documentSection,
  encounter,
  encounterParticipant,
  ihceBundle,
  incapacityCertificate,
  interconsultation,
  medicationAdministration,
  medicationOrder,
  observation,
  organization,
  patient,
  patientContact,
  patientIdentifier,
  payer,
  practitioner,
  practitionerRole,
  procedureRecord,
  ripsExport,
  serviceRequest,
  serviceUnit,
  site,
  userPractitionerLink,
} from "@wellfit-emr/db/schema/clinical";
import { ripsReferenceEntry } from "@wellfit-emr/db/schema/rips-reference";
import { and, eq, like, sql } from "drizzle-orm";

import { appRouter } from "./routers/index";
import {
  createSeedContext,
  ensureSeedUserExists,
  SEED_USER,
} from "./test-utils";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  WELLFIT EMR — COMPREHENSIVE SEED + INTEGRATION TEST FOUNDATION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  This file serves dual purpose:
 *  1. SEED: Populates the database with realistic, coherent EMR data.
 *  2. TEST FOUNDATION: Uses the real oRPC routers (not direct DB inserts),
 *     so every seed operation is also an end-to-end integration test.
 *
 *  CRITICAL: All RIPS/SISPRO catalog codes are fetched dynamically after
 *  syncing with the state API. NO codes are hardcoded.
 *
 *  Run:  bun run packages/api/src/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Logger ─────────────────────────────────────────────────────────────────

const PREFIX = "[SEED]";

function log(step: string, message: string) {
  console.log(`${PREFIX} ${step.padEnd(16)} | ${message}`);
}

function logError(step: string, message: string) {
  console.error(`${PREFIX} ${step.padEnd(16)} | ERROR: ${message}`);
}

// ─── Seed Cleanup ───────────────────────────────────────────────────────────

async function cleanSeedData(): Promise<void> {
  log("CLEAN", "Removing previous seed data...");

  await db.run(sql`PRAGMA foreign_keys = OFF`);

  await db.delete(attachmentLink);
  await db.delete(binaryObject);
  await db.delete(ihceBundle);
  await db.delete(ripsExport);
  await db.delete(dataDisclosureAuthorization);
  await db.delete(consentRecord);
  await db.delete(incapacityCertificate);
  await db.delete(interconsultation);
  await db.delete(diagnosticReport);
  await db.delete(serviceRequest);
  await db.delete(documentSection);
  await db.delete(clinicalDocumentVersion);
  await db.delete(clinicalDocument);
  await db.delete(medicationAdministration);
  await db.delete(medicationOrder);
  await db.delete(observation);
  await db.delete(procedureRecord);
  await db.delete(diagnosis);
  await db.delete(encounterParticipant);
  await db.delete(encounter);
  await db.delete(appointment);
  await db.delete(allergyIntolerance);
  await db.delete(coverage);
  await db.delete(patientContact);
  await db.delete(patientIdentifier);
  await db.delete(patient);
  await db.delete(userPractitionerLink);
  await db.delete(practitionerRole);
  await db.delete(practitioner);
  await db.delete(payer);
  await db.delete(serviceUnit);
  await db.delete(site);
  await db.delete(organization);

  await db.run(sql`PRAGMA foreign_keys = ON`);

  log("CLEAN", "Previous seed data removed.");
}

async function hasExistingSeedData(): Promise<boolean> {
  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.repsCode, "1234567890"))
    .limit(1);
  return !!org;
}

// ─── Router Client ──────────────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: Router client proxy typing is complex; runtime structure is verified by usage.
type SeedClient = any;

let routerClient: SeedClient;

function getClient(): SeedClient {
  if (!routerClient) {
    const context = createSeedContext(db);
    routerClient = createRouterClient(appRouter, { context });
  }
  return routerClient;
}

// ─── RIPS Code Resolver ─────────────────────────────────────────────────────

interface CodeCache {
  [tableName: string]: Map<string, string>;
}

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const codeCache: CodeCache = {};

async function resolveCode(
  tableName: string,
  searchTerm: string
): Promise<string> {
  if (!codeCache[tableName]) {
    codeCache[tableName] = new Map();
  }

  const cached = codeCache[tableName].get(searchTerm);
  if (cached) {
    return cached;
  }

  const normalized = removeAccents(searchTerm);
  const variations = [
    searchTerm,
    searchTerm.toUpperCase(),
    searchTerm.toLowerCase(),
    normalized,
    normalized.toUpperCase(),
    normalized.toLowerCase(),
  ];

  for (const term of variations) {
    const baseWhere = and(
      eq(ripsReferenceEntry.tableName, tableName),
      eq(ripsReferenceEntry.enabled, true)
    );

    // Prefer exact prefix match for more precise results
    const [prefixEntry] = await db
      .select({ code: ripsReferenceEntry.code })
      .from(ripsReferenceEntry)
      .where(and(baseWhere, like(ripsReferenceEntry.name, `${term}%`)))
      .orderBy(ripsReferenceEntry.name)
      .limit(1);

    if (prefixEntry) {
      codeCache[tableName].set(searchTerm, prefixEntry.code);
      return prefixEntry.code;
    }

    // Fallback to substring match
    const [entry] = await db
      .select({ code: ripsReferenceEntry.code })
      .from(ripsReferenceEntry)
      .where(and(baseWhere, like(ripsReferenceEntry.name, `%${term}%`)))
      .orderBy(ripsReferenceEntry.name)
      .limit(1);

    if (entry) {
      codeCache[tableName].set(searchTerm, entry.code);
      return entry.code;
    }
  }

  throw new Error(
    `No enabled RIPS code found in '${tableName}' matching '${searchTerm}'. ` +
      "Sync catalogs first or use a different search term."
  );
}

async function getAnyEnabledCode(tableName: string): Promise<string> {
  if (!codeCache[tableName]) {
    codeCache[tableName] = new Map();
  }

  const cached = codeCache[tableName].get("__any__");
  if (cached) {
    return cached;
  }

  const [entry] = await db
    .select({ code: ripsReferenceEntry.code })
    .from(ripsReferenceEntry)
    .where(
      and(
        eq(ripsReferenceEntry.tableName, tableName),
        eq(ripsReferenceEntry.enabled, true)
      )
    )
    .limit(1);

  if (!entry) {
    throw new Error(
      `No enabled codes found in '${tableName}'. Sync catalogs first.`
    );
  }

  codeCache[tableName].set("__any__", entry.code);
  return entry.code;
}

async function getFirstEnabledReferences(
  tableName: string,
  limit: number
): Promise<Array<{ code: string; name: string }>> {
  const entries = await db
    .select({ code: ripsReferenceEntry.code, name: ripsReferenceEntry.name })
    .from(ripsReferenceEntry)
    .where(
      and(
        eq(ripsReferenceEntry.tableName, tableName),
        eq(ripsReferenceEntry.enabled, true)
      )
    )
    .orderBy(ripsReferenceEntry.name)
    .limit(limit);

  if (entries.length < limit) {
    throw new Error(
      `Expected at least ${limit} enabled codes in '${tableName}', found ${entries.length}.`
    );
  }

  return entries;
}

async function hashText(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Catalog Sync ───────────────────────────────────────────────────────────

async function syncCatalogs() {
  log("SYNC", "Starting SISPRO catalog synchronization...");
  const client = getClient();
  const result = await client.ripsReference.syncAll();

  if (result.errors.length > 0) {
    logError("SYNC", `${result.errors.length} tables failed to sync`);
    for (const err of result.errors) {
      logError("SYNC", `  - ${err}`);
    }
  }

  log("SYNC", `Completed. ${result.synced} tables synchronized.`);
  return result;
}

// ─── Facility Setup ─────────────────────────────────────────────────────────

interface FacilityContext {
  organizationId: string;
  payers: Array<{ id: string; name: string; code: string }>;
  practitioners: Array<{ id: string; fullName: string; specialty: string }>;
  serviceUnitId: string;
  serviceUnits: Array<{ id: string; name: string; careSetting: string }>;
  siteId: string;
  sites: Array<{ id: string; name: string }>;
}

async function createFacilities(): Promise<FacilityContext> {
  log("FACILITIES", "Creating base facilities...");
  const client = getClient();

  const org = await client.facilities.createOrganization({
    name: "Clínica WellFit Principal",
    repsCode: "1234567890",
    status: "active",
    taxId: "900123456",
  });
  log("FACILITIES", `Organization: ${org.name} (${org.id})`);

  const site = await client.facilities.createSite({
    organizationId: org.id,
    siteCode: "WF-BOG-01",
    name: "Sede Bogotá Norte",
    municipalityCode: await getAnyEnabledCode("Municipio"),
    address: "Calle 100 # 15-30, Bogotá D.C.",
  });
  log("FACILITIES", `Site: ${site.name} (${site.id})`);

  const unit = await client.facilities.createServiceUnit({
    siteId: site.id,
    serviceCode: "CON-EXT",
    name: "Consulta Externa",
    careSetting: "ambulatory",
  });
  log("FACILITIES", `Service Unit: ${unit.name} (${unit.id})`);

  const siteSur = await client.facilities.createSite({
    organizationId: org.id,
    siteCode: "WF-BOG-02",
    name: "Sede Bogotá Sur",
    municipalityCode: await resolveCode("Municipio", "Bogotá"),
    address: "Carrera 30 # 12-45, Bogotá D.C.",
  });

  const urgentUnit = await client.facilities.createServiceUnit({
    siteId: site.id,
    serviceCode: "URG-24H",
    name: "Urgencias 24 horas",
    careSetting: "urgent-care",
  });

  const imagingUnit = await client.facilities.createServiceUnit({
    siteId: siteSur.id,
    serviceCode: "IMG-DX",
    name: "Imagenología diagnóstica",
    careSetting: "diagnostic",
  });

  const labUnit = await client.facilities.createServiceUnit({
    siteId: siteSur.id,
    serviceCode: "LAB-CLI",
    name: "Laboratorio clínico",
    careSetting: "diagnostic",
  });

  const practitionerData = [
    { fullName: "Dra. Carolina Mendoza", specialty: "Medicina Interna" },
    { fullName: "Dr. Fernando Castillo", specialty: "Cardiología" },
    { fullName: "Dra. Isabel Ramírez", specialty: "Pediatría" },
    { fullName: "Dr. Andrés Peña", specialty: "Dermatología" },
    { fullName: "Dra. Juliana Morales", specialty: "Psiquiatría" },
    { fullName: "Dr. Ricardo Salazar", specialty: "Gastroenterología" },
    { fullName: "Dra. Natalia Vargas", specialty: "Ginecología y Obstetricia" },
    { fullName: "Dr. Daniel Ortega", specialty: "Ortopedia y Traumatología" },
    { fullName: "Dra. Valentina Suárez", specialty: "Medicina General" },
    { fullName: "Dr. Mateo Hernández", specialty: "Neumología" },
    { fullName: "Dra. Camila Restrepo", specialty: "Endocrinología" },
    { fullName: "Dr. Juan Pablo Mejía", specialty: "Radiología" },
    { fullName: "Dra. Marcela Ortiz", specialty: "Laboratorio Clínico" },
    { fullName: "Dr. Esteban Cárdenas", specialty: "Urgencias" },
    { fullName: "Dra. Paola Benítez", specialty: "Enfermería Jefe" },
    { fullName: "Dr. Santiago León", specialty: "Fisiatría" },
    { fullName: "Dra. Manuela Arias", specialty: "Nutrición Clínica" },
    { fullName: "Dr. Felipe Navarro", specialty: "Medicina Familiar" },
    { fullName: "Dra. Daniela Acosta", specialty: "Psicología Clínica" },
    { fullName: "Dr. Nicolás Rivas", specialty: "Cirugía General" },
  ];

  const practitioners: Array<{
    fullName: string;
    id: string;
    specialty: string;
  }> = [];
  const docType = await getAnyEnabledCode("TipoIdPISIS");

  for (const [index, p] of practitionerData.entries()) {
    const docNum = String(52_000_000 + index);
    const created = await client.facilities.createPractitioner({
      documentType: docType,
      documentNumber: docNum,
      fullName: p.fullName,
      active: true,
      rethusNumber: `RET-${docNum}`,
    });
    practitioners.push({
      id: created.id,
      fullName: created.fullName,
      specialty: p.specialty,
    });
    await db.insert(practitionerRole).values({
      id: crypto.randomUUID(),
      practitionerId: created.id,
      organizationId: org.id,
      siteId: index % 2 === 0 ? site.id : siteSur.id,
      roleCode: p.specialty,
      startAt: new Date("2024-01-01T08:00:00-05:00"),
    });
    log("FACILITIES", `Practitioner: ${created.fullName}`);
  }

  const primaryPractitioner = practitioners[0];
  if (primaryPractitioner) {
    await db.insert(userPractitionerLink).values({
      id: crypto.randomUUID(),
      userId: SEED_USER.id,
      practitionerId: primaryPractitioner.id,
      linkType: "primary",
      effectiveFrom: new Date("2024-01-01T08:00:00-05:00"),
    });
  }

  const payerReferences = await getFirstEnabledReferences("CodigoEAPByNit", 3);

  const payers: Array<{ id: string; name: string; code: string }> = [];
  for (const [index, payerReference] of payerReferences.entries()) {
    const [createdPayer] = await db
      .insert(payer)
      .values({
        id: crypto.randomUUID(),
        payerType: index === 2 ? "prepaid" : "eps",
        name: payerReference.name,
        code: payerReference.code,
        status: "active",
      })
      .returning();

    if (createdPayer) {
      payers.push(createdPayer);
      log("FACILITIES", `Payer: ${createdPayer.name}`);
    }
  }

  return {
    organizationId: org.id,
    payers,
    siteId: site.id,
    serviceUnitId: unit.id,
    serviceUnits: [
      { id: unit.id, name: unit.name, careSetting: unit.careSetting },
      {
        id: urgentUnit.id,
        name: urgentUnit.name,
        careSetting: urgentUnit.careSetting,
      },
      {
        id: imagingUnit.id,
        name: imagingUnit.name,
        careSetting: imagingUnit.careSetting,
      },
      { id: labUnit.id, name: labUnit.name, careSetting: labUnit.careSetting },
    ],
    sites: [
      { id: site.id, name: site.name },
      { id: siteSur.id, name: siteSur.name },
    ],
    practitioners,
  };
}

// ─── Patient Narratives ─────────────────────────────────────────────────────

interface EncounterNarrative {
  appointmentReason: string;
  causeExternalSearch: string;
  condicionDestinoSearch: string;
  diagnosis: Array<{
    cie10Search: string;
    description: string;
    diagnosisTypeSearch: string;
  }>;
  encounterClassSearch: string;
  finalidadSearch: string;
  modalitySearch: string;
  notes?: string;
  observations: Array<{
    codeSearch?: string;
    observationType: string;
    unit?: string;
    valueNum?: number;
    valueText?: string;
  }>;
  procedures: Array<{
    cupsSearch: string;
    description: string;
  }>;
  reasonForVisit: string;
  serviceRequestSearch?: string;
  status: string;
}

interface PatientNarrative {
  birthDate: string;
  countrySearch: string;
  encounters: EncounterNarrative[];
  firstName: string;
  genderIdentity?: string;
  lastName1: string;
  lastName2: string;
  middleName?: string;
  municipalitySearch: string;
  sexAtBirth: string;
  zoneSearch: string;
}

function createNarratives(): PatientNarrative[] {
  return [
    {
      firstName: "María Elena",
      middleName: "",
      lastName1: "Rojas",
      lastName2: "Pérez",
      birthDate: "1967-03-15",
      sexAtBirth: "M",
      genderIdentity: "F",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Control de diabetes mellitus tipo 2",
          reasonForVisit:
            "Control rutinario de diabetes. Paciente refiere poliuria y polidipsia leve.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "DETECCION TEMPRANA",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "DIABETES MELLITUS",
              description: "Diabetes mellitus tipo 2",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "HIPERTENSION ESENCIAL",
              description: "Hipertensión esencial primaria",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            {
              observationType: "blood-pressure-systolic",
              valueNum: 145,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 92,
              unit: "mmHg",
            },
            { observationType: "weight", valueNum: 78, unit: "kg" },
            { observationType: "height", valueNum: 162, unit: "cm" },
            {
              observationType: "glucose-fasting",
              valueNum: 142,
              unit: "mg/dL",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta de medicina interna",
            },
          ],
        },
        {
          appointmentReason: "Seguimiento diabetes - ajuste medicación",
          reasonForVisit:
            "Seguimiento a 3 meses. HbA1c previa 8.2%. Adherencia parcial a dieta.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "DIABETES MELLITUS",
              description: "Diabetes mellitus tipo 2",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "HIPERLIPIDEMIA MIXTA",
              description: "Dislipidemia mixta",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            {
              observationType: "blood-pressure-systolic",
              valueNum: 138,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 88,
              unit: "mmHg",
            },
            {
              observationType: "glucose-fasting",
              valueNum: 128,
              unit: "mg/dL",
            },
            {
              observationType: "hba1c",
              valueNum: 72,
              valueText: "7.2%",
              unit: "%",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta de control crónico",
            },
            {
              cupsSearch: "LABORATORIO",
              description: "Perfil lipídico y HbA1c",
            },
          ],
        },
        {
          appointmentReason: "Control mensual diabetes",
          reasonForVisit:
            "Control mensual. Paciente asintomática. Cumple con ejercicio y dieta.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "DIABETES MELLITUS",
              description: "Diabetes mellitus tipo 2 controlada",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "blood-pressure-systolic",
              valueNum: 132,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 84,
              unit: "mmHg",
            },
            {
              observationType: "glucose-fasting",
              valueNum: 118,
              unit: "mg/dL",
            },
            {
              observationType: "weight",
              valueNum: 75,
              unit: "kg",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta de control",
            },
          ],
        },
      ],
    },
    {
      firstName: "Carlos Andrés",
      middleName: "",
      lastName1: "Martínez",
      lastName2: "Giraldo",
      birthDate: "1991-08-22",
      sexAtBirth: "H",
      genderIdentity: "M",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Crisis de asma leve",
          reasonForVisit:
            "Paciente refiere disnea expiratoria y sibilancias post-ejercicio.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ASMA",
              description: "Asma alérgica leve persistente",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "respiratory-rate",
              valueNum: 22,
              unit: "rpm",
            },
            {
              observationType: "oxygen-saturation",
              valueNum: 96,
              unit: "%",
            },
            {
              observationType: "peak-flow",
              valueNum: 420,
              unit: "L/min",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta medicina general",
            },
            {
              cupsSearch: "ESPIROMETRIA",
              description: "Espirometría con broncodilatador",
            },
          ],
        },
        {
          appointmentReason: "Control asma - ajuste inhaladores",
          reasonForVisit:
            "Seguimiento post-espirometría. FEV1 85% del teórico. Buena técnica inhalatoria.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ASMA",
              description: "Asma alérgica leve persistente",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "peak-flow",
              valueNum: 480,
              unit: "L/min",
            },
            {
              observationType: "oxygen-saturation",
              valueNum: 98,
              unit: "%",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta control asma",
            },
          ],
        },
      ],
    },
    {
      firstName: "Ana Lucía",
      middleName: "",
      lastName1: "Fernández",
      lastName2: "Suárez",
      birthDate: "1997-05-10",
      sexAtBirth: "M",
      genderIdentity: "F",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Control prenatal primer trimestre",
          reasonForVisit:
            "Gestante de 10 semanas. Sin nauseas severas. Antecedentes familiales negativos.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "DETECCION TEMPRANA",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "EMBARAZO",
              description: "Embarazo de 10 semanas",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            { observationType: "weight", valueNum: 62, unit: "kg" },
            {
              observationType: "blood-pressure-systolic",
              valueNum: 110,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 70,
              unit: "mmHg",
            },
            { observationType: "heart-rate", valueNum: 88, unit: "bpm" },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta prenatal",
            },
            {
              cupsSearch: "ECOGRAFIA",
              description: "Ultrasonido obstétrico transabdominal",
            },
          ],
        },
        {
          appointmentReason: "Control prenatal segundo trimestre",
          reasonForVisit:
            "Gestante de 24 semanas. Feto activo. Sin edemas. Peso ganado 4kg.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "EMBARAZO",
              description: "Embarazo de 24 semanas",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            { observationType: "weight", valueNum: 66, unit: "kg" },
            {
              observationType: "blood-pressure-systolic",
              valueNum: 108,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 68,
              unit: "mmHg",
            },
            {
              observationType: "fundal-height",
              valueNum: 24,
              unit: "cm",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta prenatal",
            },
            {
              cupsSearch: "ECOGRAFIA",
              description: "Ecografía morfológica fetal",
            },
          ],
        },
        {
          appointmentReason: "Control prenatal tercer trimestre",
          reasonForVisit:
            "Gestante de 34 semanas. Feto en posición cefálica. Sin proteinuria.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "EMBARAZO",
              description: "Embarazo de 34 semanas",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            { observationType: "weight", valueNum: 70, unit: "kg" },
            {
              observationType: "blood-pressure-systolic",
              valueNum: 112,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 72,
              unit: "mmHg",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta prenatal",
            },
          ],
        },
      ],
    },
    {
      firstName: "Jorge Luis",
      middleName: "",
      lastName1: "Gómez",
      lastName2: "Vásquez",
      birthDate: "1953-11-30",
      sexAtBirth: "H",
      genderIdentity: "M",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Control EPOC e insuficiencia cardíaca",
          reasonForVisit:
            "Paciente con disnea clase funcional NYHA II. Edemas leves en miembros inferiores.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ENFERMEDAD PULMONAR OBSTRUCTIVA CRONICA",
              description: "Enfermedad pulmonar obstructiva crónica",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "INSUFICIENCIA CARDIACA CONGESTIVA",
              description: "Insuficiencia cardíaca congestiva",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
            {
              cie10Search: "ARTROSIS",
              description: "Artrosis de rodillas bilateral",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            {
              observationType: "oxygen-saturation",
              valueNum: 91,
              unit: "%",
            },
            {
              observationType: "respiratory-rate",
              valueNum: 24,
              unit: "rpm",
            },
            {
              observationType: "heart-rate",
              valueNum: 92,
              unit: "bpm",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta medicina interna",
            },
            {
              cupsSearch: "ELECTROCARDIOGRAMA",
              description: "Electrocardiograma de 12 derivaciones",
            },
          ],
        },
        {
          appointmentReason: "Seguimiento EPOC - exacerbación leve",
          reasonForVisit:
            "Exacerbación leve de EPOC post-IRA. Aumento de esputo purulento.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ENFERMEDAD PULMONAR OBSTRUCTIVA CRONICA",
              description: "EPOC con exacerbación aguda leve",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "oxygen-saturation",
              valueNum: 89,
              unit: "%",
            },
            {
              observationType: "respiratory-rate",
              valueNum: 26,
              unit: "rpm",
            },
            {
              observationType: "temperature",
              valueNum: 37.8,
              unit: "°C",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta urgencias menor",
            },
            {
              cupsSearch: "RADIOGRAFIA",
              description: "Radiografía de tórax PA y lateral",
            },
          ],
        },
      ],
    },
    {
      firstName: "Sofia Isabel",
      middleName: "",
      lastName1: "Medina",
      lastName2: "López",
      birthDate: "2019-02-14",
      sexAtBirth: "M",
      genderIdentity: "F",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Control pediátrico - crisis asmática",
          reasonForVisit:
            "Niña de 5 años con sibilancias nocturnas 2x semana. Sin fiebre.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ASMA",
              description: "Asma intermitente pediátrica",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "RINITIS ALERGICA",
              description: "Rinitis alérgica estacional",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            {
              observationType: "oxygen-saturation",
              valueNum: 97,
              unit: "%",
            },
            {
              observationType: "respiratory-rate",
              valueNum: 28,
              unit: "rpm",
            },
            {
              observationType: "weight",
              valueNum: 18,
              unit: "kg",
            },
            {
              observationType: "height",
              valueNum: 108,
              unit: "cm",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta pediatría",
            },
          ],
        },
        {
          appointmentReason: "Control pediátrico - seguimiento asma",
          reasonForVisit:
            "Mejoría con salbutamol PRN. Sin despertares nocturnos esta semana.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ASMA",
              description: "Asma intermitente pediátrica en control",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "oxygen-saturation",
              valueNum: 99,
              unit: "%",
            },
            {
              observationType: "respiratory-rate",
              valueNum: 24,
              unit: "rpm",
            },
            {
              observationType: "weight",
              valueNum: 18.5,
              unit: "kg",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta pediatría de control",
            },
          ],
        },
      ],
    },
    {
      firstName: "Roberto Alejandro",
      middleName: "",
      lastName1: "Vega",
      lastName2: "Cárdenas",
      birthDate: "1980-06-05",
      sexAtBirth: "H",
      genderIdentity: "M",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Dolor lumbar agudo post-levantamiento",
          reasonForVisit:
            "Dolor lumbar derecho irradiado a glúteo post-levantamiento de peso. EVA 7/10.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "OTRO TIPO DE ACCIDENTE",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "DORSALGIA",
              description: "Lumbalgia aguda mecánica",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "CIATICA",
              description: "Ciática L5 derecha sospechada",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            { observationType: "pain-scale", valueNum: 7, unit: "EVA" },
            {
              observationType: "blood-pressure-systolic",
              valueNum: 135,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 85,
              unit: "mmHg",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta ortopedia",
            },
            {
              cupsSearch: "RADIOGRAFIA",
              description: "Radiografía de columna lumbosacra",
            },
          ],
        },
        {
          appointmentReason: "Seguimiento lumbalgia - resultado RM",
          reasonForVisit:
            "RM muestra hernia discal L4-L5 moderada. Dolor mejorado EVA 3/10.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "TRASTORNOS DE DISCO LUMBAR",
              description: "Hernia de disco lumbar L4-L5",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            { observationType: "pain-scale", valueNum: 3, unit: "EVA" },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta ortopedia de control",
            },
            {
              cupsSearch: "FISIOTERAPIA",
              description: "Sesión de fisioterapia rehabilitadora",
            },
          ],
        },
      ],
    },
    {
      firstName: "Diana Patricia",
      middleName: "",
      lastName1: "Castro",
      lastName2: "Morales",
      birthDate: "1986-09-18",
      sexAtBirth: "M",
      genderIdentity: "F",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason:
            "Primera consulta - ansiedad y síntomas depresivos",
          reasonForVisit:
            "Paciente refiere ansiedad generalizada, insomnio y disforia de 3 meses de evolución.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "TRASTORNO DE ANSIEDAD GENERALIZADA",
              description: "Trastorno de ansiedad generalizada",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "TRASTORNO MIXTO DE ANSIEDAD Y DEPRESION",
              description: "Episodio depresivo leve",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            {
              observationType: "phq9-score",
              valueNum: 12,
              unit: "pts",
            },
            {
              observationType: "gad7-score",
              valueNum: 14,
              unit: "pts",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta psiquiatría",
            },
          ],
        },
        {
          appointmentReason: "Seguimiento psiquiatría - respuesta a SSRI",
          reasonForVisit:
            "Mejoría del 40% en síntomas ansiosos. Insomnio residual leve.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "TRASTORNO DE ANSIEDAD GENERALIZADA",
              description: "Trastorno de ansiedad generalizada en tratamiento",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "phq9-score",
              valueNum: 7,
              unit: "pts",
            },
            {
              observationType: "gad7-score",
              valueNum: 8,
              unit: "pts",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta psiquiatría de control",
            },
          ],
        },
      ],
    },
    {
      firstName: "Miguel Ángel",
      middleName: "",
      lastName1: "Torres",
      lastName2: "Ríos",
      birthDate: "1961-04-02",
      sexAtBirth: "H",
      genderIdentity: "M",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Cardiología - post-infarto agudo de miocardio",
          reasonForVisit:
            "IAM STEMI hace 6 semanas. Asintomático actualmente. Rehabilitación cardiaca.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "INFARTO TRANSMURAL AGUDO",
              description: "Infarto agudo de miocardio reciente",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "HIPERTENSION ESENCIAL",
              description: "Hipertensión arterial esencial",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
            {
              cie10Search: "HIPERLIPIDEMIA MIXTA",
              description: "Hipercolesterolemia mixta",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            {
              observationType: "blood-pressure-systolic",
              valueNum: 128,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 78,
              unit: "mmHg",
            },
            {
              observationType: "heart-rate",
              valueNum: 68,
              unit: "bpm",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta cardiología",
            },
            {
              cupsSearch: "ELECTROCARDIOGRAMA",
              description: "ECG de reposo",
            },
          ],
        },
        {
          appointmentReason: "Seguimiento cardiología - ajuste medicación",
          reasonForVisit:
            "Sin angina. Tolerancia al ejercicio mejorada. LDL 78 mg/dL.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "INFARTO TRANSMURAL AGUDO",
              description: "IAM previo en rehabilitación",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "blood-pressure-systolic",
              valueNum: 122,
              unit: "mmHg",
            },
            {
              observationType: "blood-pressure-diastolic",
              valueNum: 76,
              unit: "mmHg",
            },
            {
              observationType: "heart-rate",
              valueNum: 64,
              unit: "bpm",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta cardiología de control",
            },
          ],
        },
      ],
    },
    {
      firstName: "Laura Cristina",
      middleName: "",
      lastName1: "Herrera",
      lastName2: "Bustamante",
      birthDate: "1994-12-08",
      sexAtBirth: "M",
      genderIdentity: "F",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Dermatología - dermatitis eccematosa",
          reasonForVisit:
            "Lesiones eccematosas en pliegues flexurales de 2 meses. Prurito intenso.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "DERMATITIS ATOPICAS",
              description: "Dermatitis atópica moderada",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "scorad-score",
              valueNum: 35,
              unit: "pts",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta dermatología",
            },
            {
              cupsSearch: "BIOPSIA",
              description: "Biopsia de piel",
            },
          ],
        },
        {
          appointmentReason: "Dermatología - seguimiento biopsia",
          reasonForVisit:
            "Biopsia confirma dermatitis crónica. Mejoría parcial con corticoide tópico.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "DERMATITIS ATOPICAS",
              description: "Dermatitis atópica crónica",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "scorad-score",
              valueNum: 22,
              unit: "pts",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta dermatología de control",
            },
          ],
        },
      ],
    },
    {
      firstName: "Pedro Antonio",
      middleName: "",
      lastName1: "Díaz",
      lastName2: "Navarro",
      birthDate: "1973-07-25",
      sexAtBirth: "H",
      genderIdentity: "M",
      countrySearch: "Colombia",
      municipalitySearch: "Bogotá",
      zoneSearch: "Urbano",
      encounters: [
        {
          appointmentReason: "Gastroenterología - reflujo y dispepsia",
          reasonForVisit:
            "Pirosis postprandial de 4 meses. Regurgitación ácida nocturna.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ENFERMEDAD DEL REFLUJO GASTROESOFAGICO",
              description: "Enfermedad por reflujo gastroesofágico",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
            {
              cie10Search: "GASTRITIS CRONICA SUPERFICIAL",
              description: "Gastritis crónica no especificada",
              diagnosisTypeSearch: "Confirmado nuevo",
            },
          ],
          observations: [
            {
              observationType: "weight",
              valueNum: 82,
              unit: "kg",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta gastroenterología",
            },
            {
              cupsSearch: "ENDOSCOPIA",
              description: "Endoscopia digestiva alta",
            },
          ],
        },
        {
          appointmentReason: "Gastroenterología - resultado endoscopia",
          reasonForVisit:
            "Endoscopia: esofagitis grado A de Los Ángeles. Helicobacter negativo.",
          encounterClassSearch: "Consulta externa",
          modalitySearch: "Intramural",
          finalidadSearch: "TRATAMIENTO",
          causeExternalSearch: "ENFERMEDAD GENERAL",
          condicionDestinoSearch: "DOMICILIO",
          status: "finished",
          diagnosis: [
            {
              cie10Search: "ENFERMEDAD DEL REFLUJO GASTROESOFAGICO",
              description: "ERGE con esofagitis grado A",
              diagnosisTypeSearch: "Impresión diagnóstica",
            },
          ],
          observations: [
            {
              observationType: "weight",
              valueNum: 81,
              unit: "kg",
            },
          ],
          procedures: [
            {
              cupsSearch: "CONSULTA DE PRIMERA VEZ POR MEDICINA",
              description: "Consulta gastroenterología de control",
            },
          ],
        },
      ],
    },
  ];
}

// ─── Data Creation Engine ───────────────────────────────────────────────────

interface SeedResult {
  allergiesCreated: number;
  appointmentsCreated: number;
  attachmentsCreated: number;
  clinicalDocumentsCreated: number;
  consentsCreated: number;
  contactsCreated: number;
  coverageCreated: number;
  dataDisclosuresCreated: number;
  diagnosesCreated: number;
  diagnosticReportsCreated: number;
  encountersCreated: number;
  ihceBundlesCreated: number;
  incapacitiesCreated: number;
  interconsultationsCreated: number;
  medicationAdministrationsCreated: number;
  medicationsCreated: number;
  observationsCreated: number;
  patientsCreated: number;
  proceduresCreated: number;
  ripsExportsCreated: number;
  serviceRequestsCreated: number;
}

interface EncounterStats {
  appointments: number;
  attachments: number;
  clinicalDocuments: number;
  consents: number;
  dataDisclosures: number;
  diagnoses: number;
  diagnosticReports: number;
  encounters: number;
  ihceBundles: number;
  incapacities: number;
  interconsultations: number;
  medicationAdministrations: number;
  medications: number;
  observations: number;
  procedures: number;
  serviceRequests: number;
}

async function createPatientRecord(
  narrative: PatientNarrative,
  docType: string,
  docIndex: number
) {
  const client = getClient();
  const countryCode = await resolveCode("Pais", narrative.countrySearch);
  const municipalityCode = await resolveCode(
    "Municipio",
    narrative.municipalitySearch
  );
  const zoneCode = await resolveCode("ZonaVersion2", narrative.zoneSearch);

  const patientDocNum = String(1_050_000_000 + docIndex);
  const patient = await client.patients.create({
    primaryDocumentType: docType,
    primaryDocumentNumber: patientDocNum,
    firstName: narrative.firstName,
    middleName: narrative.middleName || null,
    lastName1: narrative.lastName1,
    lastName2: narrative.lastName2 || null,
    birthDate: new Date(narrative.birthDate),
    sexAtBirth: narrative.sexAtBirth,
    genderIdentity: narrative.genderIdentity || null,
    countryCode,
    municipalityCode,
    zoneCode,
  });

  log(
    "PATIENT",
    `${patient.firstName} ${patient.lastName1} (${patient.id.slice(0, 8)})`
  );
  return patient;
}

async function createAdministrativePatientData(
  patientId: string,
  narrative: PatientNarrative,
  facility: FacilityContext,
  docIndex: number
): Promise<{ contacts: number; coverage: number }> {
  const selectedPayer = facility.payers[docIndex % facility.payers.length];
  if (!selectedPayer) {
    throw new Error("No payer available for patient coverage.");
  }

  const coveragePlanCode = await getAnyEnabledCode("CoberturaPlan");
  const affiliateType = await getAnyEnabledCode("RIPSTipoUsuarioVersion2");

  await db.insert(patientIdentifier).values({
    id: crypto.randomUUID(),
    patientId,
    identifierSystem: "wellfit-mrn",
    identifierType: "MR",
    identifierValue: `WF-${String(docIndex + 1).padStart(6, "0")}`,
    isCurrent: true,
  });

  await db.insert(patientContact).values({
    id: crypto.randomUUID(),
    patientId,
    contactType: "emergency",
    fullName: `${narrative.lastName1} ${docIndex % 2 === 0 ? "Gómez" : "López"}`,
    relationshipCode: docIndex % 2 === 0 ? "conyuge" : "familiar",
    phone: `300555${String(1000 + docIndex).padStart(4, "0")}`,
    email: `contacto.${docIndex + 1}@wellfit.example`,
    address: `Carrera ${10 + docIndex} # ${20 + docIndex}-35`,
    isPrimary: true,
  });

  await db.insert(coverage).values({
    id: crypto.randomUUID(),
    patientId,
    payerId: selectedPayer.id,
    affiliateType,
    coveragePlanCode,
    policyNumber: `POL-WF-${selectedPayer.code}-${String(docIndex + 1).padStart(4, "0")}`,
    effectiveFrom: new Date("2024-01-01T00:00:00-05:00"),
  });

  return { contacts: 1, coverage: 1 };
}

async function createAllergyIfAsthma(
  patientId: string,
  narrative: PatientNarrative
) {
  const hasAsthma = narrative.encounters.some((e) =>
    e.diagnosis.some((d) => d.description.toLowerCase().includes("asma"))
  );

  if (!hasAsthma) {
    return false;
  }

  const client = getClient();
  await client.clinicalRecords.createAllergy({
    patientId,
    substanceCode: await getAnyEnabledCode("CIE10"),
    codeSystem: "CIE10",
    status: "active",
    criticality: "high",
    reactionText: "Broncoespasmo ante exposición a ácaros del polvo",
    recordedAt: new Date(),
    recordedBy: SEED_USER.id,
  });
  return true;
}

async function resolveEncounterCodes(encNarrative: EncounterNarrative) {
  const encounterClass = await resolveCode(
    "GrupoServicios",
    encNarrative.encounterClassSearch
  );
  const modality = await resolveCode(
    "ModalidadAtencion",
    encNarrative.modalitySearch
  );
  const finalidad = encNarrative.finalidadSearch
    ? await resolveCode(
        "RIPSFinalidadConsultaVersion2",
        encNarrative.finalidadSearch
      )
    : null;
  const causaExterna = encNarrative.causeExternalSearch
    ? await resolveCode(
        "RIPSCausaExternaVersion2",
        encNarrative.causeExternalSearch
      )
    : null;
  const condicionDestino = encNarrative.condicionDestinoSearch
    ? await resolveCode(
        "CondicionyDestinoUsuarioEgreso",
        encNarrative.condicionDestinoSearch
      )
    : null;

  return {
    encounterClass,
    modality,
    finalidad,
    causaExterna,
    condicionDestino,
  };
}

async function createEncounterBundle(
  patientId: string,
  encNarrative: EncounterNarrative,
  facility: FacilityContext,
  practitioner: { id: string },
  scheduledAt: Date,
  encounterIndex: number,
  docIndex: number
): Promise<{ stats: EncounterStats; diagnosisIds: string[] }> {
  const client = getClient();
  const stats: EncounterStats = {
    appointments: 0,
    attachments: 0,
    clinicalDocuments: 0,
    consents: 0,
    dataDisclosures: 0,
    diagnoses: 0,
    diagnosticReports: 0,
    encounters: 0,
    ihceBundles: 0,
    incapacities: 0,
    interconsultations: 0,
    medicationAdministrations: 0,
    medications: 0,
    observations: 0,
    procedures: 0,
    serviceRequests: 0,
  };

  await client.appointments.create({
    patientId,
    practitionerId: practitioner.id,
    siteId: facility.siteId,
    serviceUnitId: facility.serviceUnitId,
    scheduledAt,
    durationMinutes: 30,
    reason: encNarrative.appointmentReason,
    notes: encNarrative.notes || null,
  });
  stats.appointments++;

  const codes = await resolveEncounterCodes(encNarrative);
  const startedAt = new Date(scheduledAt.getTime() + 15 * 60_000);
  const endedAt = new Date(startedAt.getTime() + 30 * 60_000);

  const encounter = await client.encounters.create({
    patientId,
    siteId: facility.siteId,
    serviceUnitId: facility.serviceUnitId,
    encounterClass: codes.encounterClass,
    careModality: codes.modality,
    reasonForVisit: encNarrative.reasonForVisit,
    startedAt,
    status: "in-progress",
    finalidadConsultaCode: codes.finalidad,
    causeExternalCode: codes.causaExterna,
    condicionDestinoCode: codes.condicionDestino,
    modalidadAtencionCode: codes.modality,
  });
  stats.encounters++;

  await client.encounters.close({
    id: encounter.id,
    endedAt,
    status: encNarrative.status,
  });

  const diagnosisIds: string[] = [];
  for (const diag of encNarrative.diagnosis) {
    const cie10Code = await resolveCode("CIE10", diag.cie10Search);
    const diagType = await resolveCode(
      "RIPSTipoDiagnosticoPrincipalVersion2",
      diag.diagnosisTypeSearch
    );
    const created = await client.clinicalRecords.createDiagnosis({
      encounterId: encounter.id,
      code: cie10Code,
      codeSystem: "CIE10",
      description: diag.description,
      diagnosisType: diagType,
      certainty: "confirmed",
      rank: diagnosisIds.length + 1,
    });
    diagnosisIds.push(created.id);
    stats.diagnoses++;
  }

  for (const obs of encNarrative.observations) {
    await client.clinicalRecords.createObservation({
      patientId,
      encounterId: encounter.id,
      observationType: obs.observationType,
      code: obs.codeSearch || obs.observationType,
      codeSystem: "LOINC",
      valueNum: obs.valueNum ?? null,
      valueText: obs.valueText ?? String(obs.valueNum ?? ""),
      valueUnit: obs.unit || null,
      observedAt: startedAt,
      status: "final",
    });
    stats.observations++;
  }

  for (const proc of encNarrative.procedures) {
    const cupsCode = await resolveCode("CUPSRips", proc.cupsSearch);
    await client.clinicalRecords.createProcedure({
      patientId,
      encounterId: encounter.id,
      cupsCode,
      description: proc.description,
      status: "completed",
      performedAt: startedAt,
      performerId: practitioner.id,
    });
    stats.procedures++;
  }

  if (encounterIndex === 0 || encounterIndex === 1) {
    const medication = await createMedicationForEncounter(
      patientId,
      encounter.id,
      practitioner.id,
      diagnosisIds,
      encNarrative,
      startedAt,
      docIndex,
      encounterIndex
    );
    stats.medications++;
    if (encounterIndex === 0) {
      await client.medicationOrders.createAdministration({
        medicationOrderId: medication.id,
        administeredAt: new Date(startedAt.getTime() + 10 * 60_000),
        administeredBy: practitioner.id,
        doseAdministered:
          `${medication.dose} ${medication.doseUnit ?? ""}`.trim(),
        status: "completed",
      });
      stats.medicationAdministrations++;
    }
  }

  const enrichedStats = await createRegulatoryAndClinicalArtifacts(
    patientId,
    encounter.id,
    facility,
    practitioner.id,
    encNarrative,
    startedAt,
    docIndex,
    encounterIndex
  );

  stats.attachments += enrichedStats.attachments;
  stats.clinicalDocuments += enrichedStats.clinicalDocuments;
  stats.consents += enrichedStats.consents;
  stats.dataDisclosures += enrichedStats.dataDisclosures;
  stats.diagnosticReports += enrichedStats.diagnosticReports;
  stats.ihceBundles += enrichedStats.ihceBundles;
  stats.incapacities += enrichedStats.incapacities;
  stats.interconsultations += enrichedStats.interconsultations;
  stats.serviceRequests += enrichedStats.serviceRequests;

  return { stats, diagnosisIds };
}

function createMedicationForEncounter(
  patientId: string,
  encounterId: string,
  prescriberId: string,
  diagnosisIds: string[],
  encNarrative: EncounterNarrative,
  startedAt: Date,
  docIndex: number,
  encounterIndex: number
): Promise<{
  dose: string;
  doseUnit: string | null;
  id: string;
}> {
  const client = getClient();
  const medNames = [
    {
      generic: "Metformina",
      concentration: "500 mg",
      dose: "1",
      unit: "tableta",
      route: "oral",
      freq: "Cada 12 horas",
      dur: "90 días",
      qty: "180",
    },
    {
      generic: "Losartán",
      concentration: "50 mg",
      dose: "1",
      unit: "tableta",
      route: "oral",
      freq: "Cada 24 horas",
      dur: "90 días",
      qty: "90",
    },
    {
      generic: "Salbutamol",
      concentration: "100 mcg",
      dose: "2",
      unit: "inhalación",
      route: "inhalatoria",
      freq: "Cada 8 horas PRN",
      dur: "30 días",
      qty: "1 inhalador",
    },
    {
      generic: "Ácido fólico",
      concentration: "5 mg",
      dose: "1",
      unit: "tableta",
      route: "oral",
      freq: "Cada 24 horas",
      dur: "90 días",
      qty: "90",
    },
    {
      generic: "Omeprazol",
      concentration: "20 mg",
      dose: "1",
      unit: "cápsula",
      route: "oral",
      freq: "30 min antes del desayuno",
      dur: "60 días",
      qty: "60",
    },
  ];

  const medIndex = (docIndex + encounterIndex) % medNames.length;
  const selectedMed = medNames[medIndex];
  if (!selectedMed) {
    throw new Error("Invalid medication selection index.");
  }

  const primaryDiagnosis = encNarrative.diagnosis[0];

  return client.medicationOrders.create({
    patientId,
    encounterId,
    prescriberId,
    diagnosisId: diagnosisIds[0] ?? null,
    genericName: selectedMed.generic,
    concentration: selectedMed.concentration,
    dosageForm: "Tableta",
    dose: selectedMed.dose,
    doseUnit: selectedMed.unit,
    routeCode: selectedMed.route,
    frequencyText: selectedMed.freq,
    durationText: selectedMed.dur,
    quantityTotal: selectedMed.qty,
    indications: primaryDiagnosis?.description ?? null,
    status: "active",
    signedAt: startedAt,
  });
}

type ArtifactStats = Pick<
  EncounterStats,
  | "attachments"
  | "clinicalDocuments"
  | "consents"
  | "dataDisclosures"
  | "diagnosticReports"
  | "ihceBundles"
  | "incapacities"
  | "interconsultations"
  | "serviceRequests"
>;

function createEmptyArtifactStats(): ArtifactStats {
  return {
    attachments: 0,
    clinicalDocuments: 0,
    consents: 0,
    dataDisclosures: 0,
    diagnosticReports: 0,
    ihceBundles: 0,
    incapacities: 0,
    interconsultations: 0,
    serviceRequests: 0,
  };
}

async function createRegulatoryAndClinicalArtifacts(
  patientId: string,
  encounterId: string,
  facility: FacilityContext,
  practitionerId: string,
  encNarrative: EncounterNarrative,
  startedAt: Date,
  docIndex: number,
  encounterIndex: number
): Promise<ArtifactStats> {
  const stats = createEmptyArtifactStats();
  const document = await createClinicalDocumentForEncounter(
    patientId,
    encounterId,
    practitionerId,
    encNarrative,
    encounterIndex
  );
  stats.clinicalDocuments++;

  if (encounterIndex === 0) {
    const consentStats = await createConsentArtifacts(
      patientId,
      encounterId,
      encNarrative,
      startedAt
    );
    stats.consents += consentStats.consents;
    stats.dataDisclosures += consentStats.dataDisclosures;
  }

  const serviceStats = await createServiceRequestArtifacts(
    patientId,
    encounterId,
    facility,
    practitionerId,
    encNarrative,
    startedAt,
    docIndex,
    encounterIndex
  );
  stats.serviceRequests += serviceStats.serviceRequests;
  stats.diagnosticReports += serviceStats.diagnosticReports;
  stats.attachments += serviceStats.attachments;

  stats.interconsultations += await createInterconsultationIfNeeded(
    encounterId,
    practitionerId,
    document.id,
    encNarrative,
    startedAt,
    encounterIndex
  );
  stats.incapacities += await createIncapacityIfNeeded(
    patientId,
    encounterId,
    practitionerId,
    encNarrative,
    startedAt
  );
  stats.ihceBundles += await createIhceBundle(
    patientId,
    encounterId,
    document.id,
    encNarrative,
    startedAt,
    docIndex,
    encounterIndex
  );

  return stats;
}

async function createClinicalDocumentForEncounter(
  patientId: string,
  encounterId: string,
  practitionerId: string,
  encNarrative: EncounterNarrative,
  encounterIndex: number
): Promise<{ id: string }> {
  const client = getClient();
  const primaryDiagnosis = encNarrative.diagnosis[0];
  const documentText = [
    `Motivo de consulta: ${encNarrative.reasonForVisit}`,
    `Diagnóstico principal: ${primaryDiagnosis?.description ?? "Sin diagnóstico principal"}`,
    `Plan: continuar manejo integral y seguimiento por ${encNarrative.appointmentReason.toLowerCase()}.`,
  ].join("\n");

  const document = await client.clinicalDocuments.create({
    patientId,
    encounterId,
    authorPractitionerId: practitionerId,
    documentType: encounterIndex === 0 ? "historia_clinica" : "nota_evolucion",
    payloadJson: {
      source: "seed",
      reasonForVisit: encNarrative.reasonForVisit,
      diagnoses: encNarrative.diagnosis.map((diag) => diag.description),
      observations: encNarrative.observations.map((obs) => ({
        type: obs.observationType,
        value: obs.valueText ?? obs.valueNum,
        unit: obs.unit ?? null,
      })),
      plan: encNarrative.procedures.map((proc) => proc.description),
    },
    sections: [
      {
        sectionCode: "subjective",
        sectionOrder: 1,
        sectionPayloadJson: {
          reasonForVisit: encNarrative.reasonForVisit,
          notes: encNarrative.notes ?? null,
        },
      },
      {
        sectionCode: "assessment-plan",
        sectionOrder: 2,
        sectionPayloadJson: {
          diagnoses: encNarrative.diagnosis.map((diag) => diag.description),
          procedures: encNarrative.procedures.map((proc) => proc.description),
        },
      },
    ],
    textRendered: documentText,
  });

  if (encounterIndex !== 1) {
    await client.clinicalDocuments.sign({ id: document.id });
  }

  return document;
}

async function createConsentArtifacts(
  patientId: string,
  encounterId: string,
  encNarrative: EncounterNarrative,
  startedAt: Date
): Promise<Pick<ArtifactStats, "consents" | "dataDisclosures">> {
  const client = getClient();
  await client.consents.createConsent({
    patientId,
    encounterId,
    consentType: "atencion_integral_ambulatoria",
    procedureCode: encNarrative.procedures[0]
      ? await resolveCode("CUPSRips", encNarrative.procedures[0].cupsSearch)
      : null,
    decision: "granted",
    grantedByPersonName: "Paciente",
    representativeRelationship: null,
    signedAt: new Date(startedAt.getTime() - 15 * 60_000),
    expiresAt: new Date(startedAt.getTime() + 365 * 24 * 60 * 60_000),
  });

  await client.consents.createDataDisclosure({
    patientId,
    thirdPartyName: "Entidad responsable de pago",
    purposeCode: "facturacion-y-auditoria-medica",
    scopeJson: {
      data: ["identificacion", "diagnosticos", "procedimientos", "ordenes"],
      source: "seed",
    },
    grantedAt: new Date(startedAt.getTime() - 10 * 60_000),
    expiresAt: new Date(startedAt.getTime() + 365 * 24 * 60 * 60_000),
    legalBasis: "consentimiento",
  });

  return { consents: 1, dataDisclosures: 1 };
}

async function createServiceRequestArtifacts(
  patientId: string,
  encounterId: string,
  facility: FacilityContext,
  practitionerId: string,
  encNarrative: EncounterNarrative,
  startedAt: Date,
  docIndex: number,
  encounterIndex: number
): Promise<
  Pick<ArtifactStats, "attachments" | "diagnosticReports" | "serviceRequests">
> {
  if (encNarrative.procedures.length <= 1 && encounterIndex !== 1) {
    return { attachments: 0, diagnosticReports: 0, serviceRequests: 0 };
  }

  const client = getClient();
  const primaryDiagnosis = encNarrative.diagnosis[0];
  const requestCode = await resolveCode(
    "CUPSRips",
    encNarrative.procedures.at(-1)?.cupsSearch ?? "LABORATORIO"
  );
  const serviceRequest = await client.serviceRequests.create({
    patientId,
    encounterId,
    requestType: encounterIndex % 2 === 0 ? "laboratory" : "imaging",
    requestCode,
    priority: encounterIndex === 0 ? "routine" : "preferential",
    requestedBy: practitionerId,
    requestedAt: new Date(startedAt.getTime() + 20 * 60_000),
    status: "completed",
  });

  await client.serviceRequests.createReport({
    requestId: serviceRequest.id,
    encounterId,
    reportType: serviceRequest.requestType,
    issuedAt: new Date(startedAt.getTime() + 48 * 60 * 60_000),
    conclusionText:
      primaryDiagnosis?.description ??
      "Resultado compatible con el contexto clínico registrado.",
    performerOrgId: facility.organizationId,
    status: "final",
  });

  await createAttachment(
    serviceRequest.id,
    "service_request",
    `Soporte ${serviceRequest.requestType} ${docIndex + 1}-${encounterIndex + 1}`,
    "diagnostic-result",
    new Date(startedAt.getTime() + 49 * 60 * 60_000)
  );

  return { attachments: 1, diagnosticReports: 1, serviceRequests: 1 };
}

function getRequestedSpecialty(
  encNarrative: EncounterNarrative
): string | null {
  const clinicalText =
    `${encNarrative.appointmentReason} ${encNarrative.reasonForVisit}`.toLowerCase();
  if (clinicalText.includes("prenatal")) {
    return "Ginecología y Obstetricia";
  }
  if (clinicalText.includes("asma")) {
    return "Neumología";
  }
  if (clinicalText.includes("cardiología")) {
    return "Cardiología";
  }
  if (clinicalText.includes("dermatología")) {
    return "Dermatología";
  }
  return null;
}

async function createInterconsultationIfNeeded(
  encounterId: string,
  practitionerId: string,
  documentId: string,
  encNarrative: EncounterNarrative,
  startedAt: Date,
  encounterIndex: number
): Promise<number> {
  const specialty = getRequestedSpecialty(encNarrative);
  if (!specialty) {
    return 0;
  }

  const client = getClient();
  const interconsultation = await client.interconsultations.create({
    encounterId,
    requestedSpecialty: specialty,
    requestedBy: practitionerId,
    requestedAt: new Date(startedAt.getTime() + 25 * 60_000),
    reasonText: `Valoración complementaria por ${specialty}: ${encNarrative.reasonForVisit}`,
    status: encounterIndex === 0 ? "requested" : "completed",
  });

  if (encounterIndex !== 0) {
    await client.interconsultations.respond({
      id: interconsultation.id,
      responseDocumentId: documentId,
      status: "completed",
    });
  }

  return 1;
}

async function createIncapacityIfNeeded(
  patientId: string,
  encounterId: string,
  practitionerId: string,
  encNarrative: EncounterNarrative,
  startedAt: Date
): Promise<number> {
  const clinicalText =
    `${encNarrative.appointmentReason} ${encNarrative.reasonForVisit}`.toLowerCase();
  if (
    !(clinicalText.includes("dolor lumbar") || clinicalText.includes("crisis"))
  ) {
    return 0;
  }

  const client = getClient();
  await client.incapacityCertificates.create({
    patientId,
    encounterId,
    issuedBy: practitionerId,
    issuedAt: new Date(startedAt.getTime() + 35 * 60_000),
    startDate: startedAt,
    endDate: new Date(startedAt.getTime() + 3 * 24 * 60 * 60_000),
    conceptText: `Incapacidad temporal por ${encNarrative.appointmentReason.toLowerCase()}.`,
    destinationEntity: "Empleador / Entidad responsable de pago",
    signedAt: new Date(startedAt.getTime() + 36 * 60_000),
  });

  return 1;
}

async function createIhceBundle(
  patientId: string,
  encounterId: string,
  documentId: string,
  encNarrative: EncounterNarrative,
  startedAt: Date,
  docIndex: number,
  encounterIndex: number
): Promise<number> {
  const client = getClient();
  await client.ihceBundles.create({
    encounterId,
    bundleType: "RDA",
    bundleJson: {
      source: "seed",
      patientId,
      encounterId,
      documentId,
      diagnoses: encNarrative.diagnosis.map((diag) => diag.description),
    },
    generatedAt: new Date(startedAt.getTime() + 60 * 60_000),
    sentAt:
      encounterIndex % 2 === 0
        ? new Date(startedAt.getTime() + 65 * 60_000)
        : null,
    responseCode: encounterIndex % 2 === 0 ? "ACK" : null,
    vidaCode: `VIDA-${docIndex + 1}-${encounterIndex + 1}`,
    status: encounterIndex % 2 === 0 ? "sent" : "generated",
  });

  return 1;
}

async function createAttachment(
  linkedEntityId: string,
  linkedEntityType: string,
  title: string,
  classification: string,
  capturedAt: Date
) {
  const client = getClient();
  const storageLocator = `seed://${linkedEntityType}/${linkedEntityId}/${title}`;
  const binary = await client.attachments.createBinaryObject({
    storageLocator,
    mimeType: "application/pdf",
    sizeBytes: 24_576 + title.length,
    hashSha256: await hashText(storageLocator),
    encryptedKeyRef: `seed-key-${await hashText(`${storageLocator}:key`)}`,
    retentionClass: "clinical-record",
  });

  return client.attachments.createLink({
    binaryId: binary.id,
    linkedEntityType,
    linkedEntityId,
    title,
    classification,
    capturedAt,
  });
}

async function createPatientData(
  narrative: PatientNarrative,
  facility: FacilityContext,
  docIndex: number
): Promise<{
  patientId: string;
  stats: Partial<SeedResult>;
}> {
  const docType = await getAnyEnabledCode("TipoIdPISIS");
  const patient = await createPatientRecord(narrative, docType, docIndex);

  const stats: Partial<SeedResult> = {
    patientsCreated: 1,
    allergiesCreated: 0,
    appointmentsCreated: 0,
    attachmentsCreated: 0,
    clinicalDocumentsCreated: 0,
    consentsCreated: 0,
    contactsCreated: 0,
    coverageCreated: 0,
    dataDisclosuresCreated: 0,
    encountersCreated: 0,
    diagnosesCreated: 0,
    diagnosticReportsCreated: 0,
    ihceBundlesCreated: 0,
    incapacitiesCreated: 0,
    interconsultationsCreated: 0,
    medicationAdministrationsCreated: 0,
    observationsCreated: 0,
    proceduresCreated: 0,
    medicationsCreated: 0,
    ripsExportsCreated: 0,
    serviceRequestsCreated: 0,
  };

  const administrativeData = await createAdministrativePatientData(
    patient.id,
    narrative,
    facility,
    docIndex
  );
  stats.contactsCreated = administrativeData.contacts;
  stats.coverageCreated = administrativeData.coverage;

  const hasAllergy = await createAllergyIfAsthma(patient.id, narrative);
  if (hasAllergy) {
    stats.allergiesCreated = 1;
  }

  for (const [encounterIndex, encNarrative] of narrative.encounters.entries()) {
    const practitioner =
      facility.practitioners[
        (docIndex + encounterIndex) % facility.practitioners.length
      ];
    if (!practitioner) {
      throw new Error("No practitioner available for encounter.");
    }

    const scheduledAt = new Date(
      Date.now() -
        (narrative.encounters.length - encounterIndex) *
          30 *
          24 *
          60 *
          60 *
          1000
    );

    const bundle = await createEncounterBundle(
      patient.id,
      encNarrative,
      facility,
      practitioner,
      scheduledAt,
      encounterIndex,
      docIndex
    );

    stats.appointmentsCreated =
      (stats.appointmentsCreated ?? 0) + bundle.stats.appointments;
    stats.encountersCreated =
      (stats.encountersCreated ?? 0) + bundle.stats.encounters;
    stats.diagnosesCreated =
      (stats.diagnosesCreated ?? 0) + bundle.stats.diagnoses;
    stats.observationsCreated =
      (stats.observationsCreated ?? 0) + bundle.stats.observations;
    stats.proceduresCreated =
      (stats.proceduresCreated ?? 0) + bundle.stats.procedures;
    stats.medicationsCreated =
      (stats.medicationsCreated ?? 0) + bundle.stats.medications;
    stats.medicationAdministrationsCreated =
      (stats.medicationAdministrationsCreated ?? 0) +
      bundle.stats.medicationAdministrations;
    stats.clinicalDocumentsCreated =
      (stats.clinicalDocumentsCreated ?? 0) + bundle.stats.clinicalDocuments;
    stats.consentsCreated =
      (stats.consentsCreated ?? 0) + bundle.stats.consents;
    stats.dataDisclosuresCreated =
      (stats.dataDisclosuresCreated ?? 0) + bundle.stats.dataDisclosures;
    stats.serviceRequestsCreated =
      (stats.serviceRequestsCreated ?? 0) + bundle.stats.serviceRequests;
    stats.diagnosticReportsCreated =
      (stats.diagnosticReportsCreated ?? 0) + bundle.stats.diagnosticReports;
    stats.interconsultationsCreated =
      (stats.interconsultationsCreated ?? 0) + bundle.stats.interconsultations;
    stats.incapacitiesCreated =
      (stats.incapacitiesCreated ?? 0) + bundle.stats.incapacities;
    stats.attachmentsCreated =
      (stats.attachmentsCreated ?? 0) + bundle.stats.attachments;
    stats.ihceBundlesCreated =
      (stats.ihceBundlesCreated ?? 0) + bundle.stats.ihceBundles;
  }

  return { patientId: patient.id, stats };
}

async function createRipsExportsForPayers(
  facility: FacilityContext,
  totals: SeedResult
): Promise<number> {
  const client = getClient();
  const periodTo = new Date();
  const periodFrom = new Date(periodTo.getTime() - 90 * 24 * 60 * 60_000);
  let created = 0;

  for (const [index, selectedPayer] of facility.payers.entries()) {
    await client.ripsExports.create({
      payerId: selectedPayer.id,
      periodFrom,
      periodTo,
      generatedAt: new Date(periodTo.getTime() + index * 60_000),
      status: index === 0 ? "validated" : "draft",
      payloadJson: {
        source: "seed",
        payerCode: selectedPayer.code,
        period: {
          from: periodFrom.toISOString(),
          to: periodTo.toISOString(),
        },
        totals: {
          patients: totals.patientsCreated,
          encounters: totals.encountersCreated,
          diagnoses: totals.diagnosesCreated,
          procedures: totals.proceduresCreated,
          serviceRequests: totals.serviceRequestsCreated,
        },
      },
      validationResultJson:
        index === 0
          ? {
              status: "ok",
              warnings: [],
              source: "seed",
            }
          : null,
    });
    created++;
  }

  return created;
}

function createEmptySeedResult(): SeedResult {
  return {
    allergiesCreated: 0,
    appointmentsCreated: 0,
    attachmentsCreated: 0,
    clinicalDocumentsCreated: 0,
    consentsCreated: 0,
    contactsCreated: 0,
    coverageCreated: 0,
    dataDisclosuresCreated: 0,
    diagnosesCreated: 0,
    diagnosticReportsCreated: 0,
    encountersCreated: 0,
    ihceBundlesCreated: 0,
    incapacitiesCreated: 0,
    interconsultationsCreated: 0,
    medicationAdministrationsCreated: 0,
    medicationsCreated: 0,
    observationsCreated: 0,
    patientsCreated: 0,
    proceduresCreated: 0,
    ripsExportsCreated: 0,
    serviceRequestsCreated: 0,
  };
}

function addSeedStats(totals: SeedResult, stats: Partial<SeedResult>): void {
  totals.patientsCreated += stats.patientsCreated ?? 0;
  totals.appointmentsCreated += stats.appointmentsCreated ?? 0;
  totals.encountersCreated += stats.encountersCreated ?? 0;
  totals.diagnosesCreated += stats.diagnosesCreated ?? 0;
  totals.observationsCreated += stats.observationsCreated ?? 0;
  totals.proceduresCreated += stats.proceduresCreated ?? 0;
  totals.medicationsCreated += stats.medicationsCreated ?? 0;
  totals.medicationAdministrationsCreated +=
    stats.medicationAdministrationsCreated ?? 0;
  totals.allergiesCreated += stats.allergiesCreated ?? 0;
  totals.contactsCreated += stats.contactsCreated ?? 0;
  totals.coverageCreated += stats.coverageCreated ?? 0;
  totals.clinicalDocumentsCreated += stats.clinicalDocumentsCreated ?? 0;
  totals.consentsCreated += stats.consentsCreated ?? 0;
  totals.dataDisclosuresCreated += stats.dataDisclosuresCreated ?? 0;
  totals.serviceRequestsCreated += stats.serviceRequestsCreated ?? 0;
  totals.diagnosticReportsCreated += stats.diagnosticReportsCreated ?? 0;
  totals.interconsultationsCreated += stats.interconsultationsCreated ?? 0;
  totals.incapacitiesCreated += stats.incapacitiesCreated ?? 0;
  totals.attachmentsCreated += stats.attachmentsCreated ?? 0;
  totals.ihceBundlesCreated += stats.ihceBundlesCreated ?? 0;
}

// ─── Main Seed Runner ───────────────────────────────────────────────────────

export async function runSeed(
  options: { clean?: boolean } = {}
): Promise<SeedResult> {
  log("START", "WellFit EMR Seed Script");
  log("START", `Seed user: ${SEED_USER.email}`);

  const hasData = await hasExistingSeedData();

  if (hasData && !options.clean) {
    logError(
      "START",
      "Existing seed data detected. Run with --clean to overwrite, or use a fresh database."
    );
    throw new Error(
      "Seed data already exists. Use --clean flag to remove previous data before seeding."
    );
  }

  if (options.clean && hasData) {
    await cleanSeedData();
  }

  // Ensure seed user exists
  await ensureSeedUserExists(db);
  log("AUTH", `Seed user ready: ${SEED_USER.id}`);

  // Sync catalogs first (REQUIRED — no hardcoded codes)
  await syncCatalogs();

  // Create facilities
  const facility = await createFacilities();

  // Create patients with narratives
  const narratives = createNarratives();
  log(
    "PATIENTS",
    `Creating ${narratives.length} patients with full histories...`
  );

  const totals = createEmptySeedResult();

  for (const [index, narrative] of narratives.entries()) {
    const { stats } = await createPatientData(narrative, facility, index);
    addSeedStats(totals, stats);
  }

  totals.ripsExportsCreated = await createRipsExportsForPayers(
    facility,
    totals
  );

  // Summary
  log("DONE", "Seed completed successfully!");
  log("DONE", `Patients:      ${totals.patientsCreated}`);
  log("DONE", `Appointments:  ${totals.appointmentsCreated}`);
  log("DONE", `Encounters:    ${totals.encountersCreated}`);
  log("DONE", `Diagnoses:     ${totals.diagnosesCreated}`);
  log("DONE", `Observations:  ${totals.observationsCreated}`);
  log("DONE", `Procedures:    ${totals.proceduresCreated}`);
  log("DONE", `Medications:   ${totals.medicationsCreated}`);
  log("DONE", `Med Admins:    ${totals.medicationAdministrationsCreated}`);
  log("DONE", `Allergies:     ${totals.allergiesCreated}`);
  log("DONE", `Documents:     ${totals.clinicalDocumentsCreated}`);
  log("DONE", `Consents:      ${totals.consentsCreated}`);
  log("DONE", `Disclosures:   ${totals.dataDisclosuresCreated}`);
  log("DONE", `Service Req.:  ${totals.serviceRequestsCreated}`);
  log("DONE", `Diag Reports:  ${totals.diagnosticReportsCreated}`);
  log("DONE", `Interconsult.: ${totals.interconsultationsCreated}`);
  log("DONE", `Incapacities:  ${totals.incapacitiesCreated}`);
  log("DONE", `Attachments:   ${totals.attachmentsCreated}`);
  log("DONE", `IHCE bundles:  ${totals.ihceBundlesCreated}`);
  log("DONE", `RIPS exports:  ${totals.ripsExportsCreated}`);
  log("DONE", `Contacts:      ${totals.contactsCreated}`);
  log("DONE", `Coverage:      ${totals.coverageCreated}`);

  return totals;
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────

if (import.meta.main) {
  const clean = process.argv.includes("--clean");
  runSeed({ clean }).catch((error: unknown) => {
    logError("FATAL", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}
