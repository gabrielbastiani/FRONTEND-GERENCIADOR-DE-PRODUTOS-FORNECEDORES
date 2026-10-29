"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Loading } from "@/components/loading";
import { PurchaseForm } from "@/components/purchase-form";
import { Purchase } from "@/types";

export default function EditPurchasePage() {
  const params = useParams();
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
        href={`/compras/${purchase.id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar para a compra
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Editar compra</h1>

      <PurchaseForm purchase={purchase} />
    </div>
  );
}