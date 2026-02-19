"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

type AuthGateProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function AuthGate({
  children,
  redirectTo = "/auth",
}: AuthGateProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white/70 px-6 py-4 text-sm text-slate-600 shadow-sm">
          Checking your session...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
