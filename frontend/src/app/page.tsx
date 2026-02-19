"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, BookText, ClipboardCheck, UploadCloud } from "lucide-react";

import AuthGate from "@/components/guards/AuthGate";
import AppHeader from "@/components/layout/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useSyllabusStatus } from "@/lib/useSyllabusStatus";
import { cn } from "@/lib/utils";

type UploadResponse = {
  message?: string;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { exists, loading, error, refresh, markUploaded } = useSyllabusStatus({
    auto: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const syllabusReady = exists === true;

  useEffect(() => {
    if (!authLoading && user) {
      refresh();
    }
  }, [authLoading, user, refresh]);

  const handleUpload = async () => {
    if (!file) {
      setUploadError("Select a PDF syllabus first.");
      return;
    }
    const isReplacingSyllabus = syllabusReady;
    setUploading(true);
    setUploadStatus(null);
    setUploadError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await apiFetch<UploadResponse>("/upload-syllabus", {
        method: "POST",
        body: form,
      });
      setUploadStatus(
        response?.message ??
          (isReplacingSyllabus
            ? "New syllabus uploaded successfully. Subject updated."
            : "Syllabus uploaded successfully.")
      );
      markUploaded();
      await refresh();
      setFile(null);
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      const apiError = err as ApiError;
      setUploadError(apiError.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthGate>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 md:pl-64">
        <AppHeader />

          <section className="mx-auto w-full max-w-6xl px-6 pt-10 md:px-12 md:pt-12">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-3">
                <Badge className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-indigo-700">
                  Post-auth dashboard
                </Badge>
                <h1 className="text-3xl font-semibold text-slate-950 md:text-4xl lg:text-5xl font-serif">
                  Your StudyFlow Workspace
                </h1>
                <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                  Upload a syllabus, generate a schedule, and track progress across every
                  module and deadline.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                  className="rounded-xl"
                >
                  Refresh syllabus check
                </Button>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-8 w-full max-w-6xl px-6 md:px-12">
            <div className="grid gap-6">
              <Card className="border-slate-200/70 bg-white shadow-sm">
                <CardHeader className="gap-3">
                  <CardTitle className="flex items-center gap-2 text-2xl text-slate-900 font-serif">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                      <UploadCloud className="h-5 w-5" />
                    </span>
                    {syllabusReady ? "Upload New Syllabus PDF" : "Upload Syllabus PDF"}
                  </CardTitle>
                  <p className="text-sm text-slate-500 md:text-base">
                    {syllabusReady
                      ? "Upload another subject syllabus to replace the current one."
                      : "Upload your course syllabus to unlock scheduling and todo views."}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {loading
                      ? "Checking syllabus status..."
                      : syllabusReady
                      ? "Syllabus detected. Upload a new PDF anytime to switch subjects."
                      : "No syllabus uploaded yet. Upload a PDF to begin."}
                  </div>
                  {error && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Syllabus file
                    </label>
                    <Input
                      key={fileInputKey}
                      type="file"
                      accept="application/pdf"
                      className="rounded-xl"
                      onChange={(event) => {
                        setUploadStatus(null);
                        setUploadError(null);
                        setFile(event.target.files ? event.target.files[0] : null);
                      }}
                    />
                  </div>
                  {uploadStatus && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      {uploadStatus}
                    </div>
                  )}
                  {uploadError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {uploadError}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="rounded-xl"
                    >
                      {uploading
                        ? "Uploading..."
                        : syllabusReady
                        ? "Upload new syllabus"
                        : "Upload syllabus"}
                    </Button>
                    <Link href="/schedule" className="sm:ml-auto">
                      <Button
                        variant="secondary"
                        className="w-full rounded-xl sm:w-auto"
                      >
                        Open schedule builder
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <Card
                  className={cn(
                    "border-slate-200/70 bg-white shadow-sm transition lg:hover:-translate-y-0.5 lg:hover:shadow-md",
                    !syllabusReady && "opacity-70"
                  )}
                  aria-disabled={!syllabusReady}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-slate-900 font-serif">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      Schedule Builder
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      Generate a study plan with your preferred time slots.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {syllabusReady
                        ? "Syllabus ready. Build a schedule in minutes."
                        : "Upload a syllabus to activate schedule generation."}
                    </div>
                    {syllabusReady ? (
                      <Link href="/schedule">
                        <Button variant="outline" className="w-full rounded-xl">
                          Build schedule
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full rounded-xl"
                        disabled
                      >
                        Build schedule
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "border-slate-200/70 bg-white shadow-sm transition lg:hover:-translate-y-0.5 lg:hover:shadow-md",
                    !syllabusReady && "opacity-70"
                  )}
                  aria-disabled={!syllabusReady}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-slate-900 font-serif">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                        <ClipboardCheck className="h-4 w-4" />
                      </span>
                      Syllabus Todo
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      Track units, topics, and subtopics as you study.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {syllabusReady
                        ? "Open your syllabus checklist and update progress."
                        : "Upload a syllabus to create your todo outline."}
                    </div>
                    {syllabusReady ? (
                      <Link href="/todo">
                        <Button variant="outline" className="w-full rounded-xl">
                          View syllabus todo
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full rounded-xl"
                        disabled
                      >
                        View syllabus todo
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "border-slate-200/70 bg-white shadow-sm transition lg:hover:-translate-y-0.5 lg:hover:shadow-md",
                    !syllabusReady && "opacity-70"
                  )}
                  aria-disabled={!syllabusReady}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-slate-900 font-serif">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                        <BookText className="h-4 w-4" />
                      </span>
                      Answer Key Book
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      Generate a full detailed answer book PDF from your syllabus.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {syllabusReady
                        ? "Syllabus ready. Build and download your answer key PDF."
                        : "Upload a syllabus to activate answer key generation."}
                    </div>
                    {syllabusReady ? (
                      <Link href="/answer-key">
                        <Button variant="outline" className="w-full rounded-xl">
                          Open answer key generator
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full rounded-xl"
                        disabled
                      >
                        Open answer key generator
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
      </main>
    </AuthGate>
  );
}
