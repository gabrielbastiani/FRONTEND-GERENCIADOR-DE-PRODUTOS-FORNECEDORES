"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type Props = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export function PaginationControls({
  page,
  limit,
  total,
  totalPages,
  itemLabel = "registros",
  onPageChange,
  onLimitChange
}: Props) {
  const pageCount = Math.max(totalPages, 1);
  const firstItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastItem = Math.min(page * limit, total);
  const canGoBack = page > 1;
  const canGoForward = page < pageCount;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Exibindo <strong className="text-slate-900">{firstItem}–{lastItem}</strong> de{" "}
        <strong className="text-slate-900">{total}</strong> {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Por página
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            aria-label="Quantidade de itens por página"
          >
            {[10, 12, 20, 50].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={!canGoBack}
            aria-label="Primeira página"
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoBack}
            aria-label="Página anterior"
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="min-w-[100px] px-2 text-center text-sm text-slate-600">
            Página <strong className="text-slate-900">{page}</strong> de {pageCount}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoForward}
            aria-label="Próxima página"
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(pageCount)}
            disabled={!canGoForward}
            aria-label="Última página"
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
