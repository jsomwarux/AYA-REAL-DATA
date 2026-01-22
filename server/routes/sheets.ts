import { Router } from 'express';
import { fetchSheetData, fetchMultipleRanges, getSpreadsheetInfo, SheetRow as GoogleSheetRow } from '../services/googleSheets';
import { db } from '../db';
import { sheetRows } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const router = Router();

// Get the unique identifier from a row based on sheet type
function getRowIdentifier(row: GoogleSheetRow, sheetType: string): string | null {
  // Try common identifier fields
  const identifierFields = [
    'invoice_number', 'invoice_id', 'id', 'ID',  // For construction
    'deal_id', 'property_id', 'address',          // For deals
    'row_id', 'unique_id'                         // Generic
  ];

  for (const field of identifierFields) {
    if (row[field] !== null && row[field] !== undefined && row[field] !== '') {
      return String(row[field]);
    }
  }

  // If no identifier found, create one from first few non-null values
  const values = Object.values(row).filter(v => v !== null && v !== '').slice(0, 3);
  if (values.length > 0) {
    return values.join('_');
  }

  return null;
}

// Add timestamps to rows, preserving existing timestamps for known rows
async function addTimestampsToRows(
  rows: GoogleSheetRow[],
  sheetType: string
): Promise<GoogleSheetRow[]> {
  if (rows.length === 0) {
    return rows;
  }

  // Get identifiers for all rows
  const rowsWithIds = rows.map(row => ({
    row,
    identifier: getRowIdentifier(row, sheetType)
  })).filter(r => r.identifier !== null);

  if (rowsWithIds.length === 0) {
    // No identifiable rows, just add current timestamp to all
    const now = new Date().toISOString();
    return rows.map(row => ({ ...row, retrieved_at: now }));
  }

  const identifiers = rowsWithIds.map(r => r.identifier as string);

  // Fetch existing records from database
  const existingRecords = await db
    .select()
    .from(sheetRows)
    .where(
      and(
        eq(sheetRows.sheet_type, sheetType),
        inArray(sheetRows.row_identifier, identifiers)
      )
    );

  // Create a map of identifier -> first_seen_at
  const existingTimestamps = new Map<string, Date>();
  for (const record of existingRecords) {
    existingTimestamps.set(record.row_identifier, record.first_seen_at);
  }

  // Find new rows that need to be inserted
  const newIdentifiers = identifiers.filter(id => !existingTimestamps.has(id));
  const now = new Date();

  // Insert new rows into the database
  if (newIdentifiers.length > 0) {
    const newRecords = newIdentifiers.map(identifier => ({
      sheet_type: sheetType,
      row_identifier: identifier,
      first_seen_at: now,
    }));

    await db.insert(sheetRows).values(newRecords);

    // Add to our map
    for (const id of newIdentifiers) {
      existingTimestamps.set(id, now);
    }
  }

  // Add timestamps to rows
  return rows.map(row => {
    const identifier = getRowIdentifier(row, sheetType);
    const timestamp = identifier ? existingTimestamps.get(identifier) : null;
    return {
      ...row,
      retrieved_at: timestamp ? timestamp.toISOString() : now.toISOString(),
    };
  });
}

// Get Construction Oversight data
router.get('/construction', async (req, res) => {
  try {
    const spreadsheetId = process.env.CONSTRUCTION_SHEET_ID;

    if (!spreadsheetId) {
      return res.status(400).json({
        error: 'Construction sheet ID not configured',
        message: 'Please set CONSTRUCTION_SHEET_ID in environment variables'
      });
    }

    const range = (req.query.range as string) || 'Sheet1!A:Z';
    const data = await fetchSheetData(spreadsheetId, range);

    // Add timestamps (preserving existing ones for known rows)
    const rowsWithTimestamp = await addTimestampsToRows(data.rows, 'construction');

    // Add retrieved_at to headers if not already present
    const headers = data.headers.includes('retrieved_at')
      ? data.headers
      : [...data.headers, 'retrieved_at'];

    res.json({
      ...data,
      headers,
      rows: rowsWithTimestamp,
    });
  } catch (error: any) {
    console.error('Error fetching construction data:', error);
    res.status(500).json({
      error: 'Failed to fetch construction data',
      message: error.message
    });
  }
});

// Get Deal Intelligence data
router.get('/deals', async (req, res) => {
  try {
    const spreadsheetId = process.env.DEALS_SHEET_ID;

    if (!spreadsheetId) {
      return res.status(400).json({
        error: 'Deals sheet ID not configured',
        message: 'Please set DEALS_SHEET_ID in environment variables'
      });
    }

    const range = (req.query.range as string) || 'Sheet1!A:Z';
    const data = await fetchSheetData(spreadsheetId, range);

    // Add timestamps (preserving existing ones for known rows)
    const rowsWithTimestamp = await addTimestampsToRows(data.rows, 'deals');

    // Add retrieved_at to headers if not already present
    const headers = data.headers.includes('retrieved_at')
      ? data.headers
      : [...data.headers, 'retrieved_at'];

    res.json({
      ...data,
      headers,
      rows: rowsWithTimestamp,
    });
  } catch (error: any) {
    console.error('Error fetching deals data:', error);
    res.status(500).json({
      error: 'Failed to fetch deals data',
      message: error.message
    });
  }
});

// Get data from any sheet (with spreadsheet ID)
router.get('/sheet/:spreadsheetId', async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const range = (req.query.range as string) || 'Sheet1!A:Z';
    const sheetType = (req.query.type as string) || 'generic';

    const data = await fetchSheetData(spreadsheetId, range);

    // Add timestamps (preserving existing ones for known rows)
    const rowsWithTimestamp = await addTimestampsToRows(data.rows, sheetType);

    const headers = data.headers.includes('retrieved_at')
      ? data.headers
      : [...data.headers, 'retrieved_at'];

    res.json({
      ...data,
      headers,
      rows: rowsWithTimestamp,
    });
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    res.status(500).json({
      error: 'Failed to fetch sheet data',
      message: error.message
    });
  }
});

// Get spreadsheet metadata
router.get('/info/:spreadsheetId', async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const info = await getSpreadsheetInfo(spreadsheetId);
    res.json(info);
  } catch (error: any) {
    console.error('Error fetching spreadsheet info:', error);
    res.status(500).json({
      error: 'Failed to fetch spreadsheet info',
      message: error.message
    });
  }
});

// Get multiple ranges at once
router.post('/batch', async (req, res) => {
  try {
    const { spreadsheetId, ranges, sheetType = 'generic' } = req.body;

    if (!spreadsheetId || !ranges || !Array.isArray(ranges)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide spreadsheetId and ranges array'
      });
    }

    const data = await fetchMultipleRanges(spreadsheetId, ranges);

    // Convert Map to object for JSON response and add timestamps
    const result: Record<string, any> = {};

    for (const [key, value] of data.entries()) {
      const rowsWithTimestamp = await addTimestampsToRows(value.rows, sheetType);
      const headers = value.headers.includes('retrieved_at')
        ? value.headers
        : [...value.headers, 'retrieved_at'];

      result[key] = {
        ...value,
        headers,
        rows: rowsWithTimestamp,
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching batch data:', error);
    res.status(500).json({
      error: 'Failed to fetch batch data',
      message: error.message
    });
  }
});

export default router;
