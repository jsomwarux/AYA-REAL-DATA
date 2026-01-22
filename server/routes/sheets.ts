import { Router } from 'express';
import { fetchSheetData, fetchMultipleRanges, getSpreadsheetInfo } from '../services/googleSheets';

const router = Router();

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

    res.json(data);
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

    res.json(data);
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

    const data = await fetchSheetData(spreadsheetId, range);
    res.json(data);
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
    const { spreadsheetId, ranges } = req.body;

    if (!spreadsheetId || !ranges || !Array.isArray(ranges)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide spreadsheetId and ranges array'
      });
    }

    const data = await fetchMultipleRanges(spreadsheetId, ranges);

    // Convert Map to object for JSON response
    const result: Record<string, any> = {};
    data.forEach((value, key) => {
      result[key] = value;
    });

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
