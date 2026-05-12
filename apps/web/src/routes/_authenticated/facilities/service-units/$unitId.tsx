import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute(
  "/_authenticated/facilities/service-units/$unitId"
)({
  component: ServiceUnitDetailPage,
});

function ServiceUnitDetailPage() {
  const navigate = useNavigate();
  const { unitId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.facilities.listServiceUnits.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const unit = listData?.serviceUnits.find((u) => u.id === unitId);

  const { data: sitesData } = useQuery({
    ...orpc.facilities.listSites.queryOptions({
      input: { limit: 1000, offset: 0 },
    }),
    enabled: !!unit?.siteId,
  });

  const site = sitesData?.sites.find((s) => s.id === unit?.siteId);

  const deleteMutation = useMutation({
    ...orpc.facilities.deleteServiceUnit.mutationOptions(),
    onSuccess: () => {
      toast.success("Unidad de servicio eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listServiceUnits.key({ type: "query" }),
      });
      navigate({ to: "/facilities/service-units" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar unidad de servicio");
    },
  });

  const title = isLoading
    ? "Cargando..."
    : (unit?.name ?? "Detalle de unidad de servicio");

  useEffect(() => {
    if (unit) {
      document.title = `${unit.name} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [unit]);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/facilities/service-units"
        description="Información de la unidad de servicio"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : unit ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Nombre", value: unit.name },
                { label: "Código", value: unit.serviceCode },
                {
                  label: "Ambiente",
                  value: unit.careSetting,
                },
                {
                  label: "Sede",
                  value: site?.name ?? (
                    <Link
                      className="text-primary hover:underline"
                      params={{ siteId: unit.siteId }}
                      to="/facilities/sites/$siteId"
                    >
                      {unit.siteId.slice(0, 8)}…
                    </Link>
                  ),
                },
                {
                  label: "Creada",
                  value: new Date(unit.createdAt).toLocaleString("es-CO"),
                },
                {
                  label: "Actualizada",
                  value: new Date(unit.updatedAt).toLocaleString("es-CO"),
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
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    confirm(
                      "¿Eliminar esta unidad de servicio permanentemente?"
                    )
                  ) {
                    deleteMutation.mutate({ id: unitId });
                  }
                }}
                size="sm"
                variant="destructive"
              >
                <Trash2 size={14} />
                <span className="ml-1.5">Eliminar</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          description="No se encontró la unidad de servicio solicitada."
          title="Unidad no encontrada"
        />
      )}
    </div>
  );
}
