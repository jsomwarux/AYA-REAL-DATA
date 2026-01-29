import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimelineEvent } from "@/lib/api";
import { Loader2, Trash2 } from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TimelineEvent | null;
  weekDate: string;
  onSave: (data: { label: string; color: string }) => void;
  onDelete: () => void;
  isLoading?: boolean;
}

// Predefined event types with colors
const EVENT_PRESETS = [
  { label: 'Begins', color: '#93c5fd' },
  { label: 'Start', color: '#93c5fd' },
  { label: 'Complete', color: '#86efac' },
  { label: 'Finish', color: '#86efac' },
  { label: 'Departs', color: '#fcd34d' },
  { label: 'Arrive', color: '#c4b5fd' },
  { label: 'Arrive to US', color: '#c4b5fd' },
  { label: 'Installation', color: '#5eead4' },
  { label: 'Custom', color: '#d1d5db' },
];

// Color palette for custom colors
const COLOR_PALETTE = [
  '#93c5fd', // Light blue
  '#86efac', // Light green
  '#fcd34d', // Yellow
  '#c4b5fd', // Light purple
  '#5eead4', // Teal
  '#fca5a5', // Light red
  '#fdba74', // Orange
  '#f9a8d4', // Pink
  '#d1d5db', // Gray
];

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EventModal({
  isOpen,
  onClose,
  event,
  weekDate,
  onSave,
  onDelete,
  isLoading,
}: EventModalProps) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#d1d5db');
  const [presetValue, setPresetValue] = useState('Custom');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (event) {
        setLabel(event.label || '');
        setColor(event.color || '#d1d5db');
        // Try to match preset
        const preset = EVENT_PRESETS.find(p => p.label === event.label);
        setPresetValue(preset ? preset.label : 'Custom');
      } else {
        setLabel('');
        setColor('#d1d5db');
        setPresetValue('Custom');
      }
    }
  }, [isOpen, event]);

  const handlePresetChange = (value: string) => {
    setPresetValue(value);
    const preset = EVENT_PRESETS.find(p => p.label === value);
    if (preset && preset.label !== 'Custom') {
      setLabel(preset.label);
      setColor(preset.color);
    }
  };

  const handleSave = () => {
    if (!label.trim()) return;
    onSave({ label: label.trim(), color });
  };

  const isEditing = !!event;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Edit Event' : 'Add Event'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Week of {formatDateForDisplay(weekDate)}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset selector */}
          <div className="space-y-2">
            <Label htmlFor="preset">Event Type</Label>
            <Select value={presetValue} onValueChange={handlePresetChange}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: preset.color }}
                      />
                      {preset.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label input */}
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (presetValue !== 'Custom') {
                  const preset = EVENT_PRESETS.find(p => p.label === e.target.value);
                  if (!preset) setPresetValue('Custom');
                }
              }}
              placeholder="Event label..."
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-md transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <span
                className="px-3 py-1.5 rounded text-sm font-medium"
                style={{
                  backgroundColor: color,
                  color: 'rgba(0,0,0,0.8)',
                }}
              >
                {label || 'Event Label'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {isEditing && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isLoading}
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !label.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
