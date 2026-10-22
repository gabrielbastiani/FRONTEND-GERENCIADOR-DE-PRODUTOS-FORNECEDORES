"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  onNavigate?: () => void;
};

const baseClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition";
const inactiveClass =
  "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
const activeClass = "bg-blue-50 text-blue-700";

function ActiveNavLink({ href, label, icon: Icon, onNavigate }: NavLinkProps) {
  const pathname = usePathname();

  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(baseClass, active ? activeClass : inactiveClass)}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export function NavLink(props: NavLinkProps) {
  const { href, label, icon: Icon, onNavigate } = props;

  return (
    <Suspense
      fallback={
        <Link
          href={href}
          onClick={onNavigate}
          className={cn(baseClass, inactiveClass)}
        >
          <Icon size={18} />
          {label}
        </Link>
      }
    >
      <ActiveNavLink {...props} />
    </Suspense>
  );
}