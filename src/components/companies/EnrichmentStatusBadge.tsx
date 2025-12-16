import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnrichmentStatusBadgeProps {
  companyId: string;
}

interface EnrichmentStatus {
  lastEnriched: string | null;
  confidence: number | null;
  provider: string | null;
}

export function EnrichmentStatusBadge({ companyId }: EnrichmentStatusBadgeProps) {
  const { data: status, isLoading } = useQuery<EnrichmentStatus | null>({
    queryKey: ["enrichment-status", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrichment_logs")
        .select("created_at, confidence_score, provider")
        .eq("company_id", companyId)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        lastEnriched: data.created_at,
        confidence: data.confidence_score,
        provider: data.provider,
      };
    },
  });

  if (isLoading || !status) return null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500/10 text-green-700 border-green-500/20";
    if (confidence >= 60) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  };

  const timeSince = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${getConfidenceColor(status.confidence || 0)} cursor-help text-xs`}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {status.confidence}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-semibold">AI Enriched</p>
            <p>Confidence: {status.confidence}%</p>
            <p>
              Provider: {status.provider === "lovable_ai" ? "Gemini AI" : "Claude AI"}
            </p>
            <p className="text-muted-foreground">{timeSince(status.lastEnriched!)}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
