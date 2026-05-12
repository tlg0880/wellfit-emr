import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { FileCheck } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function ConsentsTab({
  patientId,
  encounterId,
}: {
  patientId: string;
  encounterId: string;
}) {
  const { data, isLoading } = useQuery(
    orpc.consents.listConsents.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        patientId,
        encounterId,
        sortDirection: "desc",
      },
      enabled: !!patientId,
    })
  );

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FileCheck size={14} />
          <span className="font-medium">{row.consentType}</span>
        </span>
      ),
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
      header: "Otorgado por",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.grantedByPersonName,
    },
    {
      header: "Fecha firma",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.signedAt).toLocaleString("es-CO"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link search={{ patientId, encounterId }} to="/consents">
          <Button size="sm">
            <FileCheck size={14} />
            Nuevo consentimiento
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay consentimientos registrados para esta atención."
        emptyTitle="Sin consentimientos"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
