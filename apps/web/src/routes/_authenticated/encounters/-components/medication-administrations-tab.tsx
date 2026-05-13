import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { Syringe, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function MedicationAdministrationsTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId?: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.medicationOrders.listAdministrations.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        encounterId,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.medicationOrders.deleteAdministration.mutationOptions(),
    onSuccess: () => {
      toast.success("Administración eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.medicationOrders.listAdministrations.key({
          type: "query",
        }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar administración");
    },
  });

  const columns = [
    {
      header: "Medicamento",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Syringe size={14} />
          <span className="font-medium">
            {row.medicationOrderId.slice(0, 8)}…
          </span>
        </span>
      ),
    },
    {
      header: "Dosis administrada",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.doseAdministered ?? "—",
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.status === "completed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : row.status === "not-done"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {row.status === "completed"
            ? "Completada"
            : row.status === "not-done"
              ? "No administrada"
              : row.status}
        </span>
      ),
    },
    {
      header: "Administrada por",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `${row.administeredBy.slice(0, 8)}…`,
    },
    {
      header: "Fecha",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.administeredAt).toLocaleString("es-CO"),
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <Button
          aria-label="Eliminar administración"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm("¿Eliminar esta administración permanentemente?")) {
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
        <Link search={{ encounterId, patientId }} to="/medication-orders">
          <Button size="sm">
            <Syringe size={14} />
            Ver órdenes de medicación
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay administraciones registradas para esta atención."
        emptyTitle="Sin administraciones"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
