import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "./card";

// Enhanced skeleton with shimmer effect
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

// Stat card skeleton
export function StatCardSkeleton() {
  return (
    <Card className="border-white/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// Stats cards row skeleton
export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton
            className={cn(
              "h-4",
              i === 0 ? "w-32" : i === 1 ? "w-24" : i === 2 ? "w-16" : "w-20"
            )}
          />
        </td>
      ))}
    </tr>
  );
}

// Full table skeleton
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// Chart skeleton
export function ChartSkeleton({ type = "bar" }: { type?: "bar" | "line" | "pie" | "radar" }) {
  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[220px] flex items-end justify-center gap-2 px-4">
          {type === "bar" && (
            <>
              {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 max-w-[40px]"
                  style={{ height: `${height}%` }}
                >
                  <Skeleton className="h-full w-full rounded-t" />
                </div>
              ))}
            </>
          )}
          {type === "line" && (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="h-[2px] w-full" />
            </div>
          )}
          {type === "pie" && (
            <Skeleton className="h-40 w-40 rounded-full" />
          )}
          {type === "radar" && (
            <Skeleton className="h-40 w-40 rounded-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Deal card skeleton
export function DealCardSkeleton() {
  return (
    <Card className="border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Pipeline column skeleton
export function PipelineColumnSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 rounded-t-lg bg-white/5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-6" />
        </div>
      </div>
      <div className="flex-1 p-2 rounded-b-lg border border-t-0 border-white/10 space-y-3 min-h-[300px]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg border border-white/10 bg-white/5">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Full pipeline skeleton
export function PipelineSkeleton() {
  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <PipelineColumnSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Full dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <StatsCardsSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="radar" />
      </div>
      <TableSkeleton />
    </div>
  );
}

// Modal content skeleton
export function ModalSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-white/10">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-10 w-10 rounded-full mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
              <Skeleton className="h-8 w-12 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-white/10">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
