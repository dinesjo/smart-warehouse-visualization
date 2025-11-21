// Simulation Engine that coordinates WMS and Robots

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { WarehouseManagementSystem } from './wms';
import { Robot } from './robot';
import type {
  RobotStatus,
  ShelfData,
  ChargingStation,
  ConveyorBelt,
  Box,
  Position,
  RobotAssignment,
  ShelfLocation,
} from './types';
import { WAREHOUSE_CONFIG, CONVEYOR_WIDTH, CONVEYOR_HEIGHT } from './types';

export interface SimulationState {
  isRunning: boolean;
  speed: number;
  time: number;
  statistics: {
    totalBoxes: number;
    boxesStored: number;
    boxesFetched: number;
    activeRobots: number;
    chargingRobots: number;
    pendingTasks: number;
  };
}

export class SimulationEngine {
  private wms: WarehouseManagementSystem;
  private robots: Map<string, Robot> = new Map();
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;

  // Stores
  public robotsStore: Writable<RobotStatus[]>;
  public shelvesStore: Writable<ShelfData[]>;
  public chargingStationsStore: Writable<ChargingStation[]>;
  public conveyorBeltsStore: Writable<ConveyorBelt[]>;
  public boxesStore: Writable<Box[]>;
  public stateStore: Writable<SimulationState>;
  public pendingTasksStore: Writable<RobotAssignment[]>;

  constructor() {
    this.wms = new WarehouseManagementSystem();

    // Initialize stores
    this.robotsStore = writable<RobotStatus[]>([]);
    this.shelvesStore = writable<ShelfData[]>([]);
    this.chargingStationsStore = writable<ChargingStation[]>([]);
    this.conveyorBeltsStore = writable<ConveyorBelt[]>([]);
    this.boxesStore = writable<Box[]>([]);
    this.pendingTasksStore = writable<RobotAssignment[]>([]);
    this.stateStore = writable<SimulationState>({
      isRunning: false,
      speed: 1,
      time: 0,
      statistics: {
        totalBoxes: 0,
        boxesStored: 0,
        boxesFetched: 0,
        activeRobots: 0,
        chargingRobots: 0,
        pendingTasks: 0,
      },
    });

    this.initializeRobots();
    this.updateStores();
  }

  private initializeRobots(): void {
    const robotStatuses = this.wms.getRobots();
    for (const status of robotStatuses) {
      const robot = new Robot(status.id, status.position);
      robot.batteryLevel = status.batteryLevel;
      this.robots.set(status.id, robot);
    }
  }

  // Simulation Control
  start(): void {
    const state = get(this.stateStore);
    if (!state.isRunning) {
      this.stateStore.update((s) => ({ ...s, isRunning: true }));
      this.lastUpdateTime = performance.now();
      this.animate();
    }
  }

  pause(): void {
    const state = get(this.stateStore);
    if (state.isRunning) {
      this.stateStore.update((s) => ({ ...s, isRunning: false }));
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  toggle(): void {
    const state = get(this.stateStore);
    if (state.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  setSpeed(speed: number): void {
    this.stateStore.update((s) => ({ ...s, speed }));
  }

  reset(): void {
    this.pause();
    this.wms = new WarehouseManagementSystem();
    this.robots.clear();
    this.initializeRobots();
    this.stateStore.update((s) => ({
      ...s,
      time: 0,
      statistics: {
        totalBoxes: 0,
        boxesStored: 0,
        boxesFetched: 0,
        activeRobots: 0,
        chargingRobots: 0,
        pendingTasks: 0,
      },
    }));
    this.updateStores();
  }

  // Animation Loop
  private animate = (): void => {
    const state = get(this.stateStore);
    if (!state.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) * state.speed;
    this.lastUpdateTime = currentTime;

    this.update(deltaTime);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private update(deltaTime: number): void {
    // Get all robot positions for obstacle detection
    const allPositions = Array.from(this.robots.values()).map((r) => r.position);

    // Update each robot
    for (const [robotId, robot] of this.robots) {
      const otherPositions = allPositions.filter(
        (pos) => pos !== robot.position
      );

      // Check if robot needs charging
      if (robot.needsCharging() && robot.status !== 'charging') {
        this.wms.sendRobotToCharge(robotId);
        const robotStatus = this.wms.getRobots().find((r) => r.id === robotId);
        if (robotStatus?.route) {
          robot.setRoute(robotStatus.route);
        }
      }

      // Update robot
      robot.update(deltaTime / 16, otherPositions); // Normalize to ~60fps

      // Update robot position in WMS
      this.wms.updateRobotPosition(robotId, robot.position);
      this.wms.updateRobotStatus(robotId, robot.status);

      // Handle robot assignments
      this.processRobotAssignment(robot);

      // Update route if completed
      robot.updateRoute();
    }

    // Update simulation time
    this.stateStore.update((s) => ({
      ...s,
      time: s.time + deltaTime / 1000,
    }));

    // Update stores
    this.updateStores();
    this.updateStatistics();
  }

  private getShelfPosition(location: ShelfLocation | 'conveyor'): Position {
    if (location === 'conveyor') {
      const conveyor = this.wms.getConveyorBelts()[0];
      return {
        x: conveyor.position.x + CONVEYOR_WIDTH / 2,
        y: conveyor.position.y + CONVEYOR_HEIGHT / 2,
      };
    }

    const shelf = this.wms.getShelves().find((s) => s.id === location.shelf);
    if (!shelf) {
      throw new Error('Invalid shelf');
    }

    // Return position in front of shelf
    return {
      x: shelf.position.x + 20,
      y: shelf.position.y - 40,
    };
  }

  private processRobotAssignment(robot: Robot): void {
    const robotStatus = this.wms.getRobots().find((r) => r.id === robot.id);
    if (!robotStatus?.assignment || robot.status !== 'idle') return;

    const assignment = robotStatus.assignment;

    if (assignment.type === 'store') {
      // Robot should pick from conveyor and store on shelf
      if (!robot.hasBox) {
        // Pick from conveyor
        const box = this.wms.getBoxes().find(
          (b) => b.rfid === assignment.boxRfid && b.location === 'conveyor'
        );
        if (box) {
          robot.pickBox(box);
          box.location = 'robot';
          box.robotId = robot.id;

          // Remove box from conveyor
          const conveyors = this.wms.getConveyorBelts();
          for (const conveyor of conveyors) {
            const boxIndex = conveyor.boxes.findIndex((b) => b.rfid === box.rfid);
            if (boxIndex !== -1) {
              conveyor.boxes.splice(boxIndex, 1);
              break;
            }
          }

          // Set route to target shelf
          const robotStatus = this.wms.getRobots().find((r) => r.id === robot.id);
          if (robotStatus && assignment.targetLocation !== 'conveyor') {
            const targetPos = this.getShelfPosition(assignment.targetLocation);
            robot.setRoute([targetPos]);
          }
        }
      } else if (robot.currentBox && assignment.targetLocation !== 'conveyor') {
        // Place on shelf
        const placedBox = robot.placeBox();
        if (placedBox) {
          this.wms.storeBoxOnShelf(placedBox, assignment.targetLocation);
          this.wms.completeRobotAssignment(robot.id);
          this.stateStore.update((s) => ({
            ...s,
            statistics: {
              ...s.statistics,
              boxesStored: s.statistics.boxesStored + 1,
            },
          }));
        }
      }
    } else if (assignment.type === 'fetch') {
      // Robot should fetch from shelf and place on conveyor
      if (!robot.hasBox && assignment.sourceLocation !== 'conveyor') {
        // Pick from shelf
        const box = this.wms.removeBoxFromShelf(assignment.sourceLocation);
        if (box) {
          robot.pickBox(box);
          box.robotId = robot.id;

          // Set route to conveyor
          const targetPos = this.getShelfPosition('conveyor');
          robot.setRoute([targetPos]);
        }
      } else if (robot.hasBox) {
        // Place on conveyor
        const placedBox = robot.placeBox();
        if (placedBox) {
          placedBox.location = 'conveyor';
          const conveyor = this.wms.getConveyorBelts()[0];
          conveyor.boxes.push(placedBox);
          this.wms.completeRobotAssignment(robot.id);
          this.stateStore.update((s) => ({
            ...s,
            statistics: {
              ...s.statistics,
              boxesFetched: s.statistics.boxesFetched + 1,
            },
          }));
        }
      }
    }
  }

  private updateStores(): void {
    this.robotsStore.set(this.wms.getRobots());
    this.shelvesStore.set(this.wms.getShelves());
    this.chargingStationsStore.set(this.wms.getChargingStations());
    this.conveyorBeltsStore.set(this.wms.getConveyorBelts());
    this.boxesStore.set(this.wms.getBoxes());
    this.pendingTasksStore.set(this.wms.getPendingTasks());
  }

  private updateStatistics(): void {
    const robots = Array.from(this.robots.values());
    const activeRobots = robots.filter(
      (r) => r.status === 'moving' || r.status === 'picking' || r.status === 'placing'
    ).length;
    const chargingRobots = robots.filter((r) => r.status === 'charging').length;
    const pendingTasks = this.wms.getPendingTasks().length;
    const totalBoxes = this.wms.getBoxes().length;

    this.stateStore.update((s) => ({
      ...s,
      statistics: {
        ...s.statistics,
        totalBoxes,
        activeRobots,
        chargingRobots,
        pendingTasks,
      },
    }));
  }

  // Box Operations
  addBox(): void {
    try {
      const conveyor = this.wms.getConveyorBelts()[0];
      const box = this.wms.addBoxToConveyor(conveyor.id);
      this.stateStore.update((s) => ({
        ...s,
        statistics: {
          ...s.statistics,
          totalBoxes: s.statistics.totalBoxes + 1,
        },
      }));
      this.updateStores();
    } catch (error) {
      console.error('Failed to add box:', error);
    }
  }

  // Cleanup
  destroy(): void {
    this.pause();
  }
}

// Create singleton instance
export const simulation = new SimulationEngine();
