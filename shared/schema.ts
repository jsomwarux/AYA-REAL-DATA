import { pgTable, text, serial, timestamp, varchar, index, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Track when rows were first seen from Google Sheets
export const sheetRows = pgTable("sheet_rows", {
  id: serial("id").primaryKey(),
  sheet_type: varchar("sheet_type", { length: 50 }).notNull(), // 'construction', 'deals', etc.
  row_identifier: varchar("row_identifier", { length: 255 }).notNull(), // unique ID for the row (e.g., invoice_number)
  first_seen_at: timestamp("first_seen_at").notNull().defaultNow(),
}, (table) => [
  index("sheet_rows_lookup_idx").on(table.sheet_type, table.row_identifier),
]);

export const insertSheetRowSchema = createInsertSchema(sheetRows).pick({
  sheet_type: true,
  row_identifier: true,
});

export type SheetRow = typeof sheetRows.$inferSelect;
export type InsertSheetRow = z.infer<typeof insertSheetRowSchema>;

// Timeline Tasks Table - stores project tasks for the timeline/Gantt view
export const timelineTasks = pgTable("timeline_tasks", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 255 }).notNull(),
  task: text("task").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("timeline_tasks_category_idx").on(table.category),
]);

export const insertTimelineTaskSchema = createInsertSchema(timelineTasks).pick({
  category: true,
  task: true,
  sortOrder: true,
});

export type TimelineTask = typeof timelineTasks.$inferSelect;
export type InsertTimelineTask = z.infer<typeof insertTimelineTaskSchema>;

// Timeline Events Table - milestones/phases for each task
export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  weekDate: date("week_date").notNull(),
  label: varchar("label", { length: 255 }),
  color: varchar("color", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("timeline_events_task_idx").on(table.taskId),
  index("timeline_events_date_idx").on(table.weekDate),
]);

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).pick({
  taskId: true,
  weekDate: true,
  label: true,
  color: true,
});

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
