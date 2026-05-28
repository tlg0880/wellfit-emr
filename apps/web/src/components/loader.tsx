import { Loader2 } from "lucide-react";

export default function Loader({ label = "Cargando..." }: { label?: string }) {
  return (
    <div
      aria-label={label}
      className="flex h-full items-center justify-center pt-8"
      role="status"
    >
      <Loader2 className="animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
