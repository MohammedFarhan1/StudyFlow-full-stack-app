import { useCallback, useEffect, useState } from "react";
import { apiFetch, type ApiError } from "@/lib/api";

type SyllabusStatus = {
  exists: boolean | null;
  loading: boolean;
  error: string | null;
};

type SyllabusStatusResponse = {
  uploaded?: boolean;
  length?: number;
};

type UseSyllabusOptions = {
  auto?: boolean;
};

export function useSyllabusStatus(options: UseSyllabusOptions = {}) {
  const { auto = true } = options;
  const [status, setStatus] = useState<SyllabusStatus>({
    exists: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiFetch<SyllabusStatusResponse>("/syllabus-status", {
        method: "GET",
      });
      if (typeof data?.uploaded === "boolean") {
        setStatus({ exists: data.uploaded, loading: false, error: null });
      } else {
        setStatus({ exists: null, loading: false, error: null });
      }
    } catch (error) {
      const apiError = error as ApiError;
      setStatus({
        exists: null,
        loading: false,
        error: apiError.message || "Unable to check syllabus status",
      });
    }
  }, []);

  const markUploaded = useCallback(() => {
    setStatus({ exists: true, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (auto) {
      refresh();
    }
  }, [auto, refresh]);

  return { ...status, refresh, markUploaded };
}
