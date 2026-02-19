"use client";

import { getFirebaseIdToken } from "@/lib/firebaseClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

type ApiConfig = {
  expectJson?: boolean;
  responseType?: "json" | "text" | "blob" | "none";
};

type ApiError = {
  status: number;
  message: string;
};

const normalizeBaseUrl = (base: string) => base.replace(/\/$/, "");

const buildApiUrl = (path: string) => {
  const base = normalizeBaseUrl(API_BASE);
  const endpoint = path.startsWith("/") ? path : `/${path}`;
  return { endpoint, url: `${base}${endpoint}` };
};

const buildNetworkError = (url: string, error: unknown): ApiError => {
  const rawMessage =
    error instanceof Error && error.message ? error.message : "Network request failed";
  const frontendOrigin =
    typeof window !== "undefined" ? window.location.origin : "the frontend origin";
  return {
    status: 0,
    message:
      `Unable to reach StudyFlow API at ${url}. ` +
      "Make sure the backend is running and CORS allows " +
      `${frontendOrigin}. Browser error: ${rawMessage}`,
  };
};

const isFormData = (value: unknown): value is FormData => {
  return typeof FormData !== "undefined" && value instanceof FormData;
};

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  config: ApiConfig = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!isFormData(options.body) && options.method && options.method !== "GET") {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (!headers.has("Authorization")) {
    const token = await getFirebaseIdToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const { url } = buildApiUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    throw buildNetworkError(url, error);
  }

  if (!res.ok) {
    const errorBody = await safeJson(res);
    const message =
      (errorBody && (errorBody.detail || errorBody.message)) ||
      `Request failed with status ${res.status}`;
    const error: ApiError = { status: res.status, message };
    throw error;
  }

  const responseType =
    config.responseType ?? (config.expectJson === false ? "none" : "json");

  if (responseType === "none") {
    return undefined as T;
  }

  if (responseType === "blob") {
    return (await res.blob()) as T;
  }

  if (responseType === "text") {
    return (await res.text()) as T;
  }

  const json = await safeJson(res);
  return json as T;
}

export type { ApiError };
