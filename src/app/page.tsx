"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  ClipboardList,
  FileText,
  Package,
  Plus,
  ShoppingCart,
  Truck
} from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/dashboard-types";
import { Loading } from "@/components/loading";

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  NOT_ANALYZED: "Não analisado",
  IN_VALIDATION: "Em validação",
  PROMISING: "Promissor",
  WAITING: "Aguardando",
  DISCARDED: "Descartado"
};

const QUOTE_LIST_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  ARCHIVED: "Arquivada"
};

const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  QUOTE_RECEIVED: "Orçamento recebido",
  UNDER_ANALYSIS: "Em análise",
  APPROVED: "Aprovado",
  ORDER_EFFECTIVE: "Pedido efetivado",
  PARTIALLY_RECEIVED: "Recebido parcialmente",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado"
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  NOT_ANALYZED: "bg-slate-100 text-slate-700",
  IN_VALIDATION: "bg-blue-50 text-blue-700",
  PROMISING: "bg-emerald-50 text-emerald-700",
  WAITING: "bg-amber-50 text-amber-700",
  DISCARDED: "bg-red-50 text-red-700",
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
  QUOTE_RECEIVED: "bg-blue-50 text-blue-700",
  UNDER_ANALYSIS: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  ORDER_EFFECTIVE: "bg-indigo-50 text-indigo-700",
  PARTIALLY_RECEIVED: "bg-violet-50 text-violet-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700"
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function StatusBadge({
  status,
  labels
}: {
  status: string;
  labels: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_BADGE_CLASSES[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function StatCard({
  label,
  value,
  detail,
  href,
  linkLabel,
  icon,
  iconClassName
}: {
  label: string;
  value: number;
  detail: string;
  href: string;
  linkLabel: string;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>

        <div className={`rounded-lg p-3 ${iconClassName}`}>{icon}</div>
      </div>

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {linkLabel}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function MiniStat({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}

      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getDashboardSummary();
        setSummary(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <Loading />;
  }

  const header = (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Acompanhe fornecedores, produtos, listas de orçamento e
          negociações em um só lugar.
        </p>
      </div>

      <Link
        href="/produtos/novo"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Plus size={18} />
        Adicionar produto
      </Link>
    </div>
  );

  if (!summary) {
    return (
      <div className="space-y-8">
        {header}

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Não foi possível carregar o resumo do dashboard."}
        </div>
      </div>
    );
  }

  const productDistribution = [
    {
      label: "Não analisados",
      value: summary.products.notAnalyzed,
      barClassName: "bg-slate-400"
    },
    {
      label: "Em validação",
      value: summary.products.inValidation,
      barClassName: "bg-blue-500"
    },
    {
      label: "Promissores",
      value: summary.products.promising,
      barClassName: "bg-emerald-500"
    },
    {
      label: "Aguardando",
      value: summary.products.waiting,
      barClassName: "bg-amber-500"
    },
    {
      label: "Descartados",
      value: summary.products.discarded,
      barClassName: "bg-red-500"
    }
  ];

  const alerts: Array<{ text: string; href: string; linkLabel: string }> =
    [];

  if (summary.alerts.productsWithoutAnalysis > 0) {
    alerts.push({
      text: `${summary.alerts.productsWithoutAnalysis} produto(s) ainda não foram analisados.`,
      href: "/produtos",
      linkLabel: "Ver produtos"
    });
  }

  if (summary.alerts.inactiveSuppliersWithProducts > 0) {
    alerts.push({
      text: `${summary.alerts.inactiveSuppliersWithProducts} fornecedor(es) inativo(s) ainda possuem produtos cadastrados.`,
      href: "/fornecedores",
      linkLabel: "Ver fornecedores"
    });
  }

  if (summary.alerts.draftQuoteLists > 0) {
    alerts.push({
      text: `${summary.alerts.draftQuoteLists} lista(s) de orçamento ainda estão em rascunho.`,
      href: "/listas-orcamento",
      linkLabel: "Ver listas"
    });
  }

  return (
    <div className="space-y-8">
      {header}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Fornecedores"
          value={summary.suppliers.total}
          detail={`${summary.suppliers.active} ativo(s) e ${summary.suppliers.inactive} inativo(s)`}
          href="/fornecedores"
          linkLabel="Ver fornecedores"
          icon={<Truck size={24} />}
          iconClassName="bg-blue-50 text-blue-600"
        />

        <StatCard
          label="Produtos cadastrados"
          value={summary.products.total}
          detail={`${summary.products.promising} promissor(es) e ${summary.products.notAnalyzed} sem análise`}
          href="/produtos"
          linkLabel="Ver produtos"
          icon={<Package size={24} />}
          iconClassName="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          label="Listas de orçamento"
          value={summary.quoteLists.total}
          detail={`${summary.quoteLists.drafts} em rascunho e ${summary.quoteLists.sent} enviada(s)`}
          href="/listas-orcamento"
          linkLabel="Ver listas"
          icon={<ClipboardList size={24} />}
          iconClassName="bg-amber-50 text-amber-600"
        />

        <StatCard
          label="Pedidos efetivados"
          value={summary.transactions.effectiveOrders}
          detail={`${summary.transactions.open} negociação(ões) em aberto`}
          href="/fornecedores"
          linkLabel="Ver fornecedores"
          icon={<ShoppingCart size={24} />}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      <SectionCard
        title="Alertas e pendências"
        description="Pontos que merecem a sua atenção."
      >
        {alerts.length === 0 ? (
          <EmptyText>Nenhuma pendência no momento.</EmptyText>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.text}
                className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex items-center gap-2 text-sm text-amber-800">
                  <Bell size={16} className="shrink-0" />
                  {alert.text}
                </span>

                <Link
                  href={alert.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline"
                >
                  {alert.linkLabel}
                  <ArrowRight size={14} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Status dos produtos"
          description="Distribuição dos produtos cadastrados."
        >
          {summary.products.total === 0 ? (
            <EmptyText>Nenhum produto cadastrado ainda.</EmptyText>
          ) : (
            <div className="space-y-4">
              {productDistribution.map((item) => {
                const percent = Math.round(
                  (item.value / summary.products.total) * 100
                );

                return (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-500">
                        {item.value} ({percent}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.barClassName}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Resumo comercial"
          description="Listas de orçamento e negociações com fornecedores."
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Listas de orçamento
          </p>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Rascunho" value={summary.quoteLists.drafts} />
            <MiniStat label="Enviadas" value={summary.quoteLists.sent} />
            <MiniStat
              label="Arquivadas"
              value={summary.quoteLists.archived}
            />
          </div>

          <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Orçamentos e pedidos
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Em aberto" value={summary.transactions.open} />
            <MiniStat
              label="Aprovados"
              value={summary.transactions.approved}
            />
            <MiniStat
              label="Pedidos efetivados"
              value={summary.transactions.effectiveOrders}
            />
            <MiniStat
              label="Concluídos"
              value={summary.transactions.completed}
            />
            <MiniStat
              label="Cancelados"
              value={summary.transactions.cancelled}
            />
            <MiniStat
              label="Catálogos"
              value={summary.catalogs.total}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Produtos recentes"
          description="Últimos produtos cadastrados."
        >
          {summary.recentProducts.length === 0 ? (
            <EmptyText>Nenhum produto cadastrado ainda.</EmptyText>
          ) : (
            <ul className="divide-y">
              {summary.recentProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/produtos/${product.id}`}
                      className="block truncate text-sm font-medium text-slate-900 hover:text-blue-600"
                    >
                      {product.name}
                    </Link>

                    <p className="truncate text-xs text-slate-500">
                      {product.supplierName}
                      {product.referenceCode
                        ? ` · Código ${product.referenceCode}`
                        : ""}
                      {` · ${formatDate(product.createdAt)}`}
                    </p>
                  </div>

                  <StatusBadge
                    status={product.status}
                    labels={PRODUCT_STATUS_LABELS}
                  />
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/produtos"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver todos os produtos
            <ArrowRight size={16} />
          </Link>
        </SectionCard>

        <SectionCard
          title="Listas de orçamento recentes"
          description="Últimas listas criadas ou atualizadas."
        >
          {summary.recentQuoteLists.length === 0 ? (
            <EmptyText>Nenhuma lista de orçamento criada ainda.</EmptyText>
          ) : (
            <ul className="divide-y">
              {summary.recentQuoteLists.map((list) => (
                <li
                  key={list.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      href="/listas-orcamento"
                      className="block truncate text-sm font-medium text-slate-900 hover:text-blue-600"
                    >
                      {list.name}
                    </Link>

                    <p className="truncate text-xs text-slate-500">
                      {list.supplierName} · {list.itemsCount} produto(s) ·{" "}
                      {formatDate(list.updatedAt)}
                    </p>
                  </div>

                  <StatusBadge
                    status={list.status}
                    labels={QUOTE_LIST_STATUS_LABELS}
                  />
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/listas-orcamento"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver todas as listas
            <ArrowRight size={16} />
          </Link>
        </SectionCard>
      </div>

      <SectionCard
        title="Orçamentos e pedidos recentes"
        description="Últimas movimentações com fornecedores."
      >
        {summary.recentTransactions.length === 0 ? (
          <EmptyText>
            Nenhum orçamento ou pedido registrado ainda.
          </EmptyText>
        ) : (
          <ul className="divide-y">
            {summary.recentTransactions.map((transaction) => {
              const reference =
                transaction.orderReference ??
                transaction.quoteReference ??
                "Sem referência";

              return (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/fornecedores/${transaction.supplierId}`}
                        className="block truncate text-sm font-medium text-slate-900 hover:text-blue-600"
                      >
                        {transaction.supplierName}
                      </Link>

                      <p className="truncate text-xs text-slate-500">
                        {reference} · {formatDate(transaction.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    status={transaction.status}
                    labels={TRANSACTION_STATUS_LABELS}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Ações rápidas"
        description="Atalhos para as tarefas mais comuns."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/produtos/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Adicionar produto
          </Link>

          <Link
            href="/fornecedores"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Truck size={16} />
            Gerenciar fornecedores
          </Link>

          <Link
            href="/produtos"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Package size={16} />
            Analisar produtos
          </Link>

          <Link
            href="/listas-orcamento"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ClipboardList size={16} />
            Listas de orçamento
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}