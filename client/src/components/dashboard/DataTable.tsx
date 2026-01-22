import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card className={cn("", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : "pt-6"}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
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

// Helper component for status badges
export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    flagged: { variant: "destructive", label: "Flagged" },
    pending: { variant: "secondary", label: "Pending" },
    approved: { variant: "default", label: "Approved" },
    reviewed: { variant: "outline", label: "Reviewed" },
    high: { variant: "default", label: "High" },
    medium: { variant: "secondary", label: "Medium" },
    low: { variant: "outline", label: "Low" },
  };

  const config = statusConfig[status?.toLowerCase()] || { variant: "outline" as const, label: status };

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
