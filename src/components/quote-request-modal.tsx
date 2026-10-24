"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Mail, MessageCircle, X } from "lucide-react";
import {
  DEFAULT_REQUESTER_NAME,
  buildMailtoUrl,
  buildQuoteMessage,
  buildWhatsAppUrl,
  type QuoteProduct,
  type QuoteSupplier
} from "@/lib/quote-request";

type QuoteRequestModalProps = {
  open: boolean;
  onClose: () => void;
  supplier: QuoteSupplier;
  products: QuoteProduct[];
};

const STORAGE_KEY = "quote-requester-name";
const MAX_SAFE_URL_LENGTH = 4000;

export function QuoteRequestModal({
  open,
  onClose,
  supplier,
  products
}: QuoteRequestModalProps) {
  const [requesterName, setRequesterName] = useState(
    DEFAULT_REQUESTER_NAME
  );
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Recupera o nome salvo neste navegador
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      setRequesterName(saved);
    }
  }, []);

  // Ao abrir, volta para o texto padrão
  useEffect(() => {
    if (open) {
      setCustomMessage(null);
      setCopied(false);
    }
  }, [open]);

  // Fecha com ESC
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const generatedMessage = useMemo(
    () => buildQuoteMessage(requesterName, products),
    [requesterName, products]
  );

  const message = customMessage ?? generatedMessage;

  const whatsappUrl = supplier.phone?.trim()
    ? buildWhatsAppUrl(supplier.phone, message)
    : null;

  const email = supplier.email?.trim() ?? "";
  const emailUrl = email.includes("@")
    ? buildMailtoUrl(
        email,
        `Solicitação de orçamento${
          supplier.name ? ` - ${supplier.name}` : ""
        }`,
        message
      )
    : null;

  const urlTooLong =
    !!whatsappUrl && whatsappUrl.length > MAX_SAFE_URL_LENGTH;

  function handleNameChange(value: string) {
    setRequesterName(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Solicitar orçamento"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Solicitar orçamento
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {supplier.name || "Fornecedor"} ·{" "}
              {products.length === 1
                ? "1 produto"
                : `${products.length} produtos`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Seu nome na mensagem
            </label>
            <input
              value={requesterName}
              onChange={(event) => handleNameChange(event.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                Mensagem (você pode editar antes de enviar)
              </label>

              {customMessage !== null && (
                <button
                  type="button"
                  onClick={() => setCustomMessage(null)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Restaurar texto padrão
                </button>
              )}
            </div>

            <textarea
              value={message}
              onChange={(event) => setCustomMessage(event.target.value)}
              rows={14}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {urlTooLong && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A lista é grande e o link do WhatsApp pode não carregar o
              texto completo. Use &quot;Copiar texto&quot; e cole direto
              na conversa.
            </div>
          )}

          {!whatsappUrl && !emailUrl && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Este fornecedor não tem telefone nem e-mail válidos
              cadastrados. Use &quot;Copiar texto&quot; ou atualize o
              cadastro do fornecedor.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t p-5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copiado" : "Copiar texto"}
          </button>

          {emailUrl && (
            <a
              href={emailUrl}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Mail size={16} />
              Enviar e-mail
            </a>
          )}

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle size={16} />
              Enviar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}