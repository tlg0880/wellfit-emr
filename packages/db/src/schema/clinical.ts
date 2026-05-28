import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull();

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const requiredTimestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" }).notNull();
const jsonText = <TData>(name: string) =>
  text(name, { mode: "json" }).$type<TData>();

export type JsonRecord = Record<string, unknown>;

export const organization = sqliteTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    repsCode: text("reps_code"),
    taxId: text("tax_id"),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("organization_reps_code_idx").on(table.repsCode),
    index("organization_tax_id_idx").on(table.taxId),
  ]
);

export const site = sqliteTable(
  "site",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    siteCode: text("site_code").notNull(),
    name: text("name").notNull(),
    municipalityCode: text("municipality_code"),
    address: text("address"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("site_organization_code_idx").on(
      table.organizationId,
      table.siteCode
    ),
  ]
);

export const serviceUnit = sqliteTable(
  "service_unit",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id),
    serviceCode: text("service_code").notNull(),
    name: text("name").notNull(),
    careSetting: text("care_setting").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("service_unit_site_code_idx").on(table.siteId, table.serviceCode),
  ]
);

export const practitioner = sqliteTable(
  "practitioner",
  {
    id: text("id").primaryKey(),
    documentType: text("document_type").notNull(),
    documentNumber: text("document_number").notNull(),
    fullName: text("full_name").notNull(),
    rethusNumber: text("rethus_number"),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("practitioner_document_idx").on(
      table.documentType,
      table.documentNumber
    ),
    index("practitioner_rethus_number_idx").on(table.rethusNumber),
  ]
);

export const userPractitionerLink = sqliteTable(
  "user_practitioner_link",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioner.id),
    linkType: text("link_type").notNull().default("primary"),
    effectiveFrom: requiredTimestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("user_practitioner_link_user_practitioner_idx").on(
      table.userId,
      table.practitionerId,
      table.linkType
    ),
    index("user_practitioner_link_user_active_idx").on(
      table.userId,
      table.effectiveTo
    ),
    index("user_practitioner_link_practitioner_active_idx").on(
      table.practitionerId,
      table.effectiveTo
    ),
  ]
);

export const practitionerRole = sqliteTable(
  "practitioner_role",
  {
    id: text("id").primaryKey(),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioner.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    siteId: text("site_id").references(() => site.id),
    roleCode: text("role_code").notNull(),
    startAt: requiredTimestamp("start_at"),
    endAt: timestamp("end_at"),
  },
  (table) => [
    index("practitioner_role_lookup_idx").on(
      table.practitionerId,
      table.roleCode,
      table.endAt
    ),
  ]
);

export const clinicalRole = sqliteTable("clinical_role", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  scope: text("scope").notNull(),
});

export const permission = sqliteTable("permission", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
});

export const userClinicalRole = sqliteTable(
  "user_clinical_role",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    roleId: text("role_id")
      .notNull()
      .references(() => clinicalRole.id),
    siteId: text("site_id").references(() => site.id),
    effectiveFrom: requiredTimestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
  },
  (table) => [
    index("user_clinical_role_active_idx").on(table.userId, table.effectiveTo),
  ]
);

export const rolePermission = sqliteTable(
  "role_permission",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => clinicalRole.id),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permission.id),
  },
  (table) => [
    uniqueIndex("role_permission_unique_idx").on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const patient = sqliteTable(
  "patient",
  {
    id: text("id").primaryKey(),
    primaryDocumentType: text("primary_document_type").notNull(),
    primaryDocumentNumber: text("primary_document_number").notNull(),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName1: text("last_name_1").notNull(),
    lastName2: text("last_name_2"),
    birthDate: integer("birth_date", { mode: "timestamp_ms" }).notNull(),
    sexAtBirth: text("sex_at_birth").notNull(),
    genderIdentity: text("gender_identity"),
    countryCode: text("country_code"),
    municipalityCode: text("municipality_code"),
    zoneCode: text("zone_code"),
    deceasedAt: timestamp("deceased_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("patient_primary_document_idx").on(
      table.primaryDocumentType,
      table.primaryDocumentNumber
    ),
    index("patient_birth_date_idx").on(table.birthDate),
    index("patient_municipality_idx").on(table.municipalityCode),
  ]
);

export const patientIdentifier = sqliteTable(
  "patient_identifier",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    identifierSystem: text("identifier_system").notNull(),
    identifierType: text("identifier_type").notNull(),
    identifierValue: text("identifier_value").notNull(),
    isCurrent: integer("is_current", { mode: "boolean" })
      .default(true)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("patient_identifier_system_value_idx").on(
      table.identifierSystem,
      table.identifierValue
    ),
  ]
);

export const patientContact = sqliteTable(
  "patient_contact",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    contactType: text("contact_type").notNull(),
    fullName: text("full_name"),
    relationshipCode: text("relationship_code"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .default(false)
      .notNull(),
  },
  (table) => [
    index("patient_contact_primary_idx").on(table.patientId, table.isPrimary),
  ]
);

export const payer = sqliteTable(
  "payer",
  {
    id: text("id").primaryKey(),
    payerType: text("payer_type").notNull(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("payer_type_code_idx").on(table.payerType, table.code),
  ]
);

export const coverage = sqliteTable(
  "coverage",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    payerId: text("payer_id")
      .notNull()
      .references(() => payer.id),
    affiliateType: text("affiliate_type").notNull(),
    coveragePlanCode: text("coverage_plan_code"),
    policyNumber: text("policy_number"),
    effectiveFrom: requiredTimestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
  },
  (table) => [
    index("coverage_patient_active_idx").on(table.patientId, table.effectiveTo),
    index("coverage_plan_code_idx").on(table.coveragePlanCode),
  ]
);

export const encounter = sqliteTable(
  "encounter",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id),
    serviceUnitId: text("service_unit_id")
      .notNull()
      .references(() => serviceUnit.id),
    encounterType: text("encounter_type", {
      enum: ["clinical", "documentary"],
    })
      .notNull()
      .default("clinical"),
    encounterClass: text("encounter_class").notNull(),
    careModality: text("care_modality").notNull(),
    admissionSource: text("admission_source"),
    causeExternalCode: text("cause_external_code"),
    finalidadConsultaCode: text("finalidad_consulta_code"),
    condicionDestinoCode: text("condicion_destino_code"),
    modalidadAtencionCode: text("modalidad_atencion_code"),
    reasonForVisit: text("reason_for_visit").notNull(),
    startedAt: requiredTimestamp("started_at"),
    endedAt: timestamp("ended_at"),
    status: text("status").notNull(),
    vidaCode: text("vida_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("encounter_patient_started_idx").on(table.patientId, table.startedAt),
    index("encounter_site_started_idx").on(table.siteId, table.startedAt),
    index("encounter_type_idx").on(table.encounterType),
    index("encounter_cause_external_idx").on(table.causeExternalCode),
    index("encounter_finalidad_idx").on(table.finalidadConsultaCode),
  ]
);

export const encounterParticipant = sqliteTable(
  "encounter_participant",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id),
    practitionerId: text("practitioner_id")
      .notNull()
      .references(() => practitioner.id),
    participantRole: text("participant_role").notNull(),
    startedAt: requiredTimestamp("started_at"),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    index("encounter_participant_role_idx").on(
      table.encounterId,
      table.participantRole
    ),
  ]
);

export const clinicalDocument = sqliteTable(
  "clinical_document",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id),
    documentType: text("document_type").notNull(),
    status: text("status").notNull(),
    currentVersionId: text("current_version_id"),
    createdAt: createdAt(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("clinical_document_patient_type_created_idx").on(
      table.patientId,
      table.documentType,
      table.createdAt
    ),
  ]
);

export const clinicalDocumentVersion = sqliteTable(
  "clinical_document_version",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => clinicalDocument.id),
    versionNo: integer("version_no").notNull(),
    supersedesVersionId: text("supersedes_version_id"),
    authorPractitionerId: text("author_practitioner_id")
      .notNull()
      .references(() => practitioner.id),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id),
    signedByUserId: text("signed_by_user_id").references(() => user.id),
    signedAt: timestamp("signed_at"),
    correctionReason: text("correction_reason"),
    payloadJson: jsonText<JsonRecord>("payload_json").notNull(),
    textRendered: text("text_rendered"),
    hashSha256: text("hash_sha256").notNull(),
    isCurrent: integer("is_current", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("clinical_document_version_unique_idx").on(
      table.documentId,
      table.versionNo
    ),
    index("clinical_document_version_current_idx").on(
      table.documentId,
      table.isCurrent
    ),
    index("clinical_document_version_hash_idx").on(table.hashSha256),
  ]
);

export const documentSection = sqliteTable(
  "document_section",
  {
    id: text("id").primaryKey(),
    documentVersionId: text("document_version_id")
      .notNull()
      .references(() => clinicalDocumentVersion.id),
    sectionCode: text("section_code").notNull(),
    sectionOrder: integer("section_order").notNull(),
    sectionPayloadJson: jsonText<JsonRecord>("section_payload_json").notNull(),
  },
  (table) => [
    uniqueIndex("document_section_version_code_idx").on(
      table.documentVersionId,
      table.sectionCode
    ),
  ]
);

export const diagnosis = sqliteTable(
  "diagnosis",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    documentVersionId: text("document_version_id").references(
      () => clinicalDocumentVersion.id,
      { onDelete: "cascade" }
    ),
    codeSystem: text("code_system").notNull(),
    code: text("code").notNull(),
    description: text("description").notNull(),
    diagnosisType: text("diagnosis_type").notNull(),
    ripsReferenceName: text("rips_reference_name"),
    rank: integer("rank"),
    onsetAt: timestamp("onset_at"),
    certainty: text("certainty"),
  },
  (table) => [
    index("diagnosis_encounter_code_idx").on(
      table.encounterId,
      table.codeSystem,
      table.code
    ),
  ]
);

export const allergyIntolerance = sqliteTable(
  "allergy_intolerance",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    substanceCode: text("substance_code").notNull(),
    codeSystem: text("code_system").notNull(),
    criticality: text("criticality"),
    reactionText: text("reaction_text"),
    status: text("status").notNull(),
    recordedAt: requiredTimestamp("recorded_at"),
    recordedBy: text("recorded_by").notNull(),
  },
  (table) => [
    index("allergy_patient_status_idx").on(table.patientId, table.status),
  ]
);

export const observation = sqliteTable(
  "observation",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    documentVersionId: text("document_version_id").references(
      () => clinicalDocumentVersion.id,
      { onDelete: "cascade" }
    ),
    observationType: text("observation_type").notNull(),
    codeSystem: text("code_system"),
    code: text("code"),
    valueText: text("value_text"),
    valueNum: integer("value_num"),
    valueUnit: text("value_unit"),
    observedAt: requiredTimestamp("observed_at"),
    status: text("status").notNull(),
  },
  (table) => [
    index("observation_encounter_type_time_idx").on(
      table.encounterId,
      table.observationType,
      table.observedAt
    ),
  ]
);

export const procedureRecord = sqliteTable(
  "procedure_record",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    cupsCode: text("cups_code").notNull(),
    description: text("description").notNull(),
    ripsReferenceName: text("rips_reference_name"),
    performedAt: timestamp("performed_at"),
    performerId: text("performer_id").references(() => practitioner.id),
    status: text("status").notNull(),
  },
  (table) => [
    index("procedure_encounter_cups_idx").on(table.encounterId, table.cupsCode),
  ]
);

export const medicationOrder = sqliteTable(
  "medication_order",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    diagnosisId: text("diagnosis_id").references(() => diagnosis.id, {
      onDelete: "cascade",
    }),
    prescriberId: text("prescriber_id")
      .notNull()
      .references(() => practitioner.id),
    genericName: text("generic_name").notNull(),
    atcCode: text("atc_code"),
    concentration: text("concentration").notNull(),
    dosageForm: text("dosage_form").notNull(),
    dose: text("dose").notNull(),
    doseUnit: text("dose_unit"),
    routeCode: text("route_code").notNull(),
    frequencyText: text("frequency_text").notNull(),
    durationText: text("duration_text").notNull(),
    quantityTotal: text("quantity_total").notNull(),
    validUntil: timestamp("valid_until"),
    indications: text("indications"),
    status: text("status").notNull(),
    signedAt: requiredTimestamp("signed_at"),
  },
  (table) => [
    index("medication_order_encounter_prescriber_idx").on(
      table.encounterId,
      table.prescriberId,
      table.signedAt
    ),
  ]
);

export const medicationAdministration = sqliteTable(
  "medication_administration",
  {
    id: text("id").primaryKey(),
    medicationOrderId: text("medication_order_id")
      .notNull()
      .references(() => medicationOrder.id, { onDelete: "cascade" }),
    administeredAt: requiredTimestamp("administered_at"),
    administeredBy: text("administered_by")
      .notNull()
      .references(() => practitioner.id),
    doseAdministered: text("dose_administered"),
    status: text("status").notNull(),
    reasonNotAdministered: text("reason_not_administered"),
  },
  (table) => [
    index("med_admin_order_time_idx").on(
      table.medicationOrderId,
      table.administeredAt
    ),
  ]
);

export const serviceRequest = sqliteTable(
  "service_request",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    requestType: text("request_type").notNull(),
    requestCode: text("request_code").notNull(),
    priority: text("priority").notNull(),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => practitioner.id),
    requestedAt: requiredTimestamp("requested_at"),
    status: text("status").notNull(),
  },
  (table) => [
    index("service_request_encounter_type_status_idx").on(
      table.encounterId,
      table.requestType,
      table.status
    ),
  ]
);

export const diagnosticReport = sqliteTable(
  "diagnostic_report",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => serviceRequest.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    reportType: text("report_type").notNull(),
    issuedAt: requiredTimestamp("issued_at"),
    conclusionText: text("conclusion_text"),
    performerOrgId: text("performer_org_id").references(() => organization.id),
    status: text("status").notNull(),
  },
  (table) => [
    index("diagnostic_report_request_issued_idx").on(
      table.requestId,
      table.issuedAt
    ),
  ]
);

export const interconsultation = sqliteTable(
  "interconsultation",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    requestedSpecialty: text("requested_specialty").notNull(),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => practitioner.id),
    requestedAt: requiredTimestamp("requested_at"),
    reasonText: text("reason_text").notNull(),
    responseDocumentId: text("response_document_id").references(
      () => clinicalDocument.id
    ),
    status: text("status").notNull(),
  },
  (table) => [
    index("interconsultation_encounter_status_idx").on(
      table.encounterId,
      table.status
    ),
  ]
);

export const incapacityCertificate = sqliteTable(
  "incapacity_certificate",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    issuedBy: text("issued_by")
      .notNull()
      .references(() => practitioner.id),
    issuedAt: requiredTimestamp("issued_at"),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    conceptText: text("concept_text").notNull(),
    destinationEntity: text("destination_entity"),
    signedAt: requiredTimestamp("signed_at"),
  },
  (table) => [
    index("incapacity_patient_issued_idx").on(table.patientId, table.issuedAt),
  ]
);

export const consentRecord = sqliteTable(
  "consent_record",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id").references(() => encounter.id, {
      onDelete: "cascade",
    }),
    consentType: text("consent_type").notNull(),
    procedureCode: text("procedure_code"),
    decision: text("decision").notNull(),
    grantedByPersonName: text("granted_by_person_name").notNull(),
    representativeRelationship: text("representative_relationship"),
    signedAt: requiredTimestamp("signed_at"),
    expiresAt: timestamp("expires_at"),
    documentVersionId: text("document_version_id").references(
      () => clinicalDocumentVersion.id,
      { onDelete: "cascade" }
    ),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    index("consent_patient_type_signed_idx").on(
      table.patientId,
      table.consentType,
      table.signedAt
    ),
  ]
);

export const dataDisclosureAuthorization = sqliteTable(
  "data_disclosure_authorization",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    thirdPartyName: text("third_party_name").notNull(),
    purposeCode: text("purpose_code").notNull(),
    scopeJson: jsonText<JsonRecord>("scope_json").notNull(),
    grantedAt: requiredTimestamp("granted_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    legalBasis: text("legal_basis").notNull(),
  },
  (table) => [
    index("data_disclosure_patient_expiry_idx").on(
      table.patientId,
      table.expiresAt
    ),
  ]
);

export const binaryObject = sqliteTable(
  "binary_object",
  {
    id: text("id").primaryKey(),
    storageLocator: text("storage_locator").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    hashSha256: text("hash_sha256").notNull().unique(),
    encryptedKeyRef: text("encrypted_key_ref").notNull(),
    createdAt: createdAt(),
    retentionClass: text("retention_class").notNull(),
  },
  (table) => [
    index("binary_object_retention_class_idx").on(table.retentionClass),
  ]
);

export const attachmentLink = sqliteTable(
  "attachment_link",
  {
    id: text("id").primaryKey(),
    binaryId: text("binary_id")
      .notNull()
      .references(() => binaryObject.id, { onDelete: "cascade" }),
    linkedEntityType: text("linked_entity_type").notNull(),
    linkedEntityId: text("linked_entity_id").notNull(),
    title: text("title").notNull(),
    classification: text("classification").notNull(),
    capturedAt: requiredTimestamp("captured_at"),
  },
  (table) => [
    index("attachment_link_entity_idx").on(
      table.linkedEntityType,
      table.linkedEntityId
    ),
  ]
);

export const ripsExport = sqliteTable(
  "rips_export",
  {
    id: text("id").primaryKey(),
    payerId: text("payer_id")
      .notNull()
      .references(() => payer.id),
    periodFrom: integer("period_from", { mode: "timestamp_ms" }).notNull(),
    periodTo: integer("period_to", { mode: "timestamp_ms" }).notNull(),
    status: text("status").notNull(),
    operationType: text("operation_type").notNull().default("FEV_RIPS"),
    organizationTaxId: text("organization_tax_id"),
    invoiceNumber: text("invoice_number"),
    noteType: text("note_type"),
    noteNumber: text("note_number"),
    numUsers: integer("num_users"),
    totalValue: text("total_value"),
    generatedAt: requiredTimestamp("generated_at"),
    payloadJson: jsonText<JsonRecord>("payload_json"),
    validationResultJson: jsonText<JsonRecord>("validation_result_json"),
    cuv: text("cuv"),
    sentAt: timestamp("sent_at"),
    muvResponseJson: jsonText<JsonRecord>("muv_response_json"),
  },
  (table) => [
    index("rips_export_generated_status_idx").on(
      table.generatedAt,
      table.status
    ),
    index("rips_export_operation_type_idx").on(table.operationType),
    index("rips_export_cuv_idx").on(table.cuv),
  ]
);

export const ripsExportEncounter = sqliteTable(
  "rips_export_encounter",
  {
    id: text("id").primaryKey(),
    ripsExportId: text("rips_export_id")
      .notNull()
      .references(() => ripsExport.id, { onDelete: "cascade" }),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id),
    userConsecutive: integer("user_consecutive").notNull(),
    serviceType: text("service_type").notNull(),
    serviceConsecutive: integer("service_consecutive").notNull(),
    includedAt: requiredTimestamp("included_at"),
  },
  (table) => [
    index("ree_export_idx").on(table.ripsExportId),
    index("ree_encounter_idx").on(table.encounterId),
    index("ree_patient_idx").on(table.patientId),
    uniqueIndex("ree_export_encounter_service_unique_idx").on(
      table.ripsExportId,
      table.encounterId,
      table.serviceType,
      table.serviceConsecutive
    ),
  ]
);

export const billingItem = sqliteTable(
  "billing_item",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    payerId: text("payer_id")
      .notNull()
      .references(() => payer.id),
    serviceType: text("service_type").notNull(),
    serviceCode: text("service_code").notNull(),
    serviceId: text("service_id"),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    unitValue: text("unit_value").notNull(),
    totalValue: text("total_value").notNull(),
    createdAt: requiredTimestamp("created_at"),
  },
  (table) => [
    index("billing_item_encounter_idx").on(table.encounterId),
    index("billing_item_payer_idx").on(table.payerId),
    index("billing_item_service_idx").on(table.serviceType, table.serviceCode),
  ]
);

export const ihceBundle = sqliteTable(
  "ihce_bundle",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id")
      .notNull()
      .references(() => encounter.id, { onDelete: "cascade" }),
    bundleType: text("bundle_type").notNull(),
    bundleJson: jsonText<JsonRecord>("bundle_json").notNull(),
    generatedAt: requiredTimestamp("generated_at"),
    sentAt: timestamp("sent_at"),
    responseCode: text("response_code"),
    vidaCode: text("vida_code"),
    status: text("status").notNull(),
  },
  (table) => [
    index("ihce_bundle_encounter_status_idx").on(
      table.encounterId,
      table.status
    ),
  ]
);

export const auditEvent = sqliteTable(
  "audit_event",
  {
    id: integer("id").primaryKey(),
    patientId: text("patient_id").references(() => patient.id, {
      onDelete: "cascade",
    }),
    encounterId: text("encounter_id").references(() => encounter.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    actionCode: text("action_code").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    occurredAt: requiredTimestamp("occurred_at"),
    channel: text("channel").notNull(),
    ipHash: text("ip_hash"),
    resultCode: text("result_code").notNull(),
    reasonCode: text("reason_code"),
  },
  (table) => [
    index("audit_event_patient_time_idx").on(table.patientId, table.occurredAt),
    index("audit_event_user_time_idx").on(table.userId, table.occurredAt),
    index("audit_event_action_time_idx").on(table.actionCode, table.occurredAt),
  ]
);

export const appointment = sqliteTable(
  "appointment",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id),
    practitionerId: text("practitioner_id").references(() => practitioner.id),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id),
    serviceUnitId: text("service_unit_id").references(() => serviceUnit.id),
    scheduledAt: requiredTimestamp("scheduled_at"),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    status: text("status").notNull().default("scheduled"),
    reason: text("reason").notNull(),
    notes: text("notes"),
    encounterId: text("encounter_id").references(() => encounter.id, {
      onDelete: "cascade",
    }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    cancelledAt: timestamp("cancelled_at"),
    cancelledReason: text("cancelled_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("appointment_patient_scheduled_idx").on(
      table.patientId,
      table.scheduledAt
    ),
    index("appointment_practitioner_scheduled_idx").on(
      table.practitionerId,
      table.scheduledAt
    ),
    index("appointment_site_scheduled_idx").on(table.siteId, table.scheduledAt),
    index("appointment_status_scheduled_idx").on(
      table.status,
      table.scheduledAt
    ),
    index("appointment_encounter_idx").on(table.encounterId),
  ]
);

export const retentionRecord = sqliteTable(
  "retention_record",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    retentionClass: text("retention_class").notNull(),
    triggerDate: integer("trigger_date", { mode: "timestamp_ms" }).notNull(),
    disposalEligibilityDate: integer("disposal_eligibility_date", {
      mode: "timestamp_ms",
    }).notNull(),
    legalHoldFlag: integer("legal_hold_flag", { mode: "boolean" })
      .default(false)
      .notNull(),
  },
  (table) => [
    index("retention_disposal_hold_idx").on(
      table.disposalEligibilityDate,
      table.legalHoldFlag
    ),
  ]
);

export const patientCopyRequest = sqliteTable(
  "patient_copy_request",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    patientName: text("patient_name").notNull(),
    scope: text("scope").notNull(),
    deliveryChannel: text("delivery_channel").notNull(),
    requester: text("requester").notNull(),
    legalBasis: text("legal_basis").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("Recibida"),
    createdAt: requiredTimestamp("created_at").default(
      sql`(cast(unixepoch('subsecond') * 1000 as integer))`
    ),
    deadline: requiredTimestamp("deadline"),
  },
  (table) => [
    index("pcr_patient_idx").on(table.patientId),
    index("pcr_status_idx").on(table.status),
    index("pcr_deadline_idx").on(table.deadline),
  ]
);

export const patientDocument = sqliteTable(
  "patient_document",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    originalFileName: text("original_file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedByUserId: text("uploaded_by_user_id").references(() => user.id),
    status: text("status").notNull().default("pending"),
    summaryText: text("summary_text"),
    summaryJson: jsonText<JsonRecord>("summary_json"),
    extractedText: text("extracted_text"),
    errorMessage: text("error_message"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("patient_document_patient_idx").on(table.patientId),
    index("patient_document_status_idx").on(table.status),
    index("patient_document_uploaded_by_idx").on(table.uploadedByUserId),
  ]
);

export const patientRelations = relations(patient, ({ many }) => ({
  identifiers: many(patientIdentifier),
  contacts: many(patientContact),
  coverages: many(coverage),
  encounters: many(encounter),
  clinicalDocuments: many(clinicalDocument),
  patientDocuments: many(patientDocument),
}));

export const practitionerRelations = relations(practitioner, ({ many }) => ({
  userLinks: many(userPractitionerLink),
  organizationRoles: many(practitionerRole),
  encounterParticipations: many(encounterParticipant),
}));

export const userPractitionerLinkRelations = relations(
  userPractitionerLink,
  ({ one }) => ({
    user: one(user, {
      fields: [userPractitionerLink.userId],
      references: [user.id],
    }),
    practitioner: one(practitioner, {
      fields: [userPractitionerLink.practitionerId],
      references: [practitioner.id],
    }),
  })
);

export const encounterRelations = relations(encounter, ({ many, one }) => ({
  patient: one(patient, {
    fields: [encounter.patientId],
    references: [patient.id],
  }),
  site: one(site, {
    fields: [encounter.siteId],
    references: [site.id],
  }),
  serviceUnit: one(serviceUnit, {
    fields: [encounter.serviceUnitId],
    references: [serviceUnit.id],
  }),
  participants: many(encounterParticipant),
  clinicalDocuments: many(clinicalDocument),
  diagnoses: many(diagnosis),
  observations: many(observation),
  medicationOrders: many(medicationOrder),
  billingItems: many(billingItem),
}));

export const clinicalDocumentRelations = relations(
  clinicalDocument,
  ({ many, one }) => ({
    patient: one(patient, {
      fields: [clinicalDocument.patientId],
      references: [patient.id],
    }),
    encounter: one(encounter, {
      fields: [clinicalDocument.encounterId],
      references: [encounter.id],
    }),
    versions: many(clinicalDocumentVersion),
  })
);

export const clinicalDocumentVersionRelations = relations(
  clinicalDocumentVersion,
  ({ many, one }) => ({
    document: one(clinicalDocument, {
      fields: [clinicalDocumentVersion.documentId],
      references: [clinicalDocument.id],
    }),
    authorPractitioner: one(practitioner, {
      fields: [clinicalDocumentVersion.authorPractitionerId],
      references: [practitioner.id],
    }),
    sections: many(documentSection),
  })
);

export const appointmentRelations = relations(appointment, ({ one }) => ({
  patient: one(patient, {
    fields: [appointment.patientId],
    references: [patient.id],
  }),
  practitioner: one(practitioner, {
    fields: [appointment.practitionerId],
    references: [practitioner.id],
  }),
  site: one(site, {
    fields: [appointment.siteId],
    references: [site.id],
  }),
  serviceUnit: one(serviceUnit, {
    fields: [appointment.serviceUnitId],
    references: [serviceUnit.id],
  }),
  encounter: one(encounter, {
    fields: [appointment.encounterId],
    references: [encounter.id],
  }),
}));

export const patientDocumentRelations = relations(
  patientDocument,
  ({ one }) => ({
    patient: one(patient, {
      fields: [patientDocument.patientId],
      references: [patient.id],
    }),
    uploadedBy: one(user, {
      fields: [patientDocument.uploadedByUserId],
      references: [user.id],
    }),
  })
);

export const ripsExportRelations = relations(ripsExport, ({ one, many }) => ({
  payer: one(payer, {
    fields: [ripsExport.payerId],
    references: [payer.id],
  }),
  encounters: many(ripsExportEncounter),
}));

export const ripsExportEncounterRelations = relations(
  ripsExportEncounter,
  ({ one }) => ({
    ripsExport: one(ripsExport, {
      fields: [ripsExportEncounter.ripsExportId],
      references: [ripsExport.id],
    }),
    encounter: one(encounter, {
      fields: [ripsExportEncounter.encounterId],
      references: [encounter.id],
    }),
    patient: one(patient, {
      fields: [ripsExportEncounter.patientId],
      references: [patient.id],
    }),
  })
);
