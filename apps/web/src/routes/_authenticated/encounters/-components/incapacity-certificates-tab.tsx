import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function IncapacityCertificatesTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.incapacityCertificates.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        encounterId,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.incapacityCertificates.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Incapacidad eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.incapacityCertificates.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar incapacidad");
    },
  });

  const columns = [
    {
      header: "Concepto",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FileText size={14} />
          <span className="font-medium">{row.conceptText}</span>
        </span>
      ),
    },
    {
      header: "Destinatario",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.destinationEntity,
    },
    {
      header: "Inicio",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.startDate).toLocaleDateString("es-CO"),
    },
    {
      header: "Fin",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.endDate).toLocaleDateString("es-CO"),
    },
    {
      header: "Fecha emisión",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.issuedAt).toLocaleString("es-CO"),
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <Button
          aria-label="Eliminar incapacidad"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm("¿Eliminar esta incapacidad permanentemente?")) {
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
        <Link search={{ encounterId, patientId }} to="/incapacity-certificates">
          <Button size="sm">
            <FileText size={14} />
            Nueva incapacidad
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay incapacidades registradas para esta atención."
        emptyTitle="Sin incapacidades"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
