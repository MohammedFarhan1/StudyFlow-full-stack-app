"use client";

import { useState } from "react";
import { CalendarCheck, Clock3 } from "lucide-react";

import AuthGate from "@/components/guards/AuthGate";
import SyllabusGate from "@/components/guards/SyllabusGate";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, type ApiError } from "@/lib/api";

type TimeSlot = {
  start: string;
  end: string;
};

type ScheduleResponse = {
  message?: string;
};

export default function SchedulePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [slots, setSlots] = useState<TimeSlot[]>([{ start: "09:00", end: "10:00" }]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloading, setDownloading] = useState(false);


  const updateSlot = (index: number, field: "start" | "end", value: string) => {
    setSlots((prev) =>
      prev.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot
      )
    );
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, { start: "14:00", end: "15:00" }]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index));
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError("Select a start and end date.");
      return;
    }
    setLoading(true);
    setStatus(null);
    setError(null);
    setDownloadReady(false);
    try {
      const payload = {
        start_date: startDate,
        end_date: endDate,
        time_slots: slots,
        timezone,
      };
      const response = await apiFetch<ScheduleResponse>("/generate-schedule", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatus(response?.message ?? "Schedule generated successfully.");
      setDownloadReady(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Schedule generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadReady || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await apiFetch<Blob>("/download-schedule", {
        method: "GET",
      }, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "StudySchedule.ics";
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
                    <CalendarCheck className="h-5 w-5 text-emerald-600" />
                    Build your study schedule
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Select a date range and your available study windows.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Start date
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        End date
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Timezone
                    </label>
                    <Input
                      value={timezone}
                      onChange={(event) => setTimezone(event.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Time slots
                      </label>
                      <Button variant="secondary" size="sm" onClick={addSlot}>
                        <Clock3 className="h-4 w-4" />
                        Add slot
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {slots.map((slot, index) => (
                        <div
                          key={`${slot.start}-${slot.end}-${index}`}
                          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                        >
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(event) =>
                              updateSlot(index, "start", event.target.value)
                            }
                          />
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(event) =>
                              updateSlot(index, "end", event.target.value)
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlot(index)}
                            disabled={slots.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

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
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Generating..." : "Generate schedule"}
                  </Button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!downloadReady || downloading}
                    className={`inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition ${
                      downloadReady && !downloading
                        ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    {downloading ? "Preparing download..." : "Download ICS file"}
                  </button>
                </CardContent>
              </Card>
            </section>
        </main>
      </SyllabusGate>
    </AuthGate>
  );
}
