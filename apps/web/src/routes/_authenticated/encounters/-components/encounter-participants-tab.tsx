import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@wellfit-emr/ui/components/button";
import { Label } from "@wellfit-emr/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { orpc, queryClient } from "@/utils/orpc";

export function EncounterParticipantsTab({
  encounterId,
}: {
  encounterId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [practitionerId, setPractitionerId] = useState("");
  const [role, setRole] = useState("");
  const [startedAt, setStartedAt] = useState("");

  const { data, isLoading } = useQuery(
    orpc.encounterParticipants.list.queryOptions({
      input: {
        encounterId,
        limit: 25,
        offset: 0,
        sortDirection: "asc",
      },
    })
  );

  const { data: practitionersData } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 100,
        offset: 0,
        sortDirection: "asc",
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.encounterParticipants.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Participante agregado");
      queryClient.invalidateQueries({
        queryKey: orpc.encounterParticipants.list.key({ type: "query" }),
      });
      setShowForm(false);
      setEditingId(null);
      setPractitionerId("");
      setRole("");
      setStartedAt("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar participante");
    },
  });

  const updateMutation = useMutation({
    ...orpc.encounterParticipants.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Participante actualizado");
      queryClient.invalidateQueries({
        queryKey: orpc.encounterParticipants.list.key({ type: "query" }),
      });
      setShowForm(false);
      setEditingId(null);
      setPractitionerId("");
      setRole("");
      setStartedAt("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar participante");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.encounterParticipants.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Participante eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.encounterParticipants.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar participante");
    },
  });

  function resetForm() {
    setPractitionerId("");
    setRole("");
    setStartedAt("");
  }

  function startEdit(row: NonNullable<typeof data>["items"][0]) {
    setEditingId(row.id);
    setPractitionerId(row.practitionerId);
    setRole(row.participantRole);
    setStartedAt(new Date(row.startedAt).toISOString().slice(0, 16));
    setShowForm(true);
  }

  function handleAdd() {
    if (!(practitionerId && role)) {
      toast.error("Seleccione profesional y rol");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        encounterId,
        practitionerId,
        participantRole: role,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      });
    } else {
      createMutation.mutate({
        encounterId,
        practitionerId,
        participantRole: role,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      });
    }
  }

  const practitionerOptions = practitionersData?.practitioners ?? [];

  const columns = [
    {
      header: "Profesional",
      accessor: (row: NonNullable<typeof data>["items"][0]) => {
        const practitioner = practitionerOptions.find(
          (p) => p.id === row.practitionerId
        );
        return (
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} />
            <span className="font-medium">
              {practitioner?.fullName ?? `${row.practitionerId.slice(0, 8)}…`}
            </span>
          </span>
        );
      },
    },
    {
      header: "Rol",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.participantRole,
    },
    {
      header: "Inicio",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.startedAt).toLocaleString("es-CO"),
    },
    {
      header: "Fin",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.endedAt ? new Date(row.endedAt).toLocaleString("es-CO") : "—",
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Editar participante"
            onClick={() => startEdit(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar participante"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este participante?")) {
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
      className: "w-16",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)} size="sm">
          <UserPlus size={14} />
          {showForm ? "Cancelar" : "Agregar participante"}
        </Button>
      </div>

      {showForm && (
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label
              className="font-medium text-[10px] text-muted-foreground"
              htmlFor="encounter-participant-practitioner"
            >
              Profesional *
            </Label>
            <Select
              onValueChange={(v) => setPractitionerId(v as string)}
              value={practitionerId}
            >
              <SelectTrigger id="encounter-participant-practitioner">
                <SelectValue placeholder="Seleccionar profesional..." />
              </SelectTrigger>
              <SelectContent>
                {practitionerOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName} ({p.documentNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label
              className="font-medium text-[10px] text-muted-foreground"
              htmlFor="encounter-participant-role"
            >
              Rol *
            </Label>
            <Select onValueChange={(v) => setRole(v as string)} value={role}>
              <SelectTrigger id="encounter-participant-role">
                <SelectValue placeholder="Seleccionar rol..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Médico tratante</SelectItem>
                <SelectItem value="assistant">Asistente</SelectItem>
                <SelectItem value="consultant">Consultor</SelectItem>
                <SelectItem value="anesthesiologist">Anestesiólogo</SelectItem>
                <SelectItem value="nurse">Enfermería</SelectItem>
                <SelectItem value="resident">Residente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label
              className="font-medium text-[10px] text-muted-foreground"
              htmlFor="encounter-participant-start"
            >
              Inicio
            </Label>
            <input
              className="h-9 w-full border border-input bg-background px-3 py-1 text-sm"
              id="encounter-participant-start"
              onChange={(e) => setStartedAt(e.target.value)}
              type="datetime-local"
              value={startedAt}
            />
          </div>
          <Button
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={handleAdd}
            size="sm"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Guardando..."
              : editingId
                ? "Actualizar"
                : "Agregar"}
          </Button>
          {editingId && (
            <Button
              onClick={() => {
                setEditingId(null);
                resetForm();
                setShowForm(false);
              }}
              size="sm"
              variant="ghost"
            >
              Cancelar
            </Button>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay participantes registrados para esta atención."
        emptyTitle="Sin participantes"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
