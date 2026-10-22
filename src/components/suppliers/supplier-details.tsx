"use client";

import Link from "next/link";
import { ArrowLeft, FileText, RefreshCw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Catalog, Supplier } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Loading } from "@/components/loading";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export function SupplierDetails({
  supplierId
}: {
  supplierId: string;
}) {

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [supplierData, catalogData] = await Promise.all([
        api.getSupplier(supplierId),
        api.listCatalogs(supplierId)
      ]);

      setSupplier(supplierData);
      setCatalogs(catalogData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supplierId]);

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setMessage("Selecione um arquivo PDF.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      await api.uploadCatalog(supplierId, file);
      setMessage("Catálogo enviado com sucesso.");
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar o catálogo."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleExtract(catalogId: string) {
    setExtracting(catalogId);
    setMessage("");

    try {
      const result = await api.extractCatalog(catalogId);
      setMessage(
        `${result.total} candidatos extraídos. Abra o catálogo para revisar os dados.`
      );
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao extrair o catálogo."
      );
    } finally {
      setExtracting(null);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!supplier) {
    return (
      <div className="text-sm text-red-600">
        Fornecedor não encontrado.
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/fornecedores"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft size={16} />
        Voltar para fornecedores
      </Link>

      <PageHeader
        title={supplier.name}
        description="Informações comerciais e catálogos vinculados."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowEdit((value) => !value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Editar fornecedor
            </button>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              <Upload size={17} />
              {uploading ? "Enviando..." : "Enviar catálogo PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={handleUpload}
              />
            </label>
          </div>
        }
      />

      {message && (
        <div className="mb-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {message}
        </div>
      )}

      {showEdit && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SupplierForm
            supplier={supplier}
            onSuccess={(updated) => {
              setSupplier(updated);
              setShowEdit(false);
            }}
            onCancel={() => setShowEdit(false)}
          />
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Contato</p>
          <p className="mt-2 font-medium text-slate-900">
            {supplier.contactPerson || "Não informado"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {supplier.email || "Sem e-mail"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Telefone</p>
          <p className="mt-2 font-medium text-slate-900">
            {supplier.phone || "Não informado"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Condições comerciais</p>
          <p className="mt-2 line-clamp-3 text-sm text-slate-700">
            {supplier.commercialTerms || "Não informado"}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Histórico de catálogos
            </h2>

            <p className="text-sm text-slate-500">
              Gerencie versões e extraia os produtos dos arquivos PDF.
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Atualizar catálogos"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {catalogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Nenhum catálogo enviado.
          </p>
        ) : (
          <div className="space-y-3">
            {catalogs.map((catalog) => (
              <div
                key={catalog.id}
                className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-50 p-3 text-red-600">
                    <FileText size={21} />
                  </div>

                  <div>
                    <Link
                      href={`/fornecedores/${supplierId}/catalogos/${catalog.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {catalog.originalName}
                    </Link>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>Versão {catalog.version}</span>
                      <span>
                        Enviado em {formatDate(catalog.uploadedAt)}
                      </span>
                      <span>
                        {catalog._count?.products || 0} produtos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={catalog.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Abrir PDF
                  </a>

                  <button
                    onClick={() => handleExtract(catalog.id)}
                    disabled={extracting === catalog.id}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw size={14} />
                    {extracting === catalog.id
                      ? "Extraindo..."
                      : "Extrair produtos"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}