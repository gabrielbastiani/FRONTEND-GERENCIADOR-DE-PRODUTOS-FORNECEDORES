"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

interface NavigationItem {
  href: string;
  label: string;
}

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/fornecedores", label: "Fornecedores" },
  { href: "/produtos", label: "Produtos" },
  { href: "/listas-orcamento", label: "Orçamentos prévios" },
  { href: "/compras", label: "Compras" },
  { href: "/notas-recebidas", label: "Notas recebidas" }
];

function getLinkClassName(isActive: boolean) {
  const base =
    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  if (isActive) {
    return `${base} bg-slate-900 text-white`;
  }

  return `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
}

function checkIsActive(href: string, pathname: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Único componente que usa usePathname().
 * Por isso precisa ficar dentro de um <Suspense>.
 */
function NavigationLinks() {
  const pathname = usePathname() ?? "";

  return (
    <>
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={getLinkClassName(checkIsActive(item.href, pathname))}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

/**
 * Exibido enquanto o pathname não está disponível.
 * Mesmos links, sem destaque de item ativo.
 */
function NavigationFallback() {
  return (
    <>
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={getLinkClassName(false)}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="border-b border-slate-200 bg-white md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 py-5">
          <Link href="/" className="block">
            <span className="block text-lg font-bold">Catalog Manager</span>
            <span className="block text-xs text-slate-500">
              Fornecedores e produtos
            </span>
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
          <Suspense fallback={<NavigationFallback />}>
            <NavigationLinks />
          </Suspense>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}