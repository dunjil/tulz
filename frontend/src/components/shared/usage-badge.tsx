"use client";

import { useQuery } from "@tanstack/react-query";
import { apiHelpers } from "@/lib/api";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function UsageBadge({ className }: { className?: string }) {
  const { data: usage } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Paywalls removed - Component disabled
  return null;
}
