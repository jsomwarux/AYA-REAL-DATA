import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  title?: string;
  columns: Column[];
  data: Record<string, any>[];
  emptyMessage?: string;
  className?: string;
}

export function DataTable({
  title,
  columns,
  data,
  emptyMessage = "No data available",
  className
}: DataTableProps) {
  return (
    <Card className={cn("border-white/10", className)}>
      {title && (
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0 px-0" : "pt-6 px-0"}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "text-xs uppercase tracking-wider text-muted-foreground font-medium",
                      column.className
                    )}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow
                    key={index}
                    className="border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("text-sm", column.className)}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] ?? "-"
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for status badges with custom colors
export function StatusBadge({ status }: { status: string }) {
  const statusLower = status?.toLowerCase() || "";

  const statusConfig: Record<string, { className: string; label: string }> = {
    flagged: {
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      label: "Flagged"
    },
    pending: {
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      label: "Pending"
    },
    approved: {
      className: "bg-teal-500/20 text-teal-400 border-teal-500/30",
      label: "Approved"
    },
    reviewed: {
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      label: "Reviewed"
    },
    high: {
      className: "bg-teal-500/20 text-teal-400 border-teal-500/30",
      label: "High"
    },
    medium: {
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      label: "Medium"
    },
    low: {
      className: "bg-muted text-muted-foreground border-white/10",
      label: "Low"
    },
  };

  const config = statusConfig[statusLower] || {
    className: "bg-muted text-muted-foreground border-white/10",
    label: status
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
      config.className
    )}>
      {config.label}
    </span>
  );
}
