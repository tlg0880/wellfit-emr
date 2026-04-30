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
  "/_authenticated/attachments/$attachmentId"
)({
  component: AttachmentDetailPage,
});

function AttachmentDetailPage() {
  const { attachmentId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.attachments.listLinks.queryOptions({
      input: {
        linkedEntityType: "patient",
        linkedEntityId: "",
        limit: 1000,
        offset: 0,
      },
    })
  );

  const attachment = listData?.items.find((i) => i.id === attachmentId);

  const title = isLoading
    ? "Cargando..."
    : (attachment?.title ?? "Detalle de anexo");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/attachments"
        description="Información del anexo documental"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : attachment ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del anexo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Título", value: attachment.title },
                {
                  label: "Clasificación",
                  value: attachment.classification,
                },
                {
                  label: "Entidad vinculada",
                  value: `${attachment.linkedEntityType} — ${attachment.linkedEntityId}`,
                },
                {
                  label: "Binary ID",
                  value: attachment.binaryId,
                },
                {
                  label: "Fecha captura",
                  value: new Date(attachment.capturedAt).toLocaleString(
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
          description="No se encontró el anexo solicitado."
          title="Anexo no encontrado"
        />
      )}
    </div>
  );
}
