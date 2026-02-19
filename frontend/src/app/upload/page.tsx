"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AuthGate from "@/components/guards/AuthGate";

export default function UploadRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <AuthGate>
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white/70 px-6 py-4 text-sm text-slate-600 shadow-sm">
          Redirecting to dashboard...
        </div>
      </main>
    </AuthGate>
  );
}
