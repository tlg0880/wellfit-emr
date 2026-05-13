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
import { AlertTriangle, FileCheck, RefreshCw, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/incapacity-certificates/$certificateId"
)({
  component: IncapacityCertificateDetailPage,
});

function IncapacityCertificateDetailPage() {
  const { certificateId } = Route.useParams();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    ...orpc.incapacityCertificates.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Certificado eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.incapacityCertificates.list.key({ type: "query" }),
      });
      navigate({ to: "/incapacity-certificates" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar certificado");
    },
  });

  const {
    data: certificate,
    isLoading,
    isError,
    error,
  } = useQuery(
    orpc.incapacityCertificates.get.queryOptions({
      input: { id: certificateId },
    })
  );

  const { data: issuerData } = useQuery({
    ...orpc.facilities.getPractitioner.queryOptions({
      input: { id: certificate?.issuedBy ?? "" },
    }),
    enabled: !!certificate?.issuedBy,
  });

  const { data: patientData } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: certificate?.patientId ?? "" },
    }),
    enabled: !!certificate?.patientId,
  });

  const { data: encounterData } = useQuery({
    ...orpc.encounters.get.queryOptions({
      input: { id: certificate?.encounterId ?? "" },
    }),
    enabled: !!certificate?.encounterId,
  });

  const title = isLoading
    ? "Cargando..."
    : (certificate?.conceptText ?? "Detalle de incapacidad");

  useEffect(() => {
    if (certificate) {
      document.title = `${certificate.conceptText} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [certificate]);

  if (isError) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader backTo="/incapacity-certificates" title="Error al cargar" />
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <AlertTriangle className="text-destructive" size={20} />
          <p className="text-muted-foreground text-sm">
            {error?.message || "Ocurrió un error inesperado."}
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: orpc.incapacityCertificates.get.key({
                  type: "query",
                }),
              })
            }
            size="sm"
            variant="outline"
          >
            <RefreshCw size={12} /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          certificate ? (
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm("¿Eliminar este certificado permanentemente?")) {
                  deleteMutation.mutate({ id: certificateId });
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
        backTo="/incapacity-certificates"
        description="Información del certificado de incapacidad"
        icon={FileCheck}
        iconBgClass="bg-amber-100 text-amber-600"
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
              <div>
                <p className="text-[10px] text-muted-foreground">Paciente</p>
                <p className="mt-0.5 font-medium">
                  <Link
                    className="text-primary hover:underline"
                    params={{ patientId: certificate.patientId }}
                    to="/patients/$patientId"
                  >
                    {patientData
                      ? `${patientData.firstName} ${patientData.lastName1}`
                      : `${certificate.patientId.slice(0, 8)}…`}
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Atención</p>
                <p className="mt-0.5 font-medium">
                  <Link
                    className="text-primary hover:underline"
                    params={{ encounterId: certificate.encounterId }}
                    search={{ tab: undefined }}
                    to="/encounters/$encounterId"
                  >
                    {encounterData
                      ? encounterData.reasonForVisit || "Sin motivo"
                      : `${certificate.encounterId.slice(0, 8)}…`}
                  </Link>
                </p>
              </div>
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
                  value:
                    issuerData?.fullName ??
                    `${certificate.issuedBy.slice(0, 8)}…`,
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
