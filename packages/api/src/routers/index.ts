import type { AnyRouter, RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { appointmentsRouter } from "./appointments";
import { attachmentsRouter } from "./attachments";
import { auditEventsRouter } from "./audit-events";
import { clinicalDocumentsRouter } from "./clinical-documents";
import { clinicalRecordsRouter } from "./clinical-records";
import { consentsRouter } from "./consents";
import { coverageRouter } from "./coverage";
import { encounterParticipantsRouter } from "./encounter-participants";
import { encountersRouter } from "./encounters";
import { facilitiesRouter } from "./facilities";
import { ihceBundlesRouter } from "./ihce-bundles";
import { incapacityCertificatesRouter } from "./incapacity-certificates";
import { interconsultationsRouter } from "./interconsultations";
import { medicationOrdersRouter } from "./medication-orders";
import { patientContactsRouter } from "./patient-contacts";
import { patientCopyRequestsRouter } from "./patient-copy-requests";
import { patientDocumentsRouter } from "./patient-documents";
import { patientIdentifiersRouter } from "./patient-identifiers";
import { patientsRouter } from "./patients";
import { payersRouter } from "./payers";
import { practitionerRolesRouter } from "./practitioner-roles";
import { retentionRecordsRouter } from "./retention-records";
import { ripsExportsRouter } from "./rips-exports";
import { ripsReferenceRouter } from "./rips-reference";
import { serviceRequestsRouter } from "./service-requests";

const healthCheckProcedure = publicProcedure.handler(() => "OK");

const privateDataProcedure = protectedProcedure.handler(({ context }) => ({
  message: "This is private",
  user: context.session?.user,
}));

export interface AppRouter extends Record<string, AnyRouter> {
  admin: typeof adminRouter;
  appointments: typeof appointmentsRouter;
  attachments: typeof attachmentsRouter;
  auditEvents: typeof auditEventsRouter;
  clinicalDocuments: typeof clinicalDocumentsRouter;
  clinicalRecords: typeof clinicalRecordsRouter;
  consents: typeof consentsRouter;
  coverage: typeof coverageRouter;
  encounterParticipants: typeof encounterParticipantsRouter;
  encounters: typeof encountersRouter;
  facilities: typeof facilitiesRouter;
  healthCheck: typeof healthCheckProcedure;
  ihceBundles: typeof ihceBundlesRouter;
  incapacityCertificates: typeof incapacityCertificatesRouter;
  interconsultations: typeof interconsultationsRouter;
  medicationOrders: typeof medicationOrdersRouter;
  patientContacts: typeof patientContactsRouter;
  patientCopyRequests: typeof patientCopyRequestsRouter;
  patientDocuments: typeof patientDocumentsRouter;
  patientIdentifiers: typeof patientIdentifiersRouter;
  patients: typeof patientsRouter;
  payers: typeof payersRouter;
  practitionerRoles: typeof practitionerRolesRouter;
  privateData: typeof privateDataProcedure;
  retentionRecords: typeof retentionRecordsRouter;
  ripsExports: typeof ripsExportsRouter;
  ripsReference: typeof ripsReferenceRouter;
  serviceRequests: typeof serviceRequestsRouter;
}

export const appRouter: AppRouter = {
  admin: adminRouter,
  appointments: appointmentsRouter,
  attachments: attachmentsRouter,
  auditEvents: auditEventsRouter,
  clinicalDocuments: clinicalDocumentsRouter,
  clinicalRecords: clinicalRecordsRouter,
  consents: consentsRouter,
  coverage: coverageRouter,
  encounterParticipants: encounterParticipantsRouter,
  encounters: encountersRouter,
  facilities: facilitiesRouter,
  healthCheck: healthCheckProcedure,
  ihceBundles: ihceBundlesRouter,
  incapacityCertificates: incapacityCertificatesRouter,
  interconsultations: interconsultationsRouter,
  medicationOrders: medicationOrdersRouter,
  patientContacts: patientContactsRouter,
  patientCopyRequests: patientCopyRequestsRouter,
  patientDocuments: patientDocumentsRouter,
  patientIdentifiers: patientIdentifiersRouter,
  patients: patientsRouter,
  payers: payersRouter,
  practitionerRoles: practitionerRolesRouter,
  privateData: privateDataProcedure,
  retentionRecords: retentionRecordsRouter,
  ripsExports: ripsExportsRouter,
  ripsReference: ripsReferenceRouter,
  serviceRequests: serviceRequestsRouter,
};
export type AppRouterClient = RouterClient<typeof appRouter>;
