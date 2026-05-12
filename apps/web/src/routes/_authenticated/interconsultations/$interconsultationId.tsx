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
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/interconsultations/$interconsultationId"
)({
  component: InterconsultationDetailPage,
});

function InterconsultationDetailPage() {
  const { interconsultationId } = Route.useParams();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    ...orpc.interconsultations.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Interconsulta eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.interconsultations.list.key({ type: "query" }),
      });
      navigate({ to: "/interconsultations" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar interconsulta");
    },
  });

  const {
    data: interconsultation,
    isLoading,
    isError,
    error,
  } = useQuery(
    orpc.interconsultations.get.queryOptions({
      input: { id: interconsultationId },
    })
  );

  const { data: requesterData } = useQuery({
    ...orpc.facilities.getPractitioner.queryOptions({
      input: { id: interconsultation?.requestedBy ?? "" },
    }),
    enabled: !!interconsultation?.requestedBy,
  });

  const { data: encounterData } = useQuery({
    ...orpc.encounters.get.queryOptions({
      input: { id: interconsultation?.encounterId ?? "" },
    }),
    enabled: !!interconsultation?.encounterId,
  });

  const title = isLoading
    ? "Cargando..."
    : (interconsultation?.requestedSpecialty ?? "Detalle de interconsulta");

  useEffect(() => {
    if (interconsultation) {
      document.title = `${interconsultation.requestedSpecialty} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [interconsultation]);

  if (isError) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader backTo="/interconsultations" title="Error al cargar" />
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <AlertTriangle className="text-destructive" size={20} />
          <p className="text-muted-foreground text-sm">
            {error?.message || "Ocurrió un error inesperado."}
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: orpc.interconsultations.get.key({ type: "query" }),
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
          interconsultation ? (
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm("¿Eliminar esta interconsulta permanentemente?")) {
                  deleteMutation.mutate({ id: interconsultationId });
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
                  label: "Atención",
                  value: (
                    <Link
                      className="text-primary hover:underline"
                      params={{ encounterId: interconsultation.encounterId }}
                      search={{ tab: undefined }}
                      to="/encounters/$encounterId"
                    >
                      {encounterData
                        ? encounterData.reasonForVisit || "Sin motivo"
                        : `${interconsultation.encounterId.slice(0, 8)}…`}
                    </Link>
                  ),
                },
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
                  value:
                    requesterData?.fullName ??
                    `${interconsultation.requestedBy.slice(0, 8)}…`,
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
