"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileUp, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { formatBRL, formatPurchaseDate } from "@/lib/purchase-calc";
import type { Purchase } from "@/types";

type DocumentLike = {
  id: string;
  originalName: string;
  mimeType?: string | null;
};

export function TransactionPurchases({
  supplierId,
  transactionId,
  documents = []
}: {
  supplierId: string;
  transactionId: string;
  documents?: DocumentLike[];
}) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listPurchases({ transactionId })
      .then(setPurchases)
      .catch(() => setPurchases([]))
      .finally(() => setLoading(false));
  }, [transactionId]);

  const xmlDocuments = documents.filter(
    (document) =>
      document.originalName.toLowerCase().endsWith(".xml") ||
      (document.mimeType ?? "").includes("xml")
  );

  const base = `/compras/nova?supplierId=${encodeURIComponent(
    supplierId
  )}&transactionId=${encodeURIComponent(transactionId)}`;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShoppingBag size={16} />
          Compras registradas
        </h4>

        <div className="flex flex-wrap gap-2">
          {xmlDocuments.map((document) => (
            <Link
              key={document.id}
              href={`${base}&documentId=${encodeURIComponent(document.id)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <FileUp size={14} />
              Registrar compra com {document.originalName}
            </Link>
          ))}

          <Link
            href={base}
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Registrar compra
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Carregando...</p>
      ) : purchases.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Nenhuma compra registrada para este pedido ainda.
        </p>
      ) : (
        <ul className="mt-3 divide-y text-sm">
          {purchases.map((purchase) => (
            <li
              key={purchase.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span className="text-slate-700">
                {formatPurchaseDate(purchase.purchaseDate)}
                {purchase.invoiceNumber
                  ? ` · NF ${purchase.invoiceNumber}`
                  : ""}
                {` · ${purchase.items.length} item(ns)`}
              </span>

              <span className="flex items-center gap-4">
                <strong className="text-slate-900">
                  {formatBRL(purchase.grandTotal)}
                </strong>
                <Link
                  href={`/compras/${purchase.id}`}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Abrir
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}