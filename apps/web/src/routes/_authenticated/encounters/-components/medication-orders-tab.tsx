import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { Pill, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function MedicationOrdersTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.medicationOrders.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        encounterId,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.medicationOrders.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Prescripción eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.medicationOrders.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar prescripción");
    },
  });

  const columns = [
    {
      header: "Medicamento",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Pill size={14} />
          <span className="font-medium">{row.genericName}</span>
        </span>
      ),
    },
    {
      header: "Concentración / Dosis",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `${row.concentration} — ${row.dose} ${row.doseUnit ?? ""}`,
    },
    {
      header: "Frecuencia",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.frequencyText,
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.status,
    },
    {
      header: "Fecha prescripción",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.signedAt).toLocaleString("es-CO"),
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <Button
          aria-label="Eliminar prescripción"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm("¿Eliminar esta prescripción permanentemente?")) {
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
            <Pill size={14} />
            Nueva prescripción
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay prescripciones registradas para esta atención."
        emptyTitle="Sin prescripciones"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        rowIdExtractor={(row) => `rips-medication-order-${row.id}`}
      />
    </div>
  );
}
