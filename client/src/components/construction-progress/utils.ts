import { RoomProgress } from "@/lib/api";

// Define bathroom fields and their completion criteria
// Column headers are prefixed with "Bathroom_" by the backend to avoid conflicts with duplicate names
export const BATHROOM_FIELDS: Record<string, { type: string; completeValues: string[]; naValues: string[] }> = {
  'Bathroom_Demo Status': {
    type: 'dropdown',
    completeValues: ['DEMO DONE', 'Approved Demo'],
    naValues: []
  },
  'Bathroom_Electrical Wiring': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bathroom_Speaker Line': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bathroom_Waterproofing': {
    type: 'dropdown',
    completeValues: ['Completed'],
    naValues: []
  },
  'Bathroom_Sheetrock': {
    type: 'dropdown',
    completeValues: ['Installed', 'Ceiling closed'],
    naValues: []
  },
  'Bathroom_Wall Patching': {
    type: 'dropdown',
    completeValues: ['Done'],
    naValues: []
  },
  'Bathroom_Repair Door Opening': {
    type: 'dropdown',
    completeValues: ['Completed'],
    naValues: ['Keep Existing', 'External Door']
  },
  'Bathroom_New Wall Grout': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bathroom_Shower Valves': {
    type: 'dropdown',
    completeValues: ['New Parts replaced', 'New 2 way valve', 'New 3 way valve'],
    naValues: ['no work done yet']
  },
  'Bathroom_Soap Niche Built': {
    type: 'dropdown',
    completeValues: ['Done'],
    naValues: ['Not required', 'Not Required']
  },
  'Bathroom_Tile %': {
    type: 'percentage',
    completeValues: ['100%', '100'],
    naValues: []
  },
  'Bathroom_Linear Drain Installed': {
    type: 'dropdown',
    completeValues: ['Done'],
    naValues: ['Not required', 'Not Required']
  },
};

// Define bedroom fields and their completion criteria
// Column headers are prefixed with "Bedroom_" by the backend to avoid conflicts with duplicate names
export const BEDROOM_FIELDS: Record<string, { type: string; completeValues: string[]; naValues: string[] }> = {
  'Bedroom_Electric Wiring': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Speaker Line': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Data Jack Protection': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Curtain Box': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_New HVAC Unit': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Sheetrock': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Wall Plastering': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Sanding': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Corner Sanding': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Prime Paint': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Finish Paint': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
  'Bedroom_Flooring': {
    type: 'checkbox',
    completeValues: ['TRUE', 'true'],
    naValues: []
  },
};

// Check if a field is complete
export function isFieldComplete(
  value: any,
  fieldConfig: { type: string; completeValues: string[]; naValues: string[] }
): boolean | 'na' {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const strValue = String(value).trim();

  // Check for N/A values first (case-insensitive)
  for (const na of fieldConfig.naValues) {
    if (strValue.toLowerCase() === na.toLowerCase()) {
      return 'na';
    }
  }

  // Check for completion based on field type
  if (fieldConfig.type === 'checkbox') {
    // Checkboxes come as boolean true/false or string "TRUE"/"FALSE"
    return value === true || strValue.toUpperCase() === 'TRUE';
  }

  if (fieldConfig.type === 'percentage') {
    // Check if it's 100%
    const numMatch = strValue.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10) === 100;
    }
    return false;
  }

  // Dropdown - check if value matches any complete value (case-insensitive)
  for (const cv of fieldConfig.completeValues) {
    if (strValue.toLowerCase() === cv.toLowerCase()) {
      return true;
    }
  }

  return false;
}

// Get a field value from a room, trying multiple possible key formats
function getFieldValue(room: RoomProgress, fieldName: string): any {
  // Try exact match first
  if (room[fieldName] !== undefined) {
    return room[fieldName];
  }

  // Try with different cases
  const lowerKey = fieldName.toLowerCase();
  const upperKey = fieldName.toUpperCase();

  for (const key of Object.keys(room)) {
    if (key.toLowerCase() === lowerKey || key.toUpperCase() === upperKey) {
      return room[key];
    }
  }

  return undefined;
}

// Calculate completion percentage for a room's bathroom
export function calculateBathroomCompletion(room: RoomProgress): { completed: number; total: number; percentage: number } {
  let completed = 0;
  let total = 0;

  for (const [fieldName, config] of Object.entries(BATHROOM_FIELDS)) {
    const value = getFieldValue(room, fieldName);
    const status = isFieldComplete(value, config);

    if (status === 'na') {
      // Don't count N/A fields
      continue;
    }

    total++;
    if (status === true) {
      completed++;
    }
  }

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// Calculate completion percentage for a room's bedroom
export function calculateBedroomCompletion(room: RoomProgress): { completed: number; total: number; percentage: number } {
  let completed = 0;
  let total = 0;

  for (const [fieldName, config] of Object.entries(BEDROOM_FIELDS)) {
    const value = getFieldValue(room, fieldName);
    const status = isFieldComplete(value, config);

    if (status === 'na') {
      continue;
    }

    total++;
    if (status === true) {
      completed++;
    }
  }

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// Calculate overall room completion
export function calculateRoomCompletion(room: RoomProgress): {
  bathroom: { completed: number; total: number; percentage: number };
  bedroom: { completed: number; total: number; percentage: number };
  overall: { completed: number; total: number; percentage: number };
} {
  const bathroom = calculateBathroomCompletion(room);
  const bedroom = calculateBedroomCompletion(room);

  return {
    bathroom,
    bedroom,
    overall: {
      completed: bathroom.completed + bedroom.completed,
      total: bathroom.total + bedroom.total,
      percentage: (bathroom.total + bedroom.total) > 0
        ? Math.round(((bathroom.completed + bedroom.completed) / (bathroom.total + bedroom.total)) * 100)
        : 0,
    },
  };
}

// Calculate task completion across all rooms
export function calculateTaskCompletion(
  rooms: RoomProgress[],
  taskType: 'bathroom' | 'bedroom'
): Record<string, { completed: number; total: number; percentage: number }> {
  const fields = taskType === 'bathroom' ? BATHROOM_FIELDS : BEDROOM_FIELDS;
  const result: Record<string, { completed: number; total: number; percentage: number }> = {};

  for (const [fieldName, config] of Object.entries(fields)) {
    let completed = 0;
    let total = 0;

    for (const room of rooms) {
      const value = getFieldValue(room, fieldName);
      const status = isFieldComplete(value, config);

      if (status === 'na') {
        continue;
      }

      total++;
      if (status === true) {
        completed++;
      }
    }

    result[fieldName] = {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  return result;
}

// Extract floor number from room number
export function getFloorFromRoom(roomNumber: string | number): number {
  const roomStr = String(roomNumber);
  if (roomStr.length >= 3) {
    // For 3-digit rooms (e.g., 401), floor is first digit
    // For 4-digit rooms (e.g., 2701), floor is first 2 digits
    if (roomStr.length === 3) {
      return parseInt(roomStr[0], 10);
    }
    return parseInt(roomStr.slice(0, -2), 10);
  }
  return 0;
}

// Group rooms by floor
export function groupRoomsByFloor(rooms: RoomProgress[]): Map<number, RoomProgress[]> {
  const floorMap = new Map<number, RoomProgress[]>();

  for (const room of rooms) {
    const roomNum = room['ROOM #'];
    if (roomNum === null || roomNum === undefined) continue;

    const floor = getFloorFromRoom(roomNum);
    if (!floorMap.has(floor)) {
      floorMap.set(floor, []);
    }
    floorMap.get(floor)!.push(room);
  }

  return floorMap;
}

// Get all unique floors sorted
export function getUniqueFloors(rooms: RoomProgress[]): number[] {
  const floors = new Set<number>();
  for (const room of rooms) {
    const roomNum = room['ROOM #'];
    if (roomNum !== null && roomNum !== undefined) {
      floors.add(getFloorFromRoom(roomNum));
    }
  }
  return Array.from(floors).sort((a, b) => a - b);
}

// Calculate floor completion
export function calculateFloorCompletion(rooms: RoomProgress[]): {
  bathroom: number;
  bedroom: number;
  overall: number;
} {
  if (rooms.length === 0) {
    return { bathroom: 0, bedroom: 0, overall: 0 };
  }

  let bathroomTotal = 0;
  let bedroomTotal = 0;
  let overallTotal = 0;

  for (const room of rooms) {
    const completion = calculateRoomCompletion(room);
    bathroomTotal += completion.bathroom.percentage;
    bedroomTotal += completion.bedroom.percentage;
    overallTotal += completion.overall.percentage;
  }

  return {
    bathroom: Math.round(bathroomTotal / rooms.length),
    bedroom: Math.round(bedroomTotal / rooms.length),
    overall: Math.round(overallTotal / rooms.length),
  };
}

// Get completion status color
export function getCompletionColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-400';
  if (percentage >= 70) return 'text-teal-400';
  if (percentage >= 50) return 'text-amber-400';
  if (percentage >= 25) return 'text-orange-400';
  return 'text-red-400';
}

export function getCompletionBgColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-500';
  if (percentage >= 70) return 'bg-teal-500';
  if (percentage >= 50) return 'bg-amber-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

// Format field value for display
export function formatFieldValue(value: any, fieldType: string): string {
  if (value === null || value === undefined || value === '') {
    return 'Not started';
  }
  if (fieldType === 'checkbox') {
    return value === true || String(value).toUpperCase() === 'TRUE' ? 'Complete' : 'Not started';
  }
  return String(value);
}

// Get field config for a field name (searches both bathroom and bedroom)
export function getFieldConfig(fieldName: string): { type: string; completeValues: string[]; naValues: string[] } | null {
  if (BATHROOM_FIELDS[fieldName]) {
    return BATHROOM_FIELDS[fieldName];
  }
  if (BEDROOM_FIELDS[fieldName]) {
    return BEDROOM_FIELDS[fieldName];
  }
  return null;
}
