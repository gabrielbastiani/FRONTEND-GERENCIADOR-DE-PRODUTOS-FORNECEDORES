"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PurchaseForm } from "@/components/purchase-form";

function NewPurchaseContent() {
  const params = useSearchParams();

  return (
    <PurchaseForm
      initial={{
        supplierId: params.get("supplierId") ?? undefined,
        transactionId: params.get("transactionId") ?? undefined,
        documentId: params.get("documentId") ?? undefined
      }}
    />
  );
}

export default function NewPurchasePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/compras"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar para compras
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nova compra</h1>
        <p className="mt-1 text-sm text-slate-500">
          Importe o XML da nota fiscal ou preencha os dados manualmente.
        </p>
      </div>

      <Suspense fallback={null}>
        <NewPurchaseContent />
      </Suspense>
    </div>
  );
}