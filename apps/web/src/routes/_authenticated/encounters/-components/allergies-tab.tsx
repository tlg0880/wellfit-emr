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

const allergySchema = z.object({
  substanceCode: z.string().min(1, "Requerido"),
  codeSystem: z.string().min(1, "Requerido"),
  criticality: z.string(),
  reactionText: z.string(),
  status: z.string().min(1, "Requerido"),
  recordedBy: z.string().min(1, "Requerido"),
});

export function AllergiesTab({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [practitionerSearch, setPractitionerSearch] = useState("");

  const { data, isLoading } = useQuery({
    ...orpc.clinicalRecords.listAllergies.queryOptions({
      input: { patientId },
    }),
    enabled: !!patientId,
  });

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: practitionerSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.clinicalRecords.createAllergy.mutationOptions(),
    onSuccess: () => {
      toast.success("Alergia registrada");
      setShowForm(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalRecords.listAllergies.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const form = useForm({
    defaultValues: {
      substanceCode: "",
      codeSystem: "",
      criticality: "",
      reactionText: "",
      status: "active",
      recordedBy: "",
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({
        patientId,
        substanceCode: value.substanceCode,
        codeSystem: value.codeSystem,
        criticality: value.criticality || null,
        reactionText: value.reactionText || null,
        status: value.status,
        recordedBy: value.recordedBy,
        recordedAt: new Date(),
      });
    },
    validators: {
      onSubmit: allergySchema,
    },
  });

  const columns = [
    {
      header: "Sustancia",
      accessor: (row: NonNullable<typeof data>[0]) => row.substanceCode,
    },
    {
      header: "Sistema",
      accessor: (row: NonNullable<typeof data>[0]) => row.codeSystem,
    },
    {
      header: "Crítica",
      accessor: (row: NonNullable<typeof data>[0]) => row.criticality ?? "—",
    },
    {
      header: "Reacción",
      accessor: (row: NonNullable<typeof data>[0]) => row.reactionText ?? "—",
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>[0]) => row.status,
    },
    {
      header: "Registrado por",
      accessor: (row: NonNullable<typeof data>[0]) => row.recordedBy,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar alergia"}
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
          <form.Field name="substanceCode">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Código de sustancia</Label>
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

          <form.Field name="codeSystem">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Sistema de codificación</Label>
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

          <form.Field name="criticality">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Criticidad</Label>
                <select
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                >
                  <option value="">Seleccione...</option>
                  <option value="low">Baja</option>
                  <option value="high">Alta</option>
                  <option value="unable-to-assess">No evaluable</option>
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="reactionText">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Texto de reacción</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describa la reacción"
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
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                  <option value="resolved">Resuelta</option>
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="recordedBy">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Registrado por</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar profesionales"
                  id={field.name}
                  loading={practitionersLoading}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPractitionerSearch}
                  options={
                    practitionersData?.practitioners.map((p) => ({
                      value: p.id,
                      label: p.fullName,
                      description: p.documentNumber,
                    })) ?? []
                  }
                  placeholder="Buscar profesional..."
                  search={practitionerSearch}
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
                  {isSubmitting ? "Guardando..." : "Guardar alergia"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={data ?? []}
        emptyDescription="No hay alergias registradas para este paciente."
        emptyTitle="Sin alergias"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
