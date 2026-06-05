"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutDashboard, ListChecks, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

function navForPath(pathname: string): NavItem[] {
  if (pathname.startsWith("/dashboard")) {
    return [
      { href: "/dashboard", label: "Overview", icon: <LayoutDashboard size={15} /> },
      { href: "/dashboard/tests", label: "Tests", icon: <ListChecks size={15} /> },
      { href: "/dashboard/corrector", label: "Review", icon: <ShieldCheck size={15} /> },
    ];
  }

  return [
    { href: "/", label: "Home" },
    { href: "/take", label: "Join Exam" },
    { href: "/login", label: "Admin" },
  ];
}

export function AppTopBar() {
  const pathname = usePathname();
  const navItems = navForPath(pathname);
  const isDashboard = pathname.startsWith("/dashboard");
  const isTakeFlow = pathname.startsWith("/take");

  return (
    <header className="topbar-shell">
      <div className="container-page topbar">
        <Link href={isDashboard ? "/dashboard" : "/"} className="brand-lockup">
          <span className="brand-badge">GA</span>
          <span>
            <strong>Gosyen Assess</strong>
            <small>{isDashboard ? "Assessment ops" : "Code-first exam platform"}</small>
          </span>
        </Link>
        <nav className={`topbar-nav ${isTakeFlow ? "topbar-nav--compact" : ""}`}>
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`topbar-link ${active ? "is-active" : ""}`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="topbar-actions">
          <ThemeToggle />
          {!isDashboard ? (
            <Link href="/take" className="button-primary topbar-cta">
              Enter code
            </Link>
          ) : (
            <Link href="/dashboard/tests/new" className="button-primary topbar-cta">
              Create exam
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
