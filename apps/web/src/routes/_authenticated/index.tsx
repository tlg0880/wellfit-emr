import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardPlus,
  Clock,
  Copy,
  Database,
  FileOutput,
  Gavel,
  HeartPulse,
  Home,
  PenLine,
  Server,
  Share2,
  Shield,
  ShieldUser,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function ComplianceSummaryBlock() {
  const docsQuery = useQuery(
    orpc.clinicalDocuments.list.queryOptions({
      input: { limit: 1, offset: 0, status: "draft" },
    })
  );
  const ripsQuery = useQuery(
    orpc.ripsExports.list.queryOptions({
      input: { limit: 1, offset: 0 },
    })
  );
  const ihceQuery = useQuery(
    orpc.ihceBundles.list.queryOptions({
      input: { limit: 1, offset: 0 },
    })
  );
  const interQuery = useQuery(
    orpc.interconsultations.list.queryOptions({
      input: { limit: 1, offset: 0, status: "requested" },
    })
  );
  const ordersQuery = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: { limit: 1, offset: 0, status: "active" },
    })
  );

  const isLoadingAny =
    docsQuery.isLoading ||
    ripsQuery.isLoading ||
    ihceQuery.isLoading ||
    interQuery.isLoading ||
    ordersQuery.isLoading;

  const isErrorAny =
    docsQuery.isError ||
    ripsQuery.isError ||
    ihceQuery.isError ||
    interQuery.isError ||
    ordersQuery.isError;

  const draftDocsTotal = docsQuery.data?.total ?? 0;
  const ripsTotal = ripsQuery.data?.total ?? 0;
  const ihceTotal = ihceQuery.data?.total ?? 0;
  const interTotal = interQuery.data?.total ?? 0;
  const orderTotal = ordersQuery.data?.total ?? 0;

  const totalPending =
    draftDocsTotal + ripsTotal + ihceTotal + interTotal + orderTotal;

  if (isLoadingAny) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-semibold text-base">
            Cumplimiento regulatorio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isErrorAny) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-semibold text-base">
            Cumplimiento regulatorio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-sm">
            Error al cargar resumen de cumplimiento.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (totalPending === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-semibold text-base">
            Cumplimiento regulatorio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-muted-foreground text-sm">
            No hay tareas regulatorias pendientes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold text-base">
            Cumplimiento regulatorio
          </CardTitle>
          <Link
            className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
            to="/regulatory-tasks"
          >
            Ver panel
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {draftDocsTotal > 0 && (
          <div className="flex items-center justify-between rounded-sm border border-amber-200 bg-amber-50/50 p-3 shadow-sm transition-colors hover:bg-amber-50">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-amber-100 text-amber-600 shadow-md">
                <PenLine size={14} />
              </div>
              <span className="font-medium text-foreground/90 text-sm">
                Firmas pendientes
              </span>
            </div>
            <span className="font-bold text-amber-700">{draftDocsTotal}</span>
          </div>
        )}
        {ripsTotal > 0 && (
          <div className="flex items-center justify-between rounded-sm border border-sky-200 bg-sky-50/50 p-3 shadow-sm transition-colors hover:bg-sky-50">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-sky-100 text-sky-600 shadow-md">
                <FileOutput size={14} />
              </div>
              <span className="font-medium text-foreground/90 text-sm">
                RIPS pendientes
              </span>
            </div>
            <span className="font-bold text-sky-700">{ripsTotal}</span>
          </div>
        )}
        {ihceTotal > 0 && (
          <div className="flex items-center justify-between rounded-sm border border-indigo-200 bg-indigo-50/50 p-3 shadow-sm transition-colors hover:bg-indigo-50">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-indigo-100 text-indigo-600 shadow-md">
                <Share2 size={14} />
              </div>
              <span className="font-medium text-foreground/90 text-sm">
                IHCE/RDA pendientes
              </span>
            </div>
            <span className="font-bold text-indigo-700">{ihceTotal}</span>
          </div>
        )}
        {interTotal > 0 && (
          <div className="flex items-center justify-between rounded-sm border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm transition-colors hover:bg-emerald-50">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-emerald-100 text-emerald-600 shadow-md">
                <Users size={14} />
              </div>
              <span className="font-medium text-foreground/90 text-sm">
                Interconsultas abiertas
              </span>
            </div>
            <span className="font-bold text-emerald-700">{interTotal}</span>
          </div>
        )}
        {orderTotal > 0 && (
          <div className="flex items-center justify-between rounded-sm border border-rose-200 bg-rose-50/50 p-3 shadow-sm transition-colors hover:bg-rose-50">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-rose-100 text-rose-600 shadow-md">
                <Activity size={14} />
              </div>
              <span className="font-medium text-foreground/90 text-sm">
                Órdenes activas
              </span>
            </div>
            <span className="font-bold text-rose-700">{orderTotal}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  useEffect(() => {
    document.title = "Panel principal | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { session } = Route.useRouteContext();
  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({ input: { limit: 5, offset: 0 } })
  );
  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({ input: { limit: 5, offset: 0 } })
  );
  const { data: ripsStatus, isLoading: ripsStatusLoading } = useQuery(
    orpc.ripsReference.syncStatus.queryOptions()
  );

  const stats = [
    {
      label: "Pacientes registrados",
      value: patientsData?.total ?? 0,
      icon: Users,
      color: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
      iconBg: "bg-teal-100 dark:bg-teal-900",
      borderLeft: "border-l-teal-400",
      loading: patientsLoading,
    },
    {
      label: "Atenciones del mes",
      value: encountersData?.total ?? 0,
      icon: CalendarDays,
      color: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      iconBg: "bg-sky-100 dark:bg-sky-900",
      borderLeft: "border-l-sky-400",
      loading: encountersLoading,
    },
    {
      label: "Atenciones activas",
      value:
        encountersData?.encounters.filter((e) => e.status === "in-progress")
          .length ?? 0,
      icon: Activity,
      color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      iconBg: "bg-amber-100 dark:bg-amber-900",
      borderLeft: "border-l-amber-400",
      loading: encountersLoading,
    },
    {
      label: "Profesionales activos",
      value: "—",
      icon: Stethoscope,
      color: "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
      iconBg: "bg-slate-100 dark:bg-slate-800",
      borderLeft: "border-l-slate-400",
      loading: false,
    },
  ];

  let encountersContent: React.ReactNode;
  if (encountersLoading) {
    encountersContent = (
      <>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </>
    );
  } else if (encountersData && encountersData.encounters.length > 0) {
    encountersContent = encountersData.encounters.map((enc) => (
      <Link
        className="group flex items-center justify-between rounded-sm border p-3.5 shadow-sm transition-all duration-150 hover:border-primary/20 hover:bg-primary/5 hover:shadow-md"
        key={enc.id}
        params={{ encounterId: enc.id }}
        search={{ tab: undefined }}
        to="/encounters/$encounterId"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-sm bg-teal-50 text-teal-600 shadow-md dark:bg-teal-950 dark:text-teal-400">
            <HeartPulse size={16} />
          </div>
          <div>
            <p className="font-medium text-foreground/90 text-sm leading-snug">
              {enc.reasonForVisit}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              <Clock className="mr-1 inline" size={10} />
              {new Date(enc.startedAt).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <ChevronRight
          className="text-muted-foreground/40 transition-colors group-hover:text-primary"
          size={14}
        />
      </Link>
    ));
  } else {
    encountersContent = (
      <p className="py-6 text-center text-muted-foreground text-sm">
        No hay atenciones recientes.
      </p>
    );
  }

  let patientsContent: React.ReactNode;
  if (patientsLoading) {
    patientsContent = (
      <>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </>
    );
  } else if (patientsData && patientsData.patients.length > 0) {
    patientsContent = patientsData.patients.map((pat) => (
      <Link
        className="group flex items-center justify-between rounded-sm border p-3.5 shadow-sm transition-all duration-150 hover:border-primary/20 hover:bg-primary/5 hover:shadow-md"
        key={pat.id}
        params={{ patientId: pat.id }}
        to="/patients/$patientId"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-sm bg-sky-50 text-sky-600 shadow-md dark:bg-sky-950 dark:text-sky-400">
            <Users size={16} />
          </div>
          <div>
            <p className="font-medium text-foreground/90 text-sm leading-snug">
              {pat.firstName} {pat.lastName1}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {pat.primaryDocumentType} {pat.primaryDocumentNumber} ·{" "}
              {new Date(pat.birthDate).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>
        <ChevronRight
          className="text-muted-foreground/40 transition-colors group-hover:text-primary"
          size={14}
        />
      </Link>
    ));
  } else {
    patientsContent = (
      <p className="py-6 text-center text-muted-foreground text-sm">
        No hay pacientes registrados.
      </p>
    );
  }

  function getStatusDotClass(pending?: boolean, ok?: boolean): string {
    if (pending) {
      return "animate-pulse bg-slate-300";
    }
    if (ok) {
      return "bg-emerald-500";
    }
    return "bg-amber-500";
  }

  const quickAccess = [
    {
      label: "Nuevo paciente",
      to: "/patients",
      icon: UserPlus,
      description: "Registrar un paciente en el sistema",
    },
    {
      label: "Nueva atención",
      to: "/encounters",
      icon: ClipboardPlus,
      description: "Crear una atención clínica",
    },
    {
      label: "Tareas regulatorias",
      to: "/regulatory-tasks",
      icon: Gavel,
      description: "Panel de pendientes de cumplimiento",
    },
    {
      label: "Solicitudes del paciente",
      to: "/patient-requests",
      icon: Copy,
      description: "Solicitudes de copia de historia clínica",
    },
    {
      label: "Catálogos RIPS",
      to: "/catalogs",
      icon: BookOpen,
      description: "Consultar tablas y códigos SISPRO",
    },
    {
      label: "Administración",
      to: "/admin/users",
      icon: ShieldUser,
      description: "Gestionar usuarios y permisos",
    },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-sm bg-teal-100 text-teal-600 shadow-md">
          <Home size={18} />
        </div>
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            Panel principal
          </h1>
          <p className="text-muted-foreground text-sm">
            Bienvenido, {session.data?.user.name}. Este es el resumen operativo
            de la institución.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            className={`overflow-hidden border-l-4 transition-all duration-200 hover:-translate-y-px hover:shadow-md ${stat.borderLeft}`}
            key={stat.label}
            size="sm"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </CardTitle>
              <div
                className={`flex size-9 items-center justify-center rounded-sm shadow-md ${stat.iconBg} ${stat.color}`}
              >
                <stat.icon size={18} />
              </div>
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="font-bold text-3xl text-foreground tabular-nums tracking-tight">
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent encounters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-semibold text-base">
                Atenciones recientes
              </CardTitle>
              <Link
                className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                to="/encounters"
              >
                Ver todas
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">{encountersContent}</CardContent>
        </Card>

        {/* Recent patients */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-semibold text-base">
                Pacientes recientes
              </CardTitle>
              <Link
                className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                to="/patients"
              >
                Ver todos
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">{patientsContent}</CardContent>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick access */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-semibold text-base">
              Accesos rápidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickAccess.map((item) => (
              <Link
                className="group flex items-center gap-3.5 rounded-sm border p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/20 hover:bg-primary/5 hover:shadow-md"
                key={item.to}
                to={item.to}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary shadow-md">
                  <item.icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground/90 text-sm">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {item.description}
                  </p>
                </div>
                <ChevronRight
                  className="shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary"
                  size={14}
                />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Compliance summary */}
        <ComplianceSummaryBlock />

        {/* System status */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-semibold text-base">
              Estado del sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "API",
                  status: "Operativa",
                  ok: true,
                  icon: Server,
                  iconColor: "text-emerald-600",
                  iconBg: "bg-emerald-50",
                },
                {
                  label: "Base de datos",
                  status: "Conectada",
                  ok: true,
                  icon: Database,
                  iconColor: "text-sky-600",
                  iconBg: "bg-sky-50",
                },
                {
                  label: "Autenticación",
                  status: "Activa",
                  ok: true,
                  icon: Shield,
                  iconColor: "text-amber-600",
                  iconBg: "bg-amber-50",
                },
                {
                  label: "RIPS",
                  status: ripsStatusLoading
                    ? "Cargando..."
                    : (ripsStatus?.message ?? "Desconocido"),
                  ok: ripsStatus?.status === "ok",
                  pending: ripsStatusLoading,
                  icon: FileOutput,
                  iconColor: "text-violet-600",
                  iconBg: "bg-violet-50",
                },
              ].map((item) => (
                <div
                  className="rounded-sm border bg-card/80 p-4 shadow-sm transition-all duration-150 hover:bg-card hover:shadow-md"
                  key={item.label}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-sm shadow-md">
                      <item.icon size={12} />
                    </div>
                    <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${getStatusDotClass(item.pending, item.ok)}`}
                    />
                    <span className="font-medium text-foreground/90 text-sm">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
