import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { Eye, FileText, Plus, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/consents/")({
  component: ConsentsListPage,
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

const TABS = [
  { id: "consents", label: "Consentimientos", icon: ShieldCheck },
  { id: "disclosures", label: "Autorizaciones de divulgación", icon: FileText },
];

/* ─── Create Consent Form ─── */

function CreateConsentForm({ onCancel }: { onCancel: () => void }) {
  const [patientSearch, setPatientSearch] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [cupsSearch, setCupsSearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
      },
    })
  );

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: encounterSearch || undefined,
      },
    })
  );

  const { data: cupsData, isLoading: cupsLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "CUPSRips",
        limit: 20,
        search: cupsSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.consents.createConsent.mutationOptions(),
    onSuccess: () => {
      toast.success("Consentimiento registrado");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listConsents.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar consentimiento");
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: "",
      encounterId: "",
      consentType: "procedimiento",
      procedureCode: "",
      decision: "accepted",
      grantedByPersonName: "",
      representativeRelationship: "",
      signedAt: new Date().toISOString().slice(0, 16),
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({
        patientId: value.patientId,
        encounterId: value.encounterId || null,
        consentType: value.consentType,
        procedureCode: value.procedureCode || null,
        decision: value.decision,
        grantedByPersonName: value.grantedByPersonName,
        representativeRelationship: value.representativeRelationship || null,
        signedAt: new Date(value.signedAt),
      });
    },
    validators: {
      onSubmit: z.object({
        patientId: z.string().min(1, "Requerido"),
        encounterId: z.string(),
        consentType: z.string().min(1, "Requerido"),
        procedureCode: z.string(),
        decision: z.string().min(1, "Requerido"),
        grantedByPersonName: z.string().min(1, "Requerido"),
        representativeRelationship: z.string(),
        signedAt: z.string().min(1, "Requerido"),
      }),
    },
  });

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nuevo consentimiento informado</CardTitle>
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
                <Label htmlFor={field.name}>Paciente</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar pacientes"
                  loading={patientsLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPatientSearch}
                  options={
                    patientsData?.patients.map((p) => ({
                      value: p.id,
                      label: `${p.firstName} ${p.lastName1}`,
                      description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
                    })) ?? []
                  }
                  placeholder="Buscar paciente..."
                  required
                  search={patientSearch}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="encounterId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Atención (opcional)</Label>
                <SearchSelect
                  clearable
                  emptyMessage="Escribe para buscar atenciones"
                  loading={encountersLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setEncounterSearch}
                  options={
                    encountersData?.encounters.map((e) => ({
                      value: e.id,
                      label: e.reasonForVisit || "Sin motivo",
                      description: new Date(e.startedAt).toLocaleDateString(
                        "es-CO"
                      ),
                    })) ?? []
                  }
                  placeholder="Buscar atención..."
                  search={encounterSearch}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="consentType">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Tipo de consentimiento</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="procedureCode">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Código CUPS (opcional)</Label>
                <SearchSelect
                  clearable
                  emptyMessage="Escribe para buscar en CUPS"
                  loading={cupsLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setCupsSearch}
                  options={
                    cupsData?.entries.map((e) => ({
                      value: e.code,
                      label: e.name,
                      description: e.code,
                    })) ?? []
                  }
                  placeholder="Buscar CUPS..."
                  search={cupsSearch}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="decision">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Decisión</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                >
                  <option value="accepted">Aceptado</option>
                  <option value="rejected">Rechazado</option>
                  <option value="withdrawn">Retirado</option>
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="grantedByPersonName">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Firmado por</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="representativeRelationship">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>
                  Relación representante (opcional)
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="signedAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha de firma</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="datetime-local"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <div className="flex items-end gap-2 md:col-span-3">
            <Button
              onClick={onCancel}
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
                  {isSubmitting ? "Guardando..." : "Guardar consentimiento"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Create Data Disclosure Form ─── */

function CreateDataDisclosureForm({ onCancel }: { onCancel: () => void }) {
  const [patientSearch, setPatientSearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.consents.createDataDisclosure.mutationOptions(),
    onSuccess: () => {
      toast.success("Autorización de divulgación registrada");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listDataDisclosures.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al registrar autorización de divulgación"
      );
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: "",
      thirdPartyName: "",
      purposeCode: "",
      scopeJson: "",
      legalBasis: "",
      grantedAt: new Date().toISOString().slice(0, 16),
      expiresAt: "",
    },
    onSubmit: async ({ value }) => {
      let parsedScope: Record<string, unknown> = {};
      try {
        parsedScope = JSON.parse(value.scopeJson || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        toast.error("El campo Ámbito (JSON) no es un objeto válido");
        return;
      }

      await create.mutateAsync({
        patientId: value.patientId,
        thirdPartyName: value.thirdPartyName,
        purposeCode: value.purposeCode,
        scopeJson: parsedScope,
        legalBasis: value.legalBasis,
        grantedAt: new Date(value.grantedAt),
        expiresAt: value.expiresAt ? new Date(value.expiresAt) : null,
      });
    },
    validators: {
      onSubmit: z.object({
        patientId: z.string().min(1, "Requerido"),
        thirdPartyName: z.string().min(1, "Requerido"),
        purposeCode: z.string().min(1, "Requerido"),
        scopeJson: z.string().refine((v) => {
          try {
            const parsed = JSON.parse(v || "{}") as unknown;
            return (
              typeof parsed === "object" &&
              parsed !== null &&
              !Array.isArray(parsed)
            );
          } catch {
            return false;
          }
        }, "Debe ser un objeto JSON válido"),
        legalBasis: z.string().min(1, "Requerido"),
        grantedAt: z.string().min(1, "Requerido"),
        expiresAt: z.string(),
      }),
    },
  });

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nueva autorización de divulgación de datos</CardTitle>
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
                <Label htmlFor={field.name}>Paciente</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar pacientes"
                  loading={patientsLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPatientSearch}
                  options={
                    patientsData?.patients.map((p) => ({
                      value: p.id,
                      label: `${p.firstName} ${p.lastName1}`,
                      description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
                    })) ?? []
                  }
                  placeholder="Buscar paciente..."
                  required
                  search={patientSearch}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="thirdPartyName">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Tercero autorizado</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="purposeCode">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Propósito</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="scopeJson">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Ámbito (JSON)</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder='{"sections": ["demographics", "diagnoses"]}'
                  required
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="legalBasis">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Base legal</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="grantedAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha de autorización</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="datetime-local"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="expiresAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>
                  Fecha de expiración (opcional)
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="datetime-local"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <div className="flex items-end gap-2 md:col-span-3">
            <Button
              onClick={onCancel}
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
                  {isSubmitting ? "Guardando..." : "Guardar autorización"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Consents Tab ─── */

function ConsentsTab({ patientId }: { patientId: string }) {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery(
    orpc.consents.listConsents.queryOptions({
      input: {
        limit,
        offset,
        patientId: patientId || "patient-id",
        sortDirection: "desc",
      },
      enabled: !!patientId,
    })
  );

  const revokeMutation = useMutation({
    ...orpc.consents.revokeConsent.mutationOptions(),
    onSuccess: () => {
      toast.success("Consentimiento revocado");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listConsents.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al revocar");
    },
  });

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.consentType,
    },
    {
      header: "Decisión",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.decision === "accepted"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : row.decision === "rejected"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {row.decision}
        </span>
      ),
    },
    {
      header: "Firmado por",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.grantedByPersonName,
    },
    {
      header: "Fecha firma",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.signedAt).toLocaleString("es-CO"),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.revokedAt ? (
          <span className="text-[10px] text-destructive">Revocado</span>
        ) : (
          <span className="text-[10px] text-emerald-600">Vigente</span>
        ),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.revokedAt ? null : (
          <Button
            onClick={() =>
              revokeMutation.mutate({
                id: row.id,
                revokedAt: new Date(),
              })
            }
            size="icon-xs"
            variant="ghost"
          >
            <X size={14} />
          </Button>
        ),
      className: "w-16",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)} size="sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Nuevo consentimiento"}
        </Button>
      </div>

      {showForm && <CreateConsentForm onCancel={() => setShowForm(false)} />}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No se encontraron consentimientos para este paciente."
        emptyTitle="Sin consentimientos"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        pagination={
          data
            ? {
                limit,
                offset,
                total: data.total,
                onPageChange: setOffset,
              }
            : undefined
        }
      />
    </div>
  );
}

/* ─── Data Disclosures Tab ─── */

function DataDisclosuresTab({ patientId }: { patientId: string }) {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery(
    orpc.consents.listDataDisclosures.queryOptions({
      input: {
        limit,
        offset,
        patientId: patientId || "patient-id",
        sortDirection: "desc",
      },
      enabled: !!patientId,
    })
  );

  const revokeMutation = useMutation({
    ...orpc.consents.revokeDataDisclosure.mutationOptions(),
    onSuccess: () => {
      toast.success("Autorización revocada");
      queryClient.invalidateQueries({
        queryKey: orpc.consents.listDataDisclosures.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al revocar");
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
      toast.error(error.message || "Error al eliminar");
    },
  });

  const columns = [
    {
      header: "Tercero",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.thirdPartyName,
    },
    {
      header: "Propósito",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.purposeCode,
    },
    {
      header: "Base legal",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.legalBasis,
    },
    {
      header: "Fecha autorización",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.grantedAt).toLocaleString("es-CO"),
    },
    {
      header: "Expira",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.expiresAt ? new Date(row.expiresAt).toLocaleString("es-CO") : "—",
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.revokedAt ? (
          <span className="text-[10px] text-destructive">Revocada</span>
        ) : (
          <span className="text-[10px] text-emerald-600">Vigente</span>
        ),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          {!row.revokedAt && (
            <Button
              onClick={() =>
                revokeMutation.mutate({
                  id: row.id,
                  revokedAt: new Date(),
                })
              }
              size="icon-xs"
              variant="ghost"
            >
              <X size={14} />
            </Button>
          )}
          <Button
            onClick={() => deleteMutation.mutate({ id: row.id })}
            size="icon-xs"
            variant="ghost"
          >
            <Eye size={14} />
          </Button>
        </div>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)} size="sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Nueva autorización"}
        </Button>
      </div>

      {showForm && (
        <CreateDataDisclosureForm onCancel={() => setShowForm(false)} />
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No se encontraron autorizaciones de divulgación para este paciente."
        emptyTitle="Sin autorizaciones"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        pagination={
          data
            ? {
                limit,
                offset,
                total: data.total,
                onPageChange: setOffset,
              }
            : undefined
        }
      />
    </div>
  );
}

/* ─── Main Page ─── */

function ConsentsListPage() {
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [activeTab, setActiveTab] = useState("consents");

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
      },
    })
  );

  return (
    <div className="space-y-4">
      <PageHeader
        description="Consentimientos informados y autorizaciones"
        title="Consentimientos"
      />

      <div className="px-6">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="text-muted-foreground" size={14} />
          <SearchSelect
            className="max-w-xs"
            clearable
            emptyMessage="Escribe para buscar pacientes"
            loading={patientsLoading}
            onChange={(v) => {
              setPatientId(v);
            }}
            onSearchChange={setPatientSearch}
            options={
              patientsData?.patients.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName1}`,
                description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
              })) ?? []
            }
            placeholder="Filtrar por paciente..."
            search={patientSearch}
            value={patientId}
          />
        </div>

        <div className="mb-3 flex items-center gap-1 border-b">
          {TABS.map((tab) => (
            <button
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-medium text-xs transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "consents" && <ConsentsTab patientId={patientId} />}
        {activeTab === "disclosures" && (
          <DataDisclosuresTab patientId={patientId} />
        )}
      </div>
    </div>
  );
}
