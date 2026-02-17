import { Router } from 'express';
import { fetchSheetData, fetchSheetDataWithHyperlinks, fetchMultipleRanges, getSpreadsheetInfo, listDriveFiles, listDriveSubfolders, getDriveFileStream, SheetRow as GoogleSheetRow } from '../services/googleSheets';
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

// Get Construction Progress data (new sheet with Rooms Progress and RECAP tabs)
router.get('/construction-progress', async (req, res) => {
  console.log('[construction-progress] Endpoint called');
  try {
    const spreadsheetId = process.env.CONSTRUCTION_PROGRESS_SHEET_ID;
    console.log('[construction-progress] Sheet ID configured:', spreadsheetId ? 'YES' : 'NO');

    if (!spreadsheetId) {
      console.error('[construction-progress] CONSTRUCTION_PROGRESS_SHEET_ID not set');
      return res.status(400).json({
        error: 'Construction Progress sheet ID not configured',
        message: 'Please set CONSTRUCTION_PROGRESS_SHEET_ID in environment variables'
      });
    }

    // Dynamically find the Rooms Progress tab name (resilient to renames)
    const spreadsheetInfo = await getSpreadsheetInfo(spreadsheetId);
    const availableTabs = spreadsheetInfo.sheets?.map(s => s.title) || [];
    console.log('[construction-progress] Available tabs:', availableTabs);

    // Find the rooms progress tab by checking common name patterns
    const roomsTab = availableTabs.find(t =>
      t?.toLowerCase().includes('rooms progress')
    ) || 'A.I Rooms Progress'; // fallback to original name

    // Find the recap tab similarly
    const recapTab = availableTabs.find(t =>
      t?.toLowerCase().trim() === 'recap'
    ) || 'RECAP';

    console.log('[construction-progress] Using rooms tab:', roomsTab, '| recap tab:', recapTab);

    // Fetch both the Rooms Progress data and RECAP data
    const roomsRange = `'${roomsTab}'!A3:AZ500`; // Row 3 has headers, row 4+ has data
    const recapRange = `'${recapTab}'!A:AZ`;

    console.log('[construction-progress] Fetching data from sheet:', spreadsheetId);
    // Fetch values and hyperlinks in parallel
    const [data, hyperlinkData] = await Promise.all([
      fetchMultipleRanges(spreadsheetId, [roomsRange, recapRange]),
      // Fetch Column B hyperlinks (ROOM # links to Google Drive folders)
      fetchSheetDataWithHyperlinks(spreadsheetId, roomsTab, 3, 500, 'B'),
    ]);
    console.log('[construction-progress] Data fetched successfully');

    // Build a map of room number → Google Drive folder URL from hyperlinks
    const roomDriveFolderMap = new Map<string, string>();
    if (hyperlinkData && hyperlinkData.rawValues && hyperlinkData.rawValues.length > 1) {
      const hlRows = hyperlinkData.rawValues.slice(1); // Skip header row
      for (const row of hlRows) {
        const roomNum = (row[0] || '').trim(); // Column A = empty in our range, but we fetched A:B
        const roomLink = (row[1] || '').trim(); // Column B = ROOM # with hyperlink
        // The hyperlink fetcher returns the URL as the value when a hyperlink exists
        // Column A is empty, Column B has the room number text or its hyperlink URL
        // Since we fetch A3:B500, row[0] = Col A (empty), row[1] = Col B (room # or URL)
        // If col B has a hyperlink, the value will be the URL, and we need to match by row position
      }
    }
    // Better approach: match hyperlink data by row index to room data
    // The hyperlink fetch returns Col A and Col B values where hyperlinks replace display text
    // We need to compare the displayed room numbers with the URLs
    // Since fetchSheetDataWithHyperlinks returns hyperlink as value, Col B cells that have
    // a hyperlink will show the URL, not the room number. We need the formattedValue too.
    // Let's build the map differently - iterate the hyperlink rawValues and use the values data for room numbers
    const roomsData = data.get(roomsRange);
    if (hyperlinkData && hyperlinkData.rawValues && roomsData && roomsData.rawValues) {
      const hlRows = hyperlinkData.rawValues.slice(1); // skip header
      const valRows = roomsData.rawValues.slice(1); // skip header
      for (let i = 0; i < Math.min(hlRows.length, valRows.length); i++) {
        const roomNum = String(valRows[i][1] || '').trim(); // Column B from values data (index 1)
        const hlValue = (hlRows[i][1] || '').trim(); // Column B from hyperlink data
        // If the hyperlink value is a URL (starts with http), it's the Drive folder link
        if (roomNum && hlValue && hlValue.startsWith('http')) {
          roomDriveFolderMap.set(roomNum, hlValue);
        }
      }
      console.log(`[construction-progress] Found ${roomDriveFolderMap.size} room Drive folder links`);
    }

    // Process Rooms Progress data (roomsData already fetched above for hyperlink matching)
    const recapData = data.get(recapRange);

    // Diagnostic logging: what did we get back from the API?
    console.log('[construction-progress] roomsData exists:', !!roomsData);
    console.log('[construction-progress] roomsData rawValues length:', roomsData?.rawValues?.length || 0);
    if (roomsData?.rawValues && roomsData.rawValues.length > 0) {
      console.log('[construction-progress] First row (raw headers):', JSON.stringify(roomsData.rawValues[0]));
      if (roomsData.rawValues.length > 1) {
        console.log('[construction-progress] Second row (first data row):', JSON.stringify(roomsData.rawValues[1]?.slice(0, 5)));
      }
    }

    // Transform rooms data - need special handling for the merged BATHROOM/BEDROOM headers
    // Row 3 (index 0 in our fetch since we start at A3) contains the actual column headers
    let processedRooms: GoogleSheetRow[] = [];
    let roomHeaders: string[] = [];

    if (roomsData && roomsData.rawValues && roomsData.rawValues.length > 0) {
      // First row of our fetch is the column headers (Row 3 in sheet)
      const rawHeaders = roomsData.rawValues[0] as string[];

      // Dynamically detect column layout instead of hardcoding positions.
      // The sheet has: some leading columns (may include empty cols + ROOM #),
      // then a Bathroom section, then a Bedroom section.
      // Bathroom and Bedroom sections have duplicate sub-header names (e.g. both
      // have "Electrical Wiring", "Speaker Line", "Sheetrock", etc.).
      // We detect sections by finding the first duplicate header — everything
      // before the first duplicate belongs to section 1 (Bathroom), everything
      // from the first duplicate onward belongs to section 2 (Bedroom).

      // Find the ROOM # column index (before any prefixing)
      const roomColIndex = rawHeaders.findIndex(h =>
        h && h.trim().toLowerCase().replace(/\s+/g, ' ') === 'room #'
      );
      console.log('[construction-progress] ROOM # column found at index:', roomColIndex);

      // The data columns start right after ROOM #
      const dataColStart = roomColIndex >= 0 ? roomColIndex + 1 : 2;

      // Detect where section 2 (Bedroom) starts by finding the first repeated header
      // after the data columns begin
      const seenDataHeaders = new Set<string>();
      let bedroomStart = -1;
      for (let i = dataColStart; i < rawHeaders.length; i++) {
        const h = (rawHeaders[i] || '').trim();
        if (!h) continue;
        if (seenDataHeaders.has(h)) {
          bedroomStart = i;
          break;
        }
        seenDataHeaders.add(h);
      }
      console.log('[construction-progress] Bedroom section starts at index:', bedroomStart);

      // Process headers: prefix data columns with Bathroom_ or Bedroom_,
      // but leave ROOM # and any leading columns unprefixed
      roomHeaders = rawHeaders.map((header, index) => {
        if (!header || header.trim() === '') return '';
        const trimmedHeader = header.trim();

        // Leading columns (ROOM # and anything before it) — no prefix
        if (index <= roomColIndex) {
          return trimmedHeader;
        }

        // Bedroom section (from the first duplicate onward)
        if (bedroomStart >= 0 && index >= bedroomStart) {
          return `Bedroom_${trimmedHeader}`;
        }

        // Bathroom section (between ROOM # and Bedroom start)
        if (index > roomColIndex) {
          return `Bathroom_${trimmedHeader}`;
        }

        return trimmedHeader;
      });

      console.log('[construction-progress] Processed headers:', roomHeaders.filter(h => h));

      // Data starts from the second row of our fetch (Row 4 in sheet)
      const dataRows = roomsData.rawValues.slice(1);

      processedRooms = dataRows.map((row) => {
        const obj: GoogleSheetRow = {};
        roomHeaders.forEach((header, index) => {
          const value = row[index];
          if (header && header.trim() !== '') {
            // Handle checkbox values (TRUE/FALSE from Google Sheets)
            // Google Sheets API returns checkbox values as strings "TRUE" or "FALSE"
            // Also handle "1"/"0" which some sheet configurations use for checkboxes
            const strValue = String(value).trim();
            if (strValue === 'TRUE' || strValue === '1') {
              obj[header.trim()] = true;
            } else if (strValue === 'FALSE' || strValue === '0') {
              obj[header.trim()] = false;
            } else if (value !== undefined && value !== '') {
              // Try to parse numbers, but keep percentages as strings
              const isPercentage = typeof value === 'string' && value.includes('%');
              if (!isPercentage) {
                const num = Number(value);
                obj[header.trim()] = isNaN(num) ? value : num;
              } else {
                obj[header.trim()] = value;
              }
            } else {
              obj[header.trim()] = null;
            }
          }
        });
        return obj;
      });

      // Log before filtering to diagnose potential column name mismatches
      console.log('[construction-progress] Rows before room# filter:', processedRooms.length);
      if (processedRooms.length > 0) {
        const sampleKeys = Object.keys(processedRooms[0]);
        console.log('[construction-progress] Available keys in first row:', JSON.stringify(sampleKeys));
        console.log('[construction-progress] First row values:', JSON.stringify(processedRooms[0]));
      }

      // Find the room number key dynamically — resilient to column renames
      const roomNumKey = roomHeaders.find(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'room #' || lower === 'room#' || lower === 'room' || lower === 'rooms' || lower === 'rm #' || lower === 'rm#';
      }) || 'ROOM #';
      console.log('[construction-progress] Using room number key:', roomNumKey);

      processedRooms = processedRooms.filter(row => {
        // Filter out empty rows (rows without a room number)
        const roomNum = row[roomNumKey];
        return roomNum !== null && roomNum !== undefined && roomNum !== '';
      });

      // Deduplicate rooms by room number — keep the last occurrence (most recent data)
      const beforeDedup = processedRooms.length;
      const roomMap = new Map<string, GoogleSheetRow>();
      for (const room of processedRooms) {
        const roomNum = String(room[roomNumKey] || '');
        roomMap.set(roomNum, room);
      }
      processedRooms = Array.from(roomMap.values());
      const afterDedup = processedRooms.length;
      if (beforeDedup !== afterDedup) {
        console.log(`[construction-progress] Deduplicated rooms: ${beforeDedup} → ${afterDedup} (removed ${beforeDedup - afterDedup} duplicates)`);
      }

      // Attach Google Drive folder URLs to each room
      for (const room of processedRooms) {
        const roomNum = String(room[roomNumKey] || '');
        const driveUrl = roomDriveFolderMap.get(roomNum);
        if (driveUrl) {
          room['_driveFolderUrl'] = driveUrl;
        }
      }

      // Log field completion counts for debugging data accuracy
      const checkboxFields = roomHeaders.filter(h => h.includes('Bathroom_') || h.includes('Bedroom_'));
      for (const field of checkboxFields) {
        let trueCount = 0, falseCount = 0, nullCount = 0, otherCount = 0;
        for (const room of processedRooms) {
          const val = room[field];
          if (val === true) trueCount++;
          else if (val === false) falseCount++;
          else if (val === null || val === undefined) nullCount++;
          else otherCount++;
        }
        if (otherCount > 0 || trueCount + falseCount + nullCount !== processedRooms.length) {
          console.log(`[construction-progress] Field "${field}": true=${trueCount}, false=${falseCount}, null=${nullCount}, other=${otherCount} (total rooms: ${processedRooms.length})`);
        }
      }
    }

    // Process RECAP data — supports multiple sections (e.g., BEDROOM, BATHROOM)
    // Sheet structure: Row 1 = section header (e.g., "BEDROOM"), Row 2 = column headers (DATE, WIRING, ...),
    // Row 3+ = data. Additional sections may follow with the same pattern.
    interface RecapSection {
      section: string;
      headers: string[];
      rows: GoogleSheetRow[];
    }
    let recapSections: RecapSection[] = [];
    let recapHeaders: string[] = [];

    if (recapData && recapData.rawValues && recapData.rawValues.length > 0) {
      const allRows = recapData.rawValues;
      let currentSection = '';
      let currentHeaders: string[] = [];
      let currentDataRows: GoogleSheetRow[] = [];

      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i] as string[];

        // Detect section header: a row where only the first (or second) cell has a value
        // and the value looks like a section name (all uppercase, no numbers)
        const nonEmptyCells = row.filter(c => c && String(c).trim() !== '');
        const firstCell = (row[0] || '').trim();

        if (nonEmptyCells.length === 1 && firstCell && /^[A-Z\s]+$/.test(firstCell) && firstCell.length > 2) {
          // Save previous section if exists
          if (currentSection && currentHeaders.length > 0) {
            recapSections.push({
              section: currentSection,
              headers: currentHeaders,
              rows: currentDataRows,
            });
          }
          currentSection = firstCell;
          currentHeaders = [];
          currentDataRows = [];
          continue;
        }

        // Detect column header row: contains "DATE" in first column
        if (firstCell.toUpperCase() === 'DATE' && currentSection) {
          currentHeaders = row.map(h => (h || '').trim()).filter(h => h !== '');
          recapHeaders = [...new Set([...recapHeaders, ...currentHeaders])];
          continue;
        }

        // Data row: has a date value in column A and belongs to a section
        if (currentSection && currentHeaders.length > 0 && firstCell) {
          const obj: GoogleSheetRow = { _section: currentSection };
          currentHeaders.forEach((header, index) => {
            const value = row[index];
            if (header && header.trim() !== '') {
              if (value !== undefined && value !== null && String(value).trim() !== '') {
                const strVal = String(value).trim();
                const num = Number(strVal);
                obj[header.trim()] = isNaN(num) ? strVal : num;
              } else {
                obj[header.trim()] = null;
              }
            }
          });
          // Only include rows with at least one non-null data value (beyond section and date)
          const dataValues = Object.entries(obj).filter(([k]) => k !== '_section' && k !== 'DATE');
          if (dataValues.some(([, v]) => v !== null)) {
            currentDataRows.push(obj);
          }
        }
      }

      // Save last section
      if (currentSection && currentHeaders.length > 0) {
        recapSections.push({
          section: currentSection,
          headers: currentHeaders,
          rows: currentDataRows,
        });
      }

      console.log(`[construction-progress] RECAP sections found: ${recapSections.map(s => `${s.section} (${s.rows.length} rows)`).join(', ')}`);
    }

    console.log(`[construction-progress] Returning ${processedRooms.length} unique rooms`);

    // Add timestamps to rooms data
    const roomsWithTimestamp = await addTimestampsToRows(processedRooms, 'construction-progress');

    res.json({
      rooms: {
        headers: roomHeaders.filter(h => h && h.trim() !== ''),
        rows: roomsWithTimestamp,
        totalRooms: processedRooms.length,
      },
      recap: {
        headers: recapHeaders.filter(h => h && h.trim() !== ''),
        sections: recapSections,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching construction progress data:', error);
    res.status(500).json({
      error: 'Failed to fetch construction progress data',
      message: error.message
    });
  }
});

// Get files from a Google Drive folder (for room progress photos)
router.get('/drive-files', async (req, res) => {
  try {
    const folderUrl = req.query.folderUrl as string;

    if (!folderUrl) {
      return res.status(400).json({ error: 'folderUrl query parameter is required' });
    }

    // Extract folder ID from various Google Drive URL formats
    let folderId: string | null = null;
    // Format: https://drive.google.com/drive/folders/FOLDER_ID
    const folderMatch = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      folderId = folderMatch[1];
    }
    // Format: https://drive.google.com/open?id=FOLDER_ID
    if (!folderId) {
      const openMatch = folderUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (openMatch) {
        folderId = openMatch[1];
      }
    }

    if (!folderId) {
      return res.status(400).json({ error: 'Could not extract folder ID from URL', url: folderUrl });
    }

    console.log(`[drive-files] Listing files from folder: ${folderId}`);
    const files = await listDriveFiles(folderId);
    console.log(`[drive-files] Found ${files.length} files`);

    res.json({ files, folderId });
  } catch (error: any) {
    console.error('Error listing drive files:', error);
    res.status(500).json({
      error: 'Failed to list drive files',
      message: error.message
    });
  }
});

// Proxy a Google Drive file (stream content through our server for authenticated access)
router.get('/drive-file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const { stream, mimeType, size, name } = await getDriveFileStream(fileId);

    res.setHeader('Content-Type', mimeType);
    if (size) {
      res.setHeader('Content-Length', size);
    }
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    (stream as any).pipe(res);
  } catch (error: any) {
    console.error('Error proxying drive file:', error);
    res.status(500).json({
      error: 'Failed to fetch drive file',
      message: error.message
    });
  }
});

// Get Budget data
router.get('/budget', async (req, res) => {
  console.log('[budget] Endpoint called');
  try {
    const spreadsheetId = process.env.BUDGET_SHEET_ID;
    console.log('[budget] Sheet ID configured:', spreadsheetId ? 'YES' : 'NO');

    if (!spreadsheetId) {
      console.error('[budget] BUDGET_SHEET_ID not set');
      return res.status(400).json({
        error: 'Budget sheet ID not configured',
        message: 'Please set BUDGET_SHEET_ID in environment variables'
      });
    }

    // Fetch both Budget Details and Budget Summary data
    const detailsRange = "'Budget Details'!A:G";
    const summaryRange = "'Budget Summary'!A:G";

    console.log('[budget] Fetching data from sheet:', spreadsheetId);
    const allData = await fetchMultipleRanges(spreadsheetId, [detailsRange, summaryRange]);
    const data = allData.get(detailsRange);
    const summaryData = allData.get(summaryRange);
    console.log('[budget] Data fetched successfully');

    // Process Budget Details data
    let budgetItems: GoogleSheetRow[] = [];
    let totals = {
      total: 0,
      contingency: 0,
      totalBudget: 0,
      hardCosts: 0,
      softCosts: 0,
      paidThusFar: 0,
      costPerRoom: 0,
      costPerBedroom: 0,
      costPerBathroom: 0,
      totalRooms: 166,
    };
    const categoryTotals: Record<string, number> = {};
    const categoryPaid: Record<string, number> = {};
    const vendorTotals: Record<string, number> = {};
    const statusCounts: Record<string, { count: number; total: number }> = {};

    // Process Budget Summary to get "Paid Thus Far" totals
    if (summaryData && summaryData.rawValues && summaryData.rawValues.length > 0) {
      const summaryHeaders = summaryData.rawValues.find((row: string[]) =>
        row.some(cell => cell && cell.toString().toLowerCase().includes('summary scope'))
      );

      // Find the header row index
      const headerRowIndex = summaryData.rawValues.findIndex((row: string[]) =>
        row.some(cell => cell && cell.toString().toLowerCase().includes('summary scope'))
      );

      if (headerRowIndex >= 0) {
        const headers = summaryData.rawValues[headerRowIndex] as string[];
        // Find column indices in summary
        const scopeIdx = headers.findIndex(h => h?.toLowerCase().includes('summary scope') || h?.toLowerCase().includes('scope'));
        const amountIdx = headers.findIndex(h => h?.toLowerCase().includes('amount'));
        const paidIdx = headers.findIndex(h => h?.toLowerCase().includes('paid'));
        const perKeyIdx = headers.findIndex(h => h?.toLowerCase().includes('key'));

        console.log('[budget] Summary column indices:', { scopeIdx, amountIdx, paidIdx, perKeyIdx });

        // Process summary rows
        const summaryRows = summaryData.rawValues.slice(headerRowIndex + 1);
        summaryRows.forEach((row: string[]) => {
          const scope = row[scopeIdx]?.toString().trim() || '';
          const paidRaw = row[paidIdx];

          // Parse paid amount
          let paid = 0;
          if (paidRaw !== undefined && paidRaw !== null && paidRaw !== '' && paidRaw !== '-') {
            const cleanValue = String(paidRaw).replace(/[$,\s]/g, '');
            const parsed = parseFloat(cleanValue);
            if (!isNaN(parsed)) {
              paid = parsed;
            }
          }

          // Map summary scope names to category names and track paid amounts
          if (scope && paid > 0) {
            // Extract category name from "Total X" format
            const categoryMatch = scope.match(/^Total\s+(.+)$/i);
            if (categoryMatch) {
              const categoryName = categoryMatch[1].trim();
              categoryPaid[categoryName] = paid;

              // Also try variations
              if (categoryName.toLowerCase() === 'exteroir') {
                categoryPaid['Exterior Work'] = paid;
              } else if (categoryName.toLowerCase() === 'signage') {
                categoryPaid['Interior Signage'] = paid;
              } else if (categoryName.toLowerCase().includes('construction material')) {
                categoryPaid['Bathrooms'] = (categoryPaid['Bathrooms'] || 0) + paid;
              } else if (categoryName.toLowerCase().includes('contractor')) {
                categoryPaid['Bedrooms'] = (categoryPaid['Bedrooms'] || 0) + paid;
              } else if (categoryName.toLowerCase().includes('ff&e')) {
                categoryPaid['FF&E'] = paid;
                categoryPaid['Loose Accesories'] = paid;
              } else if (categoryName.toLowerCase().includes('boh')) {
                categoryPaid['BOH'] = paid;
              } else if (categoryName.toLowerCase() === 'soft cost') {
                categoryPaid['Soft costs'] = paid;
              }
            }
          }

          // Check for total paid row (last row with totals)
          if (scope === '' && paid > 0 && totals.paidThusFar === 0) {
            // This might be the grand total row
          }
        });

        // Find the grand total paid (last row usually)
        const lastRows = summaryData.rawValues.slice(-5);
        for (const row of lastRows) {
          const paidRaw = row[paidIdx];
          if (paidRaw) {
            const cleanValue = String(paidRaw).replace(/[$,\s]/g, '');
            const parsed = parseFloat(cleanValue);
            if (!isNaN(parsed) && parsed > totals.paidThusFar) {
              totals.paidThusFar = parsed;
            }
          }
        }
      }
    }

    if (data && data.rawValues && data.rawValues.length > 0) {
      // First row is headers
      const headers = data.rawValues[0] as string[];
      const dataRows = data.rawValues.slice(1);

      // Find column indices
      const categoryIdx = headers.findIndex(h => h?.toLowerCase().includes('category'));
      const paymentsIdx = headers.findIndex(h => {
        const lower = h?.toLowerCase() || '';
        return lower.includes('payment') || lower.includes('vendor') || lower.includes('contractor') || lower.includes('supplier');
      });
      const projectIdx = headers.findIndex(h => h?.toLowerCase().includes('project'));
      const statusIdx = headers.findIndex(h => h?.toLowerCase().includes('status'));
      const subtotalIdx = headers.findIndex(h => h?.toLowerCase().includes('subtotal'));

      console.log('[budget] Column indices:', { categoryIdx, paymentsIdx, projectIdx, statusIdx, subtotalIdx });

      // Forward-fill CATEGORY column: Google Sheets merged cells only return a value
      // for the first cell in the merge. Subsequent rows get empty strings.
      // We carry the last non-empty category value forward to fill the gaps.
      if (categoryIdx >= 0) {
        let lastCategory = '';
        for (const row of dataRows) {
          const val = row[categoryIdx]?.toString().trim() || '';
          if (val) {
            lastCategory = val;
          } else if (lastCategory) {
            row[categoryIdx] = lastCategory;
          }
        }
      }

      // Process each row
      dataRows.forEach((row, rowIndex) => {
        const category = row[categoryIdx]?.toString().trim() || '';
        const payments = row[paymentsIdx]?.toString().trim() || '';
        const project = row[projectIdx]?.toString().trim() || '';
        const status = row[statusIdx]?.toString().trim() || '';
        const subtotalRaw = row[subtotalIdx];

        // Parse subtotal - handle currency formatting, dashes, and empty values
        let subtotal = 0;
        if (subtotalRaw !== undefined && subtotalRaw !== null && subtotalRaw !== '' && subtotalRaw !== '-') {
          // Remove currency symbols, commas, and spaces
          const cleanValue = String(subtotalRaw).replace(/[$,\s]/g, '');
          const parsed = parseFloat(cleanValue);
          if (!isNaN(parsed)) {
            subtotal = parsed;
          }
        }

        // Check for total rows (these have "Total" in project column)
        const isTotal = project.toLowerCase().includes('total');
        const isCategoryTotal = isTotal && !project.toLowerCase().includes('hard cost') &&
                               !project.toLowerCase().includes('contingency') &&
                               !project.toLowerCase().includes('budget');

        // Check for grand totals
        if (project.toLowerCase() === 'total' || project.toLowerCase() === 'total hard cost') {
          totals.total = subtotal;
        } else if (project.toLowerCase() === 'contingency') {
          totals.contingency = subtotal;
        } else if (project.toLowerCase() === 'total budget') {
          totals.totalBudget = subtotal;
        }

        // Skip total rows for line items, but include regular items
        if (!isTotal && category && project) {
          const item: GoogleSheetRow = {
            id: rowIndex + 2, // Excel row number (1-indexed, +1 for header)
            category,
            vendor: payments,
            project,
            status: status || 'Not Set',
            subtotal,
          };
          budgetItems.push(item);

          // Aggregate by category
          if (category) {
            if (!categoryTotals[category]) {
              categoryTotals[category] = 0;
            }
            categoryTotals[category] += subtotal;

            // Track hard vs soft costs
            if (category.toLowerCase() === 'soft costs') {
              totals.softCosts += subtotal;
            } else {
              totals.hardCosts += subtotal;
            }
          }

          // Aggregate by vendor
          if (payments) {
            if (!vendorTotals[payments]) {
              vendorTotals[payments] = 0;
            }
            vendorTotals[payments] += subtotal;
          }

          // Aggregate by status
          const statusKey = status || 'Not Set';
          if (!statusCounts[statusKey]) {
            statusCounts[statusKey] = { count: 0, total: 0 };
          }
          statusCounts[statusKey].count += 1;
          statusCounts[statusKey].total += subtotal;
        }
      });
    }

    // If totals weren't found in the sheet, calculate them
    if (totals.total === 0) {
      totals.total = totals.hardCosts + totals.softCosts;
    }
    if (totals.contingency === 0) {
      totals.contingency = totals.total * 0.1;
    }
    if (totals.totalBudget === 0) {
      totals.totalBudget = totals.total + totals.contingency;
    }

    // Calculate cost per room
    if (totals.totalBudget > 0 && totals.totalRooms > 0) {
      totals.costPerRoom = Math.round(totals.totalBudget / totals.totalRooms);
    }

    // Calculate cost per bedroom and cost per bathroom from category totals
    if (totals.totalRooms > 0) {
      const bedroomTotal = Object.entries(categoryTotals).find(
        ([name]) => name.toLowerCase() === 'bedrooms'
      );
      const bathroomTotal = Object.entries(categoryTotals).find(
        ([name]) => name.toLowerCase() === 'bathrooms'
      );
      if (bedroomTotal) {
        totals.costPerBedroom = Math.round(bedroomTotal[1] / totals.totalRooms);
      }
      if (bathroomTotal) {
        totals.costPerBathroom = Math.round(bathroomTotal[1] / totals.totalRooms);
      }
    }

    // Sort category totals by amount (descending) and include paid amounts
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({
        name,
        total,
        paid: categoryPaid[name] || 0,
      }));

    // Sort vendor totals by amount (descending)
    const sortedVendors = Object.entries(vendorTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }));

    // Format status breakdown
    const statusBreakdown = Object.entries(statusCounts)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([status, data]) => ({ status, ...data }));

    res.json({
      items: budgetItems,
      totals,
      categoryBreakdown: sortedCategories,
      vendorBreakdown: sortedVendors,
      statusBreakdown,
      itemCount: budgetItems.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching budget data:', error);
    res.status(500).json({
      error: 'Failed to fetch budget data',
      message: error.message
    });
  }
});

// Get Weekly Goals data
router.get('/weekly-goals', async (req, res) => {
  console.log('[weekly-goals] Endpoint called');
  try {
    const spreadsheetId = process.env.WEEKLY_GOALS_SHEET_ID;
    console.log('[weekly-goals] Sheet ID configured:', spreadsheetId ? 'YES' : 'NO');

    if (!spreadsheetId) {
      console.error('[weekly-goals] WEEKLY_GOALS_SHEET_ID not set');
      return res.status(400).json({
        error: 'Weekly Goals sheet ID not configured',
        message: 'Please set WEEKLY_GOALS_SHEET_ID in environment variables'
      });
    }

    // First, fetch spreadsheet info to get the exact tab name
    let tabName = 'New updated';
    try {
      const info = await getSpreadsheetInfo(spreadsheetId);
      const matchingSheet = info.sheets?.find(
        (s: any) => s.title?.toLowerCase().trim() === 'new updated'
      );
      if (matchingSheet?.title) {
        tabName = matchingSheet.title;
        console.log('[weekly-goals] Found exact tab name:', JSON.stringify(tabName));
      } else {
        console.log('[weekly-goals] Available tabs:', info.sheets?.map((s: any) => s.title));
      }
    } catch (infoErr: any) {
      console.warn('[weekly-goals] Could not fetch sheet info, using default tab name:', infoErr.message);
    }

    const range = `'${tabName}'!A:F`;

    console.log('[weekly-goals] Fetching data from sheet:', spreadsheetId, 'range:', range);
    const data = await fetchSheetData(spreadsheetId, range);
    console.log('[weekly-goals] Data fetched successfully');

    // Process goals data
    let goals: GoogleSheetRow[] = [];

    if (data && data.rawValues && data.rawValues.length > 0) {
      // Row 1 has headers
      const headers = data.rawValues[0] as string[];
      const dataRows = data.rawValues.slice(1);

      // Map column indices
      const goalIdx = headers.findIndex(h => h?.toLowerCase().includes('weekly goal'));
      const assigneeIdx = headers.findIndex(h => h?.toLowerCase().includes('assignee'));
      const targetIdx = headers.findIndex(h => h?.toLowerCase().includes('target'));
      const deadlineIdx = headers.findIndex(h => h?.toLowerCase().includes('deadline'));
      const resultIdx = headers.findIndex(h => h?.toLowerCase().includes('result'));
      const commentsIdx = headers.findIndex(h => h?.toLowerCase().includes('comment'));

      console.log('[weekly-goals] Column indices:', { goalIdx, assigneeIdx, targetIdx, deadlineIdx, resultIdx, commentsIdx });

      goals = dataRows.map((row, index) => {
        const weeklyGoal = (row[goalIdx] || '').toString().trim();
        const assignee = (row[assigneeIdx] || '').toString().trim();
        const target = (row[targetIdx] || '').toString().trim();
        const deadline = (row[deadlineIdx] || '').toString().trim();
        const result = (row[resultIdx] || '').toString().trim();
        const comments = (row[commentsIdx] || '').toString().trim();

        return {
          id: index + 2, // Excel row number (1-indexed + header)
          weeklyGoal,
          assignee,
          target,
          deadline,
          result,
          comments,
        };
      }).filter(goal => goal.weeklyGoal !== ''); // Filter out empty rows
    }

    // Compute summary stats
    const byStatus: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};

    for (const goal of goals) {
      const status = (goal.result as string) || 'No status';
      byStatus[status] = (byStatus[status] || 0) + 1;

      const assignee = (goal.assignee as string) || 'Unassigned';
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
    }

    console.log(`[weekly-goals] Returning ${goals.length} goals`);

    res.json({
      goals,
      summary: {
        total: goals.length,
        byStatus,
        byAssignee,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching weekly goals data:', error);
    res.status(500).json({
      error: 'Failed to fetch weekly goals data',
      message: error.message
    });
  }
});

// Get Container Schedule data
router.get('/container-schedule', async (req, res) => {
  console.log('[container-schedule] Endpoint called');
  try {
    const spreadsheetId = process.env.CONTAINER_SCHEDULE_SHEET_ID;
    console.log('[container-schedule] Sheet ID configured:', spreadsheetId ? 'YES' : 'NO');

    if (!spreadsheetId) {
      console.error('[container-schedule] CONTAINER_SCHEDULE_SHEET_ID not set');
      return res.status(400).json({
        error: 'Container Schedule sheet ID not configured',
        message: 'Please set CONTAINER_SCHEDULE_SHEET_ID in environment variables'
      });
    }

    // Fetch tab info to get exact tab name
    let tabName = 'Summary';
    try {
      const info = await getSpreadsheetInfo(spreadsheetId);
      const matchingSheet = info.sheets?.find(
        (s: any) => s.title?.toLowerCase().trim() === 'summary'
      );
      if (matchingSheet?.title) {
        tabName = matchingSheet.title;
        console.log('[container-schedule] Found exact tab name:', JSON.stringify(tabName));
      } else {
        console.log('[container-schedule] Available tabs:', info.sheets?.map((s: any) => s.title));
      }
    } catch (infoErr: any) {
      console.warn('[container-schedule] Could not fetch sheet info:', infoErr.message);
    }

    // Row 1 is a title/note row, Row 2 has headers, Row 3+ has data
    // Use hyperlink-aware fetch to extract actual URLs from cells that display "Link"
    console.log('[container-schedule] Fetching data with hyperlinks from sheet:', spreadsheetId);
    const data = await fetchSheetDataWithHyperlinks(spreadsheetId, tabName, 2, 500, 'P');
    console.log('[container-schedule] Data fetched successfully with hyperlinks');

    let containers: GoogleSheetRow[] = [];

    if (data && data.rawValues && data.rawValues.length > 0) {
      const headers = data.rawValues[0] as string[];
      const dataRows = data.rawValues.slice(1);

      // Map column indices by header name (case-insensitive)
      const findCol = (keyword: string) => headers.findIndex(h =>
        h?.toLowerCase().trim().includes(keyword.toLowerCase())
      );

      const factoryIdx = findCol('factory');
      const containerLoadedIdx = findCol('container loaded');
      const shipmentIdx = findCol('shipment');
      const containerNumIdx = findCol('container #');
      const deliveryIdx = findCol('delivery');
      const loadingDateIdx = findCol('loading date');
      const vesselIdx = findCol('vessel');
      const etaNYIdx = findCol('eta to ny');
      const etaWarehouseIdx = findCol('eta to warehouse');
      const statusIdx = findCol('status');
      const bolIdx = findCol('bol');
      const insuranceIdx = findCol('insurance');
      const productListIdx = findCol('product list');
      const packingIdx = findCol('packing');
      const productDetailsIdx = findCol('product detail');
      const warehouseProofIdx = findCol('warehouse proof');

      console.log('[container-schedule] Column indices:', {
        factoryIdx, containerLoadedIdx, shipmentIdx, containerNumIdx,
        deliveryIdx, loadingDateIdx, vesselIdx, etaNYIdx, etaWarehouseIdx,
        statusIdx, bolIdx, insuranceIdx, productListIdx, packingIdx,
        productDetailsIdx, warehouseProofIdx
      });

      containers = dataRows.map((row, index) => {
        const getValue = (idx: number) => {
          if (idx < 0 || idx >= row.length) return '';
          return (row[idx] || '').toString().trim();
        };

        return {
          id: index + 3, // Excel row number (row 3 is first data row)
          factory: getValue(factoryIdx),
          containerLoaded: getValue(containerLoadedIdx),
          shipmentNumber: getValue(shipmentIdx),
          containerNumber: getValue(containerNumIdx),
          delivery: getValue(deliveryIdx),
          loadingDate: getValue(loadingDateIdx),
          vesselDepartureDate: getValue(vesselIdx),
          etaNYPort: getValue(etaNYIdx),
          etaWarehouse: getValue(etaWarehouseIdx),
          status: getValue(statusIdx),
          bolCopy: getValue(bolIdx),
          insurance: getValue(insuranceIdx),
          productListWithPhotos: getValue(productListIdx),
          packingList: getValue(packingIdx),
          productDetails: getValue(productDetailsIdx),
          warehouseProofOfDelivery: getValue(warehouseProofIdx),
        };
      }).filter(c => c.factory !== '' || c.containerLoaded !== ''); // Filter out empty rows
    }

    // Compute summary stats
    const byStatus: Record<string, number> = {};
    const byFactory: Record<string, number> = {};

    for (const container of containers) {
      const status = (container.status as string) || 'No status';
      byStatus[status] = (byStatus[status] || 0) + 1;

      const factory = (container.factory as string) || 'Unknown';
      byFactory[factory] = (byFactory[factory] || 0) + 1;
    }

    console.log(`[container-schedule] Returning ${containers.length} containers`);

    res.json({
      containers,
      summary: {
        total: containers.length,
        byStatus,
        byFactory,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching container schedule data:', error);
    res.status(500).json({
      error: 'Failed to fetch container schedule data',
      message: error.message
    });
  }
});

// Get Room Overview / Fact Sheet data
router.get('/room-overview', async (req, res) => {
  console.log('[room-overview] Endpoint called');
  try {
    const spreadsheetId = process.env.ROOM_OVERVIEW_SHEET_ID;
    console.log('[room-overview] Sheet ID configured:', spreadsheetId ? 'YES' : 'NO');

    if (!spreadsheetId) {
      console.error('[room-overview] ROOM_OVERVIEW_SHEET_ID not set');
      return res.status(400).json({
        error: 'Room Overview sheet ID not configured',
        message: 'Please set ROOM_OVERVIEW_SHEET_ID in environment variables'
      });
    }

    // Fetch sheet info to find exact tab name
    let tabName = 'ROOM FEATURES';
    try {
      const info = await getSpreadsheetInfo(spreadsheetId);
      const matchingSheet = info.sheets?.find(
        (s: any) => s.title?.toLowerCase().trim() === 'room features'
      );
      if (matchingSheet?.title) {
        tabName = matchingSheet.title;
        console.log('[room-overview] Found exact tab name:', JSON.stringify(tabName));
      } else {
        console.log('[room-overview] "ROOM FEATURES" tab not found, available tabs:', info.sheets?.map((s: any) => s.title));
      }
    } catch (infoErr: any) {
      console.warn('[room-overview] Could not fetch sheet info:', infoErr.message);
    }

    // Row 1 has headers, Row 2+ has data
    // Fetch starting from row 2 (data only) to avoid header-parsing issues.
    // We use fixed column positions since we know the exact layout:
    // A(0)=FLOOR, B(1)=ROOM#, C(2)=AREA, D(3)=SIZE CATEGORY, E(4)=ROOM TYPE,
    // F(5)=BED SIZE, G(6)=ADA, H(7)=Connecting Door, I(8)=Sink Style, J(9)=Sink Size,
    // K(10)=Shower With Glass Door, L(11)=Shower Window, M(12)=Moss Wall,
    // N(13)=Mirror Sliding Door, O(14)=Moxy Bar, P(15)=Mini Bar Size,
    // Q(16)=Speakeasy, R(17)=Party Box Headboard, S(18)=Curtain Type,
    // T(19)=NIGHT STANDS, U(20)=TV Size
    const range = `'${tabName}'!A2:U500`;
    console.log('[room-overview] Fetching range:', range);
    const data = await fetchSheetData(spreadsheetId, range);

    // rawValues contains ALL rows from the API response (including the first row
    // which fetchSheetData treats as headers). We need ALL rows as data.
    const allRows = data?.rawValues || [];
    console.log('[room-overview] Total raw rows returned:', allRows.length);
    if (allRows[0]) {
      console.log('[room-overview] First row sample:', JSON.stringify(allRows[0].slice(0, 6)));
    }

    const getValue = (row: any[], idx: number): string => {
      if (idx < 0 || idx >= row.length) return '';
      return (row[idx] || '').toString().trim();
    };

    let rooms: GoogleSheetRow[] = allRows.map((row, index) => ({
      id: index + 2,
      floor: parseInt(getValue(row, 0)) || 0,       // A - FLOOR
      roomNumber: parseInt(getValue(row, 1)) || 0,   // B - ROOM #
      area: parseInt(getValue(row, 2)) || 0,         // C - AREA (Sq ft)
      sizeCategory: getValue(row, 3),                // D - SIZE CATEGORY
      roomType: getValue(row, 4),                    // E - ROOM TYPE
      bedSize: getValue(row, 5),                     // F - BED SIZE
      ada: getValue(row, 6),                         // G - ADA
      connectingDoor: getValue(row, 7),              // H - Connecting Door
      sinkStyle: getValue(row, 8),                   // I - Sink Style
      sinkSize: getValue(row, 9),                    // J - Sink Size
      showerWithGlassDoor: getValue(row, 10),        // K - Shower With Glass Door
      showerWindow: getValue(row, 11),               // L - Shower Window
      mossWall: getValue(row, 12),                   // M - Moss Wall
      mirrorSlidingDoor: getValue(row, 13),          // N - Mirror Sliding Door
      moxyBar: getValue(row, 14),                    // O - Moxy Bar
      miniBarSize: getValue(row, 15),                // P - Mini Bar Size
      speakeasy: getValue(row, 16),                  // Q - Speakeasy
      partyBoxHeadboard: getValue(row, 17),          // R - Party Box Headboard
      curtainType: getValue(row, 18),                // S - Curtain Type
      nightStands: getValue(row, 19),                // T - NIGHT STANDS
      tvSize: getValue(row, 20),                     // U - TV Size
    }));

    console.log('[room-overview] Mapped rows before filter:', rooms.length);
    if (rooms.length > 0) {
      console.log('[room-overview] First mapped room:', JSON.stringify(rooms[0]));
    }

    // Forward-fill FLOOR column: Google Sheets merged cells only return a value
    // for the first cell in the merge. Subsequent rows get empty strings.
    // We carry the last non-zero floor value forward to fill the gaps.
    let lastFloor = 0;
    for (const room of rooms) {
      if ((room.floor as number) > 0) {
        lastFloor = room.floor as number;
      } else {
        room.floor = lastFloor;
      }
    }

    // Fallback: derive floor from room number (401→4, 502→5, 612→6).
    // Handles cases where the merged cell anchor is outside our fetch range.
    for (const room of rooms) {
      if ((room.floor as number) === 0 && (room.roomNumber as number) > 0) {
        room.floor = Math.floor((room.roomNumber as number) / 100);
      }
    }

    rooms = rooms.filter(r => (r.roomNumber as number) > 0);
    console.log('[room-overview] Rooms after filter (roomNumber > 0):', rooms.length);

    // Compute summary statistics
    const floors = [...new Set(rooms.map(r => r.floor as number))].sort((a, b) => a - b);
    const adaCount = rooms.filter(r => (r.ada as string).toLowerCase() === 'yes').length;

    const byFloor: Record<number, number> = {};
    const byRoomType: Record<string, number> = {};
    const bySizeCategory: Record<string, number> = {};
    const byBedSize: Record<string, number> = {};

    for (const room of rooms) {
      const floor = room.floor as number;
      byFloor[floor] = (byFloor[floor] || 0) + 1;

      const type = (room.roomType as string) || 'Unknown';
      byRoomType[type] = (byRoomType[type] || 0) + 1;

      const size = (room.sizeCategory as string) || 'Unknown';
      bySizeCategory[size] = (bySizeCategory[size] || 0) + 1;

      const bed = (room.bedSize as string) || 'Unknown';
      byBedSize[bed] = (byBedSize[bed] || 0) + 1;
    }

    console.log(`[room-overview] Returning ${rooms.length} rooms across ${floors.length} floors`);

    res.json({
      rooms,
      summary: {
        total: rooms.length,
        floors,
        floorCount: floors.length,
        adaCount,
        byFloor,
        byRoomType,
        bySizeCategory,
        byBedSize,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching room overview data:', error);
    res.status(500).json({
      error: 'Failed to fetch room overview data',
      message: error.message
    });
  }
});

// ── Vendor Invoices ──────────────────────────────────────────────────────────
// In-memory cache for vendor invoices (5-minute TTL)
let vendorInvoicesCache: { data: any; timestamp: number } | null = null;
const VENDOR_INVOICES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.get('/vendor-invoices', async (req, res) => {
  console.log('[vendor-invoices] Endpoint called');
  try {
    const rootFolderId = process.env.VENDOR_INVOICES_DRIVE_ID;

    if (!rootFolderId) {
      console.error('[vendor-invoices] VENDOR_INVOICES_DRIVE_ID not set');
      return res.status(400).json({
        error: 'Vendor Invoices Drive folder ID not configured',
        message: 'Please set VENDOR_INVOICES_DRIVE_ID in environment variables'
      });
    }

    // Check cache
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh && vendorInvoicesCache && Date.now() - vendorInvoicesCache.timestamp < VENDOR_INVOICES_CACHE_TTL) {
      console.log('[vendor-invoices] Returning cached data');
      return res.json(vendorInvoicesCache.data);
    }

    console.log('[vendor-invoices] Fetching vendor folders from root:', rootFolderId);

    // List top-level vendor folders
    const vendorFolders = await listDriveSubfolders(rootFolderId);
    console.log(`[vendor-invoices] Found ${vendorFolders.length} vendor folders`);

    // Fetch files for each vendor folder in parallel
    const vendorResults = await Promise.all(
      vendorFolders.map(async (folder) => {
        try {
          const files = await listDriveFiles(folder.id);
          return {
            name: folder.name,
            folderId: folder.id,
            files,
            fileCount: files.length,
          };
        } catch (err: any) {
          console.error(`[vendor-invoices] Error listing files for "${folder.name}":`, err.message);
          return {
            name: folder.name,
            folderId: folder.id,
            files: [],
            fileCount: 0,
          };
        }
      })
    );

    // Compute summary
    const totalFiles = vendorResults.reduce((sum, v) => sum + v.fileCount, 0);
    const byMimeType: Record<string, number> = {};
    for (const vendor of vendorResults) {
      for (const file of vendor.files) {
        byMimeType[file.mimeType] = (byMimeType[file.mimeType] || 0) + 1;
      }
    }

    const responseData = {
      vendors: vendorResults,
      summary: {
        totalVendors: vendorResults.length,
        totalFiles,
        byMimeType,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    vendorInvoicesCache = { data: responseData, timestamp: Date.now() };

    console.log(`[vendor-invoices] Returning ${vendorResults.length} vendors with ${totalFiles} total files`);
    res.json(responseData);
  } catch (error: any) {
    console.error('Error fetching vendor invoices:', error);
    res.status(500).json({
      error: 'Failed to fetch vendor invoices',
      message: error.message,
    });
  }
});

// GET /api/sheets/useful-links - Return Google Sheet URLs for all configured sheets
router.get('/useful-links', (_req, res) => {
  const sheetUrl = (id: string | undefined) =>
    id ? `https://docs.google.com/spreadsheets/d/${id}` : null;

  const driveUrl = (id: string | undefined) =>
    id ? `https://drive.google.com/drive/folders/${id}` : null;

  const links = [
    { label: 'Construction Progress', url: sheetUrl(process.env.CONSTRUCTION_PROGRESS_SHEET_ID), page: '/construction' },
    { label: 'Budget', url: sheetUrl(process.env.BUDGET_SHEET_ID), page: '/budget' },
    { label: 'Timeline', url: sheetUrl(process.env.TIMELINE_SHEET_ID), page: '/timeline' },
    { label: 'Weekly Goals', url: sheetUrl(process.env.WEEKLY_GOALS_SHEET_ID), page: '/weekly-goals' },
    { label: 'Container Schedule', url: sheetUrl(process.env.CONTAINER_SCHEDULE_SHEET_ID), page: '/container-schedule' },
    { label: 'Room Specs', url: sheetUrl(process.env.ROOM_OVERVIEW_SHEET_ID), page: '/room-specs' },
    { label: 'Vendor Invoices (Drive)', url: driveUrl(process.env.VENDOR_INVOICES_DRIVE_ID), page: '/vendor-invoices' },
  ].filter(link => link.url !== null);

  res.json({ links });
});

export default router;
