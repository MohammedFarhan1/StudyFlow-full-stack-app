"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/useAuth";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const formatAuthError = (err: unknown) => {
    const code = (err as { code?: string }).code ?? "";
    switch (code) {
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Incorrect email or password.";
      case "auth/user-not-found":
        return "No account found for this email.";
      case "auth/email-already-in-use":
        return "An account already exists for this email.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "The sign-in popup was closed before finishing.";
      default:
        return "Unable to sign in right now. Please try again.";
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Enter both an email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-6 pb-20 pt-12 md:px-12 lg:px-20">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              StudyFlow Access
            </p>
            <h1 className="text-4xl leading-tight text-slate-950 md:text-5xl">
              Sign in to continue building your syllabus-driven schedule.
            </h1>
            <p className="text-lg text-slate-600">
              Your account keeps syllabus data, schedules, and progress synced
              across devices.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Verified identity",
                body: "Firebase authentication protects your study plan.",
                icon: ShieldCheck,
              },
              {
                title: "Unified workspace",
                body: "Access syllabus uploads and progress in one place.",
                icon: BookOpenCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)]"
                >
                  <Icon className="mb-3 h-5 w-5 text-sky-600" />
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
            <p className="text-sm text-slate-500">
              {mode === "signin"
                ? "Sign in to sync schedules, syllabus progress, and reminders."
                : "Create an account to start syncing schedules and syllabus progress."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Email address
              </label>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Password
              </label>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            {error && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {error}
              </div>
            )}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {mode === "signin"
                ? "Use your email or Google account to sign in."
                : "Create a new account to start syncing your study plan."}
            </div>
            <Button
              className="w-full"
              type="button"
              onClick={handleEmailAuth}
              disabled={submitting || loading}
            >
              <Mail className="h-4 w-4" />
              {mode === "signin" ? "Sign in with email" : "Create account"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={handleGoogleAuth}
              disabled={submitting || loading}
            >
              Continue with Google
            </Button>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
              onClick={() =>
                setMode((current) => {
                  setError(null);
                  return current === "signin" ? "signup" : "signin";
                })
              }
              disabled={submitting || loading}
            >
              {mode === "signin"
                ? "Need an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
