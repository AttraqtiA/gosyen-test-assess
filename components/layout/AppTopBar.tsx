"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutDashboard, ListChecks, ShieldCheck, Languages } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

type Locale = "id" | "en";

const labels = {
  id: {
    overview: "Ikhtisar",
    tests: "Tes",
    review: "Review",
    join: "Masuk Ujian",
    admin: "Admin",
    create: "Buat Ujian",
    codePlatform: "Platform ujian berbasis kode",
  },
  en: {
    overview: "Overview",
    tests: "Tests",
    review: "Review",
    join: "Join Exam",
    admin: "Admin",
    create: "Create Exam",
    codePlatform: "Code-first exam platform",
  },
} as const;

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
  if (pathname.startsWith("/take") || pathname.startsWith("/results")) {
    return null;
  }
  const navItems = navForPath(pathname);
  const isDashboard = pathname.startsWith("/dashboard");
  const [locale, setLocale] = useState<Locale>("id");

  useEffect(() => {
    const stored = window.localStorage.getItem("gosyen-lang");
    if (stored === "id" || stored === "en") {
      setLocale(stored);
    }
  }, []);

  const currentLabels = labels[locale];

  function toggleLocale() {
    const next = locale === "id" ? "en" : "id";
    setLocale(next);
    window.localStorage.setItem("gosyen-lang", next);
  }

  return (
    <header className="topbar-shell">
      <div className="container-page topbar">
        <span className="topbar-brandless">{currentLabels.codePlatform}</span>
        <nav className="topbar-nav">
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
          <button type="button" onClick={toggleLocale} className="topbar-icon" aria-label="Switch language">
            <Languages size={16} />
          </button>
          <ThemeToggle />
          {!isDashboard ? (
            <Link href="/take" className="button-primary topbar-cta">
              {currentLabels.join}
            </Link>
          ) : (
            <Link href="/dashboard/tests/new" className="button-primary topbar-cta">
              {currentLabels.create}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
