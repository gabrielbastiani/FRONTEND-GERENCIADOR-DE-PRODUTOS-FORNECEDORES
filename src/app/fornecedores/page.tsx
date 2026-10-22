"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { Supplier } from "@/types";
import { Loading } from "@/components/loading";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError("");

      const data = await api.listSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Fornecedores
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Cadastre fornecedores e mantenha seus catálogos organizados.
          </p>
        </div>

        <Link
          href="/fornecedores/novo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo fornecedor
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Fornecedores cadastrados
          </h2>

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar fornecedor"
              className="rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : filteredSuppliers.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
            Nenhum fornecedor encontrado.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  {supplier.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={supplier.imageUrl}
                      alt={supplier.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                      <Truck size={21} />
                    </div>
                  )}

                  <span
                    className={
                      supplier.isActive
                        ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
                        : "rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                    }
                  >
                    {supplier.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  {supplier.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {supplier.contactName || "Sem contato informado"}
                </p>

                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span>
                    Catálogos: {supplier._count?.catalogs ?? 0}
                  </span>

                  <span>
                    Produtos: {supplier._count?.products ?? 0}
                  </span>
                </div>

                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/fornecedores/${supplier.id}`}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Abrir
                  </Link>

                  <Link
                    href={`/fornecedores/${supplier.id}/editar`}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
                    aria-label={`Editar ${supplier.name}`}
                  >
                    <Pencil size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}