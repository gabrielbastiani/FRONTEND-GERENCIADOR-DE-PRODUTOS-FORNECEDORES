"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { QuoteList } from "@/types";

export default function QuoteListsPage() {
  const [lists, setLists] = useState<QuoteList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLists() {
    try {
      setLoading(true);
      setError("");

      const result = await api.listQuoteLists();

      setLists(result);
    } catch (error) {
      console.error(error);
      setError("Não foi possível carregar as listas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLists();
  }, []);

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Deseja realmente excluir esta lista de orçamento?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.deleteQuoteList(id);
      setLists((current) =>
        current.filter((quoteList) => quoteList.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir a lista.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Listas de orçamento
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Organize produtos para solicitar cotações posteriormente.
          </p>
        </div>

        <Link
          href="/produtos"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={17} />
          Adicionar produtos
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
          Carregando listas...
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <FileText className="mx-auto text-slate-400" size={34} />

          <p className="mt-3 text-sm text-slate-500">
            Nenhuma lista de orçamento foi criada.
          </p>

          <Link
            href="/produtos"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ir para produtos
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((quoteList) => (
            <div
              key={quoteList.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/listas-orcamento/${quoteList.id}`}
                    className="font-semibold text-slate-900 hover:text-blue-600"
                  >
                    {quoteList.name}
                  </Link>

                  <p className="mt-1 text-sm text-slate-500">
                    {quoteList.supplier.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(quoteList.id)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label="Excluir lista"
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {quoteList.items.length} produto(s)
                </span>

                <span
                  className={
                    quoteList.status === "DRAFT"
                      ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
                      : quoteList.status === "SENT"
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                  }
                >
                  {quoteList.status === "DRAFT"
                    ? "Rascunho"
                    : quoteList.status === "SENT"
                      ? "Enviada"
                      : "Arquivada"}
                </span>
              </div>

              <Link
                href={`/listas-orcamento/${quoteList.id}`}
                className="mt-5 block rounded-lg border px-3 py-2 text-center text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                Abrir lista
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}