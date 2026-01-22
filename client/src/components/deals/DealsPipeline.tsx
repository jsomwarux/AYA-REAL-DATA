import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, DollarSign, Eye } from "lucide-react";
import { RecommendationBadge } from "./RecommendationBadge";
import { DealRecord } from "./DealsTable";
import { cn } from "@/lib/utils";

interface DealsPipelineProps {
  data: DealRecord[];
  onSelectDeal: (deal: DealRecord) => void;
}

type PipelineColumn = "PASS" | "HOLD" | "BUY" | "STRONG_BUY";

const COLUMNS: { key: PipelineColumn; label: string; color: string; bgColor: string }[] = [
  { key: "PASS", label: "Pass", color: "text-gray-400", bgColor: "bg-gray-500/10" },
  { key: "HOLD", label: "Hold", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  { key: "BUY", label: "Buy", color: "text-green-400", bgColor: "bg-green-500/10" },
  { key: "STRONG_BUY", label: "Strong Buy", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
];

function DealCard({
  deal,
  onSelect,
  isHighPriority,
}: {
  deal: DealRecord;
  onSelect: () => void;
  isHighPriority: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-3 rounded-lg border cursor-pointer transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg",
        isHighPriority
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent hover:border-emerald-500/50"
          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
      )}
    >
      {/* Score Badge */}
      <div
        className={cn(
          "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg",
          deal.final_score >= 80
            ? "bg-emerald-500 text-white shadow-emerald-500/50"
            : deal.final_score >= 70
            ? "bg-green-500 text-white"
            : deal.final_score >= 50
            ? "bg-amber-500 text-white"
            : "bg-gray-500 text-white"
        )}
      >
        {deal.final_score}
      </div>

      {/* Address */}
      <h4 className="text-sm font-medium text-white pr-6 line-clamp-2 mb-2">
        {deal.address}
      </h4>

      {/* Borough */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <MapPin className="h-3 w-3" />
        {deal.borough}
      </div>

      {/* Metrics Row */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-400" />
          <span className="text-muted-foreground">ROI:</span>
          <span className="text-emerald-400 font-medium">{deal.estimated_roi}</span>
        </div>
      </div>

      {/* Price Range */}
      <div className="text-xs">
        <span className="text-muted-foreground">Price: </span>
        <span className="text-white font-medium">{deal.estimated_price_range}</span>
      </div>

      {/* View Button (appears on hover) */}
      <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-full flex items-center justify-center gap-1 py-1.5 rounded bg-white/10 text-xs text-white hover:bg-white/20">
          <Eye className="h-3 w-3" />
          View Details
        </button>
      </div>
    </div>
  );
}

export function DealsPipeline({ data, onSelectDeal }: DealsPipelineProps) {
  const columns = useMemo(() => {
    const grouped: Record<PipelineColumn, DealRecord[]> = {
      PASS: [],
      HOLD: [],
      BUY: [],
      STRONG_BUY: [],
    };

    data.forEach((deal) => {
      const rec = deal.recommendation?.toUpperCase().replace(/ /g, "_") as PipelineColumn;
      if (grouped[rec]) {
        grouped[rec].push(deal);
      } else {
        grouped.HOLD.push(deal);
      }
    });

    // Sort each column by score descending
    Object.keys(grouped).forEach((key) => {
      grouped[key as PipelineColumn].sort((a, b) => b.final_score - a.final_score);
    });

    return grouped;
  }, [data]);

  const totalValue = useMemo(() => {
    const strongBuyDeals = columns.STRONG_BUY;
    // This is a rough estimate - in reality we'd parse the price range
    return strongBuyDeals.length * 5; // Placeholder
  }, [columns]);

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-teal-400" />
            Deal Pipeline
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground">
              {data.length} total deals
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {columns.STRONG_BUY.length} Strong Buys
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((column) => {
            const deals = columns[column.key];
            const totalScore = deals.reduce((sum, d) => sum + d.final_score, 0);
            const avgScore = deals.length > 0 ? Math.round(totalScore / deals.length) : 0;

            return (
              <div key={column.key} className="flex flex-col">
                {/* Column Header */}
                <div
                  className={cn(
                    "px-3 py-2 rounded-t-lg border-b-2",
                    column.bgColor,
                    column.key === "STRONG_BUY"
                      ? "border-emerald-500"
                      : column.key === "BUY"
                      ? "border-green-500"
                      : column.key === "HOLD"
                      ? "border-amber-500"
                      : "border-gray-500"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("font-medium text-sm", column.color)}>
                      {column.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {deals.length}
                    </span>
                  </div>
                  {deals.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Avg: {avgScore}
                    </div>
                  )}
                </div>

                {/* Cards Container */}
                <div
                  className={cn(
                    "flex-1 p-2 rounded-b-lg border border-t-0 border-white/10 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3",
                    column.bgColor
                  )}
                >
                  {deals.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      No deals
                    </div>
                  ) : (
                    deals.map((deal) => (
                      <DealCard
                        key={deal.bbl}
                        deal={deal}
                        onSelect={() => onSelectDeal(deal)}
                        isHighPriority={column.key === "STRONG_BUY"}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Summary */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-muted-foreground">Conversion Rate: </span>
                <span className="text-white font-medium">
                  {data.length > 0
                    ? Math.round(
                        ((columns.BUY.length + columns.STRONG_BUY.length) / data.length) * 100
                      )
                    : 0}
                  %
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  (Buy + Strong Buy)
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Drag cards to update status (coming soon)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
