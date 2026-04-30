import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/ihce-bundles/$bundleId")({
  component: IhceBundleDetailPage,
});

function IhceBundleDetailPage() {
  const { bundleId } = Route.useParams();

  const { data: listData, isLoading } = useQuery(
    orpc.ihceBundles.list.queryOptions({
      input: { limit: 1000, offset: 0 },
    })
  );

  const bundle = listData?.items.find((i) => i.id === bundleId);

  const title = isLoading
    ? "Cargando..."
    : (bundle?.bundleType ?? "Detalle de bundle IHCE");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/ihce-bundles"
        description="Información del bundle IHCE/RDA"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : bundle ? (
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del bundle</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Tipo", value: bundle.bundleType },
                {
                  label: "Estado",
                  value: (
                    <span
                      className={
                        bundle.status === "sent"
                          ? "text-emerald-600"
                          : "text-slate-600"
                      }
                    >
                      {bundle.status}
                    </span>
                  ),
                },
                {
                  label: "Generado",
                  value: new Date(bundle.generatedAt).toLocaleString("es-CO"),
                },
                {
                  label: "Enviado",
                  value: bundle.sentAt
                    ? new Date(bundle.sentAt).toLocaleString("es-CO")
                    : "—",
                },
                {
                  label: "Código VIDA",
                  value: bundle.vidaCode ?? "—",
                },
                {
                  label: "Código respuesta",
                  value: bundle.responseCode ?? "—",
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 font-medium">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bundle JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-none bg-muted p-3 text-[10px]">
                {JSON.stringify(bundle.bundleJson, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          description="No se encontró el bundle solicitado."
          title="Bundle no encontrado"
        />
      )}
    </div>
  );
}
