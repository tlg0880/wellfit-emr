import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { Eye, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

const documentTypeLabels: Record<string, string> = {
  evolucion_medica: "Evolución médica",
  nota_enfermeria: "Nota de enfermería",
  consentimiento_informado: "Consentimiento informado",
  epicrisis: "Epicrisis",
  historia_clinica: "Historia clínica",
  informe_quirurgico: "Informe quirúrgico",
  orden_medica: "Orden médica",
  otros: "Otro documento",
};

function getDocumentTypeLabel(type: string): string {
  return documentTypeLabels[type] ?? type;
}

function getStatusBadge(status: string): React.ReactNode {
  const mapped =
    status === "draft"
      ? {
          label: "Borrador",
          colorClass: "border-amber-200 bg-amber-50 text-amber-700",
        }
      : status === "signed"
        ? {
            label: "Firmado",
            colorClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
          }
        : {
            label: status,
            colorClass: "border-slate-200 bg-slate-50 text-slate-700",
          };
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-medium text-[10px] ${mapped.colorClass}`}
    >
      {mapped.label}
    </span>
  );
}

export function ClinicalDocumentsTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    orpc.clinicalDocuments.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        encounterId,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.clinicalDocuments.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar documento");
    },
  });

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["documents"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FileText size={14} />
          <span className="font-medium">
            {getDocumentTypeLabel(row.documentType)}
          </span>
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["documents"][0]) =>
        getStatusBadge(row.status),
    },
    {
      header: "Fecha creación",
      accessor: (row: NonNullable<typeof data>["documents"][0]) =>
        new Date(row.createdAt).toLocaleString("es-CO"),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["documents"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Ver documento"
            onClick={() =>
              navigate({
                to: "/clinical-documents/$documentId",
                params: { documentId: row.id },
              })
            }
            size="icon-xs"
            variant="ghost"
          >
            <Eye size={14} />
          </Button>
          <Button
            aria-label="Eliminar documento"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este documento permanentemente?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link search={{ encounterId, patientId }} to="/clinical-documents">
          <Button size="sm">
            <FileText size={14} />
            Nuevo documento
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.documents ?? []}
        emptyDescription="No hay documentos clínicos registrados para esta atención."
        emptyTitle="Sin documentos"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
