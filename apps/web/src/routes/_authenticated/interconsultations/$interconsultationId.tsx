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
  "/_authenticated/interconsultations/$interconsultationId"
)({
  component: InterconsultationDetailPage,
});

function InterconsultationDetailPage() {
  const { interconsultationId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.interconsultations.list.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const interconsultation = listData?.items.find(
    (i) => i.id === interconsultationId
  );

  const title = isLoading
    ? "Cargando..."
    : (interconsultation?.requestedSpecialty ?? "Detalle de interconsulta");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/interconsultations"
        description="Información de la interconsulta"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : interconsultation ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                {
                  label: "Especialidad solicitada",
                  value: interconsultation.requestedSpecialty,
                },
                {
                  label: "Motivo",
                  value: interconsultation.reasonText,
                },
                {
                  label: "Estado",
                  value: (
                    <span
                      className={
                        interconsultation.status === "responded"
                          ? "text-emerald-600"
                          : interconsultation.status === "requested"
                            ? "text-blue-600"
                            : "text-slate-600"
                      }
                    >
                      {interconsultation.status}
                    </span>
                  ),
                },
                {
                  label: "Fecha solicitud",
                  value: new Date(interconsultation.requestedAt).toLocaleString(
                    "es-CO"
                  ),
                },
                {
                  label: "Solicitado por",
                  value: interconsultation.requestedBy,
                },
                {
                  label: "ID de respuesta",
                  value: interconsultation.responseDocumentId ?? "—",
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
          description="No se encontró la interconsulta solicitada."
          title="Interconsulta no encontrada"
        />
      )}
    </div>
  );
}
