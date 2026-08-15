import { Suspense } from "react";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">HC</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Správa rozpisu ledu</h1>
          <p className="text-sm text-gray-500 mt-1">HC Junior Mělník</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
