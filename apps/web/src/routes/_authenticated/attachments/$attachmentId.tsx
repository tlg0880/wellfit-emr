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
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Paperclip,
  Trash2,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/attachments/$attachmentId"
)({
  component: AttachmentDetailPage,
});

const entityTypeLabels: Record<string, string> = {
  patient: "Paciente",
  encounter: "Atención",
  practitioner: "Profesional",
  organization: "Organización",
  clinicalDocument: "Documento clínico",
};

const entityDetailRoutes: Record<string, string> = {
  patient: "/patients",
  encounter: "/encounters",
  practitioner: "/facilities/practitioners",
  organization: "/facilities/organizations",
  clinicalDocument: "/clinical-documents",
};

function getEntityTypeLabel(type: string): string {
  return entityTypeLabels[type] ?? type;
}

function getEntityDetailRoute(type: string, id: string): string | null {
  const base = entityDetailRoutes[type];
  if (!base) {
    return null;
  }
  return `${base}/${id}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InfoRow({
  label,
  value,
  isError,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  isError?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {isError ? (
        <p className="mt-0.5 flex items-center gap-1 font-medium text-amber-700 text-xs">
          <AlertTriangle size={12} />
          Error al cargar
        </p>
      ) : (
        <p className="mt-0.5 font-medium text-xs">{children ?? value ?? "—"}</p>
      )}
    </div>
  );
}

function AttachmentDetailPage() {
  const { attachmentId } = Route.useParams();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    ...orpc.attachments.deleteLink.mutationOptions(),
    onSuccess: () => {
      toast.success("Anexo eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.attachments.list.key({ type: "query" }),
      });
      navigate({ to: "/attachments" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar anexo");
    },
  });

  const {
    data: linkData,
    isLoading: linkLoading,
    error: linkError,
  } = useQuery(
    orpc.attachments.getLink.queryOptions({
      input: { id: attachmentId },
    })
  );

  const link = linkData;

  const {
    data: binaryData,
    isLoading: binaryLoading,
    error: binaryError,
  } = useQuery(
    orpc.attachments.getBinaryObject.queryOptions({
      input: { id: link?.binaryId ?? "" },
      enabled: !!link?.binaryId,
    })
  );

  const isLoading = linkLoading;
  const hasLinkError = !!linkError;

  useEffect(() => {
    if (isLoading) {
      document.title = "WellFit EMR";
    } else if (hasLinkError) {
      document.title = "Anexo no encontrado | WellFit EMR";
    } else if (link?.title) {
      document.title = `Anexo: ${link.title}`;
    } else {
      document.title = "WellFit EMR";
    }

    return () => {
      document.title = "WellFit EMR";
    };
  }, [link?.title, isLoading, hasLinkError]);

  const title = isLoading
    ? "Cargando..."
    : hasLinkError
      ? "Anexo no encontrado"
      : (link?.title ?? "Detalle de anexo");

  const description = isLoading
    ? ""
    : hasLinkError
      ? ""
      : "Información del anexo documental";

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          link ? (
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm("¿Eliminar este anexo permanentemente?")) {
                  deleteMutation.mutate({ id: attachmentId });
                }
              }}
              size="sm"
              variant="outline"
            >
              <Trash2 size={14} />
              <span className="ml-1.5">
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </span>
            </Button>
          ) : undefined
        }
        backTo="/attachments"
        description={description}
        icon={Paperclip}
        iconBgClass="bg-slate-100 text-slate-600"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : hasLinkError || !link ? (
        <div className="px-6">
          <EmptyState
            description="No se encontró el anexo solicitado."
            title="Anexo no encontrado"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          {/* Link metadata card */}
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <FileText size={16} />
                Información del anexo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Título" value={link.title} />
              <InfoRow label="Clasificación" value={link.classification} />
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground">
                  Entidad vinculada
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 font-medium text-xs">
                  <span>
                    {getEntityTypeLabel(link.linkedEntityType)} —{" "}
                    {link.linkedEntityId.slice(0, 8)}…
                  </span>
                  {(() => {
                    const detailRoute = getEntityDetailRoute(
                      link.linkedEntityType,
                      link.linkedEntityId
                    );
                    if (!detailRoute) {
                      return null;
                    }
                    return (
                      <Link
                        aria-label="Ver entidad vinculada"
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                        to={detailRoute}
                      >
                        <ExternalLink size={12} />
                      </Link>
                    );
                  })()}
                </p>
              </div>
              <InfoRow
                label="Fecha captura"
                value={new Date(link.capturedAt).toLocaleString("es-CO")}
              />
            </CardContent>
          </Card>

          {/* Binary metadata card */}
          <Card>
            <CardHeader>
              <CardTitle>Metadatos del archivo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow
                isError={!!binaryError && !binaryLoading}
                label="Tipo MIME"
                value={binaryData?.mimeType}
              />
              <InfoRow
                isError={!!binaryError && !binaryLoading}
                label="Tamaño"
                value={
                  binaryData ? formatSize(binaryData.sizeBytes) : undefined
                }
              />
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground">
                  Hash SHA-256
                </p>
                {binaryError && !binaryLoading ? (
                  <p className="mt-0.5 flex items-center gap-1 font-medium text-amber-700 text-xs">
                    <AlertTriangle size={12} />
                    Error al cargar
                  </p>
                ) : (
                  <p className="mt-0.5 break-all font-medium font-mono text-[10px]">
                    {binaryData?.hashSha256 ?? "—"}
                  </p>
                )}
              </div>
              <InfoRow
                isError={!!binaryError && !binaryLoading}
                label="Ubicación de almacenamiento"
                value={binaryData?.storageLocator}
              />
              <InfoRow
                isError={!!binaryError && !binaryLoading}
                label="Clase de retención"
                value={binaryData?.retentionClass}
              />
              <InfoRow
                isError={!!binaryError && !binaryLoading}
                label="Referencia de clave cifrada"
                value={binaryData?.encryptedKeyRef}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
