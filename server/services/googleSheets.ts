import { google, sheets_v4, drive_v3 } from 'googleapis';

// Types for Google Sheets data
export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

export interface SheetData {
  headers: string[];
  rows: SheetRow[];
  rawValues: string[][];
}

// Types for Google Drive files
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl: string | null;
  webViewUrl: string | null;
  size: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
}

// Shared auth instance for both Sheets and Drive
function getGoogleAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  }
  return null;
}

// Initialize Google Sheets client
function getGoogleSheetsClient(): sheets_v4.Sheets {
  const auth = getGoogleAuth();
  if (auth) {
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

// Initialize Google Drive client
function getGoogleDriveClient(): drive_v3.Drive {
  const auth = getGoogleAuth();
  if (auth) {
    return google.drive({ version: 'v3', auth });
  }

  if (process.env.GOOGLE_API_KEY) {
    return google.drive({
      version: 'v3',
      auth: process.env.GOOGLE_API_KEY,
    });
  }

  throw new Error('Google Drive credentials not configured. Set either GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY or GOOGLE_API_KEY');
}

// List only immediate subfolders of a Drive folder (no recursion, folders only)
export async function listDriveSubfolders(parentId: string): Promise<Array<{ id: string; name: string }>> {
  const drive = getGoogleDriveClient();
  const folders: Array<{ id: string; name: string }> = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 100,
      pageToken,
      orderBy: 'name',
    });
    const files = response.data.files || [];
    folders.push(...files.map(f => ({ id: f.id!, name: f.name! })));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return folders;
}

// List all files in a Google Drive folder (recursively includes subfolders)
export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const drive = getGoogleDriveClient();
  const allFiles: DriveFile[] = [];

  async function listFolder(parentId: string) {
    let pageToken: string | undefined;
    do {
      const response = await drive.files.list({
        q: `'${parentId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, size, createdTime, modifiedTime)',
        pageSize: 100,
        pageToken,
        orderBy: 'name',
      });

      const files = response.data.files || [];
      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // Recurse into subfolders
          await listFolder(file.id!);
        } else {
          allFiles.push({
            id: file.id!,
            name: file.name || 'Unknown',
            mimeType: file.mimeType || 'application/octet-stream',
            thumbnailUrl: file.thumbnailLink || null,
            webViewUrl: file.webViewLink || null,
            size: file.size || null,
            createdTime: file.createdTime || null,
            modifiedTime: file.modifiedTime || null,
          });
        }
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }

  await listFolder(folderId);
  return allFiles;
}

// Get a readable stream for a Drive file (for proxying content).
// Google-native files (Sheets, Docs, Slides, etc.) are exported as PDF since they have no binary content.
export async function getDriveFileStream(fileId: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size: string | null; name: string }> {
  const drive = getGoogleDriveClient();

  // Get file metadata first
  const meta = await drive.files.get({
    fileId,
    fields: 'name, mimeType, size',
  });

  const originalMimeType = meta.data.mimeType || 'application/octet-stream';
  const fileName = meta.data.name || 'file';

  // Google Docs Editor files (Sheets, Docs, Slides, Drawings, etc.) cannot be downloaded
  // directly — they must be exported to a standard format.
  if (originalMimeType.startsWith('application/vnd.google-apps.')) {
    const response = await drive.files.export(
      { fileId, mimeType: 'application/pdf' },
      { responseType: 'stream' }
    );

    return {
      stream: response.data as unknown as NodeJS.ReadableStream,
      mimeType: 'application/pdf',
      size: null, // export size is not known upfront
      name: fileName.replace(/\.[^.]*$/, '') + '.pdf',
    };
  }

  // Regular binary files (PDFs, images, etc.) — download directly
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    stream: response.data as unknown as NodeJS.ReadableStream,
    mimeType: originalMimeType,
    size: meta.data.size || null,
    name: fileName,
  };
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
