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

export const Route = createFileRoute(
  "/_authenticated/facilities/sites/$siteId"
)({
  component: SiteDetailPage,
});

function SiteDetailPage() {
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

  const title = isLoading ? "Cargando..." : (site?.name ?? "Detalle de sede");

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
                  value: organization?.name ?? site.organizationId,
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
