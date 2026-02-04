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

// Mock deal data for demo/development mode
const MOCK_DEALS_ROWS = [
  { bbl: "1-00845-0021", address: "123 W 57th St", borough: "MANHATTAN", final_score: 87, recommendation: "STRONG BUY", upside_score: 92, risk_score: 78, execution_score: 88, investment_thesis: "Prime Midtown location with significant value-add potential through renovation. Below-market rents offer 40%+ upside upon lease turnover.", estimated_price_range: "$4.2M - $4.8M", estimated_roi: "18-22%", key_due_diligence: "Verify zoning compliance, environmental Phase I, tenant lease expiration schedule" },
  { bbl: "3-01234-0055", address: "456 Atlantic Ave", borough: "BROOKLYN", final_score: 74, recommendation: "BUY", upside_score: 80, risk_score: 65, execution_score: 76, investment_thesis: "Emerging corridor with strong residential conversion potential. Recent rezoning supports mixed-use development.", estimated_price_range: "$2.8M - $3.2M", estimated_roi: "14-18%", key_due_diligence: "Structural assessment, rezoning confirmation, market rent comparables" },
  { bbl: "2-03456-0012", address: "789 Grand Concourse", borough: "BRONX", final_score: 68, recommendation: "BUY", upside_score: 72, risk_score: 60, execution_score: 70, investment_thesis: "Distressed asset in rapidly improving neighborhood. Metro-North expansion will drive significant appreciation.", estimated_price_range: "$1.5M - $1.9M", estimated_roi: "12-16%", key_due_diligence: "Title search, building violations review, capital expenditure assessment" },
  { bbl: "4-05678-0033", address: "321 Queens Blvd", borough: "QUEENS", final_score: 55, recommendation: "HOLD", upside_score: 58, risk_score: 50, execution_score: 56, investment_thesis: "Stable cash-flowing asset with modest upside. Limited value-add opportunities but strong tenant base provides reliable income.", estimated_price_range: "$3.1M - $3.5M", estimated_roi: "8-11%", key_due_diligence: "Tenant creditworthiness, deferred maintenance audit, insurance review" },
  { bbl: "5-07890-0044", address: "654 Victory Blvd", borough: "STATEN ISLAND", final_score: 42, recommendation: "PASS", upside_score: 38, risk_score: 35, execution_score: 50, investment_thesis: "Limited growth potential in current market cycle. High vacancy risk and declining neighborhood metrics suggest better opportunities elsewhere.", estimated_price_range: "$900K - $1.1M", estimated_roi: "5-7%", key_due_diligence: "Environmental concerns, flood zone assessment, market demand analysis" },
  { bbl: "1-01122-0066", address: "88 Essex St", borough: "MANHATTAN", final_score: 91, recommendation: "STRONG BUY", upside_score: 95, risk_score: 82, execution_score: 93, investment_thesis: "LES opportunity zone property with historic tax credits available. Rapid gentrification and new subway access create exceptional upside.", estimated_price_range: "$5.5M - $6.2M", estimated_roi: "22-28%", key_due_diligence: "Historic preservation requirements, opportunity zone compliance, community board review" },
  { bbl: "3-03344-0077", address: "200 Flatbush Ave", borough: "BROOKLYN", final_score: 63, recommendation: "HOLD", upside_score: 65, risk_score: 58, execution_score: 64, investment_thesis: "Well-located but fully priced asset. Current cap rate reflects market value with limited near-term catalysts for appreciation.", estimated_price_range: "$3.8M - $4.3M", estimated_roi: "9-12%", key_due_diligence: "Rent stabilization audit, comparable sales analysis, operating expense review" },
  { bbl: "2-05566-0088", address: "500 E Tremont Ave", borough: "BRONX", final_score: 79, recommendation: "BUY", upside_score: 83, risk_score: 70, execution_score: 81, investment_thesis: "Multi-family conversion opportunity in improving area. Strong rental demand and below-replacement-cost basis create favorable risk/reward.", estimated_price_range: "$2.1M - $2.5M", estimated_roi: "15-20%", key_due_diligence: "Conversion feasibility study, HPD violations check, utility infrastructure assessment" },
];

// Get Deal Intelligence data
router.get('/deals', async (req, res) => {
  try {
    // Check if mock mode is enabled
    const mockMode = process.env.DEALS_MOCK_MODE?.toLowerCase() === 'true';

    if (mockMode) {
      const now = new Date().toISOString();
      const headers = ['bbl', 'address', 'borough', 'final_score', 'recommendation', 'upside_score', 'risk_score', 'execution_score', 'investment_thesis', 'estimated_price_range', 'estimated_roi', 'key_due_diligence', 'retrieved_at'];
      const rows = MOCK_DEALS_ROWS.map(row => ({ ...row, retrieved_at: now }));
      return res.json({ headers, rows });
    }

    const spreadsheetId = process.env.DEALS_SHEET_ID;

    if (!spreadsheetId) {
      return res.status(400).json({
        error: 'Deals sheet ID not configured',
        message: 'Please set DEALS_SHEET_ID in environment variables'
      });
    }

    const range = (req.query.range as string) || 'Sheet1!A:BZ';
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

    // Fetch both the A.I Rooms Progress data and RECAP data
    const roomsRange = "'A.I Rooms Progress'!A3:Z500"; // Row 3 has headers, row 4+ has data
    const recapRange = "'RECAP'!A:Z";

    console.log('[construction-progress] Fetching data from sheet:', spreadsheetId);
    const data = await fetchMultipleRanges(spreadsheetId, [roomsRange, recapRange]);
    console.log('[construction-progress] Data fetched successfully');

    // Process Rooms Progress data
    const roomsData = data.get(roomsRange);
    const recapData = data.get(recapRange);

    // Transform rooms data - need special handling for the merged BATHROOM/BEDROOM headers
    // Row 3 (index 0 in our fetch since we start at A3) contains the actual column headers
    let processedRooms: GoogleSheetRow[] = [];
    let roomHeaders: string[] = [];

    if (roomsData && roomsData.rawValues && roomsData.rawValues.length > 0) {
      // First row of our fetch is the column headers (Row 3 in sheet)
      const rawHeaders = roomsData.rawValues[0] as string[];

      // Column positions (0-indexed based on A3:Z500 range):
      // A=0 (empty), B=1 (ROOM #), C-N=2-13 (Bathroom, 12 cols), O-Z=14-25 (Bedroom, 12 cols)
      // Bathroom columns: indices 2-13 (C through N)
      // Bedroom columns: indices 14-25 (O through Z)
      const BATHROOM_START = 2;  // Column C
      const BATHROOM_END = 13;   // Column N
      const BEDROOM_START = 14;  // Column O
      const BEDROOM_END = 25;    // Column Z

      // Track column names to detect duplicates and prefix them appropriately
      const seenHeaders = new Map<string, number>(); // header -> first index seen

      // Process headers, prefixing duplicates based on section
      roomHeaders = rawHeaders.map((header, index) => {
        if (!header || header.trim() === '') return '';

        const trimmedHeader = header.trim();

        // Check if this header was seen before
        if (seenHeaders.has(trimmedHeader)) {
          // This is a duplicate - prefix based on section
          if (index >= BEDROOM_START && index <= BEDROOM_END) {
            return `Bedroom_${trimmedHeader}`;
          } else if (index >= BATHROOM_START && index <= BATHROOM_END) {
            return `Bathroom_${trimmedHeader}`;
          }
        }

        // Mark this header as seen at this index
        seenHeaders.set(trimmedHeader, index);

        // First occurrence - prefix based on section for consistency
        if (index >= BATHROOM_START && index <= BATHROOM_END) {
          return `Bathroom_${trimmedHeader}`;
        } else if (index >= BEDROOM_START && index <= BEDROOM_END) {
          return `Bedroom_${trimmedHeader}`;
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
      }).filter(row => {
        // Filter out empty rows (rows without a room number)
        const roomNum = row['ROOM #'] || row['Room #'] || row['ROOM'] || row['room'];
        return roomNum !== null && roomNum !== undefined && roomNum !== '';
      });

      // Deduplicate rooms by ROOM # — keep the last occurrence (most recent data)
      const beforeDedup = processedRooms.length;
      const roomMap = new Map<string, GoogleSheetRow>();
      for (const room of processedRooms) {
        const roomNum = String(room['ROOM #'] || room['Room #'] || room['ROOM'] || room['room']);
        roomMap.set(roomNum, room);
      }
      processedRooms = Array.from(roomMap.values());
      const afterDedup = processedRooms.length;
      if (beforeDedup !== afterDedup) {
        console.log(`[construction-progress] Deduplicated rooms: ${beforeDedup} → ${afterDedup} (removed ${beforeDedup - afterDedup} duplicates)`);
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
    // Fetch from row 2 onwards so headers are first row of result
    const range = `'${tabName}'!A2:P500`;

    console.log('[container-schedule] Fetching data from sheet:', spreadsheetId, 'range:', range);
    const data = await fetchSheetData(spreadsheetId, range);
    console.log('[container-schedule] Data fetched successfully');

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

export default router;
