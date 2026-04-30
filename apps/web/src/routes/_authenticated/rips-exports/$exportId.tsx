import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/rips-exports/$exportId")({
  component: RipsExportDetailPage,
});

function RipsExportDetailPage() {
  const { exportId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.ripsExports.list.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const exportItem = listData?.items.find((i) => i.id === exportId);

  const title = isLoading
    ? "Cargando..."
    : (exportItem?.status ?? "Detalle de export RIPS");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
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
                  value: exportItem.payerId,
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
