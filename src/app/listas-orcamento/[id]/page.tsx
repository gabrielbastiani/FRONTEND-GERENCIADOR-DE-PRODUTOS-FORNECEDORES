"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { QuoteList } from "@/types";
import { QuoteRequestModal } from "@/components/quote-request-modal";

export default function QuoteListDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [quoteList, setQuoteList] = useState<QuoteList | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteOpen, setQuoteOpen] = useState(false);

  async function loadQuoteList() {
    try {
      setLoading(true);

      const result = await api.getQuoteList(id);

      setQuoteList(result);
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar a lista.");
      router.push("/listas-orcamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuoteList();
  }, [id]);

  async function handleRemoveItem(itemId: string) {
    if (!quoteList || quoteList.status !== "DRAFT") {
      return;
    }

    const confirmed = window.confirm(
      "Deseja remover este produto da lista?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.removeItemFromQuoteList(quoteList.id, itemId);

      setQuoteList((current) =>
        current
          ? {
              ...current,
              items: current.items.filter(
                (item) => item.id !== itemId
              )
            }
          : current
      );
    } catch (error) {
      console.error(error);
      alert("Não foi possível remover o produto.");
    }
  }

  async function handleMarkAsSent() {
    if (!quoteList) {
      return;
    }

    try {
      const updated = await api.updateQuoteList(quoteList.id, {
        status: "SENT"
      });

      setQuoteList(updated);
    } catch (error) {
      console.error(error);
    }
  }

  const quoteProducts = useMemo(() => {
    if (!quoteList) {
      return [];
    }

    return quoteList.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      code: item.productCode,
      referenceCode: item.productReference
    }));
  }, [quoteList]);

  if (loading || !quoteList) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Carregando lista...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/listas-orcamento"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft size={16} />
        Voltar para listas
      </Link>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {quoteList.name}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Fornecedor: {quoteList.supplier.name}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {quoteList.items.length} produto(s)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setQuoteOpen(true)}
            disabled={quoteList.items.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <MessageCircle size={17} />
            Gerar solicitação
          </button>

          {quoteList.status === "DRAFT" && (
            <button
              type="button"
              onClick={handleMarkAsSent}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Marcar como enviada
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Referência</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y">
              {quoteList.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {item.productName}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {item.productCode || "-"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {item.productReference || "-"}
                  </td>

                  <td className="px-5 py-4 text-right">
                    {quoteList.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="inline-flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QuoteRequestModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        supplier={{
          name: quoteList.supplier.name,
          phone: quoteList.supplier.phone,
          email: quoteList.supplier.email
        }}
        products={quoteProducts}
      />
    </div>
  );
}