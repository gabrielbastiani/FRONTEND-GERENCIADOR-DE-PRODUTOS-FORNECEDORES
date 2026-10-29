"use client";

import { useState } from "react";
import { ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/purchase-calc";
import { getErrorMessage } from "@/lib/utils";
import type { Product, Purchase, TransactionItem } from "@/types";

type DraftRow = {
  key: string;
  productId: string | null;
  name: string;
  code: string;
  quantity: string;
  unitPrice: string;
};

type TransactionItemsProps = {
  transactionId: string;
  supplierId: string;
  items: TransactionItem[];
  readOnly?: boolean;
  onSaved: () => void | Promise<void>;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500";

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyRow(): DraftRow {
  return {
    key: newKey(),
    productId: null,
    name: "",
    code: "",
    quantity: "1",
    unitPrice: ""
  };
}

function parseMoney(value: string) {
  const text = value.trim().replace(/\s/g, "");

  if (text === "") {
    return NaN;
  }

  return Number(
    text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text
  );
}

function priceToInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getItemsTotal(items: TransactionItem[]) {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
}

export function TransactionItems({
  transactionId,
  supplierId,
  items,
  readOnly = false,
  onSaved
}: TransactionItemsProps) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadProducts() {
    if (productsLoaded) {
      return;
    }

    try {
      const result = await api.listProducts({
        supplierId,
        page: 1,
        limit: 100
      });

      setProducts(result.data);
      setProductsLoaded(true);
    } catch {
      setProducts([]);
    }
  }

  function startEdit() {
    setRows(
      items.length > 0
        ? items.map((item) => ({
            key: item.id,
            productId: item.productId,
            name: item.name,
            code: item.code ?? "",
            quantity: String(item.quantity),
            unitPrice: priceToInput(item.unitPrice)
          }))
        : [emptyRow()]
    );

    setError("");
    setEditing(true);
    loadProducts();
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, ...patch } : row
      )
    );
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function addProductRow(productId: string) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    setRows((current) => [
      ...current.filter(
        (row) => row.name.trim() !== "" || row.unitPrice !== ""
      ),
      {
        key: newKey(),
        productId: product.id,
        name: product.name,
        code: product.referenceCode ?? "",
        quantity: "1",
        unitPrice: product.cost ? priceToInput(Number(product.cost)) : ""
      }
    ]);
  }

  async function handleSave() {
    const filled = rows.filter(
      (row) =>
        row.name.trim() !== "" ||
        row.unitPrice.trim() !== "" ||
        row.code.trim() !== ""
    );

    const payload: Array<{
      productId: string | null;
      name: string;
      code: string | null;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (let index = 0; index < filled.length; index += 1) {
      const row = filled[index];
      const line = index + 1;
      const quantity = Number(row.quantity);
      const unitPrice = parseMoney(row.unitPrice);

      if (!row.name.trim()) {
        setError(`Linha ${line}: informe o nome do item.`);
        return;
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        setError(`Linha ${line}: a quantidade deve ser um inteiro maior que zero.`);
        return;
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setError(`Linha ${line}: informe um preço unitário válido.`);
        return;
      }

      payload.push({
        productId: row.productId,
        name: row.name.trim(),
        code: row.code.trim() || null,
        quantity,
        unitPrice
      });
    }

    try {
      setSaving(true);
      setError("");

      await api.replaceTransactionItems(transactionId, payload);
      await onSaved();

      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const draftTotal = rows.reduce((sum, row) => {
    const quantity = Number(row.quantity);
    const price = parseMoney(row.unitPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      return sum;
    }

    return sum + quantity * price;
  }, 0);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ListChecks size={16} />
          Itens do orçamento ({items.length})
        </h4>

        {!editing && !readOnly && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {items.length > 0 ? <Pencil size={14} /> : <Plus size={14} />}
            {items.length > 0 ? "Editar itens" : "Adicionar itens"}
          </button>
        )}
      </div>

      {!editing && items.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          Nenhum item registrado. Informe o que foi orçado para poder comparar
          com a compra depois.
        </p>
      )}

      {!editing && items.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Código</th>
                <th className="py-2 pr-3 text-right font-medium">Qtd.</th>
                <th className="py-2 pr-3 text-right font-medium">Unitário</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 text-slate-900">{item.name}</td>
                  <td className="py-2 pr-3 text-slate-500">
                    {item.code || "-"}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-700">
                    {formatBRL(item.unitPrice)}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-900">
                    {formatBRL(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr className="border-t">
                <td
                  colSpan={4}
                  className="py-2 pr-3 text-right text-sm font-medium text-slate-600"
                >
                  Total orçado
                </td>
                <td className="py-2 text-right font-semibold text-slate-900">
                  {formatBRL(getItemsTotal(items))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editing && (
        <div className="mt-4 space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <select
              value=""
              onChange={(event) => addProductRow(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">
                {productsLoaded
                  ? "Adicionar produto do fornecedor..."
                  : "Carregando produtos..."}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.referenceCode ? ` (${product.referenceCode})` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setRows((current) => [...current, emptyRow()])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} />
              Item avulso
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-2 font-medium">Item *</th>
                  <th className="w-32 py-2 pr-2 font-medium">Código</th>
                  <th className="w-20 py-2 pr-2 font-medium">Qtd. *</th>
                  <th className="w-32 py-2 pr-2 font-medium">Unitário *</th>
                  <th className="w-10 py-2" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="py-1 pr-2">
                      <input
                        value={row.name}
                        onChange={(event) =>
                          updateRow(row.key, { name: event.target.value })
                        }
                        className={inputClass}
                        placeholder="Nome do produto"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={row.code}
                        onChange={(event) =>
                          updateRow(row.key, { code: event.target.value })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.key, { quantity: event.target.value })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={row.unitPrice}
                        onChange={(event) =>
                          updateRow(row.key, { unitPrice: event.target.value })
                        }
                        className={inputClass}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remover item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <span className="text-sm text-slate-600">
              Total orçado:{" "}
              <strong className="text-slate-900">
                {formatBRL(draftTotal)}
              </strong>
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar itens"}
              </button>

              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X size={15} />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ComparisonRow = {
  name: string;
  orderedQty: number;
  orderedPrice: number;
  invoicedQty: number;
  invoicedTotal: number;
};

export function ItemsComparison({
  items,
  purchases
}: {
  items: TransactionItem[];
  purchases: Purchase[];
}) {
  const rows: ComparisonRow[] = items.map((item) => ({
    name: item.name,
    orderedQty: item.quantity,
    orderedPrice: item.unitPrice,
    invoicedQty: 0,
    invoicedTotal: 0
  }));

  const extras: ComparisonRow[] = [];

  function findIndex(invoiced: Purchase["items"][number]) {
    let index = items.findIndex(
      (item) =>
        item.productId &&
        invoiced.productId &&
        item.productId === invoiced.productId
    );

    if (index < 0 && invoiced.code) {
      const code = normalize(invoiced.code);

      index = items.findIndex(
        (item) => item.code && normalize(item.code) === code
      );
    }

    if (index < 0) {
      const name = normalize(invoiced.name);

      index = items.findIndex((item) => normalize(item.name) === name);
    }

    return index;
  }

  for (const purchase of purchases) {
    for (const invoiced of purchase.items) {
      const index = findIndex(invoiced);
      const total = invoiced.quantity * invoiced.unitPrice;

      if (index >= 0) {
        rows[index].invoicedQty += invoiced.quantity;
        rows[index].invoicedTotal += total;
      } else {
        extras.push({
          name: invoiced.name,
          orderedQty: 0,
          orderedPrice: 0,
          invoicedQty: invoiced.quantity,
          invoicedTotal: total
        });
      }
    }
  }

  const all = [...rows, ...extras];

  function getStatus(row: ComparisonRow) {
    if (row.orderedQty === 0) {
      return { label: "Fora do pedido", className: "text-amber-700" };
    }

    if (row.invoicedQty === 0) {
      return { label: "Não faturado", className: "text-red-600" };
    }

    const invoicedPrice = row.invoicedTotal / row.invoicedQty;

    if (
      row.invoicedQty === row.orderedQty &&
      Math.abs(invoicedPrice - row.orderedPrice) < 0.005
    ) {
      return { label: "Conferido", className: "text-emerald-600" };
    }

    if (row.invoicedQty !== row.orderedQty) {
      return {
        label:
          row.invoicedQty < row.orderedQty
            ? "Quantidade a menor"
            : "Quantidade a maior",
        className: "text-orange-600"
      };
    }

    return { label: "Preço diferente", className: "text-orange-600" };
  }

  const orderedTotal = getItemsTotal(items);
  const invoicedTotal = all.reduce((sum, row) => sum + row.invoicedTotal, 0);
  const difference = invoicedTotal - orderedTotal;
  const divergences = all.filter(
    (row) => getStatus(row).label !== "Conferido"
  ).length;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">
          Pedido x Nota fiscal
        </h4>

        <span
          className={
            divergences === 0
              ? "text-xs font-medium text-emerald-600"
              : "text-xs font-medium text-orange-600"
          }
        >
          {divergences === 0
            ? "Tudo conferido"
            : `${divergences} divergência(s)`}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="py-2 pr-3 text-right font-medium">Pedido</th>
              <th className="py-2 pr-3 text-right font-medium">Faturado</th>
              <th className="py-2 pr-3 text-right font-medium">Unit. pedido</th>
              <th className="py-2 pr-3 text-right font-medium">Unit. nota</th>
              <th className="py-2 font-medium">Situação</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {all.map((row, index) => {
              const status = getStatus(row);

              return (
                <tr key={`${row.name}-${index}`}>
                  <td className="py-2 pr-3 text-slate-900">{row.name}</td>
                  <td className="py-2 pr-3 text-right text-slate-700">
                    {row.orderedQty || "-"}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-700">
                    {row.invoicedQty || "-"}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-700">
                    {row.orderedQty ? formatBRL(row.orderedPrice) : "-"}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-700">
                    {row.invoicedQty
                      ? formatBRL(row.invoicedTotal / row.invoicedQty)
                      : "-"}
                  </td>
                  <td className={`py-2 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 border-t pt-3 text-sm">
        <span className="text-slate-600">
          Orçado: <strong>{formatBRL(orderedTotal)}</strong>
        </span>
        <span className="text-slate-600">
          Faturado: <strong>{formatBRL(invoicedTotal)}</strong>
        </span>
        <span
          className={
            Math.abs(difference) < 0.005
              ? "text-emerald-600"
              : "text-orange-600"
          }
        >
          Diferença:{" "}
          <strong>
            {difference > 0 ? "+" : ""}
            {formatBRL(difference)}
          </strong>
        </span>
      </div>
    </div>
  );
}