import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Label } from "@wellfit-emr/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { Pencil, Shield, Trash2, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute(
  "/_authenticated/facilities/practitioners/$practitionerId"
)({
  component: PractitionerDetailPage,
});

function PractitionerDetailPage() {
  const navigate = useNavigate();
  const { practitionerId } = Route.useParams();
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleCode, setRoleCode] = useState("");
  const [orgId, setOrgId] = useState("");

  const { data: practitioner, isLoading } = useQuery(
    orpc.facilities.getPractitioner.queryOptions({
      input: { id: practitionerId },
    })
  );

  const { data: rolesData, isLoading: rolesLoading } = useQuery(
    orpc.practitionerRoles.list.queryOptions({
      input: { practitionerId, limit: 25, offset: 0, sortDirection: "asc" },
    })
  );

  const { data: orgsData } = useQuery(
    orpc.facilities.listOrganizations.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const createRoleMutation = useMutation({
    ...orpc.practitionerRoles.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Rol asignado");
      queryClient.invalidateQueries({
        queryKey: orpc.practitionerRoles.list.key({ type: "query" }),
      });
      setShowRoleForm(false);
      setRoleCode("");
      setOrgId("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al asignar rol");
    },
  });

  const deleteRoleMutation = useMutation({
    ...orpc.practitionerRoles.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Rol eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.practitionerRoles.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar rol");
    },
  });

  const updateRoleMutation = useMutation({
    ...orpc.practitionerRoles.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Rol actualizado");
      setEditingRoleId(null);
      setRoleCode("");
      setOrgId("");
      setShowRoleForm(false);
      queryClient.invalidateQueries({
        queryKey: orpc.practitionerRoles.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar rol");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.facilities.deletePractitioner.mutationOptions(),
    onSuccess: () => {
      toast.success("Profesional eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.facilities.listPractitioners.key({ type: "query" }),
      });
      navigate({ to: "/facilities/practitioners" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar profesional");
    },
  });

  function resetRoleForm() {
    setEditingRoleId(null);
    setRoleCode("");
    setOrgId("");
  }

  function startEditRole(row: NonNullable<typeof rolesData>["items"][0]) {
    setEditingRoleId(row.id);
    setRoleCode(row.roleCode);
    setOrgId(row.organizationId);
    setShowRoleForm(true);
  }

  function handleAddRole() {
    if (!(roleCode && orgId)) {
      toast.error("Seleccione rol y organización");
      return;
    }
    if (editingRoleId) {
      updateRoleMutation.mutate({
        id: editingRoleId,
        practitionerId,
        organizationId: orgId,
        roleCode,
        startAt: new Date(),
      });
    } else {
      createRoleMutation.mutate({
        practitionerId,
        organizationId: orgId,
        roleCode,
        startAt: new Date(),
      });
    }
  }

  const orgOptions = orgsData?.organizations ?? [];

  const roleColumns = [
    {
      header: "Rol",
      accessor: (row: NonNullable<typeof rolesData>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Shield size={14} />
          <span className="font-medium">{row.roleCode}</span>
        </span>
      ),
    },
    {
      header: "Organización",
      accessor: (row: NonNullable<typeof rolesData>["items"][0]) => {
        const org = orgOptions.find((o) => o.id === row.organizationId);
        return org?.name ?? `${row.organizationId.slice(0, 8)}…`;
      },
    },
    {
      header: "Inicio",
      accessor: (row: NonNullable<typeof rolesData>["items"][0]) =>
        new Date(row.startAt).toLocaleDateString("es-CO"),
    },
    {
      header: "Fin",
      accessor: (row: NonNullable<typeof rolesData>["items"][0]) =>
        row.endAt ? new Date(row.endAt).toLocaleDateString("es-CO") : "—",
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof rolesData>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Editar rol"
            onClick={() => startEditRole(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar rol"
            onClick={() => {
              if (confirm("¿Eliminar este rol permanentemente?")) {
                deleteRoleMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
      className: "w-16",
    },
  ];

  const title = isLoading
    ? "Cargando..."
    : (practitioner?.fullName ?? "Detalle de profesional");

  useEffect(() => {
    if (practitioner) {
      document.title = `${practitioner.fullName} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [practitioner]);

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

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar este profesional permanentemente?")) {
                    deleteMutation.mutate({ id: practitionerId });
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCheck size={16} />
                Roles asignados
              </CardTitle>
              <Button
                onClick={() => {
                  if (showRoleForm) {
                    resetRoleForm();
                    setShowRoleForm(false);
                  } else {
                    setShowRoleForm(true);
                  }
                }}
                size="sm"
                variant="outline"
              >
                {showRoleForm ? "Cancelar" : "Asignar rol"}
              </Button>
            </CardHeader>
            <CardContent>
              {showRoleForm && (
                <div className="mb-3 flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label
                      className="font-medium text-[10px] text-muted-foreground"
                      htmlFor="role-code-select"
                    >
                      Rol
                    </Label>
                    <Select
                      onValueChange={(v) => setRoleCode(v as string)}
                      value={roleCode}
                    >
                      <SelectTrigger id="role-code-select">
                        <SelectValue placeholder="Seleccionar rol..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physician">Médico</SelectItem>
                        <SelectItem value="nurse">Enfermería</SelectItem>
                        <SelectItem value="dentist">Odontólogo</SelectItem>
                        <SelectItem value="psychologist">Psicólogo</SelectItem>
                        <SelectItem value="pharmacist">Farmacéutico</SelectItem>
                        <SelectItem value="physiotherapist">
                          Fisioterapeuta
                        </SelectItem>
                        <SelectItem value="admin">Administrativo</SelectItem>
                        <SelectItem value="lab_tech">
                          Técnico de laboratorio
                        </SelectItem>
                        <SelectItem value="radiologist">Radiólogo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label
                      className="font-medium text-[10px] text-muted-foreground"
                      htmlFor="org-select"
                    >
                      Organización
                    </Label>
                    <Select
                      onValueChange={(v) => setOrgId(v as string)}
                      value={orgId}
                    >
                      <SelectTrigger id="org-select">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {orgOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    disabled={
                      createRoleMutation.isPending ||
                      updateRoleMutation.isPending
                    }
                    onClick={handleAddRole}
                    size="sm"
                  >
                    {createRoleMutation.isPending ||
                    updateRoleMutation.isPending
                      ? "Guardando..."
                      : editingRoleId
                        ? "Actualizar"
                        : "Agregar"}
                  </Button>
                </div>
              )}
              <DataTable
                columns={roleColumns}
                data={rolesData?.items ?? []}
                emptyDescription="No hay roles asignados a este profesional."
                emptyTitle="Sin roles"
                isLoading={rolesLoading}
                keyExtractor={(row) => row.id}
              />
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
