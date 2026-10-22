"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Package,
  Plus,
  Truck
} from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { ProductListResponse, Supplier } from "@/types";
import { Loading } from "@/components/loading";

export default function DashboardPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] =
    useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [supplierData, productData] = await Promise.all([
          api.listSuppliers(),
          api.listProducts({
            page: 1,
            limit: 1
          })
        ]);

        setSuppliers(supplierData);
        setProducts(productData);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Controle seus fornecedores e produtos cadastrados.
          </p>
        </div>

        <Link
          href="/produtos/novo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Adicionar produto
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Fornecedores
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {suppliers.length}
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <Truck size={24} />
            </div>
          </div>

          <Link
            href="/fornecedores"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver fornecedores
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Produtos cadastrados
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {products?.pagination.total ?? 0}
              </p>
            </div>

            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
              <Package size={24} />
            </div>
          </div>

          <Link
            href="/produtos"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver produtos
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Próximo passo
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Cadastre seus fornecedores, anexe os catálogos como
          material de consulta e insira os produtos manualmente.
          Dessa forma, os dados ficam sob sua conferência antes de
          serem usados nas análises comerciais.
        </p>

        <Link
          href="/fornecedores"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Acessar fornecedores
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}