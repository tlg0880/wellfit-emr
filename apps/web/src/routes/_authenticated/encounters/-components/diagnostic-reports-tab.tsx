import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { ClipboardList } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { orpc } from "@/utils/orpc";

export function DiagnosticReportsTab({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId?: string;
}) {
  const { data, isLoading } = useQuery(
    orpc.serviceRequests.listReports.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        encounterId,
        sortDirection: "desc",
      },
    })
  );

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList size={14} />
          <span className="font-medium">{row.reportType}</span>
        </span>
      ),
    },
    {
      header: "Conclusión",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.conclusionText ?? "—",
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.status === "final"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : row.status === "preliminary"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {row.status === "final"
            ? "Final"
            : row.status === "preliminary"
              ? "Preliminar"
              : row.status}
        </span>
      ),
    },
    {
      header: "Fecha emisión",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.issuedAt).toLocaleString("es-CO"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link search={{ encounterId, patientId }} to="/service-requests">
          <Button size="sm">
            <ClipboardList size={14} />
            Ver órdenes de servicio
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyDescription="No hay informes diagnósticos registrados para esta atención."
        emptyTitle="Sin informes diagnósticos"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
