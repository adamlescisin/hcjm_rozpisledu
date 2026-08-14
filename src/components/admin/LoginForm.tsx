"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Nesprávné přihlašovací údaje.");
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Zadejte e-mailovou adresu.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/admin/reset-password`,
    });
    setResetSent(true);
    setLoading(false);
  };

  if (resetSent) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
        <div className="text-green-600 text-4xl mb-3">✓</div>
        <h2 className="font-semibold text-gray-900 mb-1">E-mail odeslán</h2>
        <p className="text-sm text-gray-500">
          Zkontrolujte svou e-mailovou schránku a klikněte na odkaz pro obnovení hesla.
        </p>
        <button
          onClick={() => { setResetSent(false); setResetMode(false); }}
          className="mt-4 text-sm text-[var(--color-primary)] hover:underline"
        >
          Zpět na přihlášení
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            placeholder="admin@hcjuniormelnik.cz"
          />
        </div>

        {!resetMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {resetMode ? "Odeslat odkaz" : "Přihlásit se"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => { setResetMode(!resetMode); setError(null); }}
          className="text-xs text-gray-400 hover:text-[var(--color-primary)] hover:underline"
        >
          {resetMode ? "Zpět na přihlášení" : "Zapomenuté heslo?"}
        </button>
      </div>
    </div>
  );
}
