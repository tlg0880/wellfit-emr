import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/appointments/$appointmentId"
)({
  component: AppointmentDetailPage,
});

function AppointmentDetailPage() {
  const { appointmentId } = Route.useParams();

  const {
    data: appointment,
    isLoading,
    isError,
  } = useQuery(
    orpc.appointments.get.queryOptions({ input: { id: appointmentId } })
  );

  const { data: patient } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: appointment?.patientId ?? "" },
    }),
    enabled: !!appointment?.patientId,
  });

  const { data: practitionerData } = useQuery({
    ...orpc.facilities.getPractitioner.queryOptions({
      input: { id: appointment?.practitionerId ?? "" },
    }),
    enabled: !!appointment?.practitionerId,
  });

  const { data: siteData } = useQuery({
    ...orpc.facilities.getSite.queryOptions({
      input: { id: appointment?.siteId ?? "" },
    }),
    enabled: !!appointment?.siteId,
  });

  const { data: serviceUnitData } = useQuery({
    ...orpc.facilities.getServiceUnit.queryOptions({
      input: { id: appointment?.serviceUnitId ?? "" },
    }),
    enabled: !!appointment?.serviceUnitId,
  });

  useEffect(() => {
    if (appointment) {
      document.title = `${appointment.reason} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [appointment]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Programada", color: "text-blue-600" },
    confirmed: { label: "Confirmada", color: "text-emerald-600" },
    cancelled: { label: "Cancelada", color: "text-slate-500" },
    completed: { label: "Completada", color: "text-slate-700" },
    "no-show": { label: "No asistió", color: "text-amber-600" },
  };

  const title = isLoading
    ? "Cargando..."
    : (appointment?.reason ?? "Detalle de cita");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/appointments"
        description="Información de la cita programada"
        title={title}
      />

      {isError ? (
        <div className="mx-6 flex flex-col items-center justify-center gap-2 py-12">
          <p className="text-destructive text-sm">Error al cargar cita</p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: orpc.appointments.get.key({ type: "query" }),
              })
            }
            size="sm"
            variant="outline"
          >
            <RefreshCw size={12} />
            Reintentar
          </Button>
        </div>
      ) : isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : appointment ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                {
                  label: "Estado",
                  value: (
                    <span
                      className={
                        statusConfig[appointment.status]?.color ??
                        "text-foreground"
                      }
                    >
                      {statusConfig[appointment.status]?.label ??
                        appointment.status}
                    </span>
                  ),
                },
                {
                  label: "Fecha programada",
                  value: new Date(appointment.scheduledAt).toLocaleString(
                    "es-CO"
                  ),
                },
                {
                  label: "Duración",
                  value: `${appointment.durationMinutes} minutos`,
                },
                {
                  label: "Motivo",
                  value: appointment.reason,
                },
                {
                  label: "Notas",
                  value: appointment.notes ?? "—",
                },
                {
                  label: "Creada",
                  value: new Date(appointment.createdAt).toLocaleString(
                    "es-CO"
                  ),
                },
                ...(appointment.cancelledAt
                  ? [
                      {
                        label: "Cancelada",
                        value: `${new Date(appointment.cancelledAt).toLocaleString("es-CO")}${appointment.cancelledReason ? ` — ${appointment.cancelledReason}` : ""}`,
                      },
                    ]
                  : []),
                {
                  label: "Profesional",
                  value:
                    practitionerData?.fullName ??
                    (appointment.practitionerId ? "Cargando..." : "—"),
                },
                {
                  label: "Sede",
                  value:
                    siteData?.name ??
                    (appointment.siteId ? "Cargando..." : "—"),
                },
                {
                  label: "Unidad de servicio",
                  value:
                    serviceUnitData?.name ??
                    (appointment.serviceUnitId ? "Cargando..." : "—"),
                },
                ...(appointment.encounterId
                  ? [
                      {
                        label: "Atención vinculada",
                        value: (
                          <Link
                            className="text-primary hover:underline"
                            params={{ encounterId: appointment.encounterId }}
                            search={{ tab: undefined }}
                            to="/encounters/$encounterId"
                          >
                            {appointment.encounterId.slice(0, 8)}…
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 font-medium">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {patient ? (
                <>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Nombre</p>
                    <p className="font-medium">
                      {patient.firstName} {patient.lastName1}{" "}
                      {patient.lastName2 ?? ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Documento
                    </p>
                    <p className="font-medium">
                      {patient.primaryDocumentType}{" "}
                      {patient.primaryDocumentNumber}
                    </p>
                  </div>
                  <Link
                    className="inline-block pt-2 text-[10px] text-primary hover:underline"
                    params={{ patientId: patient.id }}
                    to="/patients/$patientId"
                  >
                    Ver historia clínica completa →
                  </Link>
                </>
              ) : (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          description="No se encontró la cita solicitada."
          title="Cita no encontrada"
        />
      )}
    </div>
  );
}
