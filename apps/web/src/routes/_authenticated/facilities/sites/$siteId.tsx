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
  "/_authenticated/facilities/sites/$siteId"
)({
  component: SiteDetailPage,
});

function SiteDetailPage() {
  const navigate = useNavigate();
  const { siteId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.facilities.listSites.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const site = listData?.sites.find((s) => s.id === siteId);

  const { data: orgData } = useQuery({
    ...orpc.facilities.listOrganizations.queryOptions({
      input: { limit: 1000, offset: 0 },
    }),
    enabled: !!site?.organizationId,
  });

  const organization = orgData?.organizations.find(
    (o) => o.id === site?.organizationId
  );

  const deleteMutation = useMutation({
    ...orpc.facilities.deleteSite.mutationOptions(),
    onSuccess: () => {
      toast.success("Sede eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listSites.key({ type: "query" }),
      });
      navigate({ to: "/facilities/sites" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar sede");
    },
  });

  const title = isLoading ? "Cargando..." : (site?.name ?? "Detalle de sede");

  useEffect(() => {
    if (site) {
      document.title = `${site.name} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [site]);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/facilities/sites"
        description="Información de la sede"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : site ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Nombre", value: site.name },
                { label: "Código", value: site.siteCode },
                {
                  label: "Dirección",
                  value: site.address ?? "—",
                },
                {
                  label: "Municipio",
                  value: site.municipalityCode ?? "—",
                },
                {
                  label: "Organización",
                  value: organization?.name ?? (
                    <Link
                      className="text-primary hover:underline"
                      params={{ organizationId: site.organizationId }}
                      to="/facilities/organizations/$organizationId"
                    >
                      {site.organizationId.slice(0, 8)}…
                    </Link>
                  ),
                },
                {
                  label: "Creada",
                  value: new Date(site.createdAt).toLocaleString("es-CO"),
                },
                {
                  label: "Actualizada",
                  value: new Date(site.updatedAt).toLocaleString("es-CO"),
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
                  if (confirm("¿Eliminar esta sede permanentemente?")) {
                    deleteMutation.mutate({ id: siteId });
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
          description="No se encontró la sede solicitada."
          title="Sede no encontrada"
        />
      )}
    </div>
  );
}
