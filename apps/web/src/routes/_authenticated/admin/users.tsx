import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@wellfit-emr/ui/components/dropdown-menu";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import {
  AlertTriangle,
  Ban,
  Lock,
  MoreHorizontal,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

const LIMIT = 50;

interface UserItem {
  banned: boolean | null;
  createdAt: Date | string;
  email: string;
  id: string;
  name: string;
  role: string;
}

function UsersPage() {
  const [offset, setOffset] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  useEffect(() => {
    document.title = "Usuarios | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuerySearch(searchValue);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const { data, isLoading, error, refetch } = useQuery(
    orpc.admin.listUsers.queryOptions({
      input: {
        limit: LIMIT,
        offset,
        searchValue: querySearch || undefined,
      },
    })
  );

  const isForbidden =
    error != null &&
    (error.message?.toLowerCase().includes("not allowed") ||
      error.message?.toLowerCase().includes("permission") ||
      ("status" in error &&
        ((error as { status: number }).status === 403 ||
          (error as { status: number }).status === 500)));

  const hasError = error != null;

  const createMutation = useMutation({
    ...orpc.admin.createUser.mutationOptions(),
    onSuccess: () => {
      toast.success("Usuario creado correctamente");
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setShowForm(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al crear usuario: ${error.message}`);
    },
  });

  const banMutation = useMutation({
    ...orpc.admin.banUser.mutationOptions(),
    onSuccess: () => {
      toast.success("Usuario baneado");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const unbanMutation = useMutation({
    ...orpc.admin.unbanUser.mutationOptions(),
    onSuccess: () => {
      toast.success("Usuario desbaneado");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const setRoleMutation = useMutation({
    ...orpc.admin.setRole.mutationOptions(),
    onSuccess: () => {
      toast.success("Rol actualizado");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const removeMutation = useMutation({
    ...orpc.admin.removeUser.mutationOptions(),
    onSuccess: () => {
      toast.success("Usuario eliminado");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const setPasswordMutation = useMutation({
    ...orpc.admin.setUserPassword.mutationOptions(),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    ...orpc.admin.updateUser.mutationOptions(),
    onSuccess: () => {
      toast.success("Usuario actualizado");
      setEditingId(null);
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setShowForm(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("user");
  }

  function startEdit(row: UserItem) {
    setEditingId(row.id);
    setName(row.name);
    setEmail(row.email);
    setPassword("");
    setRole(row.role as "user" | "admin");
    setShowForm(true);
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      if (!(name.trim() && email.trim())) {
        return;
      }
      updateMutation.mutate({
        userId: editingId,
        data: {
          name: name.trim(),
          email: email.trim(),
        },
      });
    } else {
      if (!(name.trim() && email.trim() && password.trim())) {
        return;
      }
      createMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
      });
    }
  };

  const users = (data?.users as UserItem[]) ?? [];

  return (
    <div className="flex flex-col">
      <PageHeader
        actions={
          !hasError && (
            <Button
              onClick={() => {
                if (showForm) {
                  resetForm();
                  setShowForm(false);
                } else {
                  setShowForm(true);
                }
              }}
              size="sm"
            >
              <Plus size={14} />
              <span className="ml-1.5">
                {showForm ? "Cancelar" : "Nuevo usuario"}
              </span>
            </Button>
          )
        }
        description="Gestionar usuarios y permisos del sistema"
        icon={UserCheck}
        iconBgClass="bg-slate-100 text-slate-600"
        title="Administracion de usuarios"
      />

      <div className="p-6">
        {hasError && (
          <div className="flex flex-col items-center justify-center border py-12 text-center">
            <div className="mb-3 inline-flex size-10 items-center justify-center bg-muted">
              {isForbidden ? (
                <Lock className="text-muted-foreground" size={20} />
              ) : (
                <AlertTriangle className="text-muted-foreground" size={20} />
              )}
            </div>
            <p className="font-medium text-sm">
              {isForbidden ? "Acceso denegado" : "Error al cargar usuarios"}
            </p>
            <p className="mt-1 max-w-xs text-muted-foreground text-xs">
              {isForbidden
                ? "No tienes permisos para administrar usuarios. Contacta a un administrador si crees que esto es un error."
                : error?.message ||
                  "Ocurrio un error inesperado. Intenta de nuevo mas tarde."}
            </p>
          </div>
        )}

        {!hasError && showForm && (
          <Card className="mb-6" key={editingId || "new"}>
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar usuario" : "Nuevo usuario"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                onSubmit={handleCreate}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="user-name">Nombre *</Label>
                  <Input
                    autoFocus
                    id="user-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo"
                    required
                    value={name}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-email">Correo electronico *</Label>
                  <Input
                    id="user-email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>
                {!editingId && (
                  <div className="space-y-1.5">
                    <Label htmlFor="user-password">Contrasena *</Label>
                    <Input
                      id="user-password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contrasena"
                      required
                      type="password"
                      value={password}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="user-role">Rol</Label>
                  <Select
                    onValueChange={(v) => setRole(v as "user" | "admin")}
                    value={role}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 sm:col-span-3">
                  <Button
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    size="sm"
                    type="submit"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Guardando..."
                      : editingId
                        ? "Actualizar"
                        : "Guardar"}
                  </Button>
                  <Button
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {!hasError && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Input
                className="max-w-xs"
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                value={searchValue}
              />
            </div>

            <DataTable
              columns={[
                {
                  header: "Nombre",
                  accessor: (row: UserItem) => row.name,
                },
                {
                  header: "Correo",
                  accessor: (row: UserItem) => row.email,
                },
                {
                  header: "Rol",
                  accessor: (row: UserItem) => (
                    <span className="inline-flex items-center border border-border bg-muted px-1.5 py-0.5 font-medium text-[10px]">
                      {row.role}
                    </span>
                  ),
                },
                {
                  header: "Estado",
                  accessor: (row: UserItem) =>
                    row.banned ? (
                      <span className="inline-flex items-center border border-red-200 bg-red-50 px-1.5 py-0.5 font-medium text-[10px] text-red-700">
                        Baneado
                      </span>
                    ) : (
                      <span className="inline-flex items-center border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-medium text-[10px] text-emerald-700">
                        Activo
                      </span>
                    ),
                },
                {
                  header: "Creado",
                  accessor: (row: UserItem) =>
                    new Date(row.createdAt).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                },
                {
                  header: "Acciones",
                  accessor: (row: UserItem) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            aria-label="Acciones de usuario"
                            size="icon-xs"
                            variant="ghost"
                          >
                            <MoreHorizontal size={14} />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEdit(row)}>
                          Editar perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setRoleMutation.mutate({
                              userId: row.id,
                              role: row.role === "admin" ? "user" : "admin",
                            })
                          }
                        >
                          Cambiar rol a{" "}
                          {row.role === "admin" ? "usuario" : "admin"}
                        </DropdownMenuItem>
                        {row.banned ? (
                          <DropdownMenuItem
                            onClick={() =>
                              unbanMutation.mutate({ userId: row.id })
                            }
                          >
                            <UserCheck className="mr-2" size={14} />
                            Desbanear
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              banMutation.mutate({ userId: row.id })
                            }
                          >
                            <Ban className="mr-2" size={14} />
                            Banear
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            const newPassword = window.prompt(
                              "Ingrese la nueva contraseña para " +
                                row.name +
                                ":"
                            );
                            if (newPassword && newPassword.trim().length >= 6) {
                              setPasswordMutation.mutate({
                                userId: row.id,
                                newPassword: newPassword.trim(),
                              });
                            } else if (newPassword !== null) {
                              toast.error(
                                "La contraseña debe tener al menos 6 caracteres"
                              );
                            }
                          }}
                        >
                          <Lock className="mr-2" size={14} />
                          Restablecer contraseña
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={removeMutation.isPending}
                          onClick={() => {
                            if (
                              confirm("¿Eliminar este usuario permanentemente?")
                            ) {
                              removeMutation.mutate({ userId: row.id });
                            }
                          }}
                        >
                          <Trash2 className="mr-2" size={14} />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                  className: "w-16",
                },
              ]}
              data={users}
              emptyDescription="No se encontraron usuarios."
              emptyTitle="Sin usuarios"
              isLoading={isLoading}
              keyExtractor={(row: UserItem) => row.id}
              pagination={
                data
                  ? {
                      limit: LIMIT,
                      offset,
                      total: data.total,
                      onPageChange: setOffset,
                    }
                  : undefined
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
