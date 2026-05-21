import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  AlertCircle,
  ClipboardPlus,
  FileText,
  FlaskConical,
  Mail,
  Pill,
  RefreshCw,
  Share2,
  Shield,
  Stethoscope,
} from "lucide-react";
import { useCallback } from "react";

import { EmptyState } from "@/components/empty-state";
import { orpc, queryClient } from "@/utils/orpc";

/* ─── helpers ─── */

function formatEsCO(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEsCODatetime(date: Date | string): string {
  return new Date(date).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROUTE_PARAM_REGEX = /\$(\w+)/;

function getParamKey(route: string): string {
  const match = route.match(ROUTE_PARAM_REGEX);
  return match ? match[1] : "id";
}

/* ─── badge ─── */

type BadgeVariant = "amber" | "blue" | "emerald" | "slate" | "red" | "cyan";

function StatusBadge({
  text,
  variant,
}: {
  text: string;
  variant: BadgeVariant;
}) {
  const colors: Record<BadgeVariant, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    red: "border-red-200 bg-red-50 text-red-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  };
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide ${colors[variant]}`}
    >
      {text}
    </span>
  );
}

/* ─── timeline item type ─── */

type TimelineItemType =
  | "encounter"
  | "clinicalDocument"
  | "medicationOrder"
  | "serviceRequest"
  | "interconsultation"
  | "incapacityCertificate"
  | "consent"
  | "dataDisclosure";

interface TimelineItem {
  date: Date;
  icon: React.ReactNode;
  iconColor: string;
  id: string;
  route: string;
  statusBadge: React.ReactNode;
  subtitle: string;
  title: string;
  type: TimelineItemType;
}

/* ─── status mappings ─── */

const encounterStatusMap: Record<string, { label: string; color: string }> = {
  "in-progress": { label: "En progreso", color: "text-emerald-600" },
  finished: { label: "Finalizada", color: "text-muted-foreground" },
};

const documentTypeLabels: Record<string, string> = {
  evolucion_medica: "Evolución médica",
  nota_enfermeria: "Nota de enfermería",
  consentimiento_informado: "Consentimiento informado",
  epicrisis: "Epicrisis",
  historia_clinica: "Historia clínica",
  orden_medica: "Orden médica",
  otros: "Otro documento",
};

const documentStatusMap: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: "Borrador", variant: "amber" },
  signed: { label: "Firmado", variant: "emerald" },
};

const medicationStatusMap: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  active: { label: "Activa", variant: "amber" },
  completed: { label: "Completada", variant: "emerald" },
  suspended: { label: "Suspendida", variant: "slate" },
  stopped: { label: "Detenida", variant: "slate" },
};

const serviceRequestStatusMap: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  active: { label: "Activa", variant: "amber" },
  completed: { label: "Completada", variant: "emerald" },
  cancelled: { label: "Cancelada", variant: "slate" },
};

const interconsultationStatusMap: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  requested: { label: "Solicitada", variant: "amber" },
  responded: { label: "Respondida", variant: "emerald" },
};

/* ─── item builders ─── */

function buildEncounterItems(
  encounters: Array<{
    id: string;
    startedAt: Date;
    reasonForVisit: string;
    careModality: string;
    status: string;
  }>
): TimelineItem[] {
  return encounters.map((e) => {
    const status = encounterStatusMap[e.status] ?? {
      label: e.status,
      color: "text-muted-foreground",
    };
    return {
      id: e.id,
      type: "encounter",
      date: new Date(e.startedAt),
      title: e.reasonForVisit,
      subtitle: `Atención · ${e.careModality}`,
      statusBadge: (
        <span className={`font-medium text-xs ${status.color}`}>
          {status.label}
        </span>
      ),
      route: "/encounters/$encounterId",
      icon: <Stethoscope size={16} />,
      iconColor: "bg-emerald-50 text-emerald-700",
    };
  });
}

function buildDocumentItems(
  documents: Array<{
    id: string;
    createdAt: Date;
    documentType: string;
    status: string;
  }>
): TimelineItem[] {
  return documents.map((d) => {
    const status = documentStatusMap[d.status] ?? {
      label: d.status,
      variant: "slate" as BadgeVariant,
    };
    return {
      id: d.id,
      type: "clinicalDocument",
      date: new Date(d.createdAt),
      title: documentTypeLabels[d.documentType] ?? d.documentType,
      subtitle: "Documento clínico",
      statusBadge: <StatusBadge text={status.label} variant={status.variant} />,
      route: "/clinical-documents/$documentId",
      icon: <FileText size={16} />,
      iconColor: "bg-blue-50 text-blue-700",
    };
  });
}

function buildMedicationItems(
  items: Array<{
    id: string;
    signedAt: Date;
    genericName: string;
    dose: string;
    doseUnit: string | null;
    frequencyText: string;
    status: string;
  }>
): TimelineItem[] {
  return items.map((m) => {
    const status = medicationStatusMap[m.status] ?? {
      label: m.status,
      variant: "slate" as BadgeVariant,
    };
    return {
      id: m.id,
      type: "medicationOrder",
      date: new Date(m.signedAt),
      title: m.genericName,
      subtitle: `Prescripción · ${m.dose} ${m.doseUnit ?? ""} ${m.frequencyText}`,
      statusBadge: <StatusBadge text={status.label} variant={status.variant} />,
      route: "/medication-orders/$orderId",
      icon: <Pill size={16} />,
      iconColor: "bg-purple-50 text-purple-700",
    };
  });
}

function getServicePriorityText(priority: string): string {
  if (priority === "stat") {
    return "STAT";
  }
  if (priority === "urgent") {
    return "Urgente";
  }
  return "Rutina";
}

function getServicePriorityVariant(priority: string): BadgeVariant {
  if (priority === "stat") {
    return "red";
  }
  if (priority === "urgent") {
    return "amber";
  }
  return "slate";
}

function buildServiceRequestItems(
  items: Array<{
    id: string;
    requestedAt: Date;
    requestType: string;
    requestCode: string;
    priority: string;
    status: string;
  }>
): TimelineItem[] {
  return items.map((s) => {
    const status = serviceRequestStatusMap[s.status] ?? {
      label: s.status,
      variant: "slate" as BadgeVariant,
    };
    const priorityText = getServicePriorityText(s.priority);
    const priorityVariant = getServicePriorityVariant(s.priority);
    return {
      id: s.id,
      type: "serviceRequest",
      date: new Date(s.requestedAt),
      title: `${s.requestType} · ${s.requestCode}`,
      subtitle: `Orden de servicio · ${priorityText}`,
      statusBadge: (
        <div className="flex items-center gap-1.5">
          <StatusBadge text={status.label} variant={status.variant} />
          <StatusBadge text={priorityText} variant={priorityVariant} />
        </div>
      ),
      route: "/service-requests/$requestId",
      icon: <FlaskConical size={16} />,
      iconColor: "bg-orange-50 text-orange-700",
    };
  });
}

function buildInterconsultationItems(
  items: Array<{
    id: string;
    requestedAt: Date;
    requestedSpecialty: string;
    reasonText: string;
    status: string;
  }>
): TimelineItem[] {
  return items.map((i) => {
    const status = interconsultationStatusMap[i.status] ?? {
      label: i.status,
      variant: "slate" as BadgeVariant,
    };
    return {
      id: i.id,
      type: "interconsultation",
      date: new Date(i.requestedAt),
      title: i.requestedSpecialty,
      subtitle: `Interconsulta · ${i.reasonText}`,
      statusBadge: <StatusBadge text={status.label} variant={status.variant} />,
      route: "/interconsultations/$interconsultationId",
      icon: <Mail size={16} />,
      iconColor: "bg-indigo-50 text-indigo-700",
    };
  });
}

function buildIncapacityItems(
  items: Array<{
    id: string;
    issuedAt: Date;
    conceptText: string;
    startDate: Date;
    endDate: Date;
  }>
): TimelineItem[] {
  const now = new Date();
  return items.map((ic) => {
    const start = new Date(ic.startDate);
    const end = new Date(ic.endDate);
    const isValid = now >= start && now <= end;
    return {
      id: ic.id,
      type: "incapacityCertificate",
      date: new Date(ic.issuedAt),
      title: ic.conceptText,
      subtitle: `Incapacidad · ${formatEsCO(ic.startDate)} – ${formatEsCO(ic.endDate)}`,
      statusBadge: (
        <StatusBadge
          text={isValid ? "Vigente" : "Vencida"}
          variant={isValid ? "emerald" : "slate"}
        />
      ),
      route: "/incapacity-certificates/$certificateId",
      icon: <ClipboardPlus size={16} />,
      iconColor: "bg-rose-50 text-rose-700",
    };
  });
}

function buildConsentItems(
  items: Array<{
    id: string;
    signedAt: Date;
    consentType: string;
    grantedByPersonName: string;
    revokedAt: Date | null;
  }>
): TimelineItem[] {
  return items.map((c) => {
    const isRevoked = c.revokedAt != null;
    return {
      id: c.id,
      type: "consent",
      date: new Date(c.signedAt),
      title: c.consentType,
      subtitle: `Consentimiento · ${c.grantedByPersonName}`,
      statusBadge: (
        <StatusBadge
          text={isRevoked ? "Revocado" : "Otorgado"}
          variant={isRevoked ? "slate" : "emerald"}
        />
      ),
      route: "/consents",
      icon: <Shield size={16} />,
      iconColor: "bg-teal-50 text-teal-700",
    };
  });
}

function buildDisclosureItems(
  items: Array<{
    id: string;
    grantedAt: Date;
    thirdPartyName: string;
    purposeCode: string;
    revokedAt: Date | null;
  }>
): TimelineItem[] {
  return items.map((d) => {
    const isRevoked = d.revokedAt != null;
    return {
      id: d.id,
      type: "dataDisclosure",
      date: new Date(d.grantedAt),
      title: d.thirdPartyName,
      subtitle: `Autorización de divulgación · ${d.purposeCode}`,
      statusBadge: (
        <StatusBadge
          text={isRevoked ? "Revocada" : "Vigente"}
          variant={isRevoked ? "slate" : "cyan"}
        />
      ),
      route: "/consents",
      icon: <Share2 size={16} />,
      iconColor: "bg-cyan-50 text-cyan-700",
    };
  });
}

/* ─── data hook ─── */

function useTimelineData(patientId: string) {
  const encountersQuery = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        patientId,
        limit: 100,
        offset: 0,
        sortBy: "startedAt",
        sortDirection: "desc",
      },
    })
  );

  const docsQuery = useQuery(
    orpc.clinicalDocuments.list.queryOptions({
      input: { patientId, limit: 100, offset: 0 },
    })
  );

  const medsQuery = useQuery(
    orpc.medicationOrders.list.queryOptions({
      input: { patientId, limit: 100, offset: 0 },
    })
  );

  const servicesQuery = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: { patientId, limit: 100, offset: 0 },
    })
  );

  const interQuery = useQuery(
    orpc.interconsultations.list.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const incapQuery = useQuery(
    orpc.incapacityCertificates.list.queryOptions({
      input: { patientId, limit: 100, offset: 0 },
    })
  );

  const consentsQuery = useQuery(
    orpc.consents.listConsents.queryOptions({
      input: { patientId, limit: 100, offset: 0 },
    })
  );

  const disclosuresQuery = useQuery(
    orpc.consents.listDataDisclosures.queryOptions({
      input: { patientId, limit: 100, offset: 0 },
    })
  );

  const isLoading =
    encountersQuery.isLoading ||
    docsQuery.isLoading ||
    medsQuery.isLoading ||
    servicesQuery.isLoading ||
    interQuery.isLoading ||
    incapQuery.isLoading ||
    consentsQuery.isLoading ||
    disclosuresQuery.isLoading;

  const errors = [
    encountersQuery.isError && "Atenciones",
    docsQuery.isError && "Documentos clínicos",
    medsQuery.isError && "Prescripciones",
    servicesQuery.isError && "Órdenes de servicio",
    interQuery.isError && "Interconsultas",
    incapQuery.isError && "Incapacidades",
    consentsQuery.isError && "Consentimientos",
    disclosuresQuery.isError && "Autorizaciones de divulgación",
  ].filter(Boolean) as string[];

  const patientEncounterIds = new Set(
    (encountersQuery.data?.encounters ?? []).map((e) => e.id)
  );

  const items: TimelineItem[] = [
    ...buildEncounterItems(encountersQuery.data?.encounters ?? []),
    ...buildDocumentItems(docsQuery.data?.documents ?? []),
    ...buildMedicationItems(medsQuery.data?.items ?? []),
    ...buildServiceRequestItems(servicesQuery.data?.items ?? []),
    ...buildInterconsultationItems(
      (interQuery.data?.items ?? []).filter((i) =>
        patientEncounterIds.has(i.encounterId)
      )
    ),
    ...buildIncapacityItems(incapQuery.data?.items ?? []),
    ...buildConsentItems(consentsQuery.data?.items ?? []),
    ...buildDisclosureItems(disclosuresQuery.data?.items ?? []),
  ];

  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  return { items, isLoading, errors };
}

/* ─── skeleton rows ─── */

function TimelineSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton with fixed order
          key={`skeleton-${i}`}
        >
          <Skeleton className="size-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── component ─── */

export function PatientTimeline({ patientId }: { patientId: string }) {
  const { items, isLoading, errors } = useTimelineData(patientId);

  const retryAll = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orpc.encounters.list.key({ type: "query" }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.medicationOrders.list.key({ type: "query" }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.serviceRequests.list.key({ type: "query" }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.interconsultations.list.key({ type: "query" }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.incapacityCertificates.list.key({ type: "query" }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.consents.listConsents.key({ type: "query" }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.consents.listDataDisclosures.key({ type: "query" }),
    });
  }, []);

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Línea de tiempo clínica</CardTitle>
        {errors.length > 0 && (
          <button
            className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700"
            onClick={retryAll}
            type="button"
          >
            <AlertCircle size={12} />
            Error en {errors.join(", ")}
            <RefreshCw size={10} />
          </button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <TimelineSkeleton count={6} />}
        {!isLoading && items.length === 0 && (
          <EmptyState
            description="Este paciente no tiene registros clínicos, documentos, prescripciones u otras entradas en su historial."
            title="Sin historial clínico"
          />
        )}
        {!isLoading && items.length > 0 && (
          <div className="max-h-[480px] overflow-y-auto">
            {items.map((item) => (
              <Link
                className="group flex items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/40"
                key={`${item.type}-${item.id}`}
                params={{ [getParamKey(item.route)]: item.id }}
                to={item.route}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center ${item.iconColor}`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-xs">{item.title}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.statusBadge}
                      <span className="text-[10px] text-muted-foreground">
                        {formatEsCODatetime(item.date)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
