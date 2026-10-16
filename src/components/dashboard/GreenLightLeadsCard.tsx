import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useGreenLightLeads } from "@/hooks/useGreenLightLeads";

export function GreenLightLeadsCard() {
  const { data: leads } = useGreenLightLeads("new");
  const navigate = useNavigate();
  const count = leads?.length ?? 0;
  return (
    <Card className="border-l-4 border-l-success">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><Zap className="h-5 w-5 text-success" />Instant Outreach — {count} green-light lead{count === 1 ? "" : "s"}</CardTitle>
        <Button size="sm" onClick={() => navigate("/instant-outreach")}>View all</Button>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {count === 0 ? <p className="text-muted-foreground">No new green-light leads right now.</p> :
          leads!.slice(0, 3).map((l) => (
            <div key={l.id} className="flex justify-between gap-2">
              <span className="font-medium truncate">{l.builder_name ?? "Unknown contractor"}</span>
              <span className="text-muted-foreground shrink-0">{[l.num_units ? `${l.num_units} units` : null, l.state].filter(Boolean).join(" · ")}</span>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
