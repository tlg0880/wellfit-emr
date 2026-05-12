import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { Input } from "@wellfit-emr/ui/components/input";
import { SearchSelect } from "@wellfit-emr/ui/components/search-select";
import { Eye, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/audit-events/")({
  component: AuditEventsListPage,
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

function AuditEventsListPage() {
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [queryPatientSearch, setQueryPatientSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [queryUserSearch, setQueryUserSearch] = useState("");
  const [actionCode, setActionCode] = useState("");
  const [queryActionCode, setQueryActionCode] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [queryEncounterId, setQueryEncounterId] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);

  useEffect(() => {
    document.title = "Auditoría | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryActionCode(actionCode);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [actionCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryEncounterId(encounterId);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [encounterId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryPatientSearch(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryUserSearch(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryPatientSearch || undefined,
      },
    })
  );

  const { data: usersData, isLoading: usersLoading } = useQuery(
    orpc.admin.listUsers.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        searchValue: queryUserSearch || undefined,
      },
    })
  );

  const { data: allUsersData } = useQuery(
    orpc.admin.listUsers.queryOptions({
      input: {
        limit: 500,
        offset: 0,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.auditEvents.list.queryOptions({
      input: {
        limit,
        offset,
        patientId: patientId || undefined,
        userId: userId || undefined,
        actionCode: queryActionCode || undefined,
        encounterId: queryEncounterId || undefined,
        sortDirection: "desc",
      },
    })
  );

  const columns = [
    {
      header: "Acción",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Eye size={14} />
          {row.actionCode}
        </span>
      ),
    },
    {
      header: "Entidad",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        `${row.entityType}${row.entityId ? ` / ${row.entityId.slice(0, 8)}…` : ""}`,
    },
    {
      header: "Usuario",
      accessor: (row: NonNullable<typeof data>["items"][0]) => {
        const user = (
          allUsersData?.users as Array<{
            id: string;
            name: string | null;
            email: string;
          }>
        )?.find((u) => u.id === row.userId);
        return user ? user.name || user.email : `${row.userId.slice(0, 8)}…`;
      },
    },
    {
      header: "Resultado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.resultCode === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {row.resultCode}
        </span>
      ),
    },
    {
      header: "Canal",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.channel,
    },
    {
      header: "Fecha",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.occurredAt).toLocaleString("es-CO"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        description="Bitácora de auditoría de acceso y modificaciones"
        title="Auditoría"
      />

      <div className="px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Search className="text-muted-foreground" size={14} />
          <SearchSelect
            className="max-w-[180px]"
            clearable
            emptyMessage="Buscar paciente"
            loading={patientsLoading}
            onChange={(v) => {
              setPatientId(v);
              setOffset(0);
            }}
            onSearchChange={setPatientSearch}
            options={
              patientsData?.patients.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName1}`,
                description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
              })) ?? []
            }
            placeholder="Paciente..."
            search={patientSearch}
            value={patientId}
          />
          <SearchSelect
            className="max-w-[180px]"
            clearable
            emptyMessage="Buscar usuario"
            loading={usersLoading}
            onChange={(v) => {
              setUserId(v);
              setOffset(0);
            }}
            onSearchChange={setUserSearch}
            options={
              (
                usersData?.users as Array<{
                  id: string;
                  name: string | null;
                  email: string;
                }>
              ).map((u) => ({
                value: u.id,
                label: u.name || u.email,
                description: u.email,
              })) ?? []
            }
            placeholder="Usuario..."
            search={userSearch}
            value={userId}
          />
          <Input
            className="h-7 max-w-[140px] text-xs"
            onChange={(e) => {
              setActionCode(e.target.value);
              setOffset(0);
            }}
            placeholder="Acción..."
            value={actionCode}
          />
          <Input
            className="h-7 max-w-[160px] text-xs"
            onChange={(e) => {
              setEncounterId(e.target.value);
              setOffset(0);
            }}
            placeholder="ID atención..."
            value={encounterId}
          />
          {(patientId || userId || actionCode || encounterId) && (
            <Button
              onClick={() => {
                setPatientId("");
                setUserId("");
                setActionCode("");
                setEncounterId("");
                setOffset(0);
              }}
              size="xs"
              variant="ghost"
            >
              <X size={12} />
              Limpiar filtros
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription={
            patientId || userId || actionCode || encounterId
              ? "Ningún evento coincide con los filtros aplicados."
              : "No se encontraron eventos de auditoría."
          }
          emptyTitle={
            patientId || userId || actionCode || encounterId
              ? "Sin resultados"
              : "Sin eventos"
          }
          isLoading={isLoading}
          keyExtractor={(row) => String(row.id)}
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
    </div>
  );
}
