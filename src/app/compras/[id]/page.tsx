"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatBRL, formatPurchaseDate } from "@/lib/purchase-calc";
import { Loading } from "@/components/loading";
import { Purchase } from "@/types";

export default function PurchaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPurchase(id)
      .then(setPurchase)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Deseja realmente excluir esta compra?")) {
      return;
    }

    try {
      await api.deletePurchase(id);
      router.push("/compras");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!purchase) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Compra não encontrada."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/compras"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar para compras
      </Link>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Compra de {purchase.supplier.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatPurchaseDate(purchase.purchaseDate)}
            {purchase.invoiceNumber
              ? ` · NF ${purchase.invoiceNumber}`
              : ""}
            {purchase.source === "XML" ? " · Importada via XML" : ""}
          </p>
          {purchase.invoiceKey && (
            <p className="mt-1 break-all text-xs text-slate-400">
              Chave: {purchase.invoiceKey}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/compras/${purchase.id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={17} />
            Editar
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={17} />
            Excluir
          </button>
        </div>
      </div>

            {purchase.transaction && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span>
            Vinculada a{" "}
            <strong>
              {purchase.transaction.orderReference
                ? `pedido ${purchase.transaction.orderReference}`
                : purchase.transaction.quoteReference
                  ? `orçamento ${purchase.transaction.quoteReference}`
                  : "um orçamento/pedido sem referência"}
            </strong>
          </span>

          <Link
            href={`/fornecedores/${purchase.supplierId}`}
            className="font-medium text-blue-700 hover:underline"
          >
            Ver negociação do fornecedor
          </Link>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Imagem</th>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Qtd.</th>
                <th className="px-5 py-3">Valor unit.</th>
                <th className="px-5 py-3">Frete rateado</th>
                <th className="px-5 py-3">Custo unit. c/ frete</th>
                <th className="px-5 py-3">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {purchase.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-11 w-11 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <Package size={18} />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {item.productId ? (
                      <Link
                        href={`/produtos/${item.productId}`}
                        className="hover:text-blue-600"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {item.code || "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatBRL(item.unitPrice)}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatBRL(item.freightShare)}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {formatBRL(item.unitCost)}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {formatBRL(item.totalCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <dl className="ml-auto max-w-xs space-y-2 rounded-xl border bg-white p-5 text-sm shadow-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Produtos</dt>
          <dd>{formatBRL(purchase.itemsTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Frete</dt>
          <dd>{formatBRL(purchase.freightTotal)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatBRL(purchase.grandTotal)}</dd>
        </div>
      </dl>

      {purchase.notes && (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">Observações</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {purchase.notes}
          </p>
        </section>
      )}
    </div>
  );
}