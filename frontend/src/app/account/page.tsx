"use client";

import Link from "next/link";

import AuthGate from "@/components/guards/AuthGate";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/useAuth";

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function AccountPage() {
  const { user, signOut } = useAuth();

  const providers =
    user?.providerData?.map((provider) => provider.providerId) ?? [];

  return (
    <AuthGate>
      <main className="min-h-screen pb-20 md:pl-64">
        <AppHeader />

        <section className="mx-auto mt-12 w-full max-w-4xl px-6 md:px-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Account</CardTitle>
              <p className="text-sm text-slate-500">
                Manage your StudyFlow profile and sign-in details.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Display name
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {user?.displayName ?? "Add your name in Firebase"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Email address
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {user?.email ?? "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    User ID
                  </p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-900">
                    {user?.uid ?? "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Providers
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {providers.length ? providers.join(", ") : "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Created
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatDate(user?.metadata?.creationTime)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Last sign-in
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatDate(user?.metadata?.lastSignInTime)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Need to change profile data? Update it in Firebase Authentication
                for now.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={signOut}>
                  Sign out
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth">Switch account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </AuthGate>
  );
}
