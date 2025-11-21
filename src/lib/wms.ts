// Warehouse Management System (WMS)

import type {
  Box,
  RobotStatus,
  ShelfLocation,
  Position,
  ShelfData,
  ChargingStation,
  ConveyorBelt,
  RobotAssignment,
} from './types';
import {
  WAREHOUSE_CONFIG,
  SHELF_WIDTH,
  SHELF_HEIGHT,
  SHELF_SPACING_VERTICAL,
  SHELF_SPACING_HORIZONTAL,
  CHARGING_STATION_SIZE,
  CONVEYOR_WIDTH,
  CONVEYOR_HEIGHT,
  LOW_BATTERY_THRESHOLD,
} from './types';

export class WarehouseManagementSystem {
  private boxes: Map<string, Box> = new Map();
  private robots: Map<string, RobotStatus> = new Map();
  private shelves: Map<number, ShelfData> = new Map();
  private chargingStations: ChargingStation[] = [];
  private conveyorBelts: ConveyorBelt[] = [];
  private pendingTasks: RobotAssignment[] = [];

  constructor() {
    this.initializeWarehouse();
  }

  private initializeWarehouse() {
    // Initialize shelves (20 shelves in 2 rows of 10)
    const startX = 150;
    const startYTop = 100;
    const startYBottom = 500;

    for (let i = 0; i < 20; i++) {
      const shelfId = i + 1;
      const row = i < 10 ? 0 : 1;
      const colIndex = i % 10;

      const position: Position = {
        x: startX + colIndex * (SHELF_WIDTH + SHELF_SPACING_VERTICAL),
        y: row === 0 ? startYTop : startYBottom,
      };

      this.shelves.set(shelfId, {
        id: shelfId,
        position,
        storage: new Map(),
      });
    }

    // Initialize charging stations (4 corners)
    const margin = 50;
    this.chargingStations = [
      {
        id: 'cs1',
        position: { x: margin, y: margin },
        occupied: false,
      },
      {
        id: 'cs2',
        position: { x: WAREHOUSE_CONFIG.warehouseWidth - margin, y: margin },
        occupied: false,
      },
      {
        id: 'cs3',
        position: { x: margin, y: WAREHOUSE_CONFIG.warehouseHeight - margin },
        occupied: false,
      },
      {
        id: 'cs4',
        position: {
          x: WAREHOUSE_CONFIG.warehouseWidth - margin,
          y: WAREHOUSE_CONFIG.warehouseHeight - margin,
        },
        occupied: false,
      },
    ];

    // Initialize conveyor belts (top and bottom)
    const conveyorX = WAREHOUSE_CONFIG.warehouseWidth / 2 - CONVEYOR_WIDTH / 2;
    this.conveyorBelts = [
      {
        id: 'cb1',
        position: { x: conveyorX, y: 30 },
        boxes: [],
        isRunning: true,
      },
      {
        id: 'cb2',
        position: { x: conveyorX, y: WAREHOUSE_CONFIG.warehouseHeight - 50 },
        boxes: [],
        isRunning: true,
      },
    ];

    // Initialize robots (distributed around charging stations)
    for (let i = 0; i < WAREHOUSE_CONFIG.numRobots; i++) {
      const stationIndex = i % this.chargingStations.length;
      const station = this.chargingStations[stationIndex];
      const offset = Math.floor(i / this.chargingStations.length) * 40;

      const robotId = `robot-${i + 1}`;
      this.robots.set(robotId, {
        id: robotId,
        position: {
          x: station.position.x + offset,
          y: station.position.y + offset,
        },
        angle: 0,
        batteryLevel: 100,
        hasBox: false,
        status: 'idle',
      });
    }
  }

  // Box Management
  addBoxToConveyor(conveyorId: string): Box {
    const rfid = `RFID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const availableLocation = this.findAvailableShelfLocation();

    if (!availableLocation) {
      throw new Error('No available shelf space');
    }

    const box: Box = {
      rfid,
      location: 'conveyor',
    };

    this.boxes.set(rfid, box);
    const conveyor = this.conveyorBelts.find((cb) => cb.id === conveyorId);
    if (conveyor) {
      conveyor.boxes.push(box);
    }

    // Create storage task
    const task: RobotAssignment = {
      type: 'store',
      boxRfid: rfid,
      sourceLocation: 'conveyor',
      targetLocation: availableLocation,
    };
    this.pendingTasks.push(task);
    this.assignTaskToRobot();

    return box;
  }

  requestBoxRetrieval(location: ShelfLocation): void {
    const boxKey = this.getShelfStorageKey(location);
    const shelf = this.shelves.get(location.shelf);
    const box = shelf?.storage.get(boxKey);

    if (!box) {
      throw new Error('No box found at location');
    }

    const task: RobotAssignment = {
      type: 'fetch',
      boxRfid: box.rfid,
      sourceLocation: location,
      targetLocation: 'conveyor',
    };
    this.pendingTasks.push(task);
    this.assignTaskToRobot();
  }

  private assignTaskToRobot(): void {
    if (this.pendingTasks.length === 0) return;

    // Find idle robot with sufficient battery
    const idleRobot = Array.from(this.robots.values()).find(
      (r) => r.status === 'idle' && r.batteryLevel > LOW_BATTERY_THRESHOLD
    );

    if (idleRobot) {
      const task = this.pendingTasks.shift();
      if (task) {
        idleRobot.assignment = task;
        // Don't set status here - let the Robot instance handle it when route is synced
        this.computeRoute(idleRobot);
      }
    }
  }

  private computeRoute(robot: RobotStatus): void {
    if (!robot.assignment) return;

    const targetPos = this.getLocationPosition(
      robot.assignment.type === 'store'
        ? robot.assignment.sourceLocation
        : robot.assignment.sourceLocation
    );

    // Simple straight-line route for now (A* pathfinding would be better)
    robot.route = [targetPos];
  }

  private getLocationPosition(location: ShelfLocation | 'conveyor'): Position {
    if (location === 'conveyor') {
      return this.conveyorBelts[0].position;
    }

    const shelf = this.shelves.get(location.shelf);
    if (!shelf) {
      throw new Error('Invalid shelf');
    }

    // Return position in front of shelf
    return {
      x: shelf.position.x,
      y: shelf.position.y - 40, // Position robot in front of shelf
    };
  }

  private findAvailableShelfLocation(): ShelfLocation | null {
    for (const [shelfId, shelf] of this.shelves) {
      for (let level = 1; level <= WAREHOUSE_CONFIG.shelfLevels; level++) {
        for (let pos = 1; pos <= WAREHOUSE_CONFIG.shelfPositions; pos++) {
          const key = `${level}-${pos}`;
          if (!shelf.storage.has(key)) {
            return { shelf: shelfId, level, position: pos };
          }
        }
      }
    }
    return null;
  }

  private getShelfStorageKey(location: ShelfLocation): string {
    return `${location.level}-${location.position}`;
  }

  storeBoxOnShelf(box: Box, location: ShelfLocation): void {
    const shelf = this.shelves.get(location.shelf);
    if (!shelf) return;

    const key = this.getShelfStorageKey(location);
    box.location = location;
    shelf.storage.set(key, box);
    this.boxes.set(box.rfid, box);
  }

  removeBoxFromShelf(location: ShelfLocation): Box | null {
    const shelf = this.shelves.get(location.shelf);
    if (!shelf) return null;

    const key = this.getShelfStorageKey(location);
    const box = shelf.storage.get(key);
    if (box) {
      shelf.storage.delete(key);
      box.location = 'robot';
      return box;
    }
    return null;
  }

  // Robot Management
  updateRobotPosition(robotId: string, position: Position): void {
    const robot = this.robots.get(robotId);
    if (robot) {
      robot.position = position;
    }
  }

  updateRobotStatus(robotId: string, status: RobotStatus['status']): void {
    const robot = this.robots.get(robotId);
    if (robot) {
      robot.status = status;
    }
  }

  completeRobotAssignment(robotId: string): void {
    const robot = this.robots.get(robotId);
    if (robot) {
      robot.assignment = undefined;
      robot.status = 'idle';
      robot.route = undefined;
      // Try to assign next task
      this.assignTaskToRobot();
    }
  }

  sendRobotToCharge(robotId: string): void {
    const robot = this.robots.get(robotId);
    if (!robot) return;

    const availableStation = this.chargingStations.find((cs) => !cs.occupied);
    if (availableStation) {
      robot.route = [availableStation.position];
      robot.status = 'charging';
      availableStation.occupied = true;
      availableStation.robotId = robotId;
    }
  }

  // Getters
  getRobots(): RobotStatus[] {
    return Array.from(this.robots.values());
  }

  getShelves(): ShelfData[] {
    return Array.from(this.shelves.values());
  }

  getChargingStations(): ChargingStation[] {
    return this.chargingStations;
  }

  getConveyorBelts(): ConveyorBelt[] {
    return this.conveyorBelts;
  }

  getBoxes(): Box[] {
    return Array.from(this.boxes.values());
  }

  getPendingTasks(): RobotAssignment[] {
    return this.pendingTasks;
  }
}
