// Robot Class with Movement, Battery Management, and Obstacle Detection

import type { Position, RobotStatus, Box, ObstacleDetection } from './types';
import {
  ROBOT_SPEED,
  BATTERY_CONSUMPTION_MOVE,
  BATTERY_CONSUMPTION_ARM,
  LOW_BATTERY_THRESHOLD,
  CRITICAL_BATTERY_THRESHOLD,
} from './types';

export class Robot {
  id: string;
  position: Position;
  angle: number;
  batteryLevel: number;
  hasBox: boolean;
  currentBox?: Box;
  status: RobotStatus['status'];
  targetPosition?: Position;
  route?: Position[];

  constructor(id: string, initialPosition: Position) {
    this.id = id;
    this.position = { ...initialPosition };
    this.angle = 0;
    this.batteryLevel = 100;
    this.hasBox = false;
    this.status = 'idle';
  }

  // Movement
  moveTo(target: Position): void {
    if (this.needsCharging() && this.status !== 'charging') {
      this.status = 'idle';
      return;
    }

    this.targetPosition = target;
    this.status = 'moving';
  }

  update(deltaTime: number, obstacles: Position[]): void {
    if (this.status === 'moving' && this.targetPosition) {
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < ROBOT_SPEED) {
        // Reached target
        this.position = { ...this.targetPosition };
        this.status = 'idle';
        this.targetPosition = undefined;
      } else {
        // Check for obstacles
        const obstacleDetection = this.detectObstacles(obstacles);
        if (obstacleDetection.detected && obstacleDetection.distance < 30) {
          // Stop if obstacle is too close
          return;
        }

        // Move towards target
        const moveX = (dx / distance) * ROBOT_SPEED;
        const moveY = (dy / distance) * ROBOT_SPEED;

        this.position.x += moveX;
        this.position.y += moveY;

        // Update angle based on direction
        this.angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Consume battery
        const distanceMoved = Math.sqrt(moveX * moveX + moveY * moveY);
        this.batteryLevel -= distanceMoved * BATTERY_CONSUMPTION_MOVE;
        this.batteryLevel = Math.max(0, this.batteryLevel);
      }
    } else if (this.status === 'charging') {
      // Charge battery
      this.batteryLevel += 0.5;
      if (this.batteryLevel >= 100) {
        this.batteryLevel = 100;
        this.status = 'idle';
      }
    }
  }

  // Obstacle Detection
  detectObstacles(obstacles: Position[]): ObstacleDetection {
    let minDistance = Infinity;
    let detected = false;

    for (const obstacle of obstacles) {
      const dx = obstacle.x - this.position.x;
      const dy = obstacle.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 50) {
        // Detection range
        detected = true;
        minDistance = Math.min(minDistance, distance);
      }
    }

    return {
      detected,
      distance: minDistance,
      isMoving: this.status === 'moving',
    };
  }

  // Box Operations
  pickBox(box: Box): boolean {
    if (this.hasBox || this.batteryLevel < BATTERY_CONSUMPTION_ARM) {
      return false;
    }

    this.status = 'picking';
    this.hasBox = true;
    this.currentBox = box;
    this.batteryLevel -= BATTERY_CONSUMPTION_ARM;
    this.batteryLevel = Math.max(0, this.batteryLevel);

    // Simulate pick operation time
    setTimeout(() => {
      if (this.status === 'picking') {
        this.status = 'idle';
      }
    }, 1000);

    return true;
  }

  placeBox(): Box | null {
    if (!this.hasBox || !this.currentBox || this.batteryLevel < BATTERY_CONSUMPTION_ARM) {
      return null;
    }

    this.status = 'placing';
    const box = this.currentBox;
    this.hasBox = false;
    this.currentBox = undefined;
    this.batteryLevel -= BATTERY_CONSUMPTION_ARM;
    this.batteryLevel = Math.max(0, this.batteryLevel);

    // Simulate place operation time
    setTimeout(() => {
      if (this.status === 'placing') {
        this.status = 'idle';
      }
    }, 1000);

    return box;
  }

  // Battery Management
  needsCharging(): boolean {
    return this.batteryLevel < LOW_BATTERY_THRESHOLD;
  }

  isCriticalBattery(): boolean {
    return this.batteryLevel < CRITICAL_BATTERY_THRESHOLD;
  }

  charge(amount: number = 0.5): void {
    this.batteryLevel += amount;
    this.batteryLevel = Math.min(100, this.batteryLevel);
  }

  // Status
  isAvailable(): boolean {
    return (
      this.status === 'idle' &&
      !this.hasBox &&
      this.batteryLevel > LOW_BATTERY_THRESHOLD
    );
  }

  getStatus(): RobotStatus {
    return {
      id: this.id,
      position: { ...this.position },
      angle: this.angle,
      batteryLevel: this.batteryLevel,
      hasBox: this.hasBox,
      currentBox: this.currentBox,
      status: this.status,
      route: this.route,
    };
  }

  setRoute(route: Position[]): void {
    this.route = route;
    if (route && route.length > 0) {
      this.targetPosition = route[0];
      this.status = 'moving';
    }
  }

  updateRoute(): void {
    if (this.route && this.route.length > 0 && this.status === 'idle') {
      this.route.shift();
      if (this.route.length > 0) {
        this.targetPosition = this.route[0];
        this.status = 'moving';
      }
    }
  }
}
