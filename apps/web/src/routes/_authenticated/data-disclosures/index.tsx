import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import { SearchSelect } from "@wellfit-emr/ui/components/search-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { Ban, Eye, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/data-disclosures/")({
  component: DataDisclosuresPage,
});

/* ─── helpers ─── */

function formatEsCO(date: Date | string | null): string {
  if (!date) {
    return "—";
  }
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── schema ─── */

const createSchema = z.object({
  patientId: z.string().min(1, "El paciente es obligatorio"),
  thirdPartyName: z.string().min(1, "El tercero es obligatorio"),
  purposeCode: z.string().min(1, "La finalidad es obligatoria"),
  legalBasis: z.string().min(1, "La base legal es obligatoria"),
  grantedAt: z.string().min(1, "La fecha es obligatoria"),
  expiresAt: z.string(),
});

/* ─── page ─── */

function DataDisclosuresPage() {
  const navigate = useNavigate();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [queryPatientSearch, setQueryPatientSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryPatientSearch(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    document.title = "Autorizaciones de datos | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryPatientSearch || undefined,
      },
    })
  );

  const patientOptions =
    patientsData?.patients.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName1}`,
      description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
    })) ?? [];

  const disclosuresQuery = useQuery(
    orpc.consents.listDataDisclosures.queryOptions({
      input: {
        limit,
        offset,
        patientId: selectedPatientId || "__none__",
        sortDirection: "desc",
      },
      enabled: !!selectedPatientId,
    })
  );

  const createMutation = useMutation({
    ...orpc.consents.createDataDisclosure.mutationOptions(),
    onSuccess: () => {
      toast.success("Autorización registrada correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listDataDisclosures.key({ type: "query" }),
      });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar autorización");
    },
  });

  const revokeMutation = useMutation({
    ...orpc.consents.revokeDataDisclosure.mutationOptions(),
    onSuccess: () => {
      toast.success("Autorización revocada");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listDataDisclosures.key({ type: "query" }),
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
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar autorización");
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: "",
      thirdPartyName: "",
      purposeCode: "",
      legalBasis: "",
      grantedAt: new Date().toISOString().split("T")[0],
      expiresAt: "",
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({
        patientId: value.patientId,
        thirdPartyName: value.thirdPartyName,
        purposeCode: value.purposeCode,
        legalBasis: value.legalBasis,
        grantedAt: new Date(value.grantedAt),
        expiresAt: value.expiresAt ? new Date(value.expiresAt) : null,
        scopeJson: {},
      });
    },
    validators: {
      onSubmit: createSchema,
    },
  });

  const columns = [
    {
      header: "Tercero",
      accessor: (row: {
        thirdPartyName: string;
        purposeCode: string;
        legalBasis: string;
      }) => (
        <div className="space-y-0.5">
          <span className="font-medium">{row.thirdPartyName}</span>
          <p className="text-[10px] text-muted-foreground">
            {row.purposeCode} · {row.legalBasis}
          </p>
        </div>
      ),
    },
    {
      header: "Otorgada",
      accessor: (row: { grantedAt: Date }) => formatEsCO(row.grantedAt),
    },
    {
      header: "Vencimiento",
      accessor: (row: { expiresAt: Date | null; revokedAt: Date | null }) => {
        if (row.revokedAt) {
          return (
            <span className="inline-flex border border-red-200 bg-red-50 px-1.5 py-0.5 font-medium text-[10px] text-red-700">
              Revocada {formatEsCO(row.revokedAt)}
            </span>
          );
        }
        if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
          return (
            <span className="inline-flex border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-[10px] text-amber-700">
              Vencida {formatEsCO(row.expiresAt)}
            </span>
          );
        }
        return (
          <span className="text-muted-foreground text-xs">
            {row.expiresAt ? formatEsCO(row.expiresAt) : "Sin vencimiento"}
          </span>
        );
      },
    },
    {
      header: "Estado",
      accessor: (row: { revokedAt: Date | null; expiresAt: Date | null }) => {
        const isRevoked = !!row.revokedAt;
        const isExpired =
          !isRevoked && row.expiresAt && new Date(row.expiresAt) < new Date();
        const isActive = !(isRevoked || isExpired);
        return (
          <span
            className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isExpired
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {isActive ? "Vigente" : isExpired ? "Vencida" : "Revocada"}
          </span>
        );
      },
    },
    {
      header: "Acciones",
      accessor: (row: { id: string; revokedAt: Date | null }) => (
        <div className="flex items-center gap-1">
          <Link
            aria-label="Ver autorización"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ disclosureId: row.id }}
            to="/data-disclosures/$disclosureId"
          >
            <Eye size={14} />
          </Link>
          {!row.revokedAt && (
            <Button
              aria-label="Revocar autorización"
              onClick={() =>
                revokeMutation.mutate({
                  id: row.id,
                  revokedAt: new Date(),
                })
              }
              size="icon-xs"
              variant="ghost"
            >
              <Ban size={12} />
            </Button>
          )}
          <Button
            aria-label="Eliminar autorización"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta autorización permanentemente?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Nueva autorización"}
          </Button>
        }
        description="Autorizaciones de divulgación de datos personales a terceros"
        title="Autorizaciones de datos"
      />

      {/* Patient filter */}
      <div className="mx-6 flex items-end gap-3">
        <div className="w-full max-w-sm space-y-1">
          <Label>Paciente</Label>
          <SearchSelect
            emptyMessage="No se encontraron pacientes"
            loading={patientsLoading}
            onChange={(v) => {
              setSelectedPatientId(v ?? "");
              setOffset(0);
            }}
            onSearchChange={setPatientSearch}
            options={patientOptions}
            placeholder="Buscar paciente..."
            search={patientSearch}
            value={selectedPatientId}
          />
        </div>
      </div>

      {showForm && (
        <Card className="mx-6">
          <CardHeader>
            <CardTitle>Nueva autorización de divulgación</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <form.Field name="patientId">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Paciente *</Label>
                    <SearchSelect
                      emptyMessage="No se encontraron pacientes"
                      loading={patientsLoading}
                      onChange={(v) => field.handleChange(v ?? "")}
                      onSearchChange={setPatientSearch}
                      options={patientOptions}
                      placeholder="Buscar paciente..."
                      required
                      search={patientSearch}
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="thirdPartyName">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Tercero autorizado *</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Entidad o persona"
                      required
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="purposeCode">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Finalidad *</Label>
                    <Select
                      onValueChange={(v) => field.handleChange(v as string)}
                      value={field.state.value}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auditoria">Auditoría</SelectItem>
                        <SelectItem value="facturacion">Facturación</SelectItem>
                        <SelectItem value="interoperabilidad">
                          Interoperabilidad
                        </SelectItem>
                        <SelectItem value="investigacion">
                          Investigación
                        </SelectItem>
                        <SelectItem value="judicial">Judicial</SelectItem>
                        <SelectItem value="laboral">Laboral</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="legalBasis">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Base legal *</Label>
                    <Select
                      onValueChange={(v) => field.handleChange(v as string)}
                      value={field.state.value}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ley 1581 de 2012">
                          Ley 1581 de 2012
                        </SelectItem>
                        <SelectItem value="Ley 2015 de 2020">
                          Ley 2015 de 2020
                        </SelectItem>
                        <SelectItem value="Resolución 1888 de 2025">
                          Resolución 1888 de 2025
                        </SelectItem>
                        <SelectItem value="Decreto 780 de 2016">
                          Decreto 780 de 2016
                        </SelectItem>
                        <SelectItem value="Resolución 3100 de 2019">
                          Resolución 3100 de 2019
                        </SelectItem>
                        <SelectItem value="Consentimiento expreso">
                          Consentimiento expreso del titular
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="grantedAt">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Fecha de otorgamiento *</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      type="date"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="expiresAt">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Vencimiento (opcional)</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="date"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <div className="flex items-end gap-2 md:col-span-3">
                <Button
                  onClick={() => setShowForm(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <form.Subscribe
                  selector={(state) => ({
                    canSubmit: state.canSubmit,
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ canSubmit, isSubmitting }) => (
                    <Button
                      disabled={!canSubmit || isSubmitting}
                      size="sm"
                      type="submit"
                    >
                      {isSubmitting ? "Guardando..." : "Crear autorización"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="px-6">
        {selectedPatientId ? (
          disclosuresQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-10 w-full animate-pulse bg-muted" />
              <div className="h-10 w-full animate-pulse bg-muted" />
              <div className="h-10 w-full animate-pulse bg-muted" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={disclosuresQuery.data?.items ?? []}
              emptyDescription="No hay autorizaciones de divulgación registradas para este paciente."
              emptyTitle="Sin autorizaciones"
              isLoading={false}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => {
                navigate({
                  to: "/data-disclosures/$disclosureId",
                  params: { disclosureId: row.id },
                });
              }}
              pagination={
                disclosuresQuery.data
                  ? {
                      limit,
                      offset,
                      total: disclosuresQuery.data.total,
                      onPageChange: setOffset,
                    }
                  : undefined
              }
            />
          )
        ) : (
          <EmptyState
            description="Seleccione un paciente para ver sus autorizaciones de divulgación de datos."
            title="Seleccione un paciente"
          />
        )}
      </div>
    </div>
  );
}
