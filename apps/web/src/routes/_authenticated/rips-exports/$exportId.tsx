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
import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/rips-exports/$exportId")({
  component: RipsExportDetailPage,
});

function RipsExportDetailPage() {
  const { exportId } = Route.useParams();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    ...orpc.ripsExports.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Exportación eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
      navigate({ to: "/rips-exports" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar exportación");
    },
  });

  const { data: listData, isLoading } = useQuery(
    orpc.ripsExports.list.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const exportItem = listData?.items.find((i) => i.id === exportId);

  const { data: payerData } = useQuery({
    ...orpc.payers.get.queryOptions({
      input: { id: exportItem?.payerId ?? "" },
    }),
    enabled: !!exportItem?.payerId,
  });

  const title = isLoading
    ? "Cargando..."
    : (exportItem?.status ?? "Detalle de export RIPS");

  useEffect(() => {
    if (exportItem) {
      document.title = `RIPS ${exportItem.status} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [exportItem]);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          exportItem ? (
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm("¿Eliminar esta exportación permanentemente?")) {
                  deleteMutation.mutate({ id: exportId });
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
        backTo="/rips-exports"
        description="Información de la exportación RIPS"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : exportItem ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
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
                        exportItem.status === "validated"
                          ? "text-emerald-600"
                          : exportItem.status === "draft"
                            ? "text-slate-600"
                            : "text-blue-600"
                      }
                    >
                      {exportItem.status}
                    </span>
                  ),
                },
                {
                  label: "Pagador",
                  value:
                    payerData?.name ?? `${exportItem.payerId.slice(0, 8)}…`,
                },
                {
                  label: "Periodo desde",
                  value: new Date(exportItem.periodFrom).toLocaleDateString(
                    "es-CO"
                  ),
                },
                {
                  label: "Periodo hasta",
                  value: new Date(exportItem.periodTo).toLocaleDateString(
                    "es-CO"
                  ),
                },
                {
                  label: "Generado",
                  value: new Date(exportItem.generatedAt).toLocaleString(
                    "es-CO"
                  ),
                },
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

          {exportItem.payloadJson && (
            <Card>
              <CardHeader>
                <CardTitle>Payload</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-none bg-muted p-3 text-[10px]">
                  {JSON.stringify(exportItem.payloadJson, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {exportItem.validationResultJson && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado de validación</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-none bg-muted p-3 text-[10px]">
                  {JSON.stringify(exportItem.validationResultJson, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <EmptyState
          description="No se encontró la exportación solicitada."
          title="Exportación no encontrada"
        />
      )}
    </div>
  );
}
