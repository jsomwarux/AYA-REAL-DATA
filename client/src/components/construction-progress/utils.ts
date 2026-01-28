import { RoomProgress } from "@/lib/api";

// Define bathroom fields and their completion criteria
export const BATHROOM_FIELDS = {
  'Demo Status': { type: 'dropdown', completeValues: ['DEMO DONE'], naValues: [] },
  'Electrical Wiring': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Speaker Line': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Waterproofing': { type: 'dropdown', completeValues: ['Completed'], naValues: [] },
  'Sheetrock': { type: 'dropdown', completeValues: ['Installed', 'Ceiling closed'], naValues: [] },
  'Wall Patching': { type: 'dropdown', completeValues: ['Done'], naValues: [] },
  'Repair door opening': { type: 'dropdown', completeValues: ['Completed'], naValues: ['Keep Existing'] },
  'New Wall Grout': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Shower Valves': { type: 'dropdown', completeValues: ['New 2 Way'], naValues: ['no work done'] },
  'Soap Niche Built': { type: 'dropdown', completeValues: ['Done'], naValues: ['Not Required'] },
  'Tile %': { type: 'percentage', completeValues: ['100%'], naValues: [] },
  'Linear Drain Installed': { type: 'dropdown', completeValues: ['Done'], naValues: ['Not Required', 'Not Requ'] },
} as const;

// Define bedroom fields and their completion criteria
export const BEDROOM_FIELDS = {
  'Electric Wiring': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Speaker Line': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Data Jack Protection': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Curtain Box': { type: 'checkbox', completeValues: [true], naValues: [] },
  'NEW HVAC UNIT': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Sheetrock': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Wall Plastering': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Sanding': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Corner Sanding': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Prime Paint': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Finish Paint': { type: 'checkbox', completeValues: [true], naValues: [] },
  'Flooring': { type: 'checkbox', completeValues: [true], naValues: [] },
} as const;

// Check if a field is complete
export function isFieldComplete(
  value: any,
  fieldConfig: { type: string; completeValues: readonly any[]; naValues: readonly string[] }
): boolean | 'na' {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  // Check for N/A values
  if (fieldConfig.naValues.some(na =>
    typeof value === 'string' && value.toLowerCase().includes(na.toLowerCase())
  )) {
    return 'na';
  }

  // Check for completion
  if (fieldConfig.type === 'checkbox') {
    return value === true || value === 'TRUE';
  }

  if (fieldConfig.type === 'percentage') {
    const strValue = String(value);
    return strValue === '100%' || strValue === '100';
  }

  // Dropdown - check if value matches any complete value
  return fieldConfig.completeValues.some(cv => {
    if (typeof value === 'string' && typeof cv === 'string') {
      return value.toLowerCase().includes(cv.toLowerCase());
    }
    return value === cv;
  });
}

// Calculate completion percentage for a room's bathroom
export function calculateBathroomCompletion(room: RoomProgress): { completed: number; total: number; percentage: number } {
  let completed = 0;
  let total = 0;

  for (const [fieldName, config] of Object.entries(BATHROOM_FIELDS)) {
    const value = room[fieldName];
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
    // Handle field name variations (Bedroom uses "Electric Wiring" not "Electrical Wiring")
    const value = room[fieldName];
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
      const value = room[fieldName];
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
    return value === true || value === 'TRUE' ? 'Complete' : 'Not started';
  }
  return String(value);
}
