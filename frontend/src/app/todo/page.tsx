"use client";

import { useEffect, useState } from "react";
import { CheckSquare, ListChecks } from "lucide-react";

import AuthGate from "@/components/guards/AuthGate";
import SyllabusGate from "@/components/guards/SyllabusGate";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, type ApiError } from "@/lib/api";

type Subtopic = {
  id: string;
  title: string;
  status?: boolean | string;
};

type Topic = {
  id: string;
  title: string;
  subtopics: Subtopic[];
};

type Unit = {
  id: string;
  title: string;
  topics: Topic[];
};

type TodoResponse = {
  course_title?: string;
  units?: Unit[];
  items?: Array<{
    title: string;
    level: "unit" | "topic" | "subtopic";
    children?: TodoResponse["items"];
  }>;
};

type ProgressSummary = {
  overall?: {
    percent?: number;
    completed?: number;
    total?: number;
  };
  units?: Array<{
    unit_id?: string;
    title?: string;
    percent?: number;
    completed?: number;
    total?: number;
  }>;
};

const normalizeTodo = (data: TodoResponse): Unit[] => {
  if (data.units && data.units.length > 0) {
    return data.units.map((unit) => ({
      id: unit.id ?? unit.title,
      title: unit.title,
      topics: (unit.topics ?? []).map((topic) => ({
        id: topic.id ?? topic.title,
        title: topic.title,
        subtopics: (topic.subtopics ?? []).map((subtopic) => ({
          id: subtopic.id ?? subtopic.title,
          title: subtopic.title,
          status: subtopic.status,
        })),
      })),
    }));
  }

  if (data.items && data.items.length > 0) {
    return data.items.map((unit) => ({
      id: unit.title,
      title: unit.title,
      topics: (unit.children ?? []).map((topic) => ({
        id: topic.title,
        title: topic.title,
        subtopics: (topic.children ?? []).map((subtopic) => ({
          id: subtopic.title,
          title: subtopic.title,
          status: false,
        })),
      })),
    }));
  }

  return [];
};

const isComplete = (status?: boolean | string) => {
  if (typeof status === "boolean") return status;
  if (!status) return false;
  return status.toLowerCase() === "completed" || status.toLowerCase() === "done";
};

const buildProgress = (units: Unit[]): ProgressSummary => {
  let totalCompleted = 0;
  let totalCount = 0;

  const unitSummaries =
    units?.map((unit) => {
      let unitCompleted = 0;
      let unitTotal = 0;

      unit.topics.forEach((topic) => {
        topic.subtopics.forEach((subtopic) => {
          unitTotal += 1;
          if (isComplete(subtopic.status)) {
            unitCompleted += 1;
          }
        });
      });

      totalCompleted += unitCompleted;
      totalCount += unitTotal;

      return {
        unit_id: unit.id,
        title: unit.title,
        completed: unitCompleted,
        total: unitTotal,
        percent: unitTotal ? Math.round((unitCompleted / unitTotal) * 100) : 0,
      };
    }) ?? [];

  return {
    overall: {
      completed: totalCompleted,
      total: totalCount,
      percent: totalCount ? Math.round((totalCompleted / totalCount) * 100) : 0,
    },
    units: unitSummaries,
  };
};

export default function TodoPage() {
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const todoData = await apiFetch<TodoResponse>("/syllabus-todo", {
        method: "GET",
      });
      setCourseTitle(todoData.course_title ?? null);
      const normalized = normalizeTodo(todoData);
      setUnits(normalized);
      setProgress(buildProgress(normalized));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Unable to load syllabus todo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (subtopicId: string, nextValue: boolean) => {
    setUnits((prev) => {
      const nextUnits = prev.map((unit) => ({
        ...unit,
        topics: unit.topics.map((topic) => ({
          ...topic,
          subtopics: topic.subtopics.map((subtopic) =>
            subtopic.id === subtopicId
              ? { ...subtopic, status: nextValue }
              : subtopic
          ),
        })),
      }));
      setProgress(buildProgress(nextUnits));
      return nextUnits;
    });
  };

  return (
    <AuthGate>
      <SyllabusGate>
        <main className="min-h-screen pb-20 md:pl-64">
          <AppHeader />

            <section className="mx-auto mt-12 w-full max-w-5xl px-6 md:px-12">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ListChecks className="h-5 w-5 text-indigo-600" />
                    Syllabus todo
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Track every unit, topic, and subtopic.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {courseTitle && (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700">
                      {courseTitle}
                    </div>
                  )}

                  {progress?.overall && (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Overall progress</span>
                        <span>
                          {progress.overall.completed ?? 0} /{" "}
                          {progress.overall.total ?? 0}
                        </span>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{
                            width: `${progress.overall.percent ?? 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-600">
                      Loading syllabus todo...
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {units.map((unit) => (
                        <div key={unit.id} className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold text-slate-900">
                              {unit.title}
                            </h2>
                            {progress?.units && (
                              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                {progress.units.find((item) => item.unit_id === unit.id)
                                  ?.percent ?? 0}
                                % complete
                              </span>
                            )}
                          </div>
                          <div className="space-y-4">
                            {unit.topics.map((topic) => (
                              <div
                                key={topic.id}
                                className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                              >
                                <h3 className="text-sm font-semibold text-slate-800">
                                  {topic.title}
                                </h3>
                                <div className="mt-3 space-y-2">
                                  {topic.subtopics.map((subtopic) => {
                                    const checked = isComplete(subtopic.status);
                                    return (
                                      <label
                                        key={subtopic.id}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
                                      >
                                        <span>{subtopic.title}</span>
                                        <Button
                                          variant={checked ? "secondary" : "ghost"}
                                          size="sm"
                                          onClick={() =>
                                            handleToggle(subtopic.id, !checked)
                                          }
                                        >
                                          <CheckSquare className="h-4 w-4" />
                                          {checked ? "Completed" : "Mark done"}
                                        </Button>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button variant="secondary" onClick={fetchData}>
                    Refresh todo
                  </Button>
                </CardContent>
              </Card>
            </section>
        </main>
      </SyllabusGate>
    </AuthGate>
  );
}
