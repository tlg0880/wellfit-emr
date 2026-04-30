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
  "/_authenticated/facilities/practitioners/$practitionerId"
)({
  component: PractitionerDetailPage,
});

function PractitionerDetailPage() {
  const { practitionerId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const practitioner = listData?.practitioners.find(
    (p) => p.id === practitionerId
  );

  const title = isLoading
    ? "Cargando..."
    : (practitioner?.fullName ?? "Detalle de profesional");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/facilities/practitioners"
        description="Información del profesional de salud"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : practitioner ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Nombre completo", value: practitioner.fullName },
                {
                  label: "Documento",
                  value: `${practitioner.documentType} ${practitioner.documentNumber}`,
                },
                {
                  label: "Número RETHUS",
                  value: practitioner.rethusNumber ?? "—",
                },
                {
                  label: "Activo",
                  value: practitioner.active ? "Sí" : "No",
                },
                {
                  label: "Creado",
                  value: new Date(practitioner.createdAt).toLocaleString(
                    "es-CO"
                  ),
                },
                {
                  label: "Actualizado",
                  value: new Date(practitioner.updatedAt).toLocaleString(
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
        </div>
      ) : (
        <EmptyState
          description="No se encontró el profesional solicitado."
          title="Profesional no encontrado"
        />
      )}
    </div>
  );
}
