import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function ServiceRequestsTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId?: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        encounterId,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.serviceRequests.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Orden eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.serviceRequests.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar orden");
    },
  });

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FlaskConical size={14} />
          {row.requestType}
        </span>
      ),
    },
    {
      header: "Código",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.requestCode,
    },
    {
      header: "Prioridad",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.priority === "stat"
              ? "border-red-200 bg-red-50 text-red-700"
              : row.priority === "urgent"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.status,
    },
    {
      header: "Fecha solicitud",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.requestedAt).toLocaleString("es-CO"),
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <Button
          aria-label="Eliminar orden"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm("¿Eliminar esta orden permanentemente?")) {
              deleteMutation.mutate({ id: row.id });
            }
          }}
          size="icon-xs"
          variant="ghost"
        >
          <Trash2 size={14} />
        </Button>
      ),
      className: "w-16",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link search={{ encounterId, patientId }} to="/service-requests">
          <Button size="sm">
            <FlaskConical size={14} />
            Nueva orden
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay órdenes de servicio registradas para esta atención."
        emptyTitle="Sin órdenes"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        rowIdExtractor={(row) => `rips-service-request-${row.id}`}
      />
    </div>
  );
}
