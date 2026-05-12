import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { RefreshCw, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/medication-orders/$orderId"
)({
  component: MedicationOrderDetailPage,
});

function MedicationOrderDetailPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    ...orpc.medicationOrders.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Prescripción eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.medicationOrders.list.key({ type: "query" }),
      });
      navigate({ to: "/medication-orders" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar prescripción");
    },
  });

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery(
    orpc.medicationOrders.get.queryOptions({ input: { id: orderId } })
  );

  const { data: administrationsData, isLoading: administrationsLoading } =
    useQuery({
      ...orpc.medicationOrders.listAdministrations.queryOptions({
        input: { medicationOrderId: orderId, limit: 100, offset: 0 },
      }),
      enabled: !!orderId,
    });

  const { data: diagnosesData } = useQuery({
    ...orpc.clinicalRecords.listDiagnoses.queryOptions({
      input: { encounterId: order?.encounterId ?? "" },
    }),
    enabled: !!order?.encounterId,
  });

  const diagnosis = order?.diagnosisId
    ? diagnosesData?.find((d) => d.id === order.diagnosisId)
    : undefined;

  const { data: prescriberData } = useQuery({
    ...orpc.facilities.getPractitioner.queryOptions({
      input: { id: order?.prescriberId ?? "" },
    }),
    enabled: !!order?.prescriberId,
  });

  const title = isLoading
    ? "Cargando..."
    : (order?.genericName ?? "Detalle de prescripción");

  useEffect(() => {
    if (order) {
      document.title = `${title} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [order, title]);

  const infoRows = order
    ? [
        { label: "Nombre genérico", value: order.genericName },
        { label: "Concentración", value: order.concentration },
        { label: "Forma farmacéutica", value: order.dosageForm },
        { label: "Dosis", value: order.dose },
        { label: "Unidad", value: order.doseUnit ?? "—" },
        { label: "Vía", value: order.routeCode },
        { label: "Frecuencia", value: order.frequencyText },
        { label: "Duración", value: order.durationText },
        { label: "Cantidad total", value: order.quantityTotal },
        { label: "Indicaciones", value: order.indications ?? "—" },
        {
          label: "Estado",
          value: (
            <span
              className={
                order.status === "active"
                  ? "text-emerald-600"
                  : "text-slate-600"
              }
            >
              {order.status}
            </span>
          ),
        },
        {
          label: "Firmado",
          value: new Date(order.signedAt).toLocaleString("es-CO"),
        },
        {
          label: "Prescriptor",
          value:
            prescriberData?.fullName ?? `${order.prescriberId.slice(0, 8)}…`,
        },
        { label: "ATC", value: order.atcCode ?? "—" },
        {
          label: "Diagnóstico",
          value: diagnosis
            ? `${diagnosis.description} (${diagnosis.code})`
            : order.diagnosisId
              ? "Cargando..."
              : "—",
        },
      ]
    : [];

  const adminColumns = [
    {
      header: "Fecha",
      accessor: (row: NonNullable<typeof administrationsData>["items"][0]) =>
        new Date(row.administeredAt).toLocaleString("es-CO"),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof administrationsData>["items"][0]) =>
        row.status,
    },
    {
      header: "Dosis administrada",
      accessor: (row: NonNullable<typeof administrationsData>["items"][0]) =>
        row.doseAdministered ?? "—",
    },
    {
      header: "Administrado por",
      accessor: (row: NonNullable<typeof administrationsData>["items"][0]) =>
        row.administeredBy,
    },
    {
      header: "Motivo no admin.",
      accessor: (row: NonNullable<typeof administrationsData>["items"][0]) =>
        row.reasonNotAdministered ?? "—",
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          order ? (
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm("¿Eliminar esta prescripción permanentemente?")) {
                  deleteMutation.mutate({ id: orderId });
                }
              }}
              size="sm"
              variant="outline"
            >
              <Trash2 size={14} />
              <span className="ml-1.5">
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </span>
            </Button>
          ) : undefined
        }
        backTo="/medication-orders"
        description="Detalle de la orden de medicamento"
        title={title}
      />

      {isError ? (
        <div className="mx-6 flex flex-col items-center justify-center gap-2 py-12">
          <p className="text-destructive text-sm">
            Error al cargar prescripción
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: orpc.medicationOrders.get.key({ type: "query" }),
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
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : order ? (
        <>
          <Card className="mx-6" size="sm">
            <CardHeader>
              <CardTitle>Información de la prescripción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {infoRows.map((row) => (
                  <div key={row.label}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {row.label}
                    </p>
                    <p className="mt-0.5 font-medium text-xs">{row.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mx-6" size="sm">
            <CardHeader>
              <CardTitle>Administraciones</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={adminColumns}
                data={administrationsData?.items ?? []}
                emptyDescription="No hay administraciones registradas para esta prescripción."
                emptyTitle="Sin administraciones"
                isLoading={administrationsLoading}
                keyExtractor={(row) => row.id}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          description="No se encontró la prescripción solicitada."
          title="Prescripción no encontrada"
        />
      )}
    </div>
  );
}
