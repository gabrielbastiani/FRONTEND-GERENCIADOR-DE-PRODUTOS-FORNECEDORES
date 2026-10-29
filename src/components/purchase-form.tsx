"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, ImagePlus, Link2, Package, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type {
  Product,
  Purchase,
  PurchaseLinkOption,
  PurchaseXmlPreview,
  Supplier
} from "@/types";
import {
  calculateFreightShares,
  formatBRL,
  parseDecimal
} from "@/lib/purchase-calc";

type Row = {
  key: number;
  productId: string | null;
  name: string;
  code: string;
  quantity: string;
  unitPrice: string;
  imageUrl: string | null;
  customImage: boolean;
};

type InitialValues = {
  supplierId?: string;
  transactionId?: string;
  documentId?: string;
};

const inputClass =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500";

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  QUOTE_RECEIVED: "Orçamento recebido",
  UNDER_ANALYSIS: "Em análise",
  APPROVED: "Aprovado",
  ORDER_EFFECTIVE: "Pedido efetivado",
  PARTIALLY_RECEIVED: "Parcialmente recebido",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado"
};

function optionLabel(option: PurchaseLinkOption) {
  const reference = option.orderReference
    ? `Pedido ${option.orderReference}`
    : option.quoteReference
      ? `Orçamento ${option.quoteReference}`
      : "Sem referência";

  const status = statusLabels[option.status] ?? option.status;
  const bought =
    option.purchaseCount > 0
      ? ` · ${option.purchaseCount} compra(s) já registrada(s)`
      : "";

  return `${reference} · ${status}${bought}`;
}

export function PurchaseForm({
  purchase,
  initial
}: {
  purchase?: Purchase;
  initial?: InitialValues;
}) {
  const router = useRouter();
  const keyCounter = useRef(0);
  const initialized = useRef(false);
  const lockedContext = !purchase && Boolean(initial?.transactionId);

  function newKey() {
    keyCounter.current += 1;
    return keyCounter.current;
  }

  function emptyRow(): Row {
    return {
      key: newKey(),
      productId: null,
      name: "",
      code: "",
      quantity: "1",
      unitPrice: "",
      imageUrl: null,
      customImage: false
    };
  }

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [linkOptions, setLinkOptions] = useState<PurchaseLinkOption[]>([]);

  const [supplierId, setSupplierId] = useState(
    purchase?.supplierId ?? initial?.supplierId ?? ""
  );
  const [transactionId, setTransactionId] = useState(
    purchase?.transactionId ?? initial?.transactionId ?? ""
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    purchase?.invoiceNumber ?? ""
  );
  const [invoiceKey, setInvoiceKey] = useState(purchase?.invoiceKey ?? "");
  const [purchaseDate, setPurchaseDate] = useState(
    purchase?.purchaseDate?.slice(0, 10) ?? ""
  );
  const [freight, setFreight] = useState(
    purchase && purchase.freightTotal > 0 ? String(purchase.freightTotal) : ""
  );
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [source, setSource] = useState<"MANUAL" | "XML">(
    purchase?.source ?? "MANUAL"
  );

  const [rows, setRows] = useState<Row[]>(() =>
    purchase
      ? purchase.items.map((item) => ({
        key: newKey(),
        productId: item.productId,
        name: item.name,
        code: item.code ?? "",
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        imageUrl: item.imageUrl,
        customImage: !item.productId
      }))
      : [emptyRow()]
  );

  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listSuppliers()
      .then(setSuppliers)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!supplierId) {
      setProducts([]);
      setLinkOptions([]);
      return;
    }

    api
      .listProducts({ supplierId, page: 1, limit: 100 })
      .then((result) => setProducts(result.data))
      .catch(() => setProducts([]));

    api
      .listPurchaseLinkOptions(supplierId)
      .then(setLinkOptions)
      .catch(() => setLinkOptions([]));
  }, [supplierId]);

  // Abertura vinda do pedido: já traz o XML anexado ou o vínculo.
  useEffect(() => {
    if (initialized.current || purchase || !initial) {
      return;
    }

    initialized.current = true;

    if (initial.documentId) {
      importFromDocument(initial.documentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedOption = linkOptions.find(
    (option) => option.id === transactionId
  );

  const calculated = useMemo(() => {
    const base = rows.map((row) => ({
      quantity: parseDecimal(row.quantity),
      unitPrice: parseDecimal(row.unitPrice)
    }));

    const freightValue = parseDecimal(freight);
    const shares = calculateFreightShares(base, freightValue);

    const lines = base.map((item, index) => {
      const subtotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
      const total = subtotal + shares[index];

      return {
        subtotal,
        freightShare: shares[index],
        unitCost: item.quantity > 0 ? total / item.quantity : 0,
        total
      };
    });

    const itemsTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);

    return {
      lines,
      itemsTotal,
      freightValue,
      grandTotal: itemsTotal + freightValue
    };
  }, [rows, freight]);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function removeRow(key: number) {
    setRows((current) =>
      current.length === 1 ? [emptyRow()] : current.filter((r) => r.key !== key)
    );
  }

  async function handleImage(key: number, file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      setUploadingKey(key);
      setError("");

      const result = await api.uploadPurchaseImage(file);

      updateRow(key, { imageUrl: result.imageUrl, customImage: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingKey(null);
    }
  }

  function addProductFromSupplier(productId: string) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    const newRow: Row = {
      key: newKey(),
      productId: product.id,
      name: product.name,
      code: product.referenceCode ?? "",
      quantity: "1",
      unitPrice: product.cost ? String(product.cost) : "",
      imageUrl: product.images[0]?.fileUrl ?? null,
      customImage: false
    };

    setRows((current) => {
      const onlyBlank =
        current.length === 1 && !current[0].name && !current[0].productId;

      return onlyBlank ? [newRow] : [...current, newRow];
    });
  }

  function handleSupplierChange(value: string) {
    setSupplierId(value);
    setTransactionId("");
  }

  function handleTransactionChange(value: string) {
    setTransactionId(value);

    const option = linkOptions.find((item) => item.id === value);

    if (option && !purchaseDate && option.orderEffectiveDate) {
      setPurchaseDate(option.orderEffectiveDate.slice(0, 10));
    }
  }

  function applyPreview(preview: PurchaseXmlPreview) {
    const notices: string[] = [];

    setSource("XML");
    setInvoiceNumber(preview.invoiceNumber);
    setInvoiceKey(preview.invoiceKey);
    setPurchaseDate(preview.purchaseDate);
    setFreight(preview.freightTotal > 0 ? String(preview.freightTotal) : "");

    if (preview.supplierId) {
      if (!lockedContext) {
        setSupplierId(preview.supplierId);
      }
    } else if (!lockedContext) {
      notices.push(
        `Fornecedor não encontrado pelo CNPJ ${preview.issuer.document} (${preview.issuer.name}). Selecione o fornecedor manualmente. Para a identificação automática, cadastre o CNPJ no campo documento do fornecedor.`
      );
    }

    if (preview.transactionId && !lockedContext) {
      setTransactionId(preview.transactionId);
    }

    if (preview.alreadyImportedPurchaseId) {
      notices.push(
        "Atenção: esta nota fiscal já foi cadastrada anteriormente. Ao salvar, o sistema vai recusar a duplicidade."
      );
    }

    const linked = preview.items.filter((item) => item.productId).length;

    notices.push(
      `${preview.items.length} item(ns) lido(s) do XML, ${linked} vinculado(s) a produtos cadastrados.`
    );

    if (preview.freightTotal > 0) {
      notices.push(
        "O frete veio do XML. Se o frete não for por sua conta, zere o campo."
      );
    }

    setRows(
      preview.items.map((item) => ({
        key: newKey(),
        productId: item.productId,
        name: item.name,
        code: item.code,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        imageUrl: item.imageUrl,
        customImage: false
      }))
    );

    setWarnings(notices);
  }

  async function handleXml(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      setImporting(true);
      setError("");

      applyPreview(await api.parsePurchaseXml(file));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  async function importFromDocument(documentId: string) {
    try {
      setImporting(true);
      setError("");

      const preview = await api.parsePurchaseDocumentXml(documentId);

      applyPreview(preview);

      if (initial?.transactionId && !preview.transactionId) {
        setTransactionId(initial.transactionId);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!supplierId) {
      setError("Selecione o fornecedor.");
      return;
    }

    const filled = rows.filter((row) => row.name.trim() || row.productId);

    if (filled.length === 0) {
      setError("Informe ao menos um produto.");
      return;
    }

    for (const row of filled) {
      if (!row.name.trim()) {
        setError("Informe o nome de todos os produtos.");
        return;
      }

      if (parseDecimal(row.quantity) <= 0) {
        setError(`Informe uma quantidade válida para "${row.name}".`);
        return;
      }
    }

    const payload = {
      supplierId,
      transactionId: transactionId || null,
      invoiceNumber: invoiceNumber.trim() || null,
      invoiceKey: invoiceKey.trim() || null,
      purchaseDate: purchaseDate || null,
      freightTotal: parseDecimal(freight),
      notes: notes.trim() || null,
      source,
      items: filled.map((row) => ({
        productId: row.productId,
        name: row.name.trim(),
        code: row.code.trim() || null,
        quantity: parseDecimal(row.quantity),
        unitPrice: parseDecimal(row.unitPrice),
        imageUrl: row.customImage ? row.imageUrl : null
      }))
    };

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      setSaving(true);

      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "O servidor demorou para responder. Verifique se o backend está rodando e tente novamente."
              )
            ),
          30000
        );
      });

      const saved = await Promise.race([
        purchase
          ? api.updatePurchase(purchase.id, payload)
          : api.createPurchase(payload),
        timeout
      ]);

      if (
        !purchase &&
        payload.transactionId &&
        selectedOption &&
        selectedOption.status !== "COMPLETED" &&
        selectedOption.status !== "CANCELLED"
      ) {
        const confirmed = window.confirm(
          "Compra registrada. Deseja marcar este pedido como Concluído?"
        );

        if (confirmed) {
          try {
            await api.updateCommercialTransactionStatus(
              payload.transactionId,
              {
                status: "COMPLETED",
                notes: payload.invoiceNumber
                  ? `Concluído após registro da NF ${payload.invoiceNumber}.`
                  : "Concluído após registro da compra."
              }
            );
          } catch {
            window.alert(
              "A compra foi salva, mas não foi possível atualizar o status. Altere manualmente na negociação."
            );
          }
        }
      }

      router.push(`/compras/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (timer) {
        clearTimeout(timer);
      }

      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {lockedContext && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Registrando compra para{" "}
          <strong>
            {selectedOption
              ? selectedOption.orderReference
                ? `o pedido ${selectedOption.orderReference}`
                : selectedOption.quoteReference
                  ? `o orçamento ${selectedOption.quoteReference}`
                  : "a negociação selecionada"
              : "a negociação selecionada"}
          </strong>
          {suppliers.find((item) => item.id === supplierId)
            ? ` · ${suppliers.find((item) => item.id === supplierId)?.name}`
            : ""}
          . Fornecedor e vínculo já estão definidos.
        </div>
      )}

      <section className="rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Importar XML da nota fiscal
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              O sistema preenche fornecedor, nota, data, frete e produtos.
              Você revisa tudo antes de salvar.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            <FileUp size={17} />
            {importing ? "Lendo XML..." : "Selecionar XML"}
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              disabled={importing}
              className="hidden"
              onChange={(event) => {
                handleXml(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {warnings.length > 0 && (
          <ul className="mt-4 space-y-2">
            {warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                {warning}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Dados da compra
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Fornecedor *
            </span>
            <select
              value={supplierId}
              disabled={lockedContext}
              onChange={(event) => handleSupplierChange(event.target.value)}
              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
            >
              <option value="">Selecione o fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Data da compra
            </span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className={inputClass}
            />
          </label>

          <div className="md:col-span-2 lg:col-span-3">
            <label>
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Link2 size={14} />
                Vincular a orçamento/pedido (opcional)
              </span>
              <select
                value={transactionId}
                disabled={!supplierId || lockedContext}
                onChange={(event) => handleTransactionChange(event.target.value)}
                className={`${inputClass} disabled:opacity-50 text-black`}
              >
                <option className="text-black" value="">
                  {supplierId
                    ? "Sem vínculo (compra avulsa)"
                    : "Selecione o fornecedor primeiro"}
                </option>
                {linkOptions.map((option) => (
                  <option className="text-black" key={option.id} value={option.id}>
                    {optionLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            {selectedOption && selectedOption.xmlDocuments.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500">
                  Este pedido já tem XML anexado:
                </span>
                {selectedOption.xmlDocuments.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    disabled={importing}
                    onClick={() => importFromDocument(document.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    <FileUp size={14} />
                    Preencher com {document.originalName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Número da nota fiscal
            </span>
            <input
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Chave de acesso (44 dígitos)
            </span>
            <input
              value={invoiceKey}
              onChange={(event) => setInvoiceKey(event.target.value)}
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Frete por sua conta (R$)
            </span>
            <input
              value={freight}
              onChange={(event) => setFreight(event.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              className={inputClass}
            />
          </label>

          <label className="md:col-span-2 lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Observações
            </span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Produtos comprados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              O frete é rateado automaticamente, proporcional ao valor de
              cada produto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value=""
              disabled={!supplierId || products.length === 0}
              onChange={(event) => addProductFromSupplier(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">
                {supplierId
                  ? "Adicionar produto cadastrado"
                  : "Selecione o fornecedor primeiro"}
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
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={16} />
              Linha manual
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Imagem</th>
                <th className="px-3 py-3">Produto</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Qtd.</th>
                <th className="px-3 py-3">Valor unit.</th>
                <th className="px-3 py-3">Frete rateado</th>
                <th className="px-3 py-3">Custo unit. c/ frete</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y">
              {rows.map((row, index) => {
                const line = calculated.lines[index];

                return (
                  <tr key={row.key}>
                    <td className="px-3 py-3">
                      <label
                        title="Clique para escolher a imagem"
                        className="group relative block h-11 w-11 cursor-pointer"
                      >
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.imageUrl}
                            alt={row.name}
                            className="h-11 w-11 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <Package size={18} />
                          </div>
                        )}

                        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-xs text-white opacity-0 transition group-hover:opacity-100">
                          {uploadingKey === row.key ? (
                            "..."
                          ) : (
                            <ImagePlus size={16} />
                          )}
                        </span>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={uploadingKey === row.key}
                          onChange={(event) => {
                            handleImage(row.key, event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>

                      {row.customImage && (
                        <button
                          type="button"
                          onClick={() =>
                            updateRow(row.key, {
                              imageUrl: null,
                              customImage: false
                            })
                          }
                          className="mt-1 text-xs text-red-500 hover:underline"
                        >
                          remover
                        </button>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={row.name}
                        onChange={(event) =>
                          updateRow(row.key, { name: event.target.value })
                        }
                        className={`${inputClass} min-w-[220px]`}
                      />
                      {row.productId && (
                        <span className="mt-1 block text-xs text-emerald-600">
                          Vinculado a produto cadastrado
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={row.code}
                        onChange={(event) =>
                          updateRow(row.key, { code: event.target.value })
                        }
                        className={`${inputClass} w-32`}
                      />
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.key, { quantity: event.target.value })
                        }
                        inputMode="decimal"
                        className={`${inputClass} w-24`}
                      />
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={row.unitPrice}
                        onChange={(event) =>
                          updateRow(row.key, { unitPrice: event.target.value })
                        }
                        placeholder="0,00"
                        inputMode="decimal"
                        className={`${inputClass} w-28`}
                      />
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {formatBRL(line.freightShare)}
                    </td>

                    <td className="px-3 py-3 font-medium text-slate-900">
                      {formatBRL(line.unitCost)}
                    </td>

                    <td className="px-3 py-3 text-slate-700">
                      {formatBRL(line.total)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        aria-label="Remover linha"
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Produtos</dt>
            <dd className="text-slate-900">
              {formatBRL(calculated.itemsTotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Frete</dt>
            <dd className="text-slate-900">
              {formatBRL(calculated.freightValue)}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt className="text-slate-900">Total</dt>
            <dd className="text-slate-900">
              {formatBRL(calculated.grandTotal)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex justify-end gap-2">
        <Link
          href={purchase ? `/compras/${purchase.id}` : "/compras"}
          className="rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving
            ? "Salvando..."
            : purchase
              ? "Salvar alterações"
              : "Salvar compra"}
        </button>
      </div>
    </form>
  );
}