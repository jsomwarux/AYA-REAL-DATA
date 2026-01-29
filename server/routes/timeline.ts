import { Router } from 'express';
import { db } from '../db';
import { timelineTasks, timelineEvents } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';
import { fetchSheetData } from '../services/googleSheets';

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

// Week dates from Nov 14 to May 8
const WEEK_DATES = [
  '2024-11-14', '2024-11-21', '2024-11-28', '2024-12-05',
  '2024-12-12', '2024-12-19', '2024-12-26', '2025-01-02',
  '2025-01-09', '2025-01-16', '2025-01-23', '2025-01-30',
  '2025-02-06', '2025-02-13', '2025-02-20', '2025-02-27',
  '2025-03-06', '2025-03-13', '2025-03-20', '2025-03-27',
  '2025-04-03', '2025-04-10', '2025-04-17', '2025-04-24',
  '2025-05-01', '2025-05-08',
];

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
      .orderBy(asc(timelineEvents.weekDate));

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
      weekDates: WEEK_DATES,
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

    // Fetch the timeline sheet data
    const range = "'Timeline'!A:AB";
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

    for (const row of dataRows) {
      const category = (row[0] || '').toString().trim();
      const task = (row[1] || '').toString().trim();

      // Skip empty rows
      if (!category && !task) continue;

      // Skip category header rows (rows with only category, no task)
      if (category && !task) continue;

      // Insert the task
      const [insertedTask] = await db
        .insert(timelineTasks)
        .values({
          category: category || 'Uncategorized',
          task,
          sortOrder: sortOrder++,
        })
        .returning();

      // Process events for this task
      for (const { index, date } of weekDateColumns) {
        const cellValue = (row[index] || '').toString().trim();
        if (cellValue) {
          const color = getEventColor(cellValue);
          await db.insert(timelineEvents).values({
            taskId: insertedTask.id,
            weekDate: date,
            label: cellValue,
            color,
          });
        }
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
function parseDateHeader(dateStr: string): string | null {
  const str = dateStr.toString().trim();

  // Format: "Nov 14" or "Dec 5" etc.
  const monthNames: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
  };

  const match = str.match(/^(\w+)\s+(\d+)$/i);
  if (match) {
    const monthAbbr = match[1].toLowerCase().substring(0, 3);
    const day = match[2].padStart(2, '0');
    const month = monthNames[monthAbbr];
    if (month) {
      // Determine year based on month
      const year = parseInt(month) >= 11 ? '2024' : '2025';
      return `${year}-${month}-${day}`;
    }
  }

  // Format: "11/14" or "12/5" etc.
  const slashMatch = str.match(/^(\d+)\/(\d+)$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = parseInt(month) >= 11 ? '2024' : '2025';
    return `${year}-${month}-${day}`;
  }

  return null;
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
    const { taskId, weekDate, label, color } = req.body;

    if (!taskId || !weekDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'taskId and weekDate are required'
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
      .values({ taskId, weekDate, label, color: eventColor })
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
    const { weekDate, label, color } = req.body;

    const eventColor = color || getEventColor(label || '');

    const [updatedEvent] = await db
      .update(timelineEvents)
      .set({ weekDate, label, color: eventColor })
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

export default router;
