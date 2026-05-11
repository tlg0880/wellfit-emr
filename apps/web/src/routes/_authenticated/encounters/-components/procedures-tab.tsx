import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@wellfit-emr/ui/components/button";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import { SearchSelect } from "@wellfit-emr/ui/components/search-select";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

const procedureSchema = z.object({
  cupsCode: z.string().min(1, "Requerido"),
  description: z.string().min(1, "Requerido"),
  performedAt: z.string(),
  performerId: z.string(),
  status: z.string().min(1, "Requerido"),
});

export function ProceduresTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [cupsSearch, setCupsSearch] = useState("");
  const [performerSearch, setPerformerSearch] = useState("");

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: performerSearch || undefined,
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

  const { data, isLoading } = useQuery({
    ...orpc.clinicalRecords.listProcedures.queryOptions({
      input: { encounterId },
    }),
    enabled: !!encounterId,
  });

  const create = useMutation({
    ...orpc.clinicalRecords.createProcedure.mutationOptions(),
    onSuccess: () => {
      toast.success("Procedimiento registrado");
      setShowForm(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalRecords.listProcedures.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const form = useForm({
    defaultValues: {
      cupsCode: "",
      description: "",
      performedAt: new Date().toISOString().slice(0, 16),
      performerId: "",
      status: "completed",
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({
        encounterId,
        patientId,
        cupsCode: value.cupsCode,
        description: value.description,
        performedAt: value.performedAt ? new Date(value.performedAt) : null,
        performerId: value.performerId || null,
        status: value.status,
      });
    },
    validators: {
      onSubmit: procedureSchema,
    },
  });

  const columns = [
    {
      header: "Código CUPS",
      accessor: (row: NonNullable<typeof data>[0]) => (
        <span className="font-medium">{row.cupsCode}</span>
      ),
    },
    {
      header: "Descripción",
      accessor: (row: NonNullable<typeof data>[0]) =>
        row.ripsReferenceName ?? row.description,
    },
    {
      header: "Fecha realización",
      accessor: (row: NonNullable<typeof data>[0]) =>
        row.performedAt
          ? new Date(row.performedAt).toLocaleString("es-CO")
          : "—",
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>[0]) => row.status,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar procedimiento"}
        </Button>
      </div>

      {showForm && (
        <form
          className="grid grid-cols-1 gap-3 border p-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="cupsCode">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Código CUPS</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar en CUPS"
                  id={field.name}
                  loading={cupsLoading}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(v) => {
                    const selected = cupsData?.entries.find(
                      (entry) => entry.code === v
                    );
                    field.handleChange(v);
                    if (selected) {
                      form.setFieldValue("description", selected.name);
                    }
                  }}
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
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Descripción</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="performedAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha de realización</Label>
                <Input
                  className="text-xs"
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

          <form.Field name="performerId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Profesional</Label>
                <SearchSelect
                  clearable
                  emptyMessage="Escribe para buscar profesionales"
                  id={field.name}
                  loading={practitionersLoading}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPerformerSearch}
                  options={
                    practitionersData?.practitioners.map((p) => ({
                      value: p.id,
                      label: p.fullName,
                      description: p.documentNumber,
                    })) ?? []
                  }
                  placeholder="Buscar profesional..."
                  search={performerSearch}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="status">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Estado</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                >
                  <option value="completed">Completado</option>
                  <option value="in-progress">En progreso</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            )}
          </form.Field>

          <div className="flex items-end">
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
                  {isSubmitting ? "Guardando..." : "Guardar procedimiento"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={data ?? []}
        emptyDescription="No hay procedimientos registrados para esta atención."
        emptyTitle="Sin procedimientos"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
