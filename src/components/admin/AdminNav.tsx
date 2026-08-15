"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Tag, DollarSign, Palette, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Události", icon: Calendar },
  { href: "/admin/categories", label: "Kategorie", icon: Tag },
  { href: "/admin/price-rules", label: "Ceny", icon: DollarSign },
  { href: "/admin/theme", label: "Vzhled", icon: Palette },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <nav className="bg-[var(--color-primary)] text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm mr-3 hidden sm:block">HC Junior Mělník</span>
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Odhlásit</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
