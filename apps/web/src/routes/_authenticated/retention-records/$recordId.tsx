import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { Archive, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/retention-records/$recordId"
)({
  component: RetentionRecordDetailPage,
});

function RetentionRecordDetailPage() {
  const { recordId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { data: record, isLoading } = useQuery(
    orpc.retentionRecords.get.queryOptions({ input: { id: recordId } })
  );

  const deleteMutation = useMutation({
    ...orpc.retentionRecords.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Registro de retención eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.retentionRecords.list.key({ type: "query" }),
      });
      navigate({ to: "/retention-records" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar registro");
    },
  });

  const isEligible =
    record &&
    !record.legalHoldFlag &&
    new Date(record.disposalEligibilityDate) < new Date();

  const statusLabel = isEligible
    ? "Elegible disposición"
    : record?.legalHoldFlag
      ? "Retención legal"
      : "Vigente";

  const statusClasses = isEligible
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : record?.legalHoldFlag
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  useEffect(() => {
    if (record) {
      document.title = `Retención ${record.entityType} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [record]);

  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/retention-records"
        description="Detalle del registro de retención documental"
        title={isLoading ? "Cargando..." : `Registro ${recordId.slice(0, 8)}`}
      />

      <div className="px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Archive size={16} />
              Información del registro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : record ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Tipo de entidad
                    </p>
                    <p className="font-medium">{record.entityType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      ID entidad
                    </p>
                    <p className="font-mono">{record.entityId.slice(0, 8)}…</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Clase de retención
                    </p>
                    <p className="font-medium">{record.retentionClass}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Estado</p>
                    <span
                      className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${statusClasses}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Fecha disparador
                    </p>
                    <p className="font-medium">
                      {new Date(record.triggerDate).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Fecha elegible disposición
                    </p>
                    <p className="font-medium">
                      {new Date(
                        record.disposalEligibilityDate
                      ).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Legal hold
                    </p>
                    <p className="font-medium">
                      {record.legalHoldFlag ? "Sí" : "No"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          "¿Eliminar este registro de retención permanentemente?"
                        )
                      ) {
                        deleteMutation.mutate({ id: record.id });
                      }
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                No se encontró el registro.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
