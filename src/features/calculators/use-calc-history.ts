"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useCalcHistoryStore } from "@/store/calc-history-store";
import type { CalculatorHistoryEntry, CalculatorType, CalculatorResult } from "@/lib/types";

export function useCalcHistory(type?: CalculatorType) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const allLocalEntries = useCalcHistoryStore((s) => s.entries);
  const localAdd = useCalcHistoryStore((s) => s.add);
  const localRemove = useCalcHistoryStore((s) => s.remove);
  const localClear = useCalcHistoryStore((s) => s.clear);

  const localEntries = useMemo(
    () => (type ? allLocalEntries.filter((e) => e.type === type) : allLocalEntries),
    [allLocalEntries, type],
  );

  const { data: serverEntries = [], isLoading } = useQuery({
    queryKey: ["calc-history", type ?? "all"],
    queryFn: async (): Promise<CalculatorHistoryEntry[]> => {
      const url = type ? `/api/v1/calc-history?type=${type}` : "/api/v1/calc-history";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.entries as CalculatorHistoryEntry[]).map((e) => ({
        id: e.id, type: e.type as CalculatorType,
        input: e.input as Record<string, unknown>,
        output: e.output as CalculatorResult,
        label: e.label ?? undefined, createdAt: e.createdAt,
      }));
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: async (input: { type: CalculatorType; input: Record<string, unknown>; output: CalculatorResult; label?: string }) => {
      await fetch("/api/v1/calc-history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calc-history"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/v1/calc-history?id=${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calc-history"] }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => { await fetch("/api/v1/calc-history?all=1", { method: "DELETE", credentials: "include" }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calc-history"] }),
  });

  const entries = isAuthenticated ? serverEntries : localEntries;

  const add = (type: CalculatorType, input: Record<string, unknown>, output: CalculatorResult, label?: string) => {
    if (isAuthenticated) addMutation.mutate({ type, input, output, label });
    else localAdd(type, input, output, label);
  };
  const remove = (id: string) => { if (isAuthenticated) removeMutation.mutate(id); else localRemove(id); };
  const clear = () => { if (isAuthenticated) clearMutation.mutate(); else localClear(); };

  return { entries, add, remove, clear, isLoading: isAuthenticated ? isLoading : false };
}
