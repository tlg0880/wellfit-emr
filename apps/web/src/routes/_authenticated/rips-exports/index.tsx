import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import {
  Eye,
  FileOutput,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";
import {
  extractRipsGenerationIssues,
  handleRipsGenerateSuccess,
  RipsGenerationIssuesPanel,
  showRipsGenerationIssuesToast,
} from "./-components/generation-issues";
import { RipsExportForm } from "./-components/rips-export-form";

export const Route = createFileRoute("/_authenticated/rips-exports/")({
  component: RipsExportsListPage,
});

function RipsExportsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [generationIssues, setGenerationIssues] = useState<
    ReturnType<typeof extractRipsGenerationIssues>
  >([]);

  useEffect(() => {
    document.title = "RIPS | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data, isLoading } = useQuery(
    orpc.ripsExports.list.queryOptions({
      input: {
        limit,
        offset,
        status: status || undefined,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.ripsExports.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Exportación eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar exportación");
    },
  });

  const generateMutation = useMutation({
    ...orpc.ripsExports.generatePayload.mutationOptions(),
    onMutate: () => {
      setGenerationIssues([]);
    },
    onSuccess: (data) => {
      handleRipsGenerateSuccess(data.numUsers);
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      const issues = extractRipsGenerationIssues(error);
      if (issues.length > 0) {
        setGenerationIssues(issues);
        showRipsGenerationIssuesToast(issues);
        return;
      }
      toast.error(error.message || "Error al generar payload");
    },
  });

  const validateMutation = useMutation({
    ...orpc.ripsExports.validatePayload.mutationOptions(),
    onSuccess: (data) => {
      if (data.validation.passed) {
        toast.success("Validación aprobada");
      } else {
        toast.error(
          `Validación rechazada: ${data.validation.rejections.length} rechazos`
        );
      }
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al validar");
    },
  });

  const columns = [
    {
      header: "Pagador ID",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FileOutput size={14} />
          {row.payerId.slice(0, 8)}…
        </span>
      ),
    },
    {
      header: "Periodo",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `${new Date(row.periodFrom).toLocaleDateString("es-CO")} - ${new Date(row.periodTo).toLocaleDateString("es-CO")}`,
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => {
        const statusClasses: Record<string, string> = {
          draft: "border-amber-200 bg-amber-50 text-amber-700",
          generated: "border-sky-200 bg-sky-50 text-sky-700",
          ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
          locally_invalid: "border-red-200 bg-red-50 text-red-700",
          sent: "border-blue-200 bg-blue-50 text-blue-700",
          validated: "border-emerald-200 bg-emerald-50 text-emerald-700",
        };
        return (
          <span
            className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${statusClasses[row.status] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      header: "Generado",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.generatedAt).toLocaleString("es-CO"),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Generar payload"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate({ id: row.id })}
            size="icon-xs"
            variant="ghost"
          >
            <Play size={12} />
          </Button>
          <Button
            aria-label="Validar payload"
            disabled={!row.payloadJson || validateMutation.isPending}
            onClick={() => validateMutation.mutate({ id: row.id })}
            size="icon-xs"
            variant="ghost"
          >
            <ShieldCheck size={12} />
          </Button>
          <Link
            aria-label="Editar exportación"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ exportId: row.id }}
            search={{ edit: true }}
            to="/rips-exports/$exportId"
          >
            <Pencil size={14} />
          </Link>
          <Link
            aria-label="Ver exportación"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ exportId: row.id }}
            to="/rips-exports/$exportId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Eliminar exportación"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta exportación permanentemente?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ),
      className: "w-36",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nueva exportación"}
          </Button>
        }
        description="Generación y seguimiento de lotes RIPS"
        icon={FileOutput}
        iconBgClass="bg-sky-100 text-sky-600"
        title="Exportaciones RIPS"
      />

      {showForm ? (
        <div className="mx-6">
          <RipsExportForm
            mode="create"
            onCancel={() => setShowForm(false)}
            title="Nueva exportación RIPS"
          />
        </div>
      ) : null}

      <div className="px-6">
        <RipsGenerationIssuesPanel
          issues={generationIssues}
          onDismiss={() => setGenerationIssues([])}
        />

        <div className="mb-3 flex items-center gap-2">
          <Search className="text-muted-foreground" size={14} />
          <Select
            onValueChange={(v) => {
              setStatus(v === "all" ? "" : (v as string));
              setOffset(0);
            }}
            value={status || "all"}
          >
            <SelectTrigger className="h-7 max-w-xs text-xs">
              <SelectValue placeholder="Filtrar por estado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="generated">Generado</SelectItem>
              <SelectItem value="ready">Listo</SelectItem>
              <SelectItem value="locally_invalid">Invalido local</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="validated">Validado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription={
            status
              ? "Ninguna exportación coincide con los filtros aplicados."
              : "No se encontraron exportaciones RIPS."
          }
          emptyTitle={status ? "Sin resultados" : "Sin exportaciones"}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/rips-exports/$exportId",
              params: { exportId: row.id },
            });
          }}
          pagination={
            data
              ? {
                  limit,
                  offset,
                  total: data.total,
                  onPageChange: setOffset,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
