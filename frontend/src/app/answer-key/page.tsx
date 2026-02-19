"use client";

import { useState } from "react";
import { BookText, Download } from "lucide-react";

import AuthGate from "@/components/guards/AuthGate";
import SyllabusGate from "@/components/guards/SyllabusGate";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, type ApiError } from "@/lib/api";

type GenerateAnswerKeyResponse = {
  message?: string;
  sections_generated?: number;
};

export default function AnswerKeyPage() {
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setStatus(null);
    setReady(false);
    try {
      const response = await apiFetch<GenerateAnswerKeyResponse>(
        "/generate-answer-key-book",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const sections = response?.sections_generated ?? 0;
      setStatus(
        `${response?.message ?? "Answer key book generated."} Sections: ${sections}`
      );
      setReady(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Answer key generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!ready || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await apiFetch<Blob>(
        "/download-answer-key-book",
        { method: "GET" },
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "AnswerKeyBook.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AuthGate>
      <SyllabusGate>
        <main className="min-h-screen pb-20 md:pl-64">
          <AppHeader />

          <section className="mx-auto mt-12 w-full max-w-4xl px-6 md:px-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <BookText className="h-5 w-5 text-indigo-600" />
                  Generate answer key book
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Build a fully detailed PDF answer key aligned by unit, topic, and
                  subtopic from your syllabus.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {status && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {status}
                  </div>
                )}
                {error && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? "Generating detailed answer key..." : "Generate answer key PDF"}
                </Button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!ready || downloading}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                    ready && !downloading
                      ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing download..." : "Download answer key PDF"}
                </button>
              </CardContent>
            </Card>
          </section>
        </main>
      </SyllabusGate>
    </AuthGate>
  );
}
