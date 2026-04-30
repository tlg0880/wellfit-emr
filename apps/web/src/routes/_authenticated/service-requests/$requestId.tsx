import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/service-requests/$requestId"
)({
  component: ServiceRequestDetailPage,
});

function ServiceRequestDetailPage() {
  const { requestId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showReportForm, setShowReportForm] = useState(false);

  const { data: request, isLoading } = useQuery(
    orpc.serviceRequests.list.queryOptions({
      input: { limit: 1, offset: 0 },
    })
  );

  const serviceRequest = request?.items.find((r) => r.id === requestId);

  const { data: report, isLoading: reportLoading } = useQuery({
    ...orpc.serviceRequests.getReport.queryOptions({
      input: { requestId },
    }),
    enabled: !!requestId,
  });

  const createReport = useMutation({
    ...orpc.serviceRequests.createReport.mutationOptions(),
    onSuccess: () => {
      toast.success("Reporte diagnóstico creado");
      setShowReportForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.serviceRequests.getReport.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear reporte");
    },
  });

  const [reportForm, setReportForm] = useState({
    reportType: "",
    conclusionText: "",
    issuedAt: new Date().toISOString().slice(0, 16),
  });

  function handleCreateReport(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceRequest) {
      return;
    }
    createReport.mutate({
      requestId,
      encounterId: serviceRequest.encounterId,
      reportType: reportForm.reportType,
      conclusionText: reportForm.conclusionText || null,
      issuedAt: new Date(reportForm.issuedAt),
      status: "final",
      performerOrgId: null,
    });
  }

  const title = isLoading
    ? "Cargando..."
    : (serviceRequest?.requestCode ?? "Detalle de orden");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/service-requests"
        description="Detalle de la orden de servicio y reporte asociado"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : serviceRequest ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información de la orden</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Tipo", value: serviceRequest.requestType },
                { label: "Código", value: serviceRequest.requestCode },
                {
                  label: "Prioridad",
                  value: (
                    <span
                      className={
                        serviceRequest.priority === "stat"
                          ? "text-red-600"
                          : serviceRequest.priority === "urgent"
                            ? "text-amber-600"
                            : "text-slate-600"
                      }
                    >
                      {serviceRequest.priority}
                    </span>
                  ),
                },
                { label: "Estado", value: serviceRequest.status },
                {
                  label: "Fecha solicitud",
                  value: new Date(serviceRequest.requestedAt).toLocaleString(
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reporte diagnóstico</CardTitle>
              {!(report || showReportForm) && (
                <Button onClick={() => setShowReportForm(true)} size="sm">
                  <Plus size={14} />
                  Crear reporte
                </Button>
              )}
            </CardHeader>
            <CardContent className="text-xs">
              {reportLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : report ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Tipo de reporte
                    </p>
                    <p className="font-medium">{report.reportType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Estado</p>
                    <p className="font-medium">{report.status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Fecha emisión
                    </p>
                    <p className="font-medium">
                      {new Date(report.issuedAt).toLocaleString("es-CO")}
                    </p>
                  </div>
                  {report.conclusionText && (
                    <div className="border p-3">
                      <p className="text-[10px] text-muted-foreground">
                        Conclusión
                      </p>
                      <p className="mt-1">{report.conclusionText}</p>
                    </div>
                  )}
                </div>
              ) : showReportForm ? (
                <form className="space-y-3" onSubmit={handleCreateReport}>
                  <div className="space-y-1">
                    <Label>Tipo de reporte</Label>
                    <Input
                      onChange={(e) =>
                        setReportForm((f) => ({
                          ...f,
                          reportType: e.target.value,
                        }))
                      }
                      required
                      value={reportForm.reportType}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Conclusión</Label>
                    <Input
                      onChange={(e) =>
                        setReportForm((f) => ({
                          ...f,
                          conclusionText: e.target.value,
                        }))
                      }
                      value={reportForm.conclusionText}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Fecha emisión</Label>
                    <Input
                      onChange={(e) =>
                        setReportForm((f) => ({
                          ...f,
                          issuedAt: e.target.value,
                        }))
                      }
                      required
                      type="datetime-local"
                      value={reportForm.issuedAt}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => setShowReportForm(false)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <X size={14} />
                      Cancelar
                    </Button>
                    <Button
                      disabled={createReport.isPending}
                      size="sm"
                      type="submit"
                    >
                      {createReport.isPending
                        ? "Guardando..."
                        : "Guardar reporte"}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-muted-foreground">
                  No hay reporte diagnóstico asociado.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          description="No se encontró la orden de servicio solicitada."
          title="Orden no encontrada"
        />
      )}
    </div>
  );
}
