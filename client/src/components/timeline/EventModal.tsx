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
import { TimelineEvent, CustomEventType } from "@/lib/api";
import { Loader2, Trash2, Plus, Pencil, Check, X } from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TimelineEvent | null;
  weekDate: string;
  weekDates: string[];
  onSave: (data: { label: string; color: string; startDate: string; endDate: string }) => void;
  onDelete: () => void;
  isLoading?: boolean;
  customEventTypes: CustomEventType[];
  onCreateEventType: (data: { label: string; color: string }) => Promise<void>;
  onUpdateEventType: (id: number, data: { label?: string; color?: string }) => Promise<void>;
  onDeleteEventType: (id: number) => Promise<void>;
}

// Built-in event type presets (cannot be deleted/renamed)
const BUILTIN_PRESETS = [
  { label: 'Begins', color: '#93c5fd' },
  { label: 'Start', color: '#93c5fd' },
  { label: 'Complete', color: '#86efac' },
  { label: 'Finish', color: '#86efac' },
  { label: 'Departs', color: '#fcd34d' },
  { label: 'Arrive', color: '#c4b5fd' },
  { label: 'Arrive to US', color: '#c4b5fd' },
  { label: 'Installation', color: '#5eead4' },
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
    month: 'short',
    day: 'numeric',
  });
}

export function EventModal({
  isOpen,
  onClose,
  event,
  weekDate,
  weekDates,
  onSave,
  onDelete,
  isLoading,
  customEventTypes,
  onCreateEventType,
  onUpdateEventType,
  onDeleteEventType,
}: EventModalProps) {
  // The selected event type value in the dropdown.
  // For built-in/custom types this is the label string.
  // For freeform custom it's '__custom__'.
  const [selectedType, setSelectedType] = useState('__custom__');
  const [customLabel, setCustomLabel] = useState('');
  const [customColor, setCustomColor] = useState('#d1d5db');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // New event type creation state
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#fca5a5');

  // Edit/delete event type state
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeColor, setEditingTypeColor] = useState('');
  const [isManagingTypes, setIsManagingTypes] = useState(false);

  // All known types for lookup
  const allEventTypes = [
    ...BUILTIN_PRESETS,
    ...customEventTypes.map(c => ({ label: c.label, color: c.color })),
  ];

  const isCustom = selectedType === '__custom__';

  // Derive the final label and color that will be saved
  const finalLabel = isCustom ? customLabel.trim() : selectedType;
  const finalColor = isCustom ? customColor : (allEventTypes.find(t => t.label === selectedType)?.color || '#d1d5db');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsAddingType(false);
      setIsManagingTypes(false);
      setEditingTypeId(null);

      if (event) {
        setStartDate(event.startDate);
        setEndDate(event.endDate);
        // Try to match the event label to a known type
        const match = allEventTypes.find(t => t.label === event.label);
        if (match) {
          setSelectedType(match.label);
          setCustomLabel('');
          setCustomColor('#d1d5db');
        } else {
          setSelectedType('__custom__');
          setCustomLabel(event.label || '');
          setCustomColor(event.color || '#d1d5db');
        }
      } else {
        setSelectedType('__custom__');
        setCustomLabel('');
        setCustomColor('#d1d5db');
        setStartDate(weekDate);
        setEndDate(weekDate);
      }
    }
  }, [isOpen, event, weekDate]);

  const handleSave = () => {
    if (!finalLabel) return;
    onSave({
      label: finalLabel,
      color: finalColor,
      startDate,
      endDate: endDate || startDate,
    });
  };

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) return;
    await onCreateEventType({ label: newTypeName.trim(), color: newTypeColor });
    // Auto-select the newly created type
    setSelectedType(newTypeName.trim());
    setIsAddingType(false);
    setNewTypeName('');
    setNewTypeColor('#fca5a5');
  };

  const handleStartEditType = (ct: CustomEventType) => {
    setEditingTypeId(ct.id);
    setEditingTypeName(ct.label);
    setEditingTypeColor(ct.color);
  };

  const handleSaveEditType = async () => {
    if (editingTypeId === null || !editingTypeName.trim()) return;
    const oldType = customEventTypes.find(t => t.id === editingTypeId);
    await onUpdateEventType(editingTypeId, { label: editingTypeName.trim(), color: editingTypeColor });
    // If the currently selected type was the one we just renamed, update selection
    if (oldType && selectedType === oldType.label) {
      setSelectedType(editingTypeName.trim());
    }
    setEditingTypeId(null);
  };

  const handleDeleteType = async (id: number) => {
    const deletedType = customEventTypes.find(t => t.id === id);
    await onDeleteEventType(id);
    // If the deleted type was selected, reset to custom
    if (deletedType && selectedType === deletedType.label) {
      setSelectedType('__custom__');
    }
    setEditingTypeId(null);
  };

  // Get available dates for dropdowns
  const availableEndDates = weekDates.filter(d => d >= startDate);

  const isEditing = !!event;
  const isMultiWeek = startDate !== endDate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Edit Event' : 'Add Event'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Week</Label>
              <Select value={startDate} onValueChange={(v) => {
                setStartDate(v);
                if (endDate < v) setEndDate(v);
              }}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {formatDateForDisplay(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Week</Label>
              <Select value={endDate} onValueChange={setEndDate}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableEndDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {formatDateForDisplay(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isMultiWeek && (
            <p className="text-xs text-muted-foreground">
              This event spans {weekDates.indexOf(endDate) - weekDates.indexOf(startDate) + 1} weeks
            </p>
          )}

          {/* Event Type selector — this IS the label */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Event Type</Label>
              <div className="flex gap-1">
                {customEventTypes.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-white"
                    onClick={() => { setIsManagingTypes(!isManagingTypes); setIsAddingType(false); }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {isManagingTypes ? 'Done' : 'Manage'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-white"
                  onClick={() => { setIsAddingType(!isAddingType); setIsManagingTypes(false); }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Type
                </Button>
              </div>
            </div>

            {/* Add new event type inline form */}
            {isAddingType && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
                <p className="text-xs font-medium text-white">Create New Event Type</p>
                <Input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Type name..."
                  className="bg-white/5 border-white/10 h-8 text-sm"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-6 h-6 rounded transition-transform hover:scale-110 ${
                        newTypeColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-background' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewTypeColor(c)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddNewType}
                    disabled={!newTypeName.trim()}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => { setIsAddingType(false); setNewTypeName(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Manage custom event types */}
            {isManagingTypes && customEventTypes.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <p className="text-xs font-medium text-white">Manage Custom Types</p>
                {customEventTypes.map((ct) => (
                  <div key={ct.id} className="flex items-center gap-2">
                    {editingTypeId === ct.id ? (
                      <>
                        <button
                          type="button"
                          className="w-6 h-6 rounded flex-shrink-0 ring-2 ring-white/30"
                          style={{ backgroundColor: editingTypeColor }}
                          onClick={() => {
                            const idx = COLOR_PALETTE.indexOf(editingTypeColor);
                            const next = COLOR_PALETTE[(idx + 1) % COLOR_PALETTE.length];
                            setEditingTypeColor(next);
                          }}
                          title="Click to cycle color"
                        />
                        <Input
                          value={editingTypeName}
                          onChange={(e) => setEditingTypeName(e.target.value)}
                          className="bg-white/5 border-white/10 h-7 text-xs flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-green-400 hover:text-green-300"
                          onClick={handleSaveEditType}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground"
                          onClick={() => setEditingTypeId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: ct.color }}
                        />
                        <span className="text-sm text-white flex-1 truncate">{ct.label}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                          onClick={() => handleStartEditType(ct)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDeleteType(ct.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Event type dropdown */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Built-in presets */}
                {BUILTIN_PRESETS.map((preset) => (
                  <SelectItem key={`builtin-${preset.label}`} value={preset.label}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: preset.color }} />
                      {preset.label}
                    </div>
                  </SelectItem>
                ))}
                {/* Custom types */}
                {customEventTypes.length > 0 && (
                  <SelectItem value="__separator__" disabled>
                    <span className="text-xs text-muted-foreground">── Custom Types ──</span>
                  </SelectItem>
                )}
                {customEventTypes.map((ct) => (
                  <SelectItem key={`custom-${ct.id}`} value={ct.label}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: ct.color }} />
                      {ct.label}
                    </div>
                  </SelectItem>
                ))}
                {/* Freeform custom option */}
                <SelectItem value="__custom__">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: '#d1d5db' }} />
                    Custom...
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom label + color — only shown when "Custom..." is selected */}
          {isCustom && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customLabel">Custom Label</Label>
                <Input
                  id="customLabel"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Enter event label..."
                  className="bg-white/5 border-white/10"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-md transition-transform hover:scale-110 ${
                        customColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setCustomColor(c)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <span
                className="px-3 py-1.5 rounded text-sm font-medium"
                style={{
                  backgroundColor: finalColor,
                  color: 'rgba(0,0,0,0.8)',
                }}
              >
                {finalLabel || 'Event Label'}
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
            <Button onClick={handleSave} disabled={isLoading || !finalLabel}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
