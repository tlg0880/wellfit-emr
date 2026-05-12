import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  AlertTriangle,
  ArrowUpRight,
  FileCheck,
  FileOutput,
  FileText,
  FlaskConical,
  Gavel,
  Mail,
  PenLine,
  Plus,
  RefreshCw,
  Share2,
} from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/regulatory-tasks/")({
  component: RegulatoryTasksPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

/* ─── helpers ─── */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

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

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}

/* ─── metric card ─── */

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  loading: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </CardTitle>
        <div className={`flex size-8 items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="font-bold text-3xl tabular-nums tracking-tight">
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── section card with error / loading / content ─── */

function SectionCard({
  title,
  badge,
  children,
  isLoading,
  isError,
  errorMessage,
  retry,
  cta,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  retry?: () => void;
  cta?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="font-semibold text-sm">{title}</CardTitle>
          {badge}
        </div>
        {cta}
      </CardHeader>
      <CardContent className="flex-1">
        {isError && retry ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <p className="text-destructive text-xs">
              {errorMessage || "Error al cargar datos"}
            </p>
            <Button onClick={retry} size="sm" variant="outline">
              <RefreshCw size={12} />
              Reintentar
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/* ─── status badge helper ─── */

function StatusBadge({
  text,
  variant,
}: {
  text: string;
  variant: "amber" | "blue" | "emerald" | "slate" | "red";
}) {
  const colors = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${colors[variant]}`}
    >
      {text}
    </span>
  );
}

/* ─── compliance alert ─── */

function ComplianceAlertStrip({
  draftDocs,
  draftRips,
  draftIhce,
  statOrders,
}: {
  draftDocs: { createdAt: Date }[];
  draftRips: { generatedAt: Date }[];
  draftIhce: { generatedAt: Date }[];
  statOrders: { requestedAt: Date }[];
}) {
  const now = Date.now();

  const alerts: string[] = [];

  const oldDraftDocs = draftDocs.filter(
    (d) => now - new Date(d.createdAt).getTime() > ONE_DAY_MS
  );
  if (oldDraftDocs.length > 0) {
    alerts.push(
      `${oldDraftDocs.length} documento${oldDraftDocs.length > 1 ? "s" : ""} sin firmar con más de 24 h`
    );
  }

  const oldRips = draftRips.filter(
    (r) => now - new Date(r.generatedAt).getTime() > SEVEN_DAYS_MS
  );
  if (oldRips.length > 0) {
    alerts.push(
      `${oldRips.length} exportación${oldRips.length > 1 ? "es" : ""} RIPS en borrador con más de 7 d`
    );
  }

  const oldIhce = draftIhce.filter(
    (b) => now - new Date(b.generatedAt).getTime() > SEVEN_DAYS_MS
  );
  if (oldIhce.length > 0) {
    alerts.push(
      `${oldIhce.length} bundle${oldIhce.length > 1 ? "s" : ""} IHCE sin enviar con más de 7 d`
    );
  }

  const oldStat = statOrders.filter(
    (o) => now - new Date(o.requestedAt).getTime() > ONE_DAY_MS
  );
  if (oldStat.length > 0) {
    alerts.push(
      `${oldStat.length} orden${oldStat.length > 1 ? "es" : ""} STAT sin reporte con más de 24 h`
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="border-red-500 border-l-4 bg-red-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={16} />
        <div>
          <p className="font-medium text-red-800 text-sm">
            Alerta de cumplimiento
          </p>
          <ul className="mt-1 list-inside list-disc text-red-700 text-xs">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── page ─── */

function RegulatoryTasksPage() {
  useEffect(() => {
    document.title = "Tareas regulatorias | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const docsQuery = useQuery(
    orpc.clinicalDocuments.list.queryOptions({
      input: { limit: 10, offset: 0, status: "draft", sortDirection: "desc" },
    })
  );

  const ripsQuery = useQuery(
    orpc.ripsExports.list.queryOptions({
      input: { limit: 10, offset: 0, sortDirection: "desc" },
    })
  );

  const ihceQuery = useQuery(
    orpc.ihceBundles.list.queryOptions({
      input: { limit: 10, offset: 0, sortDirection: "desc" },
    })
  );

  const interQuery = useQuery(
    orpc.interconsultations.list.queryOptions({
      input: {
        limit: 10,
        offset: 0,
        status: "requested",
        sortDirection: "desc",
      },
    })
  );

  const ordersQuery = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: {
        limit: 10,
        offset: 0,
        status: "active",
        sortDirection: "desc",
      },
    })
  );

  const draftDocs = docsQuery.data?.documents ?? [];
  const draftDocsTotal = docsQuery.data?.total ?? 0;

  const ripsItems = ripsQuery.data?.items ?? [];
  const ripsTotal = ripsQuery.data?.total ?? 0;
  const ripsPending = ripsItems.filter((r) => r.status !== "validated").length;

  const ihceItems = ihceQuery.data?.items ?? [];
  const ihceTotal = ihceQuery.data?.total ?? 0;
  const ihcePending = ihceItems.filter(
    (b) => b.status !== "acknowledged"
  ).length;

  const interItems = interQuery.data?.items ?? [];
  const interTotal = interQuery.data?.total ?? 0;

  const orderItems = ordersQuery.data?.items ?? [];
  const orderTotal = ordersQuery.data?.total ?? 0;

  const statOrders = orderItems.filter((o) => o.priority === "stat");

  const isLoadingAny =
    docsQuery.isLoading ||
    ripsQuery.isLoading ||
    ihceQuery.isLoading ||
    interQuery.isLoading ||
    ordersQuery.isLoading;

  function retryDocs() {
    queryClient.invalidateQueries({
      queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
    });
  }
  function retryRips() {
    queryClient.invalidateQueries({
      queryKey: orpc.ripsExports.list.key({ type: "query" }),
    });
  }
  function retryIhce() {
    queryClient.invalidateQueries({
      queryKey: orpc.ihceBundles.list.key({ type: "query" }),
    });
  }
  function retryInter() {
    queryClient.invalidateQueries({
      queryKey: orpc.interconsultations.list.key({ type: "query" }),
    });
  }
  function retryOrders() {
    queryClient.invalidateQueries({
      queryKey: orpc.serviceRequests.list.key({ type: "query" }),
    });
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        description="Panel operativo de pendientes de cumplimiento"
        icon={Gavel}
        iconBgClass="bg-amber-50 text-amber-600"
        title="Tareas regulatorias"
      />

      {/* Compliance alert */}
      {!isLoadingAny && (
        <ComplianceAlertStrip
          draftDocs={draftDocs}
          draftIhce={ihceItems.filter((b) => b.status === "generated")}
          draftRips={ripsItems.filter((r) => r.status === "draft")}
          statOrders={statOrders}
        />
      )}

      {/* Metric strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          color="bg-amber-50 text-amber-700"
          icon={PenLine}
          label="Firmas pendientes"
          loading={docsQuery.isLoading}
          value={draftDocsTotal}
        />
        <MetricCard
          color="bg-blue-50 text-blue-700"
          icon={FileOutput}
          label="RIPS pendientes"
          loading={ripsQuery.isLoading}
          value={ripsPending}
        />
        <MetricCard
          color="bg-indigo-50 text-indigo-700"
          icon={Share2}
          label="IHCE/RDA pendientes"
          loading={ihceQuery.isLoading}
          value={ihcePending}
        />
        <MetricCard
          color="bg-emerald-50 text-emerald-700"
          icon={Mail}
          label="Interconsultas abiertas"
          loading={interQuery.isLoading}
          value={interTotal}
        />
        <MetricCard
          color="bg-rose-50 text-rose-700"
          icon={FlaskConical}
          label="Órdenes activas"
          loading={ordersQuery.isLoading}
          value={orderTotal}
        />
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Documents */}
        <SectionCard
          badge={
            draftDocsTotal > 0 ? (
              <StatusBadge text="Firma pendiente" variant="amber" />
            ) : null
          }
          cta={
            <Link to="/clinical-documents">
              <Button size="xs" variant="outline">
                <Plus size={12} />
                Nuevo documento
              </Button>
            </Link>
          }
          errorMessage={docsQuery.error?.message}
          isError={docsQuery.isError}
          isLoading={docsQuery.isLoading}
          retry={retryDocs}
          title="Documentos clínicos"
        >
          {draftDocs.length === 0 ? (
            <EmptyState
              description="No hay documentos clínicos pendientes de firma."
              title="Sin firmas pendientes"
            />
          ) : (
            <div className="space-y-2">
              {draftDocs.map((doc) => (
                <Link
                  className="group flex items-center justify-between rounded-none border p-2.5 transition-colors hover:bg-muted/60"
                  key={doc.id}
                  params={{ documentId: doc.id }}
                  to="/clinical-documents/$documentId"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} />
                      <span className="font-medium text-xs">
                        {truncate(doc.documentType.replace(/_/g, " "), 28)}
                      </span>
                      <StatusBadge text="Borrador" variant="amber" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {doc.patientId.slice(0, 8)}… ·{" "}
                      {formatEsCODatetime(doc.createdAt)}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                    size={12}
                  />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* RIPS */}
        <SectionCard
          badge={
            ripsTotal > 0 ? (
              <div className="flex gap-1">
                {ripsItems.filter((r) => r.status === "draft").length > 0 && (
                  <StatusBadge text="Borrador" variant="amber" />
                )}
                {ripsItems.filter((r) => r.status === "sent").length > 0 && (
                  <StatusBadge text="Enviado" variant="blue" />
                )}
                {ripsItems.filter((r) => r.status === "validated").length >
                  0 && <StatusBadge text="Validado" variant="emerald" />}
              </div>
            ) : null
          }
          cta={
            <Link to="/rips-exports">
              <Button size="xs" variant="outline">
                <Plus size={12} />
                Nueva exportación
              </Button>
            </Link>
          }
          errorMessage={ripsQuery.error?.message}
          isError={ripsQuery.isError}
          isLoading={ripsQuery.isLoading}
          retry={retryRips}
          title="Exportaciones RIPS"
        >
          {ripsItems.length === 0 ? (
            <EmptyState
              description="No se encontraron exportaciones regulatorias."
              title="Sin exportaciones RIPS"
            />
          ) : (
            <div className="space-y-2">
              {ripsItems.slice(0, 10).map((item) => (
                <Link
                  className="group flex items-center justify-between rounded-none border p-2.5 transition-colors hover:bg-muted/60"
                  key={item.id}
                  params={{ exportId: item.id }}
                  to="/rips-exports/$exportId"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <FileOutput size={12} />
                      <span className="font-medium text-xs">
                        {item.payerId.slice(0, 8)}…
                      </span>
                      <StatusBadge
                        text={
                          item.status === "draft"
                            ? "Borrador"
                            : item.status === "sent"
                              ? "Enviado"
                              : "Validado"
                        }
                        variant={
                          item.status === "draft"
                            ? "amber"
                            : item.status === "sent"
                              ? "blue"
                              : "emerald"
                        }
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatEsCO(item.periodFrom)} -{" "}
                      {formatEsCO(item.periodTo)} ·{" "}
                      {formatEsCODatetime(item.generatedAt)}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                    size={12}
                  />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* IHCE */}
        <SectionCard
          badge={
            ihceTotal > 0 ? (
              <div className="flex gap-1">
                {ihceItems.filter((b) => b.status === "generated").length >
                  0 && <StatusBadge text="Generado" variant="amber" />}
                {ihceItems.filter((b) => b.status === "sent").length > 0 && (
                  <StatusBadge text="Enviado" variant="blue" />
                )}
                {ihceItems.filter((b) => b.status === "acknowledged").length >
                  0 && <StatusBadge text="Confirmado" variant="emerald" />}
              </div>
            ) : null
          }
          cta={
            <Link to="/ihce-bundles">
              <Button size="xs" variant="outline">
                <Plus size={12} />
                Nuevo bundle
              </Button>
            </Link>
          }
          errorMessage={ihceQuery.error?.message}
          isError={ihceQuery.isError}
          isLoading={ihceQuery.isLoading}
          retry={retryIhce}
          title="Bundles IHCE/RDA"
        >
          {ihceItems.length === 0 ? (
            <EmptyState
              description="No se encontraron bundles de interoperabilidad."
              title="Sin bundles IHCE/RDA"
            />
          ) : (
            <div className="space-y-2">
              {ihceItems.slice(0, 10).map((item) => (
                <Link
                  className="group flex items-center justify-between rounded-none border p-2.5 transition-colors hover:bg-muted/60"
                  key={item.id}
                  params={{ bundleId: item.id }}
                  to="/ihce-bundles/$bundleId"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Share2 size={12} />
                      <span className="font-medium text-xs">
                        {truncate(item.bundleType, 20)}
                      </span>
                      <StatusBadge
                        text={
                          item.status === "generated"
                            ? "Generado"
                            : item.status === "sent"
                              ? "Enviado"
                              : "Confirmado"
                        }
                        variant={
                          item.status === "generated"
                            ? "amber"
                            : item.status === "sent"
                              ? "blue"
                              : "emerald"
                        }
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Atención {item.encounterId.slice(0, 8)}… ·{" "}
                      {formatEsCODatetime(item.generatedAt)}
                      {item.sentAt
                        ? ` · Enviado ${formatEsCODatetime(item.sentAt)}`
                        : " · —"}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                    size={12}
                  />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Interconsultations */}
        <SectionCard
          badge={
            interTotal > 0 ? (
              <StatusBadge text="Solicitada" variant="amber" />
            ) : null
          }
          cta={
            <Link to="/interconsultations">
              <Button size="xs" variant="outline">
                <Plus size={12} />
                Nueva interconsulta
              </Button>
            </Link>
          }
          errorMessage={interQuery.error?.message}
          isError={interQuery.isError}
          isLoading={interQuery.isLoading}
          retry={retryInter}
          title="Interconsultas"
        >
          {interItems.length === 0 ? (
            <EmptyState
              description="No hay solicitudes de interconsulta pendientes."
              title="Sin interconsultas abiertas"
            />
          ) : (
            <div className="space-y-2">
              {interItems.map((item) => (
                <Link
                  className="group flex items-center justify-between rounded-none border p-2.5 transition-colors hover:bg-muted/60"
                  key={item.id}
                  params={{ interconsultationId: item.id }}
                  to="/interconsultations/$interconsultationId"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} />
                      <span className="font-medium text-xs">
                        {truncate(item.requestedSpecialty, 24)}
                      </span>
                      <StatusBadge text="Solicitada" variant="amber" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {truncate(item.reasonText, 40)} ·{" "}
                      {formatEsCODatetime(item.requestedAt)}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                    size={12}
                  />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Service requests */}
        <SectionCard
          badge={
            orderTotal > 0 ? (
              <StatusBadge text="Activa" variant="amber" />
            ) : null
          }
          cta={
            <Link to="/service-requests">
              <Button size="xs" variant="outline">
                <Plus size={12} />
                Nueva orden
              </Button>
            </Link>
          }
          errorMessage={ordersQuery.error?.message}
          isError={ordersQuery.isError}
          isLoading={ordersQuery.isLoading}
          retry={retryOrders}
          title="Órdenes de servicio"
        >
          {orderItems.length === 0 ? (
            <EmptyState
              description="No hay órdenes de servicio pendientes."
              title="Sin órdenes activas"
            />
          ) : (
            <div className="space-y-2">
              {orderItems.map((item) => (
                <Link
                  className="group flex items-center justify-between rounded-none border p-2.5 transition-colors hover:bg-muted/60"
                  key={item.id}
                  params={{ requestId: item.id }}
                  to="/service-requests/$requestId"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <FlaskConical size={12} />
                      <span className="font-medium text-xs">
                        {truncate(item.requestType, 20)}
                      </span>
                      <StatusBadge
                        text={
                          item.priority === "stat"
                            ? "STAT"
                            : item.priority === "urgent"
                              ? "Urgente"
                              : "Rutina"
                        }
                        variant={
                          item.priority === "stat"
                            ? "red"
                            : item.priority === "urgent"
                              ? "amber"
                              : "slate"
                        }
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {item.requestCode} ·{" "}
                      {formatEsCODatetime(item.requestedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileCheck className="text-muted-foreground" size={12} />
                    <ArrowUpRight
                      className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      size={12}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
