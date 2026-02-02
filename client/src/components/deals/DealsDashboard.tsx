import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  StatsCardsSkeleton,
  TableSkeleton,
  ChartSkeleton,
  PipelineSkeleton,
  DealCardSkeleton,
} from "@/components/ui/loading-skeletons";
import { EmptyState, NoSearchResults, NoFilterResults } from "@/components/ui/empty-state";
import {
  Filter,
  Search,
  X,
  Target,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
} from "lucide-react";
import { DealsStatsCards } from "./DealsStatsCards";
import { DealsTable, DealRecord } from "./DealsTable";
import { DealDetailModal } from "./DealDetailModal";
import { DealsPipeline } from "./DealsPipeline";
import { ScoreDistributionChart } from "./ScoreDistributionChart";
import { BoroughBreakdown } from "./BoroughBreakdown";
import { ScoreComponentsRadar } from "./ScoreComponentsRadar";
import { RecommendationBadge } from "./RecommendationBadge";
import { ScoreGauge } from "./ScoreGauge";
import { cn } from "@/lib/utils";

interface DealsDashboardProps {
  data: DealRecord[];
  isLoading?: boolean;
}

type RecommendationFilter = "all" | "STRONG_BUY" | "BUY" | "HOLD" | "PASS";
type BoroughFilter = "all" | "MANHATTAN" | "BROOKLYN" | "QUEENS" | "BRONX" | "STATEN_ISLAND";
type ViewMode = "table" | "pipeline";

export function DealsDashboard({ data, isLoading }: DealsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("all");
  const [boroughFilter, setBoroughFilter] = useState<BoroughFilter>("all");
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [selectedDeal, setSelectedDeal] = useState<DealRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Get unique boroughs from data
  const boroughs = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.borough?.toUpperCase()))).filter(Boolean) as string[];
    return unique.sort();
  }, [data]);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((deal) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          deal.address?.toLowerCase().includes(query) ||
          deal.bbl?.toLowerCase().includes(query) ||
          deal.borough?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Recommendation filter
      if (recommendationFilter !== "all" && deal.recommendation?.toUpperCase() !== recommendationFilter) {
        return false;
      }

      // Borough filter
      if (boroughFilter !== "all" && deal.borough?.toUpperCase() !== boroughFilter) {
        return false;
      }

      // Score range filter
      const score = deal.final_score || 0;
      if (score < scoreRange[0] || score > scoreRange[1]) {
        return false;
      }

      return true;
    });
  }, [data, searchQuery, recommendationFilter, boroughFilter, scoreRange]);

  // Count active filters
  const activeFilterCount = [
    recommendationFilter !== "all",
    boroughFilter !== "all",
    scoreRange[0] > 0 || scoreRange[1] < 100,
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setRecommendationFilter("all");
    setBoroughFilter("all");
    setScoreRange([0, 100]);
  };

  // Top deals for spotlight section
  const topDeals = useMemo(() => {
    return [...data]
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .slice(0, 3);
  }, [data]);

  // Quick filter buttons
  const QuickFilterButton = ({
    recommendation,
    label,
  }: {
    recommendation: RecommendationFilter;
    label: string;
  }) => {
    const count = data.filter(
      (d) => recommendation === "all" || d.recommendation?.toUpperCase() === recommendation
    ).length;

    return (
      <button
        onClick={() => setRecommendationFilter(recommendation)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          recommendationFilter === recommendation
            ? "bg-white/10 text-white border border-white/20"
            : "text-muted-foreground hover:text-white hover:bg-white/5"
        )}
      >
        {label}
        <span className="ml-1.5 text-xs opacity-60">({count})</span>
      </button>
    );
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <StatsCardsSkeleton />
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ChartSkeleton type="bar" />
          <ChartSkeleton type="bar" />
          <ChartSkeleton type="radar" />
        </div>
        {viewMode === "table" ? <TableSkeleton /> : <PipelineSkeleton />}
      </div>
    );
  }

  // Show empty state if no data
  if (!data.length) {
    return (
      <EmptyState
        variant="deals"
        title="No deals available"
        description="Deal Intelligence data will appear here once properties are scored. Check your Google Sheets connection in Settings."
      />
    );
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Stats Cards */}
      <DealsStatsCards data={data} />

      {/* Top Opportunities Spotlight */}
      {topDeals.length > 0 && topDeals[0].final_score >= 75 && (
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/5">
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" />
              Top Opportunities
              <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium animate-pulse">
                Hot
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
              {topDeals.map((deal, index) => (
                <div
                  key={deal.bbl}
                  onClick={() => setSelectedDeal(deal)}
                  className={cn(
                    "relative rounded-lg border p-4 cursor-pointer transition-all hover:scale-[1.02]",
                    index === 0
                      ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                >
                  {index === 0 && (
                    <div className="absolute -top-2 -right-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/50 animate-pulse">
                        1
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{deal.address}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{deal.borough}</p>
                      <div className="mt-2">
                        <RecommendationBadge recommendation={deal.recommendation} size="sm" />
                      </div>
                    </div>
                    <ScoreGauge score={deal.final_score} size="sm" showLabel={false} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Est. ROI</p>
                      <p className="font-semibold text-emerald-400">{deal.estimated_roi}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price Range</p>
                      <p className="font-medium text-white text-xs">{deal.estimated_price_range}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Charts Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
        </div>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ScoreDistributionChart
            data={data}
            highlightScore={selectedDeal?.final_score}
          />
          <BoroughBreakdown data={data} />
          <ScoreComponentsRadar data={data} />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search Input */}
          <div className="relative w-full sm:w-[250px] md:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search address, BBL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 focus:border-white/20 text-white placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Recommendation Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <QuickFilterButton recommendation="all" label="All" />
            <QuickFilterButton recommendation="STRONG_BUY" label="Strong Buy" />
            <QuickFilterButton recommendation="BUY" label="Buy" />
            <QuickFilterButton recommendation="HOLD" label="Hold" />
          </div>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "table"
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <TableIcon className="h-4 w-4" />
              Table
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "pipeline"
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </button>
          </div>

          {/* Advanced Filters Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-background border-white/10">
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Properties
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Borough Filter */}
                <div className="space-y-2">
                  <Label className="text-white">Borough</Label>
                  <Select value={boroughFilter} onValueChange={(v: BoroughFilter) => setBoroughFilter(v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Boroughs</SelectItem>
                      {boroughs.map((borough) => (
                        <SelectItem key={borough} value={borough}>
                          {borough.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recommendation Filter */}
                <div className="space-y-2">
                  <Label className="text-white">Recommendation</Label>
                  <Select
                    value={recommendationFilter}
                    onValueChange={(v: RecommendationFilter) => setRecommendationFilter(v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Recommendations</SelectItem>
                      <SelectItem value="STRONG_BUY">Strong Buy</SelectItem>
                      <SelectItem value="BUY">Buy</SelectItem>
                      <SelectItem value="HOLD">Hold</SelectItem>
                      <SelectItem value="PASS">Pass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Score Range Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Score Range</Label>
                    <span className="text-sm text-muted-foreground">
                      {scoreRange[0]} - {scoreRange[1]}
                    </span>
                  </div>
                  <Slider
                    value={scoreRange}
                    onValueChange={(v) => setScoreRange(v as [number, number])}
                    min={0}
                    max={100}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-white"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {recommendationFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm text-white">
              Signal: {recommendationFilter.replace(/_/g, " ").toLowerCase()}
              <button onClick={() => setRecommendationFilter("all")} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {boroughFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm text-white">
              Borough: {boroughFilter.replace(/_/g, " ").toLowerCase()}
              <button onClick={() => setBoroughFilter("all")} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {(scoreRange[0] > 0 || scoreRange[1] < 100) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm text-white">
              Score: {scoreRange[0]}-{scoreRange[1]}
              <button onClick={() => setScoreRange([0, 100])} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      {filteredData.length !== data.length && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Showing {filteredData.length} of {data.length} properties
        </div>
      )}

      {/* Deals View - Table or Pipeline */}
      {filteredData.length === 0 ? (
        searchQuery ? (
          <NoSearchResults query={searchQuery} onClear={() => setSearchQuery("")} />
        ) : activeFilterCount > 0 ? (
          <NoFilterResults onClear={clearFilters} />
        ) : null
      ) : viewMode === "table" ? (
        <DealsTable
          data={filteredData}
          onViewDetails={(deal) => setSelectedDeal(deal)}
        />
      ) : (
        <DealsPipeline
          data={filteredData}
          onSelectDeal={(deal) => setSelectedDeal(deal)}
        />
      )}

      {/* Deal Detail Modal */}
      <DealDetailModal
        deal={selectedDeal}
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
      />
    </div>
  );
}
