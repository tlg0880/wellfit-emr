import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { Trash2, Unlock } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/data-disclosures/$disclosureId"
)({
  component: DataDisclosureDetailPage,
});

function DataDisclosureDetailPage() {
  const { disclosureId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { data: disclosure, isLoading } = useQuery(
    orpc.consents.getDataDisclosure.queryOptions({
      input: { id: disclosureId },
    })
  );

  const { data: patient } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: disclosure?.patientId ?? "" },
    }),
    enabled: !!disclosure?.patientId,
  });

  const revokeMutation = useMutation({
    ...orpc.consents.revokeDataDisclosure.mutationOptions(),
    onSuccess: () => {
      toast.success("Autorización revocada");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listDataDisclosures.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.consents.getDataDisclosure.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al revocar autorización");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.consents.deleteDataDisclosure.mutationOptions(),
    onSuccess: () => {
      toast.success("Autorización eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listDataDisclosures.key({ type: "query" }),
      });
      navigate({ to: "/data-disclosures" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar autorización");
    },
  });

  useEffect(() => {
    if (disclosure) {
      document.title = `${disclosure.thirdPartyName} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [disclosure]);

  const isRevoked = !!disclosure?.revokedAt;
  const isExpired =
    disclosure?.expiresAt && new Date(disclosure.expiresAt) < new Date();

  const statusLabel = isRevoked
    ? "Revocada"
    : isExpired
      ? "Vencida"
      : "Vigente";

  const statusClasses = isRevoked
    ? "border-red-200 bg-red-50 text-red-700"
    : isExpired
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/data-disclosures"
        description="Detalle de la autorización de divulgación de datos"
        title={isLoading ? "Cargando..." : "Autorización de datos"}
      />

      <div className="px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Unlock size={16} />
              Información de la autorización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : disclosure ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Paciente
                    </p>
                    <p className="font-medium">
                      <Link
                        className="text-primary hover:underline"
                        params={{ patientId: disclosure.patientId }}
                        to="/patients/$patientId"
                      >
                        {patient
                          ? `${patient.firstName} ${patient.lastName1}`
                          : `${disclosure.patientId.slice(0, 8)}…`}
                      </Link>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Tercero autorizado
                    </p>
                    <p className="font-medium">{disclosure.thirdPartyName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Finalidad
                    </p>
                    <p className="font-medium">{disclosure.purposeCode}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Base legal
                    </p>
                    <p className="font-medium">{disclosure.legalBasis}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Fecha de otorgamiento
                    </p>
                    <p className="font-medium">
                      {new Date(disclosure.grantedAt).toLocaleDateString(
                        "es-CO"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Fecha de vencimiento
                    </p>
                    <p className="font-medium">
                      {disclosure.expiresAt
                        ? new Date(disclosure.expiresAt).toLocaleDateString(
                            "es-CO"
                          )
                        : "Sin vencimiento"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Estado</p>
                    <span
                      className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${statusClasses}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  {disclosure.revokedAt && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Fecha de revocación
                      </p>
                      <p className="font-medium">
                        {new Date(disclosure.revokedAt).toLocaleDateString(
                          "es-CO"
                        )}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {!isRevoked && (
                    <Button
                      disabled={revokeMutation.isPending}
                      onClick={() =>
                        revokeMutation.mutate({
                          id: disclosure.id,
                          revokedAt: new Date(),
                        })
                      }
                      size="sm"
                      variant="outline"
                    >
                      Revocar
                    </Button>
                  )}
                  <Button
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        confirm("¿Eliminar esta autorización permanentemente?")
                      ) {
                        deleteMutation.mutate({ id: disclosure.id });
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
                No se encontró la autorización.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
