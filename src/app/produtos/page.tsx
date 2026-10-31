"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileText, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  formatCurrency,
  getErrorMessage
} from "@/lib/utils";
import type {
  Catalog,
  Product,
  ProductStatus,
  Supplier
} from "@/types";
import { toQuoteProduct } from "@/lib/quote-request";
import { Loading } from "@/components/loading";
import { StatusBadge } from "@/components/status-badge";
import { SupplierContactButtons } from "@/components/supplier-contact-buttons";
import { QuoteRequestModal } from "@/components/quote-request-modal";
import { SaveToQuoteListModal } from "@/components/save-to-quote-list-modal";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [sourcePageOrder, setSourcePageOrder] = useState<"" | "asc" | "desc">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [saveListOpen, setSaveListOpen] = useState(false);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const allSelected =
    products.length > 0 &&
    selectedIds.length === products.length;

  const someSelected =
    selectedIds.length > 0 && !allSelected;

  const selectedProducts = products.filter((product) =>
    selectedIds.includes(product.id)
  );

  const selectedSupplierIds = Array.from(
    new Set(
      selectedProducts.map(
        (product) => product.supplier?.id ?? ""
      )
    )
  );

  const hasSingleSupplier =
    selectedProducts.length > 0 &&
    selectedSupplierIds.length === 1 &&
    selectedSupplierIds[0] !== "";

  const quoteSupplier = hasSingleSupplier
    ? selectedProducts[0].supplier
    : undefined;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    if (quoteOpen && !hasSingleSupplier) {
      setQuoteOpen(false);
    }
  }, [quoteOpen, hasSingleSupplier]);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const result = await api.listProducts({
        search: search || undefined,
        status: status || undefined,
        supplierId: supplierId || undefined,
        catalogId: catalogId || undefined,
        sourcePageOrder: sourcePageOrder || undefined,
        activeSuppliersOnly: true,
        page: 1,
        limit: 100
      });

      setProducts(result.data);

      setSelectedIds((current) =>
        current.filter((id) =>
          result.data.some((product) => product.id === id)
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api
      .listSuppliers()
      .then((data) => {
        setSuppliers(
          data.filter((supplier) => supplier.isActive)
        );
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      });

    api
      .listCatalogs()
      .then(setCatalogs)
      .catch((err) => {
        setError(getErrorMessage(err));
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProducts();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, status, supplierId, catalogId, sourcePageOrder]);

  function toggleProduct(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    setSelectedIds(
      allSelected
        ? []
        : products.map((product) => product.id)
    );
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) {
      return;
    }

    const quantity = selectedIds.length;

    const confirmed = window.confirm(
      quantity === 1
        ? "Deseja realmente excluir o produto selecionado? Esta ação também remove as imagens e não pode ser desfeita."
        : `Deseja realmente excluir os ${quantity} produtos selecionados? Esta ação também remove as imagens e não pode ser desfeita.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      await api.deleteProductsBulk(selectedIds);

      setSelectedIds([]);

      setSuccess(
        quantity === 1
          ? "1 produto excluído com sucesso."
          : `${quantity} produtos excluídos com sucesso.`
      );

      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  function handleListSaved() {
    setSelectedIds([]);
    setSuccess(
      "Os produtos foram salvos na lista de orçamento."
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Produtos
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Cadastre e organize seus produtos manualmente.
          </p>
        </div>

        <Link
          href="/produtos/novo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo produto
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <div className="relative xl:col-span-2">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, código, marca, modelo ou EAN"
            aria-label="Pesquisar produtos"
            className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={supplierId}
          onChange={(event) => {
            setSupplierId(event.target.value);
            setCatalogId("");
          }}
          aria-label="Filtrar por fornecedor"
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Todos os fornecedores</option>

          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>

        <select
          value={catalogId}
          onChange={(event) => setCatalogId(event.target.value)}
          aria-label="Filtrar por catálogo"
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Todos os catálogos</option>

          {catalogs
            .filter((catalog) => suppliers.some((supplier) => supplier.id === catalog.supplierId))
            .filter((catalog) => !supplierId || catalog.supplierId === supplierId)
            .map((catalog) => (
              <option key={catalog.id} value={catalog.id}>
                {catalog.title}
              </option>
            ))}
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ProductStatus | "")
          }
          aria-label="Filtrar por situação"
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="NOT_ANALYZED">Não analisado</option>
          <option value="IN_VALIDATION">Em validação</option>
          <option value="PROMISING">Promissor</option>
          <option value="WAITING">Aguardando</option>
          <option value="DISCARDED">Descartado</option>
        </select>

        <select
          value={sourcePageOrder}
          onChange={(event) =>
            setSourcePageOrder(event.target.value as "" | "asc" | "desc")
          }
          aria-label="Ordenar pela página do catálogo"
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Ordem: mais recentes</option>
          <option value="asc">Página: menor para maior</option>
          <option value="desc">Página: maior para menor</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              {selectedIds.length === 1
                ? "1 produto selecionado"
                : `${selectedIds.length} produtos selecionados`}

              {hasSingleSupplier && quoteSupplier?.name
                ? ` · ${quoteSupplier.name}`
                : ""}
            </p>

            {!hasSingleSupplier && (
              <p className="mt-1 text-xs text-amber-700">
                Selecione produtos de um único fornecedor
                para solicitar orçamento ou salvar em lista.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              disabled={deleting || !hasSingleSupplier}
              title={
                hasSingleSupplier
                  ? "Gerar mensagem de solicitação de orçamento"
                  : "Selecione produtos de um único fornecedor"
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText size={16} />
              Solicitar orçamento
            </button>

            <button
              type="button"
              onClick={() => setSaveListOpen(true)}
              disabled={deleting || !hasSingleSupplier}
              title={
                hasSingleSupplier
                  ? "Salvar produtos em uma lista de orçamento"
                  : "Selecione produtos de um único fornecedor"
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Salvar em lista
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <X size={16} />
              Limpar seleção
            </button>

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Trash2 size={16} />
              {deleting
                ? "Excluindo..."
                : "Excluir selecionados"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">
          Nenhum produto encontrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-12 px-5 py-3">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={deleting}
                      aria-label="Selecionar todos os produtos"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300"
                    />
                  </th>

                  <th className="px-5 py-3">
                    Produto
                  </th>

                  <th className="px-5 py-3">
                    Fornecedor
                  </th>

                  <th className="px-5 py-3">
                    Nome do catálogo
                  </th>

                  <th className="px-5 py-3 whitespace-nowrap">
                    Página do catálogo
                  </th>

                  <th className="px-5 py-3">
                    Contato
                  </th>

                  <th className="px-5 py-3">
                    Código/Referência
                  </th>

                  <th className="px-5 py-3">
                    Custo
                  </th>

                  <th className="px-5 py-3">
                    Situação
                  </th>

                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {products.map((product) => {
                  const isSelected = selectedIds.includes(
                    product.id
                  );

                  return (
                    <tr
                      key={product.id}
                      className={
                        isSelected
                          ? "bg-blue-50/60"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleProduct(product.id)
                          }
                          disabled={deleting}
                          aria-label={`Selecionar ${product.name}`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300"
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0].fileUrl}
                              alt={product.name}
                              className="h-11 w-11 rounded-lg border object-cover"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-lg bg-slate-100" />
                          )}

                          <div>
                            <Link
                              href={`/produtos/${product.id}`}
                              className="font-medium text-slate-900 hover:text-blue-600"
                            >
                              {product.name}
                            </Link>

                            <p className="text-xs text-slate-500">
                              {product.brand ||
                                "Marca não informada"}

                              {product.model
                                ? ` · ${product.model}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {product.supplier?.name || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <span
                          className="block max-w-[240px] truncate"
                          title={product.catalog?.title || "Sem catálogo associado"}
                        >
                          {product.catalog?.title || "Sem catálogo associado"}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                        {product.sourcePage
                          ? `Página ${product.sourcePage}`
                          : "Não informada"}
                      </td>

                      <td className="px-5 py-4">
                        <SupplierContactButtons
                          variant="icon"
                          supplierName={product.supplier?.name}
                          phone={product.supplier?.phone}
                          email={product.supplier?.email}
                          productName={product.name}
                          productReference={
                            product.referenceCode
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {product.referenceCode || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatCurrency(product.cost)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={product.status} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/produtos/${product.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <QuoteRequestModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        supplier={{
          name: quoteSupplier?.name,
          phone: quoteSupplier?.phone,
          email: quoteSupplier?.email
        }}
        products={selectedProducts.map(toQuoteProduct)}
      />

      <SaveToQuoteListModal
        open={saveListOpen}
        onClose={() => setSaveListOpen(false)}
        supplier={
          quoteSupplier
            ? {
                id: quoteSupplier.id,
                name: quoteSupplier.name
              }
            : undefined
        }
        productIds={selectedIds}
        onSaved={handleListSaved}
      />
    </div>
  );
}