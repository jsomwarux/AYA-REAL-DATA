import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { fetchExpansionContainers, type ContainerGroup, type ContainerBlockedPart } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronRight, Loader2, Container as ContainerIcon, PackageCheck, Clock, Search } from "lucide-react";

type Filter = "all" | "pending" | "arrived";

// "Container 3 & 4" / "Container 3 and 4" both reference 2+ numbers → split.
function refShape(e: ContainerBlockedPart): "partial" | "split" | "single" {
  if (e.partial) return "partial";
  const nums = e.rawValue.match(/\d+/g) ?? [];
  return nums.length >= 2 ? "split" : "single";
}

function groupByRoom(entries: ContainerBlockedPart[]) {
  const map = new Map<string, { tower: string; roomNo: string; line: string; type: string; parts: ContainerBlockedPart[] }>();
  for (const e of entries) {
    const key = `${e.tower}:${e.roomNo}:${e.type}`;
    const g = map.get(key);
    if (g) g.parts.push(e);
    else map.set(key, { tower: e.tower, roomNo: e.roomNo, line: e.line, type: e.type, parts: [e] });
  }
  return [...map.values()];
}

export default function ContainerView() {
  useDocumentTitle("Container View");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expansion-containers"],
    queryFn: fetchExpansionContainers,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [partialsOnly, setPartialsOnly] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (n: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Refreshed", "Container data updated.");
    } catch {
      toastError("Refresh failed", "Could not refresh. Try again.");
    }
  };

  const containers = useMemo(() => {
    let list = data?.containers ?? [];
    if (filter === "pending") list = list.filter((c) => !c.arrived);
    if (filter === "arrived") list = list.filter((c) => c.arrived);
    if (partialsOnly) list = list.filter((c) => c.partialCount > 0);
    if (q.trim()) {
      const n = parseInt(q.replace(/\D/g, ""), 10);
      if (!Number.isNaN(n)) list = list.filter((c) => c.number === n);
    }
    return list;
  }, [data, filter, partialsOnly, q]);

  const subtitle = data
    ? `${data.summary.containers} containers · ${data.summary.pending} pending · ${data.summary.partialParts} partial parts`
    : "When a container lands, see which rooms & parts unblock";

  return (
    <DashboardLayout title="Container View" subtitle={subtitle} onRefresh={handleRefresh} isLoading={isLoading}>
      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-white">Couldn't load container data</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading containers…
        </div>
      )}

      {data && (
        <>
          {/* Config note + summary */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-muted-foreground">
              ARRIVED_CONTAINERS ={" "}
              <span className="font-mono text-white/90">
                {data.arrivedConfig === "ALL" ? "ALL" : `[${(data.arrivedConfig as number[]).join(", ")}]`}
              </span>{" "}
              · developer-edited config
            </span>
            {data.missingTabs.length > 0 && (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                unread tabs: {data.missingTabs.join(", ")}
              </span>
            )}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["all", "pending", "arrived"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === f ? "border-teal-500/50 bg-teal-500/15 text-teal-200" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white",
                )}
              >
                {f}
                {data && f !== "all" && (
                  <span className="ml-1.5 text-[10px] opacity-70">{f === "pending" ? data.summary.pending : data.summary.arrived}</span>
                )}
              </button>
            ))}
            <button
              onClick={() => setPartialsOnly((v) => !v)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                partialsOnly ? "border-amber-500/50 bg-amber-500/15 text-amber-200" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white",
              )}
            >
              Partial only (&amp; In China)
            </button>
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Jump to container #"
                inputMode="numeric"
                className="w-44 rounded-md border border-white/10 bg-white/5 py-1.5 pl-7 pr-2 text-xs text-white placeholder:text-muted-foreground focus:border-teal-500/50 focus:outline-none"
              />
            </div>
          </div>

          {containers.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No containers match this filter
              {filter === "pending" && data.arrivedConfig === "ALL" ? " — ARRIVED_CONTAINERS is set to ALL, so everything is delivered." : "."}
            </p>
          ) : (
            <div className="space-y-2">
              {containers.map((c) => (
                <ContainerCard key={c.number} c={c} open={open.has(c.number)} onToggle={() => toggle(c.number)} />
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function ContainerCard({ c, open, onToggle }: { c: ContainerGroup; open: boolean; onToggle: () => void }) {
  const rooms = useMemo(() => (open ? groupByRoom(c.entries) : []), [open, c.entries]);

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-white/[0.02]", c.arrived ? "border-emerald-500/20" : "border-amber-500/30")}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        <ContainerIcon className={cn("h-5 w-5", c.arrived ? "text-emerald-300" : "text-amber-300")} />
        <span className="font-semibold text-white">Container {c.number}</span>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            c.arrived ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-200",
          )}
        >
          {c.arrived ? (<><PackageCheck className="mr-1 inline h-3 w-3" />delivered</>) : (<><Clock className="mr-1 inline h-3 w-3" />pending</>)}
        </span>
        <span className="hidden truncate text-xs text-muted-foreground sm:inline">
          {c.arrived ? "unblocked" : "when it lands, unblocks"} {c.roomCount} rooms · {c.partCount} parts
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px]">
          {c.partialCount > 0 && (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-200">{c.partialCount} partial</span>
          )}
          <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-muted-foreground sm:hidden">{c.partCount}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-2">
          {!c.arrived && (
            <p className="mb-2 px-2 text-xs text-amber-200/90">When Container {c.number} lands, these rooms/parts unblock:</p>
          )}
          <div className="space-y-1.5">
            {rooms.map((r) => (
              <div key={`${r.tower}:${r.roomNo}:${r.type}`} className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className={cn("rounded px-1.5 py-0.5 font-medium", r.tower === "HR" ? "bg-blue-500/15 text-blue-200" : "bg-purple-500/15 text-purple-200")}>{r.tower}</span>
                  <span className="font-semibold text-white">Room {r.roomNo}</span>
                  {(r.line || r.type) && <span className="truncate text-muted-foreground">{[r.line, r.type].filter(Boolean).join(" · ")}</span>}
                  <span className="ml-auto text-[10px] text-muted-foreground">{r.parts.length} part{r.parts.length > 1 ? "s" : ""}</span>
                </div>
                <ul className="space-y-0.5">
                  {r.parts.map((e, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{e.package}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-white/90">{e.part}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">"{e.rawValue}"</span>
                      {refShape(e) === "partial" && (
                        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[10px] text-amber-200">partial · rest in China</span>
                      )}
                      {refShape(e) === "split" && (
                        <span className="rounded border border-sky-500/40 bg-sky-500/10 px-1 text-[10px] text-sky-200">split</span>
                      )}
                      {e.sources.includes("installation") && (
                        <span className="rounded border border-white/10 bg-white/5 px-1 text-[10px] text-muted-foreground">
                          {e.sources.length > 1 ? "containers + install" : "install only"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
