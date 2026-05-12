import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@wellfit-emr/ui/components/button";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

const observationSchema = z.object({
  observationType: z.string().min(1, "Requerido"),
  code: z.string(),
  codeSystem: z.string(),
  valueText: z.string(),
  valueNum: z.string(),
  valueUnit: z.string(),
  observedAt: z.string().min(1, "Requerido"),
  status: z.string().min(1, "Requerido"),
});

export function ObservationsTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    ...orpc.clinicalRecords.listObservations.queryOptions({
      input: { encounterId },
    }),
    enabled: !!encounterId,
  });

  const create = useMutation({
    ...orpc.clinicalRecords.createObservation.mutationOptions(),
    onSuccess: () => {
      toast.success("Observación registrada");
      setShowForm(false);
      setEditingId(null);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalRecords.listObservations.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const update = useMutation({
    ...orpc.clinicalRecords.updateObservation.mutationOptions(),
    onSuccess: () => {
      toast.success("Observación actualizada");
      setShowForm(false);
      setEditingId(null);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalRecords.listObservations.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const form = useForm({
    defaultValues: {
      observationType: "",
      code: "",
      codeSystem: "",
      valueText: "",
      valueNum: "",
      valueUnit: "",
      observedAt: new Date().toISOString().slice(0, 16),
      status: "preliminary",
    },
    onSubmit: async ({ value }) => {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          observationType: value.observationType,
          code: value.code || null,
          codeSystem: value.codeSystem || null,
          valueText: value.valueText || null,
          valueNum: value.valueNum ? Number(value.valueNum) : null,
          valueUnit: value.valueUnit || null,
          status: value.status,
        });
      } else {
        await create.mutateAsync({
          encounterId,
          patientId,
          observationType: value.observationType,
          code: value.code || null,
          codeSystem: value.codeSystem || null,
          valueText: value.valueText || null,
          valueNum: value.valueNum ? Number(value.valueNum) : null,
          valueUnit: value.valueUnit || null,
          observedAt: new Date(value.observedAt),
          status: value.status,
          documentVersionId: null,
        });
      }
    },
    validators: {
      onSubmit: observationSchema,
    },
  });

  function startEdit(row: NonNullable<typeof data>[0]) {
    setEditingId(row.id);
    form.setFieldValue("observationType", row.observationType);
    form.setFieldValue("code", row.code ?? "");
    form.setFieldValue("codeSystem", row.codeSystem ?? "");
    form.setFieldValue("valueText", row.valueText ?? "");
    form.setFieldValue("valueNum", row.valueNum?.toString() ?? "");
    form.setFieldValue("valueUnit", row.valueUnit ?? "");
    form.setFieldValue(
      "observedAt",
      new Date(row.observedAt).toISOString().slice(0, 16)
    );
    form.setFieldValue("status", row.status);
    setShowForm(true);
  }

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>[0]) => row.observationType,
    },
    {
      header: "Código",
      accessor: (row: NonNullable<typeof data>[0]) =>
        row.code ? `${row.codeSystem} ${row.code}` : "—",
    },
    {
      header: "Valor",
      accessor: (row: NonNullable<typeof data>[0]) => {
        if (row.valueNum != null) {
          return `${row.valueNum} ${row.valueUnit ?? ""}`;
        }
        return row.valueText ?? "—";
      },
    },
    {
      header: "Fecha observación",
      accessor: (row: NonNullable<typeof data>[0]) =>
        new Date(row.observedAt).toLocaleString("es-CO"),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>[0]) => row.status,
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>[0]) => (
        <Button
          aria-label="Editar observación"
          onClick={() => startEdit(row)}
          size="icon-xs"
          variant="ghost"
        >
          <Pencil size={12} />
        </Button>
      ),
      className: "w-16",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (showForm) {
              setEditingId(null);
              form.reset();
            }
            setShowForm(!showForm);
          }}
          size="sm"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar observación"}
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
          <form.Field name="observationType">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Tipo de observación *</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: vital-signs"
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

          <form.Field name="code">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Código</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: 8867-4"
                  value={field.state.value}
                />
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
                  placeholder="Ej: LOINC"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="valueText">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Valor textual</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Descripción"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="valueNum">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Valor numérico</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="number"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="valueUnit">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Unidad</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: mmHg"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="observedAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha de observación *</Label>
                <Input
                  className="text-xs"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="datetime-local"
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

          <form.Field name="status">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Estado *</Label>
                <Select
                  onValueChange={(v) => field.handleChange(v as string)}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preliminary">Preliminar</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="amended">Modificado</SelectItem>
                    <SelectItem value="registered">Registrado</SelectItem>
                  </SelectContent>
                </Select>
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <div className="flex items-end gap-2">
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={!canSubmit || isSubmitting || update.isPending}
                  size="sm"
                  type="submit"
                >
                  {isSubmitting || update.isPending
                    ? "Guardando..."
                    : editingId
                      ? "Actualizar observación"
                      : "Guardar observación"}
                </Button>
              )}
            </form.Subscribe>
            {editingId && (
              <Button
                onClick={() => {
                  setEditingId(null);
                  form.reset();
                  setShowForm(false);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={data ?? []}
        emptyDescription="No hay observaciones registradas para esta atención."
        emptyTitle="Sin observaciones"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
