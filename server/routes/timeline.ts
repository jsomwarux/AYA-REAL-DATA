import { Router } from 'express';
import { db } from '../db';
import { timelineTasks, timelineEvents, customEventTypes } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';
import { fetchSheetData, getSpreadsheetInfo } from '../services/googleSheets';

const router = Router();

// Color mapping for event labels
function getEventColor(label: string): string {
  const lowerLabel = (label || '').toLowerCase();
  if (lowerLabel.includes('begins') || lowerLabel.includes('start')) return '#93c5fd';
  if (lowerLabel.includes('complete') || lowerLabel.includes('finish')) return '#86efac';
  if (lowerLabel.includes('departs')) return '#fcd34d';
  if (lowerLabel.includes('arrive')) return '#c4b5fd';
  if (lowerLabel.includes('installation')) return '#5eead4';
  return '#d1d5db';
}

// Generate fallback week dates dynamically (Nov 14 to May 8, spanning current project year)
// Used only when there are no events in the database yet
function getFallbackWeekDates(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // If currently Nov/Dec, start year is this year; otherwise last year
  const startYear = currentMonth >= 11 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;
  return generateWeeklyDates(`${startYear}-11-14`, `${endYear}-05-08`);
}
const WEEK_DATES = getFallbackWeekDates();

// Helper to generate weekly dates between two dates (every 7 days from start date)
function generateWeeklyDates(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

// GET /api/timeline - Get all timeline data (tasks + events)
router.get('/', async (req, res) => {
  try {
    // Fetch all tasks ordered by category and sortOrder
    const tasks = await db
      .select()
      .from(timelineTasks)
      .orderBy(asc(timelineTasks.category), asc(timelineTasks.sortOrder));

    // Fetch all events
    const events = await db
      .select()
      .from(timelineEvents)
      .orderBy(asc(timelineEvents.startDate));

    // Derive week dates from actual event data instead of using hardcoded dates.
    // We collect all unique startDate and endDate values from events — these are the
    // exact week column dates that were parsed from the Google Sheet headers during import.
    let weekDates: string[] = WEEK_DATES; // fallback
    if (events.length > 0) {
      const dateSet = new Set<string>();
      for (const event of events) {
        dateSet.add(event.startDate);
        dateSet.add(event.endDate);
      }
      const sortedDates = Array.from(dateSet).sort();
      if (sortedDates.length > 0) {
        weekDates = sortedDates;
      }
    }

    // Group events by taskId
    const eventsByTask: Record<number, typeof events> = {};
    for (const event of events) {
      if (!eventsByTask[event.taskId]) {
        eventsByTask[event.taskId] = [];
      }
      eventsByTask[event.taskId].push(event);
    }

    // Group tasks by category
    const categories: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (!categories[task.category]) {
        categories[task.category] = [];
      }
      categories[task.category].push(task);
    }

    res.json({
      tasks,
      events,
      eventsByTask,
      categories,
      weekDates,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({
      error: 'Failed to fetch timeline data',
      message: error.message
    });
  }
});

// POST /api/timeline/import - Import from Google Sheet
router.post('/import', async (req, res) => {
  try {
    const spreadsheetId = process.env.TIMELINE_SHEET_ID;

    if (!spreadsheetId) {
      return res.status(400).json({
        error: 'Timeline sheet ID not configured',
        message: 'Please set TIMELINE_SHEET_ID in environment variables'
      });
    }

    // First, get the spreadsheet info to find the correct sheet name
    console.log('[timeline-import] Getting spreadsheet info...');
    const spreadsheetInfo = await getSpreadsheetInfo(spreadsheetId);
    console.log('[timeline-import] Available sheets:', spreadsheetInfo.sheets?.map(s => s.title));

    // Find the timeline sheet - try common names
    const timelineSheetNames = ['Summary - High Level', 'Timeline', 'timeline', 'TIMELINE', 'Gantt', 'Schedule', 'Project Timeline'];
    let sheetName = spreadsheetInfo.sheets?.[0]?.title || 'Sheet1'; // Default to first sheet

    for (const name of timelineSheetNames) {
      const found = spreadsheetInfo.sheets?.find(s => s.title?.toLowerCase() === name.toLowerCase());
      if (found) {
        sheetName = found.title || sheetName;
        break;
      }
    }

    // If no timeline-specific sheet found, use the first sheet
    console.log('[timeline-import] Using sheet:', sheetName);

    // Fetch the timeline sheet data
    const range = `'${sheetName}'!A:AB`;
    const data = await fetchSheetData(spreadsheetId, range);

    if (!data || !data.rawValues || data.rawValues.length < 2) {
      return res.status(400).json({
        error: 'Invalid sheet data',
        message: 'Sheet appears to be empty or has no data rows'
      });
    }

    // Clear existing data
    await db.delete(timelineEvents);
    await db.delete(timelineTasks);

    // First row is headers: [Category, Task, Nov 14, Nov 21, ...]
    const headers = data.rawValues[0];
    console.log('[timeline-import] Headers:', headers);

    // Parse week dates from headers (columns C onwards = index 2+)
    const weekDateColumns: { index: number; date: string }[] = [];
    for (let i = 2; i < headers.length && i < 28; i++) {
      const dateStr = headers[i];
      if (dateStr) {
        // Try to parse the date - format like "Nov 14" or "11/14"
        const parsed = parseDateHeader(dateStr);
        if (parsed) {
          weekDateColumns.push({ index: i, date: parsed });
        }
      }
    }

    console.log('[timeline-import] Parsed week dates:', weekDateColumns);

    // Process data rows (starting from row 2)
    const dataRows = data.rawValues.slice(1);
    let sortOrder = 0;
    let currentCategory = '';

    for (const row of dataRows) {
      const categoryCol = (row[0] || '').toString().trim();
      const taskCol = (row[1] || '').toString().trim();

      // Skip completely empty rows
      if (!categoryCol && !taskCol) {
        // Check if any date columns have values - if so, this might be a continuation row
        const hasDateValues = weekDateColumns.some(({ index }) => (row[index] || '').toString().trim());
        if (!hasDateValues) continue;
      }

      // Update current category if provided
      if (categoryCol) {
        currentCategory = categoryCol;
      }

      // Determine task name:
      // - If task column has value, use it
      // - If only category column has value AND there are date values, treat category as the task name
      //   (handles rows like "FINISHES" and "OPENING" where category IS the task)
      let taskName = taskCol;
      let taskCategory = currentCategory;

      if (!taskCol && categoryCol) {
        // Check if this row has any date values
        const hasDateValues = weekDateColumns.some(({ index }) => (row[index] || '').toString().trim());
        if (hasDateValues) {
          // This is a category-as-task row (like FINISHES, OPENING)
          taskName = categoryCol;
          taskCategory = categoryCol;
        } else {
          // This is just a category header row with no data - skip it
          continue;
        }
      }

      // Skip if we still don't have a task name
      if (!taskName) continue;

      // Insert the task
      const [insertedTask] = await db
        .insert(timelineTasks)
        .values({
          category: taskCategory || 'Uncategorized',
          task: taskName,
          sortOrder: sortOrder++,
        })
        .returning();

      // Process events for this task - merge consecutive cells with same label into multi-week events
      let currentEvent: { label: string; color: string; startDate: string; endDate: string } | null = null;

      for (let i = 0; i < weekDateColumns.length; i++) {
        const { index, date } = weekDateColumns[i];
        const cellValue = (row[index] || '').toString().trim();

        if (cellValue) {
          const color = getEventColor(cellValue);

          if (currentEvent && currentEvent.label === cellValue) {
            // Extend the current event
            currentEvent.endDate = date;
          } else {
            // Save previous event if exists
            if (currentEvent) {
              await db.insert(timelineEvents).values({
                taskId: insertedTask.id,
                startDate: currentEvent.startDate,
                endDate: currentEvent.endDate,
                label: currentEvent.label,
                color: currentEvent.color,
              });
            }
            // Start a new event
            currentEvent = { label: cellValue, color, startDate: date, endDate: date };
          }
        } else {
          // Empty cell - save current event if exists
          if (currentEvent) {
            await db.insert(timelineEvents).values({
              taskId: insertedTask.id,
              startDate: currentEvent.startDate,
              endDate: currentEvent.endDate,
              label: currentEvent.label,
              color: currentEvent.color,
            });
            currentEvent = null;
          }
        }
      }

      // Don't forget to save the last event
      if (currentEvent) {
        await db.insert(timelineEvents).values({
          taskId: insertedTask.id,
          startDate: currentEvent.startDate,
          endDate: currentEvent.endDate,
          label: currentEvent.label,
          color: currentEvent.color,
        });
      }
    }

    // Fetch the imported data to return
    const tasks = await db.select().from(timelineTasks).orderBy(asc(timelineTasks.category), asc(timelineTasks.sortOrder));
    const events = await db.select().from(timelineEvents);

    res.json({
      success: true,
      imported: {
        tasks: tasks.length,
        events: events.length,
      },
      tasks,
      events,
      message: `Successfully imported ${tasks.length} tasks with ${events.length} events`,
    });
  } catch (error: any) {
    console.error('Error importing timeline data:', error);
    res.status(500).json({
      error: 'Failed to import timeline data',
      message: error.message
    });
  }
});

// Helper function to parse date headers
// The sheet headers only have month+day (e.g., "Nov 14"), so we infer the year.
// The timeline starts in Nov/Dec of one year and continues Jan-May of the next.
// We use the current date to determine the correct academic/project year.
function parseDateHeader(dateStr: string): string | null {
  const str = dateStr.toString().trim();

  const monthNames: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
  };

  let monthNum: number | null = null;
  let day: string | null = null;
  let month: string | null = null;

  // Format: "Nov 14" or "Dec 5" etc.
  const match = str.match(/^(\w+)\s+(\d+)$/i);
  if (match) {
    const monthAbbr = match[1].toLowerCase().substring(0, 3);
    day = match[2].padStart(2, '0');
    month = monthNames[monthAbbr];
    if (month) monthNum = parseInt(month);
  }

  // Format: "11/14" or "12/5" etc.
  if (!monthNum) {
    const slashMatch = str.match(/^(\d+)\/(\d+)$/);
    if (slashMatch) {
      month = slashMatch[1].padStart(2, '0');
      day = slashMatch[2].padStart(2, '0');
      monthNum = parseInt(month);
    }
  }

  if (!monthNum || !month || !day) return null;

  // Dynamically determine the year:
  // The timeline spans Nov/Dec of year N and Jan-Oct of year N+1.
  // If we're currently in months Jan-Oct, then Nov/Dec belong to last year and Jan-Oct to this year.
  // If we're currently in Nov/Dec, then Nov/Dec belong to this year and Jan-Oct to next year.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  let year: number;
  if (monthNum >= 11) {
    // Nov/Dec: belongs to the "start" year
    year = currentMonth >= 11 ? currentYear : currentYear - 1;
  } else {
    // Jan-Oct: belongs to the "end" year
    year = currentMonth >= 11 ? currentYear + 1 : currentYear;
  }

  return `${year}-${month}-${day}`;
}

// POST /api/timeline/tasks - Create new task
router.post('/tasks', async (req, res) => {
  try {
    const { category, task, sortOrder } = req.body;

    if (!category || !task) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'category and task are required'
      });
    }

    const [newTask] = await db
      .insert(timelineTasks)
      .values({ category, task, sortOrder: sortOrder || 0 })
      .returning();

    res.json(newTask);
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({
      error: 'Failed to create task',
      message: error.message
    });
  }
});

// PUT /api/timeline/tasks/:id - Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, task, sortOrder } = req.body;

    const [updatedTask] = await db
      .update(timelineTasks)
      .set({
        category,
        task,
        sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(timelineTasks.id, parseInt(id)))
      .returning();

    if (!updatedTask) {
      return res.status(404).json({
        error: 'Task not found',
        message: `No task found with id ${id}`
      });
    }

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({
      error: 'Failed to update task',
      message: error.message
    });
  }
});

// DELETE /api/timeline/tasks/:id - Delete task (cascades events)
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const taskId = parseInt(id);

    // Delete events for this task first
    await db.delete(timelineEvents).where(eq(timelineEvents.taskId, taskId));

    // Delete the task
    const [deletedTask] = await db
      .delete(timelineTasks)
      .where(eq(timelineTasks.id, taskId))
      .returning();

    if (!deletedTask) {
      return res.status(404).json({
        error: 'Task not found',
        message: `No task found with id ${id}`
      });
    }

    res.json({ success: true, deleted: deletedTask });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      error: 'Failed to delete task',
      message: error.message
    });
  }
});

// POST /api/timeline/events - Add event to task
router.post('/events', async (req, res) => {
  try {
    const { taskId, startDate, endDate, label, color } = req.body;

    if (!taskId || !startDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'taskId and startDate are required'
      });
    }

    // Verify task exists
    const task = await db.select().from(timelineTasks).where(eq(timelineTasks.id, taskId));
    if (task.length === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: `No task found with id ${taskId}`
      });
    }

    const eventColor = color || getEventColor(label || '');

    const [newEvent] = await db
      .insert(timelineEvents)
      .values({
        taskId,
        startDate,
        endDate: endDate || startDate, // Default endDate to startDate for single-day events
        label,
        color: eventColor,
      })
      .returning();

    res.json(newEvent);
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: error.message
    });
  }
});

// PUT /api/timeline/events/:id - Update event
router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, label, color } = req.body;

    const eventColor = color || getEventColor(label || '');

    const updateData: any = { label, color: eventColor };
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;

    const [updatedEvent] = await db
      .update(timelineEvents)
      .set(updateData)
      .where(eq(timelineEvents.id, parseInt(id)))
      .returning();

    if (!updatedEvent) {
      return res.status(404).json({
        error: 'Event not found',
        message: `No event found with id ${id}`
      });
    }

    res.json(updatedEvent);
  } catch (error: any) {
    console.error('Error updating event:', error);
    res.status(500).json({
      error: 'Failed to update event',
      message: error.message
    });
  }
});

// DELETE /api/timeline/events/:id - Delete event
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedEvent] = await db
      .delete(timelineEvents)
      .where(eq(timelineEvents.id, parseInt(id)))
      .returning();

    if (!deletedEvent) {
      return res.status(404).json({
        error: 'Event not found',
        message: `No event found with id ${id}`
      });
    }

    res.json({ success: true, deleted: deletedEvent });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

// PUT /api/timeline/categories/:name - Rename a category
router.put('/categories/:name', async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ error: 'newName is required' });
    }

    // Find all tasks in the old category
    const tasks = await db
      .select()
      .from(timelineTasks)
      .where(eq(timelineTasks.category, oldName));

    if (tasks.length === 0) {
      return res.status(404).json({
        error: 'Category not found',
        message: `No tasks found in category "${oldName}"`,
      });
    }

    // Update all tasks to the new category name
    await db
      .update(timelineTasks)
      .set({ category: newName.trim(), updatedAt: new Date() })
      .where(eq(timelineTasks.category, oldName));

    res.json({
      success: true,
      renamed: { from: oldName, to: newName.trim(), tasksUpdated: tasks.length },
    });
  } catch (error: any) {
    console.error('Error renaming category:', error);
    res.status(500).json({
      error: 'Failed to rename category',
      message: error.message,
    });
  }
});

// DELETE /api/timeline/categories/:name - Delete entire category (all tasks + events)
router.delete('/categories/:name', async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);

    // Find all tasks in this category
    const tasks = await db
      .select()
      .from(timelineTasks)
      .where(eq(timelineTasks.category, categoryName));

    if (tasks.length === 0) {
      return res.status(404).json({
        error: 'Category not found',
        message: `No tasks found in category "${categoryName}"`,
      });
    }

    // Delete all events for each task in the category
    for (const task of tasks) {
      await db.delete(timelineEvents).where(eq(timelineEvents.taskId, task.id));
    }

    // Delete all tasks in the category
    await db.delete(timelineTasks).where(eq(timelineTasks.category, categoryName));

    res.json({
      success: true,
      deleted: {
        category: categoryName,
        tasksRemoved: tasks.length,
      },
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      error: 'Failed to delete category',
      message: error.message,
    });
  }
});

// ==========================================
// Custom Event Types CRUD
// ==========================================

// GET /api/timeline/event-types - Get all custom event types
router.get('/event-types', async (req, res) => {
  try {
    const types = await db
      .select()
      .from(customEventTypes)
      .orderBy(asc(customEventTypes.label));
    res.json(types);
  } catch (error: any) {
    console.error('Error fetching custom event types:', error);
    res.status(500).json({ error: 'Failed to fetch event types', message: error.message });
  }
});

// POST /api/timeline/event-types - Create a new custom event type
router.post('/event-types', async (req, res) => {
  try {
    const { label, color } = req.body;
    if (!label || !color) {
      return res.status(400).json({ error: 'label and color are required' });
    }
    const [newType] = await db
      .insert(customEventTypes)
      .values({ label: label.trim(), color })
      .returning();
    res.json(newType);
  } catch (error: any) {
    console.error('Error creating custom event type:', error);
    res.status(500).json({ error: 'Failed to create event type', message: error.message });
  }
});

// PUT /api/timeline/event-types/:id - Rename or recolor a custom event type
router.put('/event-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label, color } = req.body;
    const updateData: any = {};
    if (label !== undefined) updateData.label = label.trim();
    if (color !== undefined) updateData.color = color;

    const [updated] = await db
      .update(customEventTypes)
      .set(updateData)
      .where(eq(customEventTypes.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Event type not found' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating custom event type:', error);
    res.status(500).json({ error: 'Failed to update event type', message: error.message });
  }
});

// DELETE /api/timeline/event-types/:id - Delete a custom event type
router.delete('/event-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(customEventTypes)
      .where(eq(customEventTypes.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Event type not found' });
    }
    res.json({ success: true, deleted });
  } catch (error: any) {
    console.error('Error deleting custom event type:', error);
    res.status(500).json({ error: 'Failed to delete event type', message: error.message });
  }
});

export default router;
