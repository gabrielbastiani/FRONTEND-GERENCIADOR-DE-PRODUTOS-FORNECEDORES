import type { ProductStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusLabels: Record<ProductStatus, string> = {
  NOT_ANALYZED: "Não analisado",
  IN_VALIDATION: "Em validação",
  PROMISING: "Promissor",
  WAITING: "Aguardando",
  DISCARDED: "Descartado"
};

const statusClasses: Record<ProductStatus, string> = {
  NOT_ANALYZED: "bg-slate-100 text-slate-700",
  IN_VALIDATION: "bg-amber-100 text-amber-800",
  PROMISING: "bg-emerald-100 text-emerald-800",
  WAITING: "bg-blue-100 text-blue-800",
  DISCARDED: "bg-red-100 text-red-800"
};

export function StatusBadge({
  status
}: {
  status: ProductStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        statusClasses[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}