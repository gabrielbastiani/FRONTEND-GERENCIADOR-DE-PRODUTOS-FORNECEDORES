"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  FileText,
  Package,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { api } from "@/lib/api";
import {
  formatDate,
  formatFileSize,
  getErrorMessage
} from "@/lib/utils";
import { formatBRL } from "@/lib/purchase-calc";
import type { Catalog, Product, Supplier } from "@/types";
import { Loading } from "@/components/loading";
import { FileUploadField } from "@/components/file-upload-field";
import { CommercialTransactions } from "@/components/suppliers/commercial-transactions";
import { useRouter } from "next/navigation";
import { SupplierContactButtons } from "@/components/supplier-contact-buttons";

type Tab = "negociacoes" | "catalogos" | "produtos";

export default function SupplierDetails({
  supplierId
}: {
  supplierId: string;
}) {
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [deletingCatalogId, setDeletingCatalogId] = useState("");
  const [deletingSupplier, setDeletingSupplier] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("negociacoes");
  const [showCatalogForm, setShowCatalogForm] = useState(false);

  const [catalogForm, setCatalogForm] = useState({
    title: "",
    notes: "",
    file: [] as File[]
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [supplierData, catalogData, productData] =
        await Promise.all([
          api.getSupplier(supplierId),
          api.listCatalogs(supplierId),
          api.listProducts({ supplierId, page: 1, limit: 100 })
        ]);

      setSupplier(supplierData);
      setCatalogs(catalogData);
      setProducts(productData.data);
      setProductsTotal(productData.pagination.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supplierId]);

  async function handleCatalogSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const file = catalogForm.file[0];

    if (!catalogForm.title.trim()) {
      setError("Informe o título do catálogo.");
      return;
    }

    if (!file) {
      setError("Selecione um arquivo PDF.");
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("O arquivo selecionado precisa ser um PDF.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("O arquivo PDF não pode ultrapassar 50 MB.");
      return;
    }

    try {
      setSavingCatalog(true);
      setError("");

      await api.createCatalog({
        supplierId,
        title: catalogForm.title.trim(),
        notes: catalogForm.notes,
        file
      });

      setCatalogForm({
        title: "",
        notes: "",
        file: []
      });

      setShowCatalogForm(false);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingCatalog(false);
    }
  }

  async function handleDeleteCatalog(id: string) {
    const confirmed = window.confirm(
      "Deseja realmente excluir este catálogo?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCatalogId(id);
      setError("");

      await api.deleteCatalog(id);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingCatalogId("");
    }
  }

  async function handleDeleteSupplier() {
    const confirmed = window.confirm(
      "Atenção: excluir este fornecedor também excluirá todos os produtos e catálogos vinculados. Deseja continuar?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingSupplier(true);
      setError("");

      await api.deleteSupplier(supplierId);

      router.push("/fornecedores");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeletingSupplier(false);
    }
  }

  if (loading && !supplier) {
    return <Loading />;
  }

  if (!supplier) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Fornecedor não encontrado.
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "negociacoes", label: "Negociações" },
    { id: "catalogos", label: "Catálogos", count: catalogs.length },
    { id: "produtos", label: "Produtos", count: productsTotal }
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/fornecedores"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar para fornecedores
      </Link>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            {supplier.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={supplier.imageUrl}
                alt={supplier.name}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                {supplier.name.substring(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {supplier.name}
                </h1>

                <span
                  className={
                    supplier.isActive
                      ? "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
                      : "inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                  }
                >
                  {supplier.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {supplier.contactName || "Contato não informado"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/fornecedores/${supplier.id}/editar`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Edit size={17} />
              Editar
            </Link>

            <Link
              href={`/produtos/novo?supplierId=${supplier.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Package size={17} />
              Adicionar produto
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-400">E-mail</p>
            <p className="mt-1 text-sm text-slate-700">
              {supplier.email || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-400">Telefone</p>
            <p className="mt-1 text-sm text-slate-700">
              {supplier.phone || "-"}
            </p>
            <SupplierContactButtons
              variant="full"
              className="mt-3"
              supplierName={supplier.name}
              phone={supplier.phone}
              email={supplier.email}
            />
          </div>

          <div>
            <p className="text-xs uppercase text-slate-400">Documento</p>
            <p className="mt-1 text-sm text-slate-700">
              {supplier.document || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-400">Website</p>

            {supplier.website ? (
              <a
                href={supplier.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600"
              >
                Acessar
                <ExternalLink size={14} />
              </a>
            ) : (
              <p className="mt-1 text-sm text-slate-700">-</p>
            )}
          </div>
        </div>

        {supplier.notes && (
          <div className="mt-5 border-t pt-5">
            <p className="text-xs uppercase text-slate-400">
              Observações
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {supplier.notes}
            </p>
          </div>
        )}

        <div className="mt-5 border-t pt-4 text-right">
          <button
            type="button"
            onClick={handleDeleteSupplier}
            disabled={deletingSupplier}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 disabled:opacity-60"
          >
            <Trash2 size={14} />
            {deletingSupplier ? "Excluindo..." : "Excluir fornecedor"}
          </button>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "whitespace-nowrap border-b-2 border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700"
                : "whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900"
            }
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {activeTab === "negociacoes" && (
        <CommercialTransactions supplierId={supplierId} />
      )}

      {activeTab === "catalogos" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Catálogos do fornecedor
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Os catálogos ficam armazenados como material de consulta.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCatalogForm((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {showCatalogForm ? <X size={17} /> : <Plus size={17} />}
              {showCatalogForm ? "Fechar" : "Adicionar catálogo"}
            </button>
          </div>

          {showCatalogForm && (
            <form
              onSubmit={handleCatalogSubmit}
              className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Título *
                  </span>

                  <input
                    value={catalogForm.title}
                    onChange={(event) =>
                      setCatalogForm((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Catálogo de produtos 2026"
                  />
                </label>

                <FileUploadField
                  label="Arquivo PDF *"
                  variant="pdf"
                  accept="application/pdf,.pdf"
                  helperText="Somente PDF, até 50 MB."
                  files={catalogForm.file}
                  onChange={(files) =>
                    setCatalogForm((current) => ({
                      ...current,
                      file: files
                    }))
                  }
                />
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Observações
                </span>

                <textarea
                  value={catalogForm.notes}
                  onChange={(event) =>
                    setCatalogForm((current) => ({
                      ...current,
                      notes: event.target.value
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <button
                type="submit"
                disabled={savingCatalog}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingCatalog ? "Enviando..." : "Salvar catálogo"}
              </button>
            </form>
          )}

          {catalogs.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
              Nenhum catálogo cadastrado.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {catalogs.map((catalog) => (
                <div
                  key={catalog.id}
                  className="rounded-xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
                        <FileText size={21} />
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {catalog.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {catalog.originalName}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCatalog(catalog.id)}
                      disabled={deletingCatalogId === catalog.id}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Excluir catálogo"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <span>Adicionado: {formatDate(catalog.createdAt)}</span>
                    <span>Tamanho: {formatFileSize(catalog.fileSize)}</span>
                    <span>Produtos: {catalog._count?.products ?? 0}</span>
                  </div>

                  {catalog.fileUrl && (
                    <a
                      href={catalog.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText size={16} />
                      Abrir PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "produtos" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Produtos do fornecedor
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {productsTotal > products.length
                  ? `Mostrando ${products.length} de ${productsTotal} produtos.`
                  : `${productsTotal} produto(s) cadastrado(s).`}
              </p>
            </div>

            <Link
              href={`/produtos/novo?supplierId=${supplier.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={17} />
              Adicionar produto
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
              Nenhum produto cadastrado para este fornecedor.
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-white shadow-sm">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/produtos/${product.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50"
                >
                  {product.images[0]?.fileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].fileUrl}
                      alt={product.name}
                      className="h-12 w-12 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <Package size={20} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.referenceCode || "Sem código"}
                    </p>
                  </div>

                  <span className="text-sm text-slate-700">
                    {product.cost ? formatBRL(Number(product.cost)) : "-"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}