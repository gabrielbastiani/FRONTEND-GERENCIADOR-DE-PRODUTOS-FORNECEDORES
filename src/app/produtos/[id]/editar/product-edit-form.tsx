"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCcw,
  Save,
  Trash2,
  X
} from "lucide-react";
import { api, apiSendFormData } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { Catalog, Product, Supplier } from "@/types";
import { Loading } from "@/components/loading";

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500";

type ProductImageItem = Product["images"][number];

function formatCostForInput(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed.toFixed(2).replace(".", ",");
}

export default function ProductEditForm({
  productId
}: {
  productId: string;
}) {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [existingImages, setExistingImages] = useState<
    ProductImageItem[]
  >([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    supplierId: "",
    catalogId: "",
    name: "",
    referenceCode: "",
    brand: "",
    model: "",
    ean: "",
    cost: "",
    description: "",
    sourcePage: ""
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [product, supplierList] = await Promise.all([
          api.getProduct(productId),
          api.listSuppliers()
        ]);

        setSuppliers(supplierList);
        setExistingImages(product.images ?? []);
        setImagesToRemove([]);

        setForm({
          supplierId: product.supplierId ?? product.supplier?.id ?? "",
          catalogId: product.catalogId ?? product.catalog?.id ?? "",
          name: product.name ?? "",
          referenceCode: product.referenceCode ?? "",
          brand: product.brand ?? "",
          model: product.model ?? "",
          ean: product.ean ?? "",
          cost: formatCostForInput(product.cost),
          description: product.description ?? "",
          sourcePage:
            product.sourcePage !== null &&
            product.sourcePage !== undefined
              ? String(product.sourcePage)
              : ""
        });
      } catch (err) {
        setNotFound(true);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [productId]);

  useEffect(() => {
    if (!form.supplierId) {
      setCatalogs([]);
      return;
    }

    api
      .listCatalogs(form.supplierId)
      .then(setCatalogs)
      .catch((err) => setError(getErrorMessage(err)));
  }, [form.supplierId]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleNewImages(files: FileList | null) {
    if (!files) {
      return;
    }

    const selected = Array.from(files);

    if (selected.length > 10) {
      setError("Você pode enviar no máximo 10 imagens por vez.");
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
    setNewImages(selected);
  }

  function toggleImageRemoval(imageId: string) {
    setImagesToRemove((current) =>
      current.includes(imageId)
        ? current.filter((id) => id !== imageId)
        : [...current, imageId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
  return;
}

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

      const body = new FormData();

      body.append("supplierId", form.supplierId);
      body.append("catalogId", form.catalogId);
      body.append("name", form.name);
      body.append("referenceCode", form.referenceCode);
      body.append("brand", form.brand);
      body.append("model", form.model);
      body.append("ean", form.ean);
      body.append("cost", form.cost);
      body.append("description", form.description);
      body.append("sourcePage", form.sourcePage);
      body.append("removeImageIds", JSON.stringify(imagesToRemove));

      newImages.forEach((file) => body.append("images", file));

      await apiSendFormData(`/products/${productId}`, "PUT", body);

      router.push(`/produtos/${productId}`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (notFound) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Produto não encontrado."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/produtos/${productId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar para o produto
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Editar produto
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Atualize os dados cadastrais e as imagens do produto.
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
                className={inputClass}
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
                className={`${inputClass} disabled:bg-slate-100`}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Informações comerciais
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Custo de aquisição
              </span>
              <input
                value={form.cost}
                onChange={(event) =>
                  updateField("cost", event.target.value)
                }
                className={inputClass}
                placeholder="0,00"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Opcional. Use vírgula para os centavos.
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
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Imagens e descrição
          </h2>

          <div className="mt-4 space-y-4">
            {existingImages.length > 0 && (
              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Imagens atuais
                </span>

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {existingImages.map((image) => {
                    const marked = imagesToRemove.includes(image.id);

                    return (
                      <div
                        key={image.id}
                        className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                          marked
                            ? "border-red-400"
                            : "border-transparent"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.fileUrl}
                          alt={image.originalName}
                          className={`h-full w-full object-cover transition ${
                            marked ? "opacity-30 grayscale" : ""
                          }`}
                        />

                        {marked && (
                          <span className="absolute inset-x-0 bottom-0 bg-red-600/90 py-1 text-center text-[11px] font-medium text-white">
                            Será removida
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleImageRemoval(image.id)}
                          className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1.5 text-slate-600 shadow hover:text-red-600"
                          aria-label={
                            marked
                              ? "Desfazer remoção da imagem"
                              : "Marcar imagem para remoção"
                          }
                          title={
                            marked
                              ? "Desfazer remoção"
                              : "Remover imagem"
                          }
                        >
                          {marked ? (
                            <RotateCcw size={14} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {imagesToRemove.length > 0 && (
                  <p className="mt-3 text-xs text-red-600">
                    {imagesToRemove.length === 1
                      ? "1 imagem será removida"
                      : `${imagesToRemove.length} imagens serão removidas`}{" "}
                    ao salvar as alterações.
                  </p>
                )}
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Adicionar novas imagens
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) =>
                  handleNewImages(event.target.files)
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-slate-400">
                JPG, PNG ou WEBP, com no máximo 8 MB cada.
              </span>
            </label>

            {newImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newImages.map((image, index) => (
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
                        setNewImages((current) =>
                          current.filter(
                            (_item, itemIndex) => itemIndex !== index
                          )
                        )
                      }
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Remover da seleção"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Descrição
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={4}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
          <Link
            href={`/produtos/${productId}`}
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
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}