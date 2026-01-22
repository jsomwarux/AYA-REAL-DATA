import { pgTable, text, serial, timestamp, varchar, index } from "drizzle-orm/pg-core";
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
