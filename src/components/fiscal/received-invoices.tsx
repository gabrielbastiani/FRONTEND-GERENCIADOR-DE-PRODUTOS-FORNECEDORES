"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/purchase-calc";
import { getErrorMessage } from "@/lib/utils";
import type {
  FiscalCertificate,
  ReceivedInvoice,
  ReceivedInvoiceList
} from "@/types";

const UF_OPTIONS = [
  [11, "RO"], [12, "AC"], [13, "AM"], [14, "RR"], [15, "PA"], [16, "AP"],
  [17, "TO"], [21, "MA"], [22, "PI"], [23, "CE"], [24, "RN"], [25, "PB"],
  [26, "PE"], [27, "AL"], [28, "SE"], [29, "BA"], [31, "MG"], [32, "ES"],
  [33, "RJ"], [35, "SP"], [41, "PR"], [42, "SC"], [43, "RS"], [50, "MS"],
  [51, "MT"], [52, "GO"], [53, "DF"]
] as const;

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "-";
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

function formatCnpj(value: string) {
  const cnpj = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cnpj.length === 14
    ? cnpj.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5")
    : value;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function ReceivedInvoices() {
  const [certificate, setCertificate] = useState<FiscalCertificate | null>(null);
  const [certificateLoaded, setCertificateLoaded] = useState(false);
  const [list, setList] = useState<ReceivedInvoiceList | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [ufCode, setUfCode] = useState(35);
  const [environment, setEnvironment] = useState(1);
  const [autoCiencia, setAutoCiencia] = useState(false);
  const [cnpjManual, setCnpjManual] = useState("");
  const [accessKey, setAccessKey] = useState("");

  const loadCertificate = useCallback(async () => {
    try {
      setCertificate(await api.getFiscalCertificate());
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setCertificateLoaded(true);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      setList(await api.listReceivedInvoices({ search, status, page, limit: 20 }));
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    }
  }, [search, status, page]);

  useEffect(() => {
    loadCertificate();
  }, [loadCertificate]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  async function run(key: string, action: () => Promise<string | void>) {
    try {
      setBusy(key);
      setMessage(null);

      const text = await action();

      if (text) {
        setMessage({ type: "ok", text });
      }
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  function handleSaveCertificate() {
    if (!pfxFile || !password) {
      setMessage({ type: "error", text: "Selecione o arquivo .pfx e informe a senha." });
      return;
    }

    run("save", async () => {
      const saved = await api.saveFiscalCertificate({
        pfxBase64: await readFileAsBase64(pfxFile),
        password,
        ufCode,
        environment,
        autoCiencia,
        autoSync: true,
        cnpj: cnpjManual || undefined
      });

      setCertificate(saved);
      setPfxFile(null);
      setPassword("");

      return "Certificado salvo com sucesso. Clique em \"Sincronizar agora\" para buscar as notas.";
    });
  }

  function handleSync() {
    run("sync", async () => {
      const result = await api.syncFiscalNow();

      setCertificate(result.certificate);
      await loadInvoices();

      return result.message;
    });
  }

  function handleRemoveCertificate() {
    if (!window.confirm("Remover o certificado e todas as notas recebidas já sincronizadas?")) {
      return;
    }

    run("remove", async () => {
      await api.deleteFiscalCertificate();
      setCertificate(null);
      await loadInvoices();

      return "Certificado removido.";
    });
  }

  function handleToggle(patch: { autoCiencia?: boolean; autoSync?: boolean }) {
    run("toggle", async () => {
      setCertificate(await api.updateFiscalCertificate(patch));
    });
  }

  function handleFetchByKey() {
    run("key", async () => {
      const result = await api.fetchInvoiceByKey(accessKey.replace(/\D/g, ""));

      setAccessKey("");
      await loadInvoices();

      return result.hasFullXml
        ? "Nota localizada com XML completo."
        : "Nota localizada apenas em resumo. Dê ciência da operação para liberar o XML.";
    });
  }

  async function handleDownload(invoice: ReceivedInvoice) {
    run(`xml-${invoice.id}`, async () => {
      const file = await api.getReceivedInvoiceXml(invoice.id);
      const url = URL.createObjectURL(new Blob([file.xml], { type: "application/xml" }));
      const link = document.createElement("a");

      link.href = url;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleManifest(invoice: ReceivedInvoice) {
    if (
      !window.confirm(
        "A ciência da operação é uma declaração registrada na SEFAZ em nome da empresa. Deseja continuar?"
      )
    ) {
      return;
    }

    run(`manifest-${invoice.id}`, async () => {
      await api.manifestReceivedInvoice(invoice.id, "CIENCIA");
      await loadInvoices();

      return "Ciência registrada. O XML completo costuma ficar disponível em instantes.";
    });
  }

  function handleFetchXml(invoice: ReceivedInvoice) {
    run(`fetch-${invoice.id}`, async () => {
      const result = await api.fetchReceivedInvoiceXml(invoice.id);

      await loadInvoices();

      return result.hasFullXml
        ? "XML completo obtido."
        : "A SEFAZ ainda não liberou o XML completo. Tente novamente em alguns minutos.";
    });
  }

  const blocked =
    certificate?.blockedUntil &&
    // eslint-disable-next-line react-hooks/purity
    new Date(certificate.blockedUntil).getTime() > Date.now();

  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.limit)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Notas recebidas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Notas fiscais emitidas contra o CNPJ da empresa, obtidas direto da SEFAZ.
        </p>
      </div>

      {message && (
        <div
          className={
            message.type === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
              : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          }
        >
          {message.text}
        </div>
      )}

      {certificateLoaded && !certificate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck size={16} />
            Configurar certificado digital A1
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Arquivo do certificado (.pfx)
              <input
                type="file"
                accept=".pfx,.p12"
                onChange={(event) => setPfxFile(event.target.files?.[0] ?? null)}
                className={`${inputClass} mt-1`}
              />
            </label>

            <label className="text-sm text-slate-700">
              Senha do certificado
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} mt-1`}
                autoComplete="off"
              />
            </label>

            <label className="text-sm text-slate-700">
              UF da empresa
              <select
                value={ufCode}
                onChange={(event) => setUfCode(Number(event.target.value))}
                className={`${inputClass} mt-1`}
              >
                {UF_OPTIONS.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Ambiente
              <select
                value={environment}
                onChange={(event) => setEnvironment(Number(event.target.value))}
                className={`${inputClass} mt-1`}
              >
                <option value={1}>Produção (notas reais)</option>
                <option value={2}>Homologação (testes)</option>
              </select>
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              CNPJ da empresa (só se não for identificado automaticamente no certificado)
              <input
                value={cnpjManual}
                onChange={(event) => setCnpjManual(event.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoCiencia}
              onChange={(event) => setAutoCiencia(event.target.checked)}
              className="mt-1"
            />
            <span>
              Dar ciência da operação automaticamente nas notas novas. A ciência é uma
              declaração registrada na SEFAZ em nome da empresa e é necessária para
              liberar o XML completo.
            </span>
          </label>

          <button
            type="button"
            onClick={handleSaveCertificate}
            disabled={busy === "save"}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy === "save" ? "Salvando..." : "Salvar certificado"}
          </button>
        </section>
      )}

      {certificate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck size={16} />
                {certificate.companyName || "Certificado digital"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                CNPJ {formatCnpj(certificate.cnpj)} ·{" "}
                {certificate.environment === 1 ? "Produção" : "Homologação"} · válido até{" "}
                {formatDate(certificate.validTo)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Última sincronização: {formatDateTime(certificate.lastSyncAt)}
                {certificate.lastSyncStatus === "ERROR" ? " (com erro)" : ""}
                {certificate.lastSyncMessage ? ` · ${certificate.lastSyncMessage}` : ""}
              </p>
              {blocked && (
                <p className="mt-1 text-xs text-amber-700">
                  Próxima consulta liberada pela SEFAZ em {formatDateTime(certificate.blockedUntil)}.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSync}
                disabled={busy === "sync" || Boolean(blocked)}
                className={buttonClass}
              >
                <RefreshCw size={14} className={busy === "sync" ? "animate-spin" : ""} />
                {busy === "sync" ? "Sincronizando..." : "Sincronizar agora"}
              </button>

              <button
                type="button"
                onClick={handleRemoveCertificate}
                disabled={busy === "remove"}
                className={`${buttonClass} hover:border-red-300 hover:text-red-600`}
              >
                <Trash2 size={14} />
                Remover
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={certificate.autoSync}
                onChange={(event) => handleToggle({ autoSync: event.target.checked })}
              />
              Sincronização automática
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={certificate.autoCiencia}
                onChange={(event) => handleToggle({ autoCiencia: event.target.checked })}
              />
              Ciência automática das notas novas
            </label>
          </div>
        </section>
      )}

      {certificate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[280px] flex-1 text-sm text-slate-700">
              Buscar nota pela chave de acesso (44 dígitos)
              <input
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="Cole a chave que consta no DANFE"
              />
            </label>

            <button
              type="button"
              onClick={handleFetchByKey}
              disabled={busy === "key" || accessKey.replace(/\D/g, "").length !== 44}
              className={buttonClass}
            >
              <FileSearch size={14} />
              {busy === "key" ? "Buscando..." : "Buscar"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className={`${inputClass} max-w-xs`}
              placeholder="Fornecedor, CNPJ, número ou chave"
            />

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={`${inputClass} max-w-[220px]`}
            >
              <option value="all">Todas</option>
              <option value="withXml">Com XML completo</option>
              <option value="summary">Somente resumo</option>
              <option value="unlinked">Fornecedor não cadastrado</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-3 font-medium">Emissão</th>
                  <th className="py-2 pr-3 font-medium">Fornecedor</th>
                  <th className="py-2 pr-3 font-medium">NF / Série</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                  <th className="py-2 pr-3 font-medium">XML</th>
                  <th className="py-2 pr-3 font-medium">Manifestação</th>
                  <th className="py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {list?.data.map((invoice) => (
                  <tr key={invoice.id} className={invoice.cancelled ? "opacity-60" : ""}>
                    <td className="py-2 pr-3 text-slate-700">{formatDate(invoice.issuedAt)}</td>
                    <td className="py-2 pr-3">
                      <div className="text-slate-900">{invoice.issuerName}</div>
                      <div className="text-xs text-slate-500">
                        {formatCnpj(invoice.issuerCnpj)}
                        {invoice.supplier ? ` · ${invoice.supplier.name}` : " · não cadastrado"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-slate-700">
                      {invoice.number ?? "-"} / {invoice.series ?? "-"}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-900">
                      {formatBRL(invoice.totalValue)}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {invoice.cancelled ? (
                        <span className="font-medium text-red-600">Cancelada</span>
                      ) : invoice.hasFullXml ? (
                        <span className="font-medium text-emerald-600">Completo</span>
                      ) : (
                        <span className="font-medium text-amber-700">Resumo</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-600">
                      {{
                        NONE: "Pendente",
                        CIENCIA: "Ciência registrada",
                        CONFIRMADA: "Confirmada",
                        ERRO: "Erro"
                      }[invoice.manifestStatus]}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        {invoice.hasFullXml && (
                          <button
                            type="button"
                            onClick={() => handleDownload(invoice)}
                            disabled={busy === `xml-${invoice.id}`}
                            className={buttonClass}
                          >
                            <Download size={13} />
                            XML
                          </button>
                        )}

                        {!invoice.hasFullXml &&
                          !invoice.cancelled &&
                          invoice.manifestStatus !== "CIENCIA" &&
                          invoice.manifestStatus !== "CONFIRMADA" && (
                            <button
                              type="button"
                              onClick={() => handleManifest(invoice)}
                              disabled={busy === `manifest-${invoice.id}`}
                              className={buttonClass}
                            >
                              Dar ciência
                            </button>
                          )}

                        {!invoice.hasFullXml &&
                          !invoice.cancelled &&
                          (invoice.manifestStatus === "CIENCIA" ||
                            invoice.manifestStatus === "CONFIRMADA") && (
                            <button
                              type="button"
                              onClick={() => handleFetchXml(invoice)}
                              disabled={busy === `fetch-${invoice.id}`}
                              className={buttonClass}
                            >
                              Buscar XML
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}

                {list && list.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                      Nenhuma nota encontrada. Use &quot;Sincronizar agora&quot; para buscar na SEFAZ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {list && list.total > list.limit && (
            <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-600">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className={buttonClass}
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className={buttonClass}
              >
                Próxima
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}