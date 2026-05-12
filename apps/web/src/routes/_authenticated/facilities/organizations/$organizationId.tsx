import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/facilities/organizations/$organizationId"
)({
  component: OrganizationDetailPage,
});

function OrganizationDetailPage() {
  const navigate = useNavigate();
  const { organizationId } = Route.useParams();

  const { data: organization, isLoading } = useQuery(
    orpc.facilities.getOrganization.queryOptions({
      input: { id: organizationId },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.facilities.deleteOrganization.mutationOptions(),
    onSuccess: () => {
      toast.success("Organización eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listOrganizations.key({ type: "query" }),
      });
      navigate({ to: "/facilities/organizations" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar organización");
    },
  });

  const title = isLoading
    ? "Cargando..."
    : (organization?.name ?? "Detalle de organización");

  useEffect(() => {
    if (organization) {
      document.title = `${organization.name} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [organization]);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/facilities/organizations"
        description="Información de la organización"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : organization ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Nombre", value: organization.name },
                {
                  label: "Código REPS",
                  value: organization.repsCode ?? "—",
                },
                {
                  label: "NIT",
                  value: organization.taxId ?? "—",
                },
                {
                  label: "Estado",
                  value:
                    organization.status === "active" ? "Activo" : "Inactivo",
                },
                {
                  label: "Creada",
                  value: new Date(organization.createdAt).toLocaleString(
                    "es-CO"
                  ),
                },
                {
                  label: "Actualizada",
                  value: new Date(organization.updatedAt).toLocaleString(
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

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar esta organización?")) {
                    deleteMutation.mutate({ id: organizationId });
                  }
                }}
                size="sm"
                variant="destructive"
              >
                <Trash2 size={14} />
                <span className="ml-1.5">Eliminar</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          description="No se encontró la organización solicitada."
          title="Organización no encontrada"
        />
      )}
    </div>
  );
}
