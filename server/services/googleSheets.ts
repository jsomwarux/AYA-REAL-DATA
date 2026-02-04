import { google, sheets_v4 } from 'googleapis';

// Types for Google Sheets data
export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

export interface SheetData {
  headers: string[];
  rows: SheetRow[];
  rawValues: string[][];
}

// Initialize Google Sheets client
function getGoogleSheetsClient(): sheets_v4.Sheets {
  // Check for service account credentials
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
  }

  // Fallback to API key (limited functionality)
  if (process.env.GOOGLE_API_KEY) {
    return google.sheets({
      version: 'v4',
      auth: process.env.GOOGLE_API_KEY,
    });
  }

  throw new Error('Google Sheets credentials not configured. Set either GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY or GOOGLE_API_KEY');
}

// Fetch data from a Google Sheet
export async function fetchSheetData(
  spreadsheetId: string,
  range: string
): Promise<SheetData> {
  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = response.data.values || [];

  if (values.length === 0) {
    return { headers: [], rows: [], rawValues: [] };
  }

  const headers = values[0] as string[];
  const rows = values.slice(1).map((row) => {
    const obj: SheetRow = {};
    headers.forEach((header, index) => {
      const value = row[index];
      // Try to parse numbers
      if (value !== undefined && value !== '') {
        const num = Number(value);
        obj[header] = isNaN(num) ? value : num;
      } else {
        obj[header] = null;
      }
    });
    return obj;
  });

  return { headers, rows, rawValues: values as string[][] };
}

// Fetch multiple ranges from a spreadsheet
export async function fetchMultipleRanges(
  spreadsheetId: string,
  ranges: string[]
): Promise<Map<string, SheetData>> {
  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });

  const result = new Map<string, SheetData>();

  response.data.valueRanges?.forEach((valueRange, index) => {
    const values = valueRange.values || [];
    const rangeName = ranges[index];

    if (values.length === 0) {
      result.set(rangeName, { headers: [], rows: [], rawValues: [] });
      return;
    }

    const headers = values[0] as string[];
    const rows = values.slice(1).map((row) => {
      const obj: SheetRow = {};
      headers.forEach((header, idx) => {
        const value = row[idx];
        if (value !== undefined && value !== '') {
          const num = Number(value);
          obj[header] = isNaN(num) ? value : num;
        } else {
          obj[header] = null;
        }
      });
      return obj;
    });

    result.set(rangeName, { headers, rows, rawValues: values as string[][] });
  });

  return result;
}

// Fetch sheet data with hyperlinks resolved
// Uses spreadsheets.get with rowData to extract actual hyperlink URLs from cells
export async function fetchSheetDataWithHyperlinks(
  spreadsheetId: string,
  sheetTitle: string,
  startRow: number,
  endRow: number,
  endCol: string
): Promise<SheetData> {
  const sheets = getGoogleSheetsClient();
  const range = `'${sheetTitle}'!A${startRow}:${endCol}${endRow}`;

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [range],
    fields: 'sheets.data.rowData.values(formattedValue,hyperlink)',
  });

  const rowData = response.data.sheets?.[0]?.data?.[0]?.rowData || [];
  if (rowData.length === 0) {
    return { headers: [], rows: [], rawValues: [] };
  }

  // Build rawValues where hyperlinks take priority over display text
  const rawValues: string[][] = rowData.map((row) => {
    const cells = row.values || [];
    return cells.map((cell) => {
      // If cell has a hyperlink, use that as the value
      if (cell.hyperlink) {
        return cell.hyperlink;
      }
      return cell.formattedValue || '';
    });
  });

  const headers = rawValues[0] || [];
  const dataRows = rawValues.slice(1);
  const rows = dataRows.map((row) => {
    const obj: SheetRow = {};
    headers.forEach((header, index) => {
      const value = row[index];
      if (value !== undefined && value !== '') {
        const num = Number(value);
        obj[header] = isNaN(num) ? value : num;
      } else {
        obj[header] = null;
      }
    });
    return obj;
  });

  return { headers, rows, rawValues };
}

// Get spreadsheet metadata
export async function getSpreadsheetInfo(spreadsheetId: string) {
  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties',
  });

  return {
    title: response.data.properties?.title,
    sheets: response.data.sheets?.map((sheet) => ({
      id: sheet.properties?.sheetId,
      title: sheet.properties?.title,
      index: sheet.properties?.index,
    })),
  };
}
