import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function AttachmentsTab({ encounterId }: { encounterId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.attachments.listLinks.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        linkedEntityType: "encounter",
        linkedEntityId: encounterId,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.attachments.deleteLink.mutationOptions(),
    onSuccess: () => {
      toast.success("Anexo eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.attachments.listLinks.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar anexo");
    },
  });

  const columns = [
    {
      header: "Título",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Paperclip size={14} />
          <span className="font-medium">{row.title}</span>
        </span>
      ),
    },
    {
      header: "Clasificación",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.classification,
    },
    {
      header: "Fecha captura",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.capturedAt).toLocaleString("es-CO"),
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <Button
          aria-label="Eliminar anexo"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm("¿Eliminar este anexo permanentemente?")) {
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
        <Link
          search={{
            linkedEntityType: "encounter",
            linkedEntityId: encounterId,
          }}
          to="/attachments"
        >
          <Button size="sm">
            <Paperclip size={14} />
            Nuevo anexo
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay anexos vinculados a esta atención."
        emptyTitle="Sin anexos"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
