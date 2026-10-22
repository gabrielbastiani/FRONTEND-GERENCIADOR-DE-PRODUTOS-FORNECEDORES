"use client";

import {
  FileText,
  LoaderCircle,
  PackageCheck,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  getErrorMessage
} from "@/lib/utils";
import type {
  CommercialTransaction,
  CommercialTransactionStatus,
  SupplierDocumentType
} from "@/types";

type CommercialTransactionsProps = {
  supplierId: string;
};

const statusLabels: Record<
  CommercialTransactionStatus,
  string
> = {
  DRAFT: "Rascunho",
  QUOTE_RECEIVED: "Orçamento recebido",
  UNDER_ANALYSIS: "Em análise",
  APPROVED: "Aprovado",
  ORDER_EFFECTIVE: "Pedido efetivado",
  PARTIALLY_RECEIVED: "Recebido parcialmente",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado"
};

const statusClasses: Record<
  CommercialTransactionStatus,
  string
> = {
  DRAFT: "bg-slate-100 text-slate-700",
  QUOTE_RECEIVED: "bg-blue-100 text-blue-700",
  UNDER_ANALYSIS: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  ORDER_EFFECTIVE: "bg-indigo-100 text-indigo-700",
  PARTIALLY_RECEIVED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700"
};

const documentTypeLabels: Record<
  SupplierDocumentType,
  string
> = {
  QUOTE: "Orçamento",
  PURCHASE_ORDER: "Pedido",
  INVOICE: "Nota fiscal",
  OTHER: "Outro"
};

function toInputDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.substring(0, 10);
}

function getStatusLabel(
  status: CommercialTransactionStatus
) {
  return statusLabels[status] ?? status;
}

export function CommercialTransactions({
  supplierId
}: CommercialTransactionsProps) {
  const [transactions, setTransactions] = useState<
    CommercialTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [showOrderForm, setShowOrderForm] =
    useState<string | null>(null);

  const [expandedTransaction, setExpandedTransaction] =
    useState<string | null>(null);

  const [deletingTransaction, setDeletingTransaction] =
    useState<string | null>(null);

  const [deletingDocument, setDeletingDocument] =
    useState<string | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [createForm, setCreateForm] = useState({
    quoteReference: "",
    quoteDate: "",
    notes: ""
  });

  const [orderForm, setOrderForm] = useState({
    orderReference: "",
    orderEffectiveDate: "",
    notes: ""
  });

  const [documentForm, setDocumentForm] = useState({
    type: "QUOTE" as SupplierDocumentType,
    title: "",
    documentNumber: "",
    documentDate: "",
    notes: ""
  });

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const data = await api.listCommercialTransactions({
        supplierId
      });

      setTransactions(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [supplierId]);

  async function handleCreateTransaction(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!createForm.quoteReference.trim()) {
      setError("Informe a referência do orçamento.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.createCommercialTransaction({
        supplierId,
        quoteReference: createForm.quoteReference.trim(),
        quoteDate: createForm.quoteDate || undefined,
        status: "QUOTE_RECEIVED",
        notes: createForm.notes.trim() || undefined
      });

      setCreateForm({
        quoteReference: "",
        quoteDate: "",
        notes: ""
      });

      setShowCreateForm(false);
      setMessage("Orçamento cadastrado com sucesso.");
      await loadTransactions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openOrderForm(transaction: CommercialTransaction) {
    setShowOrderForm(transaction.id);

    setOrderForm({
      orderReference: transaction.orderReference ?? "",
      orderEffectiveDate:
        toInputDate(transaction.orderEffectiveDate) ||
        new Date().toISOString().substring(0, 10),
      notes: ""
    });

    setError("");
    setMessage("");
  }

  async function handleEffectiveOrder(
    event: React.FormEvent<HTMLFormElement>,
    transactionId: string
  ) {
    event.preventDefault();

    if (!orderForm.orderReference.trim()) {
      setError("Informe a referência do pedido.");
      return;
    }

    if (!orderForm.orderEffectiveDate) {
      setError("Informe a data de efetivação do pedido.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.updateCommercialTransactionStatus(
        transactionId,
        {
          status: "ORDER_EFFECTIVE",
          orderReference:
            orderForm.orderReference.trim(),
          orderEffectiveDate:
            orderForm.orderEffectiveDate,
          notes: orderForm.notes.trim() || undefined
        }
      );

      setShowOrderForm(null);
      setMessage("Pedido efetivado com sucesso.");
      await loadTransactions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStatus(
    transaction: CommercialTransaction,
    status: CommercialTransactionStatus
  ) {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.updateCommercialTransactionStatus(
        transaction.id,
        {
          status,
          notes: `Status alterado para ${getStatusLabel(status)}.`
        }
      );

      setMessage("Status atualizado com sucesso.");
      await loadTransactions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadDocument(
    event: React.FormEvent<HTMLFormElement>,
    transactionId: string
  ) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Selecione um arquivo.");
      return;
    }

    if (!documentForm.title.trim()) {
      setError("Informe o título do documento.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("O arquivo não pode ultrapassar 50 MB.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      await api.uploadTransactionDocument({
        transactionId,
        type: documentForm.type,
        title: documentForm.title.trim(),
        documentNumber:
          documentForm.documentNumber.trim() || undefined,
        documentDate:
          documentForm.documentDate || undefined,
        notes: documentForm.notes.trim() || undefined,
        file: selectedFile
      });

      setSelectedFile(null);

      setDocumentForm({
        type: "QUOTE",
        title: "",
        documentNumber: "",
        documentDate: "",
        notes: ""
      });

      setMessage("Documento anexado com sucesso.");
      await loadTransactions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(
    transactionId: string,
    documentId: string
  ) {
    const confirmed = window.confirm(
      "Deseja realmente excluir este documento?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingDocument(documentId);
      setError("");
      setMessage("");

      await api.deleteTransactionDocument(
        transactionId,
        documentId
      );

      setMessage("Documento excluído com sucesso.");
      await loadTransactions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingDocument(null);
    }
  }

  async function handleDeleteTransaction(
    transaction: CommercialTransaction
  ) {
    const confirmed = window.confirm(
      "Deseja realmente excluir este orçamento/pedido e todos os documentos vinculados?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingTransaction(transaction.id);
      setError("");
      setMessage("");

      await api.deleteCommercialTransaction(
        transaction.id
      );

      setMessage("Registro comercial excluído com sucesso.");
      await loadTransactions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingTransaction(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle
            size={17}
            className="animate-spin"
          />
          Carregando orçamentos e pedidos...
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck
              size={21}
              className="text-blue-600"
            />

            <h2 className="text-lg font-semibold text-slate-900">
              Orçamentos e pedidos
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Controle referências, datas, status e documentos comerciais deste fornecedor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadTransactions}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setError("");
              setMessage("");
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            Novo orçamento
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={handleCreateTransaction}
          className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Novo orçamento
            </h3>

            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-md p-1 text-slate-500 hover:bg-white"
              aria-label="Fechar formulário"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Referência do orçamento *
              </span>

              <input
                value={createForm.quoteReference}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    quoteReference: event.target.value
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="ORC-2026-001"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Data do orçamento
              </span>

              <input
                type="date"
                value={createForm.quoteDate}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    quoteDate: event.target.value
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Observações
            </span>

            <textarea
              rows={3}
              value={createForm.notes}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  notes: event.target.value
                }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar orçamento"}
          </button>
        </form>
      )}

      {transactions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
          Nenhum orçamento ou pedido cadastrado para este fornecedor.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {transactions.map((transaction) => {
            const isExpanded =
              expandedTransaction === transaction.id;

            const isOrderFormOpen =
              showOrderForm === transaction.id;

            return (
              <article
                key={transaction.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {transaction.quoteReference ||
                          "Sem referência de orçamento"}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusClasses[transaction.status]
                        }`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                      <span>
                        Orçamento:{" "}
                        {formatDate(transaction.quoteDate)}
                      </span>

                      <span>
                        Pedido:{" "}
                        {transaction.orderReference || "-"}
                      </span>

                      <span>
                        Efetivado em:{" "}
                        {formatDate(
                          transaction.orderEffectiveDate
                        )}
                      </span>

                      <span>
                        Documentos:{" "}
                        {transaction._count?.documents ?? 0}
                      </span>
                    </div>

                    {transaction.notes && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-500">
                        {transaction.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {transaction.status !==
                      "ORDER_EFFECTIVE" &&
                      transaction.status !== "COMPLETED" &&
                      transaction.status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() =>
                            openOrderForm(transaction)
                          }
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                        >
                          Efetivar pedido
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTransaction(
                          isExpanded ? null : transaction.id
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {isExpanded
                        ? "Ocultar documentos"
                        : "Documentos"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteTransaction(transaction)
                      }
                      disabled={
                        deletingTransaction === transaction.id
                      }
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Excluir orçamento ou pedido"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                {isOrderFormOpen && (
                  <form
                    onSubmit={(event) =>
                      handleEffectiveOrder(
                        event,
                        transaction.id
                      )
                    }
                    className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-medium text-slate-900">
                        Efetivar pedido
                      </h4>

                      <button
                        type="button"
                        onClick={() => setShowOrderForm(null)}
                        className="rounded-md p-1 text-slate-500 hover:bg-white"
                        aria-label="Fechar formulário"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-sm font-medium text-slate-700">
                          Referência do pedido *
                        </span>

                        <input
                          value={orderForm.orderReference}
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              orderReference:
                                event.target.value
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                          placeholder="PED-2026-001"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-sm font-medium text-slate-700">
                          Data de efetivação *
                        </span>

                        <input
                          type="date"
                          value={
                            orderForm.orderEffectiveDate
                          }
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              orderEffectiveDate:
                                event.target.value
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block space-y-1">
                      <span className="text-sm font-medium text-slate-700">
                        Observações
                      </span>

                      <textarea
                        rows={2}
                        value={orderForm.notes}
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            notes: event.target.value
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={saving}
                      className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {saving
                        ? "Salvando..."
                        : "Confirmar pedido"}
                    </button>
                  </form>
                )}

                {isExpanded && (
                  <div className="mt-5 border-t pt-5">
                    <form
                      onSubmit={(event) =>
                        handleUploadDocument(
                          event,
                          transaction.id
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Upload
                          size={18}
                          className="text-blue-600"
                        />

                        <h4 className="font-medium text-slate-900">
                          Anexar documento
                        </h4>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-sm font-medium text-slate-700">
                            Tipo
                          </span>

                          <select
                            value={documentForm.type}
                            onChange={(event) =>
                              setDocumentForm((current) => ({
                                ...current,
                                type: event.target
                                  .value as SupplierDocumentType
                              }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                          >
                            <option value="QUOTE">
                              Orçamento
                            </option>
                            <option value="PURCHASE_ORDER">
                              Pedido
                            </option>
                            <option value="INVOICE">
                              Nota fiscal
                            </option>
                            <option value="OTHER">
                              Outro
                            </option>
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm font-medium text-slate-700">
                            Título *
                          </span>

                          <input
                            value={documentForm.title}
                            onChange={(event) =>
                              setDocumentForm((current) => ({
                                ...current,
                                title: event.target.value
                              }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                            placeholder="Orçamento enviado por e-mail"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm font-medium text-slate-700">
                            Número do documento
                          </span>

                          <input
                            value={documentForm.documentNumber}
                            onChange={(event) =>
                              setDocumentForm((current) => ({
                                ...current,
                                documentNumber:
                                  event.target.value
                              }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm font-medium text-slate-700">
                            Data do documento
                          </span>

                          <input
                            type="date"
                            value={documentForm.documentDate}
                            onChange={(event) =>
                              setDocumentForm((current) => ({
                                ...current,
                                documentDate:
                                  event.target.value
                              }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                        </label>
                      </div>

                      <label className="mt-4 block space-y-1">
                        <span className="text-sm font-medium text-slate-700">
                          Arquivo *
                        </span>

                        <input
                          type="file"
                          accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                          onChange={(event) =>
                            setSelectedFile(
                              event.target.files?.[0] ??
                                null
                            )
                          }
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />

                        <span className="text-xs text-slate-500">
                          PDF, XML, imagens, documentos ou planilhas, até 50 MB.
                        </span>
                      </label>

                      {selectedFile && (
                        <p className="mt-2 text-xs text-slate-600">
                          Arquivo selecionado:{" "}
                          <strong>
                            {selectedFile.name}
                          </strong>{" "}
                          ({formatFileSize(selectedFile.size)})
                        </p>
                      )}

                      <label className="mt-4 block space-y-1">
                        <span className="text-sm font-medium text-slate-700">
                          Observações
                        </span>

                        <textarea
                          rows={2}
                          value={documentForm.notes}
                          onChange={(event) =>
                            setDocumentForm((current) => ({
                              ...current,
                              notes: event.target.value
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={uploading}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Upload size={16} />
                        {uploading
                          ? "Enviando..."
                          : "Anexar documento"}
                      </button>
                    </form>

                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-slate-900">
                        Documentos anexados
                      </h4>

                      {transaction.documents &&
                      transaction.documents.length > 0 ? (
                        transaction.documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                                <FileText size={18} />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {document.title}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {documentTypeLabels[document.type]}{" "}
                                  · {document.originalName}
                                </p>

                                <p className="text-xs text-slate-500">
                                  Adicionado em{" "}
                                  {formatDateTime(
                                    document.createdAt
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              {document.fileUrl && (
                                <a
                                  href={document.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Abrir
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteDocument(
                                    transaction.id,
                                    document.id
                                  )
                                }
                                disabled={
                                  deletingDocument ===
                                  document.id
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                aria-label="Excluir documento"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">
                          Nenhum documento anexado.
                        </p>
                      )}
                    </div>

                    <div className="mt-5">
                      <label className="block text-sm font-medium text-slate-700">
                        Alterar status
                      </label>

                      <select
                        value={transaction.status}
                        disabled={saving}
                        onChange={(event) =>
                          handleChangeStatus(
                            transaction,
                            event.target
                              .value as CommercialTransactionStatus
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 sm:max-w-xs"
                      >
                        {Object.entries(statusLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}