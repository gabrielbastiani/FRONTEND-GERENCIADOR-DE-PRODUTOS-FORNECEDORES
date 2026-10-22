"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, Search, Trash2, X } from "lucide-react";
import {
  MARKETPLACE_LABELS,
  SEARCH_CHANNELS,
  buildSearchTerms,
  type MarketplaceValue,
  type ResearchProduct
} from "@/lib/marketplace-search";
import {
  createResearch,
  deleteResearch,
  listResearch,
  updateResearch,
  type MarketplaceResearch,
  type ResearchPayload
} from "@/lib/research-api";

interface FormState {
  marketplace: MarketplaceValue;
  searchedTerm: string;
  estimatedDemand: string;
  competition: string;
  salePrice: string;
  marketplaceFee: string;
  shippingCost: string;
  taxCost: string;
  otherCosts: string;
  notes: string;
}

const emptyForm: FormState = {
  marketplace: "MERCADO_LIVRE",
  searchedTerm: "",
  estimatedDemand: "",
  competition: "",
  salePrice: "",
  marketplaceFee: "",
  shippingCost: "",
  taxCost: "",
  otherCosts: "",
  notes: ""
};

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500";

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");

  if (!normalized) {
    return null;
  }

  const number = Number(normalized);
  return Number.isNaN(number) ? null : number;
}

function parseInteger(value: string): number | null {
  const number = parseNumber(value);
  return number === null ? null : Math.round(number);
}

function toInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(Number(value)).replace(".", ",");
}

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function marginClass(margin: number) {
  if (margin >= 20) return "text-emerald-600";
  if (margin >= 10) return "text-amber-600";
  return "text-red-600";
}

export function MarketplaceResearchPanel({
  product
}: {
  product: ResearchProduct;
}) {
  const terms = useMemo(() => buildSearchTerms(product), [product]);

  const [searchTerm, setSearchTerm] = useState(
    terms[0]?.value ?? product.name
  );
  const [records, setRecords] = useState<MarketplaceResearch[]>([]);
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    searchedTerm: terms[0]?.value ?? product.name
  });
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const productCost =
    product.cost === null ||
    product.cost === undefined ||
    product.cost === ""
      ? null
      : Number(product.cost);

  async function loadRecords() {
    try {
      setLoading(true);
      setRecords(await listResearch(product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [product.id]);

  const preview = useMemo(() => {
    const salePrice = parseNumber(form.salePrice);

    if (salePrice === null || salePrice <= 0 || productCost === null) {
      return null;
    }

    const profit =
      salePrice -
      productCost -
      (parseNumber(form.marketplaceFee) ?? 0) -
      (parseNumber(form.shippingCost) ?? 0) -
      (parseNumber(form.taxCost) ?? 0) -
      (parseNumber(form.otherCosts) ?? 0);

    return { profit, margin: (profit / salePrice) * 100 };
  }, [form, productCost]);

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleChannelClick(marketplace: MarketplaceValue) {
    if (editingId) {
      return;
    }

    setForm((current) => ({
      ...current,
      marketplace,
      searchedTerm: searchTerm.trim()
    }));
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...emptyForm, searchedTerm: searchTerm.trim() });
  }

  function startEdit(record: MarketplaceResearch) {
    setEditingId(record.id);
    setError("");
    setForm({
      marketplace: record.marketplace,
      searchedTerm: record.searchedTerm,
      estimatedDemand: toInput(record.estimatedDemand),
      competition: toInput(record.competition),
      salePrice: toInput(record.salePrice),
      marketplaceFee: toInput(record.marketplaceFee),
      shippingCost: toInput(record.shippingCost),
      taxCost: toInput(record.taxCost),
      otherCosts: toInput(record.otherCosts),
      notes: record.notes ?? ""
    });

    document
      .getElementById("research-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.searchedTerm.trim()) {
      setError("Informe o termo pesquisado.");
      return;
    }

    const payload: ResearchPayload = {
      marketplace: form.marketplace,
      searchedTerm: form.searchedTerm.trim(),
      estimatedDemand: parseInteger(form.estimatedDemand),
      competition: parseInteger(form.competition),
      salePrice: parseNumber(form.salePrice),
      marketplaceFee: parseNumber(form.marketplaceFee),
      shippingCost: parseNumber(form.shippingCost),
      taxCost: parseNumber(form.taxCost),
      otherCosts: parseNumber(form.otherCosts),
      notes: form.notes.trim() || null
    };

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await updateResearch(editingId, payload);
      } else {
        await createResearch(product.id, payload);
      }

      resetForm();
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja excluir este registro de pesquisa?")) {
      return;
    }

    try {
      setError("");
      await deleteResearch(id);

      if (editingId === id) {
        resetForm();
      }

      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  const hasTerm = searchTerm.trim().length > 0;

 function parseNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = value.trim();

  if (!text) {
    return 0;
  }

  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateResearchResult({
  salePrice,
  productCost,
  marketplaceFeePercent,
  shippingCost,
  taxCost,
  otherCosts
}: {
  salePrice: number;
  productCost: number;
  marketplaceFeePercent: number;
  shippingCost: number;
  taxCost: number;
  otherCosts: number;
}) {
  const marketplaceFee =
    salePrice * (marketplaceFeePercent / 100);

  const totalCosts =
    productCost +
    marketplaceFee +
    shippingCost +
    taxCost +
    otherCosts;

  const estimatedProfit = salePrice - totalCosts;

  const estimatedMargin =
    salePrice > 0
      ? (estimatedProfit / salePrice) * 100
      : 0;

  return {
    marketplaceFee,
    totalCosts,
    estimatedProfit,
    estimatedMargin
  };
}

  return (
    <section className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Pesquisa nos marketplaces
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha um termo, abra a busca no canal desejado e registre
          abaixo o que encontrou.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">
          Termo de busca
        </p>

        <div className="flex flex-wrap gap-2">
          {terms.map((term) => (
            <button
              key={term.label}
              type="button"
              onClick={() => setSearchTerm(term.value)}
              className={
                searchTerm === term.value
                  ? "rounded-full border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-400"
              }
            >
              {term.label}: {term.value}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Ou digite outro termo de busca"
            className={`${inputClass} pl-9`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {SEARCH_CHANNELS.map((channel) => (
            <a
              key={channel.value}
              href={hasTerm ? channel.buildUrl(searchTerm) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleChannelClick(channel.value)}
              aria-disabled={!hasTerm}
              className={
                hasTerm
                  ? "inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  : "pointer-events-none inline-flex items-center gap-2 rounded-lg bg-slate-300 px-3 py-2 text-sm font-medium text-white"
              }
            >
              {channel.label}
              <ExternalLink size={14} />
            </a>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          Ao clicar em um canal, o termo e o marketplace já são
          preenchidos no formulário de registro. Em alguns canais, a
          busca por EAN pode retornar poucos resultados; nesse caso,
          teste marca + modelo.
        </p>
      </div>

      <form
        id="research-form"
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border p-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            {editingId ? "Editar registro" : "Registrar pesquisa"}
          </h3>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
              <X size={15} />
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Marketplace *
            </span>
            <select
              value={form.marketplace}
              onChange={(event) =>
                setField(
                  "marketplace",
                  event.target.value as MarketplaceValue
                )
              }
              className={inputClass}
            >
              {Object.entries(MARKETPLACE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Termo pesquisado *
            </span>
            <input
              value={form.searchedTerm}
              onChange={(event) =>
                setField("searchedTerm", event.target.value)
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Demanda estimada (vendas)
            </span>
            <input
              inputMode="numeric"
              value={form.estimatedDemand}
              onChange={(event) =>
                setField("estimatedDemand", event.target.value)
              }
              placeholder="Ex.: 150"
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Concorrência (nº de anúncios/vendedores)
            </span>
            <input
              inputMode="numeric"
              value={form.competition}
              onChange={(event) =>
                setField("competition", event.target.value)
              }
              placeholder="Ex.: 35"
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Preço de venda (R$)
            </span>
            <input
              inputMode="decimal"
              value={form.salePrice}
              onChange={(event) =>
                setField("salePrice", event.target.value)
              }
              placeholder="0,00"
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Taxa do marketplace (R$)
            </span>
            <input
              inputMode="decimal"
              value={form.marketplaceFee}
              onChange={(event) =>
                setField("marketplaceFee", event.target.value)
              }
              placeholder="0,00"
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Frete (R$)
            </span>
            <input
              inputMode="decimal"
              value={form.shippingCost}
              onChange={(event) =>
                setField("shippingCost", event.target.value)
              }
              placeholder="0,00"
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Impostos (R$)
            </span>
            <input
              inputMode="decimal"
              value={form.taxCost}
              onChange={(event) =>
                setField("taxCost", event.target.value)
              }
              placeholder="0,00"
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Outros custos (R$)
            </span>
            <input
              inputMode="decimal"
              value={form.otherCosts}
              onChange={(event) =>
                setField("otherCosts", event.target.value)
              }
              placeholder="0,00"
              className={inputClass}
            />
          </label>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase text-slate-400">
              Custo do produto
            </p>
            <p className="mt-1 font-medium text-slate-700">
              {money(productCost)}
            </p>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Observações
          </span>
          <textarea
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            rows={3}
            placeholder="Link do anúncio concorrente, diferenciais, observações..."
            className={inputClass}
          />
        </label>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          {productCost === null ? (
            <p className="text-sm text-blue-900">
              Este produto não tem custo cadastrado. Informe o custo na
              edição do produto para calcular lucro e margem.
            </p>
          ) : preview ? (
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs uppercase text-blue-700">
                  Lucro estimado
                </p>
                <p
                  className={`text-lg font-bold ${marginClass(
                    preview.margin
                  )}`}
                >
                  {money(preview.profit)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-blue-700">
                  Margem potencial
                </p>
                <p
                  className={`text-lg font-bold ${marginClass(
                    preview.margin
                  )}`}
                >
                  {preview.margin.toFixed(2).replace(".", ",")}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-blue-900">
              Informe o preço de venda para calcular lucro e margem.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving
              ? "Salvando..."
              : editingId
                ? "Salvar alterações"
                : "Registrar pesquisa"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">
          Histórico de pesquisas
        </h3>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : records.length === 0 ? (
          <div className="rounded-xl border p-6 text-center text-sm text-slate-500">
            Nenhuma pesquisa registrada para este produto.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Marketplace</th>
                  <th className="px-4 py-3">Termo</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Concorrência</th>
                  <th className="px-4 py-3">Demanda</th>
                  <th className="px-4 py-3">Lucro</th>
                  <th className="px-4 py-3">Margem</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {records.map((record) => {
                  const margin =
                    record.estimatedMargin === null
                      ? null
                      : Number(record.estimatedMargin);

                  return (
                    <tr key={record.id} className="align-top">
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(record.createdAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {MARKETPLACE_LABELS[record.marketplace] ??
                          record.marketplace}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {record.searchedTerm}
                        {record.notes && (
                          <p className="mt-1 max-w-xs text-xs text-slate-400">
                            {record.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {money(record.salePrice)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {record.competition ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {record.estimatedDemand ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {money(record.estimatedProfit)}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          margin === null
                            ? "text-slate-400"
                            : marginClass(margin)
                        }`}
                      >
                        {margin === null
                          ? "-"
                          : `${margin.toFixed(2).replace(".", ",")}%`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(record)}
                            aria-label="Editar registro"
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            aria-label="Excluir registro"
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}