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
import { AlertTriangle, Ban, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/consents/$consentId")({
  component: ConsentDetailPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw new Error("UNAUTHORIZED");
    }
    return { session };
  },
  errorComponent: () => {
    window.location.href = "/login";
    return null;
  },
});

function ConsentDetailPage() {
  const navigate = useNavigate();
  const { consentId } = Route.useParams();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: consent,
    isLoading,
    isError,
    error,
  } = useQuery(
    orpc.consents.getConsent.queryOptions({
      input: { id: consentId },
      enabled: !!consentId,
    })
  );

  const { data: patientData } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: consent?.patientId ?? "" },
    }),
    enabled: !!consent?.patientId,
  });

  const revokeMutation = useMutation({
    ...orpc.consents.revokeConsent.mutationOptions(),
    onSuccess: () => {
      toast.success("Consentimiento revocado");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.getConsent.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al revocar");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.consents.deleteConsent.mutationOptions(),
    onSuccess: () => {
      toast.success("Consentimiento eliminado");
      setConfirmDelete(false);
      navigate({ to: "/consents" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar");
    },
  });

  useEffect(() => {
    if (consent?.consentType) {
      document.title = `Consentimiento: ${consent.consentType} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [consent?.consentType]);

  useEffect(() => {
    if (!confirmDelete) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setConfirmDelete(false);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [confirmDelete]);

  if (isError) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader backTo="/consents" title="Error al cargar" />
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <AlertTriangle className="text-destructive" size={20} />
          <p className="text-muted-foreground text-sm">
            {error?.message || "Ocurrió un error inesperado."}
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: orpc.consents.getConsent.key({ type: "query" }),
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader backTo="/consents" title="Cargando..." />
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!consent) {
    return (
      <div className="space-y-4">
        <PageHeader
          backTo="/consents"
          description="No se encontró el registro solicitado"
          title="Consentimiento no encontrado"
        />
      </div>
    );
  }

  const isRevoked = !!consent.revokedAt;
  const decisionLabel =
    consent.decision === "accepted"
      ? "Aceptado"
      : consent.decision === "rejected"
        ? "Rechazado"
        : consent.decision === "withdrawn"
          ? "Retirado"
          : consent.decision;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {!isRevoked && (
              <Button
                disabled={revokeMutation.isPending}
                onClick={() =>
                  revokeMutation.mutate({
                    id: consentId,
                    revokedAt: new Date(),
                  })
                }
                size="sm"
                variant="outline"
              >
                <Ban size={14} />
                Revocar
              </Button>
            )}
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                if (confirmDelete) {
                  deleteMutation.mutate({ id: consentId });
                }
              }}
              size="sm"
              variant="destructive"
            >
              <Trash2 size={14} />
              {confirmDelete ? "Confirmar eliminación" : "Eliminar"}
            </Button>
          </div>
        }
        backTo="/consents"
        description={consent.consentType}
        title={`Consentimiento ${isRevoked ? "(revocado)" : ""}`}
      />

      <Card className="mx-6" size="sm">
        <CardHeader>
          <CardTitle>Detalle del consentimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Tipo
              </p>
              <p className="mt-0.5 font-medium text-xs">
                {consent.consentType}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Decisión
              </p>
              <p className="mt-0.5 font-medium text-xs">
                <span
                  className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
                    consent.decision === "accepted"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : consent.decision === "rejected"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {decisionLabel}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Firmado por
              </p>
              <p className="mt-0.5 font-medium text-xs">
                {consent.grantedByPersonName}
              </p>
            </div>
            {consent.representativeRelationship && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Relación representante
                </p>
                <p className="mt-0.5 font-medium text-xs">
                  {consent.representativeRelationship}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Fecha de firma
              </p>
              <p className="mt-0.5 font-medium text-xs">
                {new Date(consent.signedAt).toLocaleString("es-CO")}
              </p>
            </div>
            {consent.expiresAt && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Vencimiento
                </p>
                <p className="mt-0.5 font-medium text-xs">
                  {new Date(consent.expiresAt).toLocaleDateString("es-CO")}
                </p>
              </div>
            )}
            {consent.revokedAt && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Revocado el
                </p>
                <p className="mt-0.5 font-medium text-destructive text-xs">
                  {new Date(consent.revokedAt).toLocaleString("es-CO")}
                </p>
              </div>
            )}
            {consent.encounterId && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Atención
                </p>
                <p className="mt-0.5 text-xs">
                  <Link
                    className="text-primary hover:underline"
                    params={{ encounterId: consent.encounterId }}
                    search={{ tab: undefined }}
                    to="/encounters/$encounterId"
                  >
                    {consent.encounterId.slice(0, 8)}…
                  </Link>
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Paciente
              </p>
              <p className="mt-0.5 text-xs">
                <Link
                  className="text-primary hover:underline"
                  params={{ patientId: consent.patientId }}
                  to="/patients/$patientId"
                >
                  {patientData
                    ? `${patientData.firstName} ${patientData.lastName1}`
                    : `${consent.patientId.slice(0, 8)}…`}
                </Link>
              </p>
            </div>
            {consent.procedureCode && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Procedimiento (CUPS)
                </p>
                <p className="mt-0.5 font-medium text-xs">
                  {consent.procedureCode}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
