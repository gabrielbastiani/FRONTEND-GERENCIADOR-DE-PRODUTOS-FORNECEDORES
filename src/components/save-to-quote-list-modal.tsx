"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { QuoteList } from "@/types";

type SaveToQuoteListModalProps = {
  open: boolean;
  onClose: () => void;
  supplier?: { id: string; name?: string | null };
  productIds: string[];
  onSaved?: () => void;
};

type SaveResult = {
  list: QuoteList;
  added: number;
  skipped: number;
  created: boolean;
};

export function SaveToQuoteListModal({
  open,
  onClose,
  supplier,
  productIds,
  onSaved
}: SaveToQuoteListModalProps) {
  const [lists, setLists] = useState<QuoteList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedListId, setSelectedListId] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SaveResult | null>(null);

  const supplierId = supplier?.id;

  useEffect(() => {
    if (!open || !supplierId) {
      return;
    }

    let cancelled = false;

    setResult(null);
    setError("");
    setNewName("");

    async function loadLists() {
      try {
        setLoadingLists(true);

        const data = await api.listQuoteLists({
          status: "DRAFT",
          supplierId
        });

        if (cancelled) {
          return;
        }

        setLists(data);

        if (data.length > 0) {
          setMode("existing");
          setSelectedListId(data[0].id);
        } else {
          setMode("new");
          setSelectedListId("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoadingLists(false);
        }
      }
    }

    loadLists();

    return () => {
      cancelled = true;
    };
  }, [open, supplierId]);

  const selectedList = lists.find((item) => item.id === selectedListId);

  const alreadyInSelectedList =
    mode === "existing" && selectedList
      ? productIds.filter((id) =>
          selectedList.items.some((item) => item.productId === id)
        ).length
      : 0;

  function handleClose() {
    if (saving) {
      return;
    }

    if (result) {
      onSaved?.();
    }

    onClose();
  }

  async function handleSave() {
    if (!supplierId || productIds.length === 0) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (mode === "existing" && selectedListId) {
        const skipped = alreadyInSelectedList;

        const updated = await api.addItemsToQuoteList(
          selectedListId,
          productIds
        );

        setResult({
          list: updated,
          added: productIds.length - skipped,
          skipped,
          created: false
        });
      } else {
        const created = await api.createQuoteList({
          name: newName.trim() || undefined,
          supplierId,
          productIds
        });

        setResult({
          list: created,
          added: created.items.length,
          skipped: 0,
          created: true
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open || !supplier) {
    return null;
  }

  const canSave =
    productIds.length > 0 &&
    !saving &&
    !loadingLists &&
    (mode === "new" || !!selectedListId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Salvar em lista de orçamento"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Salvar em lista de orçamento
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {supplier.name || "Fornecedor"} ·{" "}
              {productIds.length === 1
                ? "1 produto"
                : `${productIds.length} produtos`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <Check size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  {result.created
                    ? `Lista "${result.list.name}" criada com ${result.added} produto(s).`
                    : result.added > 0
                      ? `${result.added} produto(s) adicionado(s) à lista "${result.list.name}".`
                      : `O produto já estava na lista "${result.list.name}".`}
                </p>

                {!result.created &&
                  result.added > 0 &&
                  result.skipped > 0 && (
                    <p className="mt-1 text-xs">
                      {result.skipped} já estava(m) na lista e não foi(ram)
                      duplicado(s).
                    </p>
                  )}

                <p className="mt-1 text-xs">
                  A lista agora tem {result.list.items.length} produto(s).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>

              <Link
                href={`/listas-orcamento/${result.list.id}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Abrir lista
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-5">
              {loadingLists ? (
                <p className="text-sm text-slate-500">
                  Carregando listas...
                </p>
              ) : (
                <>
                  {lists.length > 0 && (
                    <div className="flex rounded-lg border bg-slate-50 p-1 text-sm">
                      <button
                        type="button"
                        onClick={() => setMode("existing")}
                        className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
                          mode === "existing"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Lista existente
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("new")}
                        className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
                          mode === "new"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Nova lista
                      </button>
                    </div>
                  )}

                  {mode === "existing" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Escolha o rascunho
                      </label>
                      <select
                        value={selectedListId}
                        onChange={(event) =>
                          setSelectedListId(event.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                      >
                        {lists.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.items.length})
                          </option>
                        ))}
                      </select>

                      {alreadyInSelectedList > 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          {alreadyInSelectedList === productIds.length
                            ? "Os produtos selecionados já estão nesta lista."
                            : `${alreadyInSelectedList} produto(s) já estão nesta lista e serão ignorados.`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Nome da lista
                      </label>
                      <input
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        placeholder={`Ex.: Cotação - ${
                          supplier.name || "fornecedor"
                        }`}
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Se deixar em branco, o sistema usa um nome padrão.
                      </p>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : mode === "existing"
                    ? "Adicionar à lista"
                    : "Criar lista"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}