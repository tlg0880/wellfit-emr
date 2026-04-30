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
  "/_authenticated/incapacity-certificates/$certificateId"
)({
  component: IncapacityCertificateDetailPage,
});

function IncapacityCertificateDetailPage() {
  const { certificateId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.incapacityCertificates.list.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const certificate = listData?.items.find((i) => i.id === certificateId);

  const title = isLoading
    ? "Cargando..."
    : (certificate?.conceptText ?? "Detalle de incapacidad");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/incapacity-certificates"
        description="Información del certificado de incapacidad"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : certificate ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del certificado</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                {
                  label: "Concepto",
                  value: certificate.conceptText,
                },
                {
                  label: "Entidad destino",
                  value: certificate.destinationEntity ?? "—",
                },
                {
                  label: "Fecha inicio",
                  value: new Date(certificate.startDate).toLocaleDateString(
                    "es-CO"
                  ),
                },
                {
                  label: "Fecha fin",
                  value: new Date(certificate.endDate).toLocaleDateString(
                    "es-CO"
                  ),
                },
                {
                  label: "Fecha emisión",
                  value: new Date(certificate.issuedAt).toLocaleString("es-CO"),
                },
                {
                  label: "Firmado",
                  value: new Date(certificate.signedAt).toLocaleString("es-CO"),
                },
                {
                  label: "Emitido por",
                  value: certificate.issuedBy,
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
          description="No se encontró el certificado solicitado."
          title="Certificado no encontrado"
        />
      )}
    </div>
  );
}
