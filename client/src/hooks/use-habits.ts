import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type HabitInput, type HabitResponse } from "@shared/routes";

export function useHabits() {
  return useQuery({
    queryKey: [api.habits.list.path],
    queryFn: async () => {
      const res = await fetch(api.habits.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch habits");
      return api.habits.list.responses[200].parse(await res.json());
    },
  });
}

export function useHabitsSummary() {
  return useQuery({
    queryKey: ["/api/habits/summary"],
    queryFn: async () => {
      const res = await fetch("/api/habits/summary", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch habits summary");
      return res.json() as Promise<HabitResponse[]>;
    },
  });
}

export function useHabit(id: number) {
  return useQuery({
    queryKey: ["/api/habits", id],
    queryFn: async () => {
      const url = buildUrl(api.habits.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch habit");
      return api.habits.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: HabitInput) => {
      const validated = api.habits.create.input.parse(data);
      
      const res = await fetch(api.habits.create.path, {
        method: api.habits.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create habit");
      }
      return api.habits.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Record<string, any>) => {
      const url = buildUrl(api.habits.update.path, { id });
      const res = await fetch(url, {
        method: api.habits.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update habit");
      return api.habits.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.habits.delete.path, { id });
      const res = await fetch(url, { 
        method: api.habits.delete.method,
        credentials: "include" 
      });

      if (!res.ok) throw new Error("Failed to delete habit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/streak-breaks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/comprehensive"] });
    },
    onError: () => {},
  });
}

export function useDailyQuote() {
  return useQuery({
    queryKey: [api.quotes.daily.path],
    queryFn: async () => {
      const res = await fetch(api.quotes.daily.path);
      if (!res.ok) throw new Error("Failed to fetch quote");
      return api.quotes.daily.responses[200].parse(await res.json());
    },
    staleTime: 1000 * 60 * 60,
  });
}
