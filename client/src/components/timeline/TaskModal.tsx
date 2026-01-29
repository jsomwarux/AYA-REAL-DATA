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
import { TimelineTask } from "@/lib/api";
import { Loader2, Trash2 } from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TimelineTask | null;
  categories: string[];
  onSave: (data: { category: string; task: string }) => void;
  onDelete: () => void;
  isLoading?: boolean;
}

// Default categories if none exist yet
const DEFAULT_CATEGORIES = [
  '10th Floor + Lobby Design',
  'Branding',
  'China',
  'Construction - High Rise',
  'Construction - Low Rise',
  'FINISHES',
  'Finishes & Misc',
  'Hiring',
  'IT',
  'Mechanical Systems',
  'OPENING',
  'PR & Social Media',
  'Website & Digital Performance',
];

export function TaskModal({
  isOpen,
  onClose,
  task,
  categories,
  onSave,
  onDelete,
  isLoading,
}: TaskModalProps) {
  const [category, setCategory] = useState('');
  const [taskName, setTaskName] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Available categories (existing + defaults if empty)
  const availableCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setCategory(task.category);
        setTaskName(task.task);
        setIsNewCategory(false);
        setNewCategory('');
      } else {
        setCategory('');
        setTaskName('');
        setIsNewCategory(false);
        setNewCategory('');
      }
    }
  }, [isOpen, task]);

  const handleSave = () => {
    const finalCategory = isNewCategory ? newCategory.trim() : category;
    if (!finalCategory || !taskName.trim()) return;
    onSave({ category: finalCategory, task: taskName.trim() });
  };

  const isEditing = !!task;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Edit Task' : 'Add Task'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category selector */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            {!isNewCategory ? (
              <div className="space-y-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setIsNewCategory(true)}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  + Create new category
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name..."
                  className="bg-white/5 border-white/10"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCategory(false);
                    setNewCategory('');
                  }}
                  className="text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  Cancel - use existing category
                </button>
              </div>
            )}
          </div>

          {/* Task name input */}
          <div className="space-y-2">
            <Label htmlFor="task">Task Name</Label>
            <Input
              id="task"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Enter task name..."
              className="bg-white/5 border-white/10"
            />
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
                Delete Task
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !taskName.trim() || (!category && !newCategory.trim())}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
