"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Save, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { Catalog, ProductStatus, Supplier } from "@/types";

export default function ProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    supplierId: searchParams.get("supplierId") ?? "",
    catalogId: "",
    name: "",
    referenceCode: "",
    brand: "",
    model: "",
    ean: "",
    cost: "",
    description: "",
    sourcePage: "",
    status: "NOT_ANALYZED" as ProductStatus,
    justification: ""
  });

  useEffect(() => {
    api.listSuppliers()
      .then(setSuppliers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoadingSuppliers(false));
  }, []);

  useEffect(() => {
    if (!form.supplierId) {
      setCatalogs([]);
      return;
    }

    api.listCatalogs(form.supplierId)
      .then(setCatalogs)
      .catch((err) => setError(getErrorMessage(err)));
  }, [form.supplierId]);

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleImages(files: FileList | null) {
    if (!files) {
      return;
    }

    const selected = Array.from(files);

    if (selected.length > 10) {
      setError("Você pode selecionar no máximo 10 imagens.");
      return;
    }

    const invalid = selected.find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(
          file.type
        ) || file.size > 8 * 1024 * 1024
    );

    if (invalid) {
      setError(
        "As imagens devem ser JPG, PNG ou WEBP e ter no máximo 8 MB."
      );
      return;
    }

    setError("");
    setImages(selected);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.supplierId) {
      setError("Selecione um fornecedor.");
      return;
    }

    if (!form.name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const product = await api.createProduct({
        ...form,
        images
      });

      router.push(`/produtos/${product.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loadingSuppliers) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        Carregando fornecedores...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/produtos"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar para produtos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Novo produto
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Insira manualmente os dados conferidos do produto.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Identificação
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Fornecedor *
              </span>
              <select
                value={form.supplierId}
                onChange={(event) => {
                  updateField("supplierId", event.target.value);
                  updateField("catalogId", "");
                }}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Selecione</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Catálogo de origem
              </span>
              <select
                value={form.catalogId}
                onChange={(event) =>
                  updateField("catalogId", event.target.value)
                }
                disabled={!form.supplierId}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
              >
                <option value="">Nenhum catálogo</option>
                {catalogs.map((catalog) => (
                  <option key={catalog.id} value={catalog.id}>
                    {catalog.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Nome do produto *
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="Nome completo do produto"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Código ou referência
              </span>
              <input
                value={form.referenceCode}
                onChange={(event) =>
                  updateField("referenceCode", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                EAN
              </span>
              <input
                value={form.ean}
                onChange={(event) =>
                  updateField("ean", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="7890000000000"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Marca
              </span>
              <input
                value={form.brand}
                onChange={(event) =>
                  updateField("brand", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Modelo
              </span>
              <input
                value={form.model}
                onChange={(event) =>
                  updateField("model", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Informações comerciais
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Custo de aquisição
              </span>
              <input
                value={form.cost}
                onChange={(event) =>
                  updateField("cost", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="0,00"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Opcional
              </span>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Página no catálogo
              </span>
              <input
                type="number"
                min="1"
                value={form.sourcePage}
                onChange={(event) =>
                  updateField("sourcePage", event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Situação inicial
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value as ProductStatus
                  )
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
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Imagens e observações
          </h2>

          <div className="mt-4 space-y-4">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Imagens do produto
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) =>
                  handleImages(event.target.files)
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-slate-400">
                JPG, PNG ou WEBP. Até 10 imagens, com no máximo 8 MB
                cada.
              </span>
            </label>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <div
                    key={`${image.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700"
                  >
                    <span className="max-w-48 truncate">
                      {image.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setImages((current) =>
                          current.filter(
                            (_item, itemIndex) => itemIndex !== index
                          )
                        )
                      }
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Remover imagem"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Descrição
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={4}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Justificativa ou observação inicial
              </span>
              <textarea
                value={form.justification}
                onChange={(event) =>
                  updateField("justification", event.target.value)
                }
                rows={3}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="Por que este produto foi cadastrado ou classificado desta forma?"
              />
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
          <Link
            href="/produtos"
            className="rounded-lg border px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={17} />
            {saving ? "Salvando..." : "Salvar produto"}
          </button>
        </div>
      </form>
    </div>
  );
}