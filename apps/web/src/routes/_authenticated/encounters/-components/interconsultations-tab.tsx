import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function InterconsultationsTab({
  encounterId,
}: {
  encounterId: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.interconsultations.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        encounterId,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.interconsultations.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Interconsulta eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.interconsultations.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar interconsulta");
    },
  });

  const columns = [
    {
      header: "Especialidad",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Mail size={14} />
          <span className="font-medium">{row.requestedSpecialty}</span>
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.status === "completed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : row.status === "requested"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Motivo",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.reasonText,
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
          aria-label="Eliminar interconsulta"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm("¿Eliminar esta interconsulta permanentemente?")) {
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
        <Link search={{ encounterId }} to="/interconsultations">
          <Button size="sm">
            <Mail size={14} />
            Nueva interconsulta
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay interconsultas registradas para esta atención."
        emptyTitle="Sin interconsultas"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
