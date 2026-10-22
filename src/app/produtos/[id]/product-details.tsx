"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Save,
  Trash2,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getErrorMessage
} from "@/lib/utils";
import type { Product, ProductStatus } from "@/types";
import { Loading } from "@/components/loading";
import { StatusBadge } from "@/components/status-badge";
import { MarketplaceResearchPanel } from "@/components/marketplace-research-panel";

export default function ProductDetails({
  productId
}: {
  productId: string;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] =
    useState<ProductStatus>("NOT_ANALYZED");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      const data = await api.getProduct(productId);

      setProduct(data);
      setStatus(data.status);
      setJustification(data.justification ?? "");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function handleStatusSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const updated = await api.updateProductStatus(productId, {
        status,
        justification
      });

      setProduct((current) =>
        current
          ? {
              ...current,
              ...updated
            }
          : updated
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Deseja realmente excluir este produto?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await api.deleteProduct(productId);
      window.location.href = "/produtos";
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!product) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Produto não encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/produtos"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar para produtos
      </Link>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {product.name}
            </h1>
            <StatusBadge status={product.status} />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Cadastrado em {formatDate(product.createdAt)}
          </p>
        </div>

                <div className="flex flex-wrap gap-2">
          <Link
            href={`/produtos/${product.id}/editar`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={17} />
            Editar produto
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 size={17} />
            {deleting ? "Excluindo..." : "Excluir produto"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Imagens
          </h2>

          {product.images.length === 0 ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
              Nenhuma imagem cadastrada.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {product.images.map((image) => (
                <a
                  key={image.id}
                  href={image.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-lg border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.fileUrl}
                    alt={image.originalName}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-white/90 p-1.5 text-slate-600">
                    <ExternalLink size={14} />
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Dados do produto
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-400">
                Fornecedor
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {product.supplier?.name || "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Código ou referência
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {product.referenceCode || "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Marca
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {product.brand || "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Modelo
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {product.model || "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                EAN
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {product.ean || "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Custo
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {formatCurrency(product.cost)}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Catálogo
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {product.catalog?.title || "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Página de origem
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {product.sourcePage || "-"}
              </dd>
            </div>
          </dl>

          {product.description && (
            <div className="mt-6 border-t pt-5">
              <h3 className="text-sm font-medium text-slate-700">
                Descrição
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {product.description}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Classificação comercial
        </h2>

        <form
          onSubmit={handleStatusSubmit}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Situação
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProductStatus)
              }
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="NOT_ANALYZED">Não analisado</option>
              <option value="IN_VALIDATION">Em validação</option>
              <option value="PROMISING">Promissor</option>
              <option value="WAITING">Aguardando</option>
              <option value="DISCARDED">Descartado</option>
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Justificativa
            </span>
            <textarea
              value={justification}
              onChange={(event) =>
                setJustification(event.target.value)
              }
              rows={4}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              placeholder="Explique a decisão tomada sobre este produto."
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save size={17} />
              {saving ? "Salvando..." : "Salvar classificação"}
            </button>
          </div>
        </form>
      </section>

      <MarketplaceResearchPanel product={product} />

      {product.statusHistory &&
        product.statusHistory.length > 0 && (
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Histórico de classificações
            </h2>

            <div className="mt-4 divide-y">
              {product.statusHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <StatusBadge status={history.newStatus} />
                    {history.justification && (
                      <p className="mt-2 text-sm text-slate-600">
                        {history.justification}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-slate-400">
                    {formatDate(history.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
    </div>
  );
}