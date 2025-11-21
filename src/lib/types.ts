// Core Types for Smart Warehouse System

export interface Position {
  x: number;
  y: number;
}

export interface ShelfLocation {
  shelf: number; // 1-20
  level: number; // 1-3
  position: number; // 1-5
}

export interface Box {
  rfid: string;
  location: ShelfLocation | 'conveyor' | 'robot';
  robotId?: string;
}

export interface RobotStatus {
  id: string;
  position: Position;
  angle: number; // degrees
  batteryLevel: number; // 0-100
  hasBox: boolean;
  currentBox?: Box;
  status: 'idle' | 'moving' | 'picking' | 'placing' | 'charging';
  assignment?: RobotAssignment;
  route?: Position[];
}

export interface RobotAssignment {
  type: 'store' | 'fetch';
  boxRfid: string;
  targetLocation: ShelfLocation | 'conveyor';
  sourceLocation: ShelfLocation | 'conveyor';
}

export interface ChargingStation {
  id: string;
  position: Position;
  occupied: boolean;
  robotId?: string;
}

export interface ConveyorBelt {
  id: string;
  position: Position;
  boxes: Box[];
  isRunning: boolean;
}

export interface ShelfData {
  id: number; // 1-20
  position: Position;
  storage: Map<string, Box>; // key: "level-position" (e.g., "1-1", "3-5")
}

export interface WarehouseConfig {
  numRobots: number;
  numShelves: number;
  shelfLevels: number;
  shelfPositions: number;
  warehouseWidth: number;
  warehouseHeight: number;
}

export interface ObstacleDetection {
  detected: boolean;
  distance: number;
  isMoving: boolean;
}

export const WAREHOUSE_CONFIG: WarehouseConfig = {
  numRobots: 10,
  numShelves: 20,
  shelfLevels: 3,
  shelfPositions: 5,
  warehouseWidth: 1200,
  warehouseHeight: 800,
};

// Constants for warehouse layout
export const SHELF_WIDTH = 40;
export const SHELF_HEIGHT = 80;
export const SHELF_SPACING_VERTICAL = 60; // narrow vertical spacing
export const SHELF_SPACING_HORIZONTAL = 100; // wide horizontal spacing
export const ROBOT_SIZE = 20;
export const CHARGING_STATION_SIZE = 30;
export const CONVEYOR_WIDTH = 100;
export const CONVEYOR_HEIGHT = 20;

// Robot constants
export const ROBOT_SPEED = 3.5; // pixels per frame at 60fps
export const BATTERY_CONSUMPTION_MOVE = 0.01; // per pixel
export const BATTERY_CONSUMPTION_ARM = 2; // per operation
export const LOW_BATTERY_THRESHOLD = 20;
export const CRITICAL_BATTERY_THRESHOLD = 5;
