import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BudgetItem } from "@/lib/api";
import {
  DollarSign,
  Building2,
  Users,
  FileText,
  Hash,
} from "lucide-react";

interface BudgetItemModalProps {
  item: BudgetItem | null;
  isOpen: boolean;
  onClose: () => void;
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Status badge colors
function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('contract') || s.includes('signed')) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (s.includes('realistic')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (s.includes('rough')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (s.includes('awaiting')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  if (s === 'n/a' || s === 'n.a') return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return 'bg-white/10 text-muted-foreground border-white/10';
}

// Get status description
function getStatusDescription(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('contract') || s.includes('signed')) return 'Contract has been signed with vendor';
  if (s.includes('realistic')) return 'Estimate based on detailed quotes';
  if (s.includes('rough')) return 'Preliminary estimate, subject to change';
  if (s.includes('awaiting')) return 'Waiting for vendor proposals';
  if (s === 'n/a' || s === 'n.a') return 'Not applicable to this project';
  return 'Status not specified';
}

export function BudgetItemModal({ item, isOpen, onClose }: BudgetItemModalProps) {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl text-white mb-2">
                Budget Item Details
              </DialogTitle>
              <Badge className={`${getStatusColor(item.status)} border`}>
                {item.status}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-400">
                {item.subtotal > 0 ? formatCurrency(item.subtotal) : 'TBD'}
              </div>
              <div className="text-xs text-muted-foreground">Subtotal</div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Project Description
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-white leading-relaxed">
                {item.project}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Category
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-white font-medium">{item.category}</span>
              </div>
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Vendor / Payment Source
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-white font-medium">
                  {item.vendor || 'Not assigned'}
                </span>
              </div>
            </div>

            {/* Row ID */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Hash className="h-4 w-4" />
                Row Number
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-white font-medium">Row {item.id}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Amount
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-teal-400 font-medium">
                  {item.subtotal > 0 ? formatCurrency(item.subtotal) : 'To be determined'}
                </span>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Status Information
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(item.status)} border`}>
                  {item.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {getStatusDescription(item.status)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
