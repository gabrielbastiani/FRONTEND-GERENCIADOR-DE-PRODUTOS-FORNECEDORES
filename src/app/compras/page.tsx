"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, ShoppingBag, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { Purchase, Supplier } from "@/types";
import { formatBRL, formatPurchaseDate } from "@/lib/purchase-calc";
import { Loading } from "@/components/loading";
import { PaginationControls } from "@/components/pagination-controls";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [totalSpent, setTotalSpent] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const result = await api.listPurchasesPage({
          supplierId: supplierId || undefined,
          search: search.trim() || undefined,
          page,
          limit
        });

        if (cancelled) return;
        setPurchases(result.data);
        setPagination(result.pagination);
        setTotalSpent(result.totalSpent);

        if (result.pagination.totalPages > 0 && page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [supplierId, search, page, limit, refreshKey]);

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja realmente excluir esta compra?")) {
      return;
    }

    try {
      await api.deletePurchase(id);
      if (purchases.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registre o que você comprou de cada fornecedor, com frete
            rateado e importação de XML.
          </p>
        </div>

        <Link
          href="/compras/nova"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Nova compra
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Número da nota fiscal"
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        />

        <select
          value={supplierId}
          onChange={(event) => {
            setSupplierId(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Todos os fornecedores</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>

        <div className="flex items-center justify-end text-sm text-slate-600">
          Total listado:&nbsp;
          <strong className="text-slate-900">{formatBRL(totalSpent)}</strong>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : purchases.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <ShoppingBag className="mx-auto text-slate-400" size={34} />
          <p className="mt-3 text-sm text-slate-500">
            Nenhuma compra encontrada.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Fornecedor</th>
                  <th className="px-5 py-3">Nota fiscal</th>
                  <th className="px-5 py-3">Itens</th>
                  <th className="px-5 py-3">Frete</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-600">
                      {formatPurchaseDate(purchase.purchaseDate)}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {purchase.supplier.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {purchase.invoiceNumber || "-"}
                      {purchase.source === "XML" && (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          XML
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {purchase.items.length}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatBRL(purchase.freightTotal)}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {formatBRL(purchase.grandTotal)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/compras/${purchase.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          Abrir
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(purchase.id)}
                          aria-label="Excluir compra"
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && pagination.total > 0 && (
        <PaginationControls
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          itemLabel="compras"
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      )}

    </div>
  );
}