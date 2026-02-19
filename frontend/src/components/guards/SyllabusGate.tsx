"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSyllabusStatus } from "@/lib/useSyllabusStatus";

type SyllabusGateProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function SyllabusGate({
  children,
  redirectTo = "/",
}: SyllabusGateProps) {
  const router = useRouter();
  const { exists, loading } = useSyllabusStatus();

  useEffect(() => {
    if (!loading && exists === false) {
      router.replace(redirectTo);
    }
  }, [loading, exists, redirectTo, router]);

  if (loading || exists === null) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white/70 px-6 py-4 text-sm text-slate-600 shadow-sm">
          Checking syllabus access...
        </div>
      </div>
    );
  }

  if (exists === false) {
    return null;
  }

  return <>{children}</>;
}
