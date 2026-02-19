"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BookText, ClipboardCheck, LayoutGrid, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/schedule", label: "Schedule", icon: BookOpen },
  { href: "/todo", label: "Todo", icon: ClipboardCheck },
  { href: "/answer-key", label: "Answer Key", icon: BookText },
];

export default function AppHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountOpen]);

  const getNavClass = (active: boolean, mobile = false) =>
    cn(
      "flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
      mobile && "w-full justify-between",
      active
        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
    );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                StudyFlow
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Academic Planning Suite
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:border-slate-300"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200/80 bg-white px-4 py-6 shadow-sm transition-transform md:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-2 pb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                StudyFlow
              </p>
              <p className="text-base font-semibold text-slate-900">
                Academic Planning Suite
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-2" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={getNavClass(active, true)}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="border-t border-slate-200/70 pt-4" ref={accountRef}>
              <Button
                variant="secondary"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => setAccountOpen((prev) => !prev)}
              >
                Account
              </Button>
              {accountOpen && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  {loading ? (
                    <span className="text-xs text-slate-500">
                      Checking session...
                    </span>
                  ) : (
                    <>
                      <p className="truncate text-xs text-slate-500">
                        {user?.email ?? "Signed in"}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={signOut}
                          className="w-full rounded-lg"
                        >
                          Sign out
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
