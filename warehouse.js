// ============================================================================
// SMART WAREHOUSE SIMULATION
// Based on DD2528 Smart Warehouse Systems General Description
// ============================================================================

// Constants
const WAREHOUSE = {
    WIDTH: 1200,
    HEIGHT: 800,
    NUM_SHELVES: 20,
    SHELF_LEVELS: 3,
    SHELF_POSITIONS: 5,
    NUM_ROBOTS: 10,
    NUM_CHARGING_STATIONS: 4
};

const ROBOT_STATE = {
    IDLE: 'idle',
    MOVING_TO_COLLECTION: 'moving_to_collection',
    PICKING_FROM_CONVEYOR: 'picking_from_conveyor',
    MOVING_TO_SHELF: 'moving_to_shelf',
    PLACING_ON_SHELF: 'placing_on_shelf',
    MOVING_TO_FETCH: 'moving_to_fetch',
    PICKING_FROM_SHELF: 'picking_from_shelf',
    MOVING_TO_DELIVERY: 'moving_to_delivery',
    PLACING_ON_CONVEYOR: 'placing_on_conveyor',
    MOVING_TO_CHARGING: 'moving_to_charging',
    CHARGING: 'charging'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRFID() {
    return 'RFID-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString();
}

// ============================================================================
// BOX CLASS
// ============================================================================

class Box {
    constructor(rfid) {
        this.rfid = rfid;
        this.location = null; // {shelf, level, position} or 'conveyor' or 'robot'
        this.assignedRobot = null;
    }
}

// ============================================================================
// ROBOT CLASS
// ============================================================================

class Robot {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.angle = 0;
        this.speed = 150;
        this.state = ROBOT_STATE.IDLE;
        this.battery = 100;
        this.maxBattery = 100;
        this.carryingBox = null;
        this.currentTask = null;
        this.path = [];
        this.pathIndex = 0;
        this.armExtended = false;
        this.stuckCounter = 0;
        this.lastX = x;
        this.lastY = y;
        this.radarRange = 60; // Detection range for obstacles
        this.safeDistance = 40; // Minimum safe distance from obstacles
        this.diagnosticMessages = [];
    }

    updateBattery(delta) {
        this.battery = Math.max(0, Math.min(this.maxBattery, this.battery + delta));
    }

    consumeBatteryForMovement(distance) {
        // Battery consumption based on distance
        const consumption = distance * 0.01;
        this.updateBattery(-consumption);
    }

    consumeBatteryForArmOperation() {
        // Fixed amount for arm operations as per PDF
        this.updateBattery(-0.5);
    }

    needsCharging() {
        return this.battery < 20;
    }

    isCriticallyLow() {
        return this.battery < 5;
    }

    moveTo(targetX, targetY) {
        this.targetX = targetX;
        this.targetY = targetY;
    }

    update(deltaTime, allRobots = []) {
        // Update position towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
            // Check radar for safety (PDF requirement)
            const safeToMove = allRobots.length > 0 ? this.isSafeToMove(allRobots) : true;

            if (!safeToMove) {
                // Stop or slow down due to obstacle
                this.stuckCounter++;
                if (this.stuckCounter > 50) {
                    this.sendDiagnostic(`Robot ${this.id} blocked by obstacle for extended time`, 'warning');
                }
                return false; // Cannot move, obstacle detected
            }

            const moveDistance = Math.min(this.speed * deltaTime, dist);
            this.x += (dx / dist) * moveDistance;
            this.y += (dy / dist) * moveDistance;

            // Update angle
            this.angle = Math.atan2(dy, dx);

            // Consume battery
            this.consumeBatteryForMovement(moveDistance);

            // Check if stuck
            if (Math.abs(this.x - this.lastX) < 0.1 && Math.abs(this.y - this.lastY) < 0.1) {
                this.stuckCounter++;
            } else {
                this.stuckCounter = 0;
            }

            this.lastX = this.x;
            this.lastY = this.y;

            return false; // Not reached target
        }

        this.stuckCounter = 0;
        return true; // Reached target
    }

    followPath() {
        if (this.path.length === 0 || this.pathIndex >= this.path.length) {
            return true; // Path completed
        }

        const waypoint = this.path[this.pathIndex];
        this.moveTo(waypoint.x, waypoint.y);

        const dist = distance(this.x, this.y, waypoint.x, waypoint.y);
        if (dist < 5) {
            this.pathIndex++;
        }

        return this.pathIndex >= this.path.length;
    }

    isAtTarget() {
        return distance(this.x, this.y, this.targetX, this.targetY) < 5;
    }

    // Radar: Detect obstacles (other robots) within range
    detectObstacles(allRobots) {
        const obstacles = [];
        for (let robot of allRobots) {
            if (robot.id === this.id) continue; // Don't detect self

            const dist = distance(this.x, this.y, robot.x, robot.y);
            if (dist < this.radarRange) {
                // Determine if moving or static
                const robotSpeed = Math.sqrt(
                    Math.pow(robot.x - robot.lastX, 2) +
                    Math.pow(robot.y - robot.lastY, 2)
                );
                const isMoving = robotSpeed > 0.5;

                obstacles.push({
                    robot: robot,
                    distance: dist,
                    isMoving: isMoving,
                    isStatic: !isMoving
                });
            }
        }
        return obstacles;
    }

    // Check if safe to move forward
    isSafeToMove(allRobots) {
        const obstacles = this.detectObstacles(allRobots);

        // Check if any obstacle is too close in our direction
        for (let obs of obstacles) {
            if (obs.distance < this.safeDistance) {
                // Check if obstacle is in our path direction
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const dxObs = obs.robot.x - this.x;
                const dyObs = obs.robot.y - this.y;

                // Dot product to check if in same direction
                const dot = (dx * dxObs + dy * dyObs) /
                           (Math.sqrt(dx*dx + dy*dy) * Math.sqrt(dxObs*dxObs + dyObs*dyObs));

                if (dot > 0.5) { // Obstacle is ahead
                    return false;
                }
            }
        }
        return true;
    }

    // Send diagnostic message to WMS
    sendDiagnostic(message, severity = 'info') {
        this.diagnosticMessages.push({
            time: Date.now(),
            severity: severity,
            message: message
        });
    }

    // Weight sensor: Check if box is on robot storage
    hasBoxOnStorage() {
        return this.carryingBox !== null;
    }

    reset() {
        this.state = ROBOT_STATE.IDLE;
        this.currentTask = null;
        this.path = [];
        this.pathIndex = 0;
        this.carryingBox = null;
        this.armExtended = false;
        this.stuckCounter = 0;
    }
}

// ============================================================================
// WAREHOUSE MANAGEMENT SYSTEM (WMS)
// ============================================================================

class WMS {
    constructor() {
        this.shelves = this.initializeShelves();
        this.boxes = new Map(); // RFID -> Box
        this.robots = [];
        this.chargingStations = [];
        this.collectionPoints = [];
        this.conveyorBelts = []; // Will be initialized with running state
        this.taskQueue = [];
        this.activityLog = [];
        this.conveyorBoxes = [];
        this.conveyorBeltStates = {}; // Track state of each belt (running/stopped)
        this.diagnostics = []; // Collect diagnostic messages from robots
    }

    initializeShelves() {
        const shelves = [];
        const startX = 200;
        const startY = 150;
        const shelfWidth = 80;
        const shelfHeight = 100;
        const spacing = 20;

        // Create 2 rows of 10 shelves each
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 10; col++) {
                const shelfId = row * 10 + col + 1;
                const x = startX + col * (shelfWidth + spacing);
                const y = startY + row * (shelfHeight + spacing + 200);

                const shelf = {
                    id: shelfId,
                    x: x,
                    y: y,
                    width: shelfWidth,
                    height: shelfHeight,
                    levels: [],
                    row: row,
                    col: col
                };

                // Initialize levels and positions
                for (let level = 0; level < WAREHOUSE.SHELF_LEVELS; level++) {
                    shelf.levels[level] = {
                        positions: Array(WAREHOUSE.SHELF_POSITIONS).fill(null)
                    };
                }

                shelves.push(shelf);
            }
        }

        return shelves;
    }

    findEmptyShelfLocation() {
        for (let shelf of this.shelves) {
            for (let level = 0; level < WAREHOUSE.SHELF_LEVELS; level++) {
                for (let pos = 0; pos < WAREHOUSE.SHELF_POSITIONS; pos++) {
                    if (shelf.levels[level].positions[pos] === null) {
                        return {
                            shelf: shelf.id,
                            level: level,
                            position: pos,
                            shelfObj: shelf
                        };
                    }
                }
            }
        }
        return null;
    }

    getShelfCoordinates(shelfId, level, position) {
        const shelf = this.shelves.find(s => s.id === shelfId);
        if (!shelf) return null;

        // Calculate position within shelf
        const levelHeight = shelf.height / WAREHOUSE.SHELF_LEVELS;
        const posWidth = shelf.width / WAREHOUSE.SHELF_POSITIONS;

        return {
            x: shelf.x + posWidth * position + posWidth / 2,
            y: shelf.y + levelHeight * level + levelHeight / 2,
            shelfX: shelf.x,
            shelfY: shelf.y
        };
    }

    placeBoxInLocation(box, location) {
        const shelf = this.shelves.find(s => s.id === location.shelf);
        if (shelf && shelf.levels[location.level]) {
            shelf.levels[location.level].positions[location.position] = box.rfid;
            box.location = location;
            return true;
        }
        return false;
    }

    removeBoxFromLocation(location) {
        const shelf = this.shelves.find(s => s.id === location.shelf);
        if (shelf && shelf.levels[location.level]) {
            const rfid = shelf.levels[location.level].positions[location.position];
            shelf.levels[location.level].positions[location.position] = null;
            return rfid;
        }
        return null;
    }

    assignTaskToRobot(task) {
        // Find idle robots
        let idleRobots = this.robots.filter(r => r.state === ROBOT_STATE.IDLE);

        if (idleRobots.length === 0) {
            // No idle robots, queue the task
            this.taskQueue.push(task);
            return null;
        }

        // Choose closest robot to the task location
        let bestRobot = null;
        let minDist = Infinity;

        for (let robot of idleRobots) {
            const dist = distance(robot.x, robot.y, task.targetX, task.targetY);
            if (dist < minDist) {
                minDist = dist;
                bestRobot = robot;
            }
        }

        if (bestRobot) {
            // Check battery status (as per PDF workflow step 4)
            if (bestRobot.needsCharging()) {
                this.log('warning', `Robot ${bestRobot.id} has low battery, sending to charging`);
                this.sendRobotToCharging(bestRobot);

                // Choose another robot (retry with filtered list)
                idleRobots = idleRobots.filter(r => r.id !== bestRobot.id && !r.needsCharging());
                if (idleRobots.length === 0) {
                    this.taskQueue.push(task);
                    return null;
                }

                // Find next closest robot with sufficient battery
                bestRobot = null;
                minDist = Infinity;
                for (let robot of idleRobots) {
                    const dist = distance(robot.x, robot.y, task.targetX, task.targetY);
                    if (dist < minDist) {
                        minDist = dist;
                        bestRobot = robot;
                    }
                }
            }

            if (bestRobot) {
                bestRobot.currentTask = task;
                this.computeRoute(bestRobot, task);
                return bestRobot;
            }
        }

        this.taskQueue.push(task);
        return null;
    }

    // Send robot to charging station (called by WMS as per PDF)
    sendRobotToCharging(robot) {
        // Find nearest charging station
        let nearest = null;
        let minDist = Infinity;

        for (let station of this.chargingStations) {
            const dist = distance(robot.x, robot.y, station.x, station.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = station;
            }
        }

        if (nearest) {
            robot.moveTo(nearest.x, nearest.y);
            robot.state = ROBOT_STATE.MOVING_TO_CHARGING;
            this.log('warning', `WMS commanding Robot ${robot.id} to charging station`);
        }
    }

    computeRoute(robot, task) {
        // Simple pathfinding - create waypoints
        const path = [];

        if (task.type === 'store') {
            // Route: Current -> Collection Point -> Shelf
            const collectionPoint = this.collectionPoints[0];

            // Add waypoint to collection point
            path.push({ x: collectionPoint.x + 80, y: collectionPoint.y });

            // Add waypoint to shelf
            const coords = this.getShelfCoordinates(
                task.location.shelf,
                task.location.level,
                task.location.position
            );

            if (coords) {
                // Add intermediate waypoint for safe navigation
                const shelfY = coords.shelfY;
                path.push({ x: coords.x, y: shelfY + 150 });
                path.push({ x: coords.x, y: coords.y });
            }
        } else if (task.type === 'fetch') {
            // Route: Current -> Shelf -> Collection Point
            const coords = this.getShelfCoordinates(
                task.location.shelf,
                task.location.level,
                task.location.position
            );

            if (coords) {
                // Waypoint to shelf
                path.push({ x: coords.x, y: coords.shelfY + 150 });
                path.push({ x: coords.x, y: coords.y });

                // Waypoint back to collection point
                const collectionPoint = this.collectionPoints[1];
                path.push({ x: coords.x, y: coords.shelfY + 150 });
                path.push({ x: collectionPoint.x + 80, y: collectionPoint.y });
            }
        }

        robot.path = path;
        robot.pathIndex = 0;
    }

    processTaskQueue() {
        // Assign queued tasks to available robots
        while (this.taskQueue.length > 0) {
            const task = this.taskQueue[0];
            const robot = this.assignTaskToRobot(task);

            if (robot) {
                this.taskQueue.shift();
            } else {
                break; // No available robots
            }
        }
    }

    addBox(targetLocation = null) {
        const rfid = generateRFID();
        const box = new Box(rfid);

        // Box appears on conveyor belt
        box.location = 'conveyor';
        this.boxes.set(rfid, box);

        // Assign storage location
        const location = targetLocation || this.findEmptyShelfLocation();

        if (!location) {
            this.log('warning', `No empty shelf space for box ${rfid}`);
            return null;
        }

        // Create task for robot to transport box
        const task = {
            type: 'store',
            box: box,
            location: location,
            targetX: location.shelfObj.x,
            targetY: location.shelfObj.y
        };

        this.conveyorBoxes.push({
            box: box,
            x: this.collectionPoints[0].x + 50,
            y: this.collectionPoints[0].y,
            targetLocation: location
        });

        this.assignTaskToRobot(task);
        this.log('success', `Box ${rfid.substr(0, 15)}... added to warehouse`);

        return box;
    }

    fetchRandomBox() {
        // Find a box stored in shelves
        const storedBoxes = Array.from(this.boxes.values()).filter(
            box => box.location && typeof box.location === 'object'
        );

        if (storedBoxes.length === 0) {
            this.log('warning', 'No boxes available to fetch');
            return null;
        }

        const box = storedBoxes[Math.floor(Math.random() * storedBoxes.length)];

        // Create fetch task
        const task = {
            type: 'fetch',
            box: box,
            location: box.location,
            targetX: this.collectionPoints[1].x,
            targetY: this.collectionPoints[1].y
        };

        this.assignTaskToRobot(task);
        this.log('success', `Fetch request for box ${box.rfid.substr(0, 15)}...`);

        return box;
    }

    log(type, message) {
        this.activityLog.unshift({
            type: type,
            message: message,
            time: formatTime()
        });

        // Keep log limited
        if (this.activityLog.length > 50) {
            this.activityLog.pop();
        }
    }

    getTotalBoxesStored() {
        return Array.from(this.boxes.values()).filter(
            box => box.location && typeof box.location === 'object'
        ).length;
    }

    getActiveRobotsCount() {
        return this.robots.filter(r => r.state !== ROBOT_STATE.IDLE).length;
    }
}

// ============================================================================
// ROBOT BEHAVIOR SYSTEM
// ============================================================================

class RobotController {
    constructor(wms) {
        this.wms = wms;
    }

    update(robot, deltaTime) {
        // Process diagnostic messages from robot (PDF requirement)
        if (robot.diagnosticMessages.length > 0) {
            for (let diag of robot.diagnosticMessages) {
                this.wms.diagnostics.push({
                    robotId: robot.id,
                    ...diag
                });
            }
            robot.diagnosticMessages = [];
        }

        // Handle stuck robots (PDF requirement)
        if (robot.stuckCounter > 100 && robot.state !== ROBOT_STATE.IDLE && robot.state !== ROBOT_STATE.CHARGING) {
            this.wms.log('error', `Robot ${robot.id} stuck for extended time, resetting task`);
            robot.sendDiagnostic(`Robot stuck, aborting current task`, 'error');

            // Re-queue task if exists
            if (robot.currentTask) {
                this.wms.taskQueue.unshift(robot.currentTask);
            }

            robot.reset();
            robot.stuckCounter = 0;
            return;
        }

        // Check for critical battery
        if (robot.isCriticallyLow() && robot.state !== ROBOT_STATE.CHARGING) {
            this.wms.log('error', `Robot ${robot.id} critically low battery - stopping`);
            robot.sendDiagnostic(`Critical battery level, ceasing operation`, 'critical');
            robot.reset();
            return;
        }

        // Check if needs charging
        if (robot.needsCharging() &&
            robot.state !== ROBOT_STATE.CHARGING &&
            robot.state !== ROBOT_STATE.MOVING_TO_CHARGING &&
            robot.state === ROBOT_STATE.IDLE) {

            this.sendToCharging(robot);
            return;
        }

        // State machine
        switch (robot.state) {
            case ROBOT_STATE.IDLE:
                this.handleIdle(robot);
                break;

            case ROBOT_STATE.MOVING_TO_COLLECTION:
                this.handleMovingToCollection(robot, deltaTime);
                break;

            case ROBOT_STATE.PICKING_FROM_CONVEYOR:
                this.handlePickingFromConveyor(robot);
                break;

            case ROBOT_STATE.MOVING_TO_SHELF:
                this.handleMovingToShelf(robot, deltaTime);
                break;

            case ROBOT_STATE.PLACING_ON_SHELF:
                this.handlePlacingOnShelf(robot);
                break;

            case ROBOT_STATE.MOVING_TO_FETCH:
                this.handleMovingToFetch(robot, deltaTime);
                break;

            case ROBOT_STATE.PICKING_FROM_SHELF:
                this.handlePickingFromShelf(robot);
                break;

            case ROBOT_STATE.MOVING_TO_DELIVERY:
                this.handleMovingToDelivery(robot, deltaTime);
                break;

            case ROBOT_STATE.PLACING_ON_CONVEYOR:
                this.handlePlacingOnConveyor(robot);
                break;

            case ROBOT_STATE.MOVING_TO_CHARGING:
                this.handleMovingToCharging(robot, deltaTime);
                break;

            case ROBOT_STATE.CHARGING:
                this.handleCharging(robot);
                break;
        }
    }

    handleIdle(robot) {
        // Process task queue
        this.wms.processTaskQueue();

        // Check if robot has a task
        if (robot.currentTask) {
            if (robot.currentTask.type === 'store') {
                robot.state = ROBOT_STATE.MOVING_TO_COLLECTION;
                this.wms.log('success', `Robot ${robot.id} assigned to store box`);
            } else if (robot.currentTask.type === 'fetch') {
                robot.state = ROBOT_STATE.MOVING_TO_FETCH;
                this.wms.log('success', `Robot ${robot.id} assigned to fetch box`);
            }
        }
    }

    handleMovingToCollection(robot, deltaTime) {
        robot.update(deltaTime, this.wms.robots);

        if (robot.followPath()) {
            // Stop conveyor belt for pickup (PDF requirement)
            const beltId = 0; // Collection point 0
            this.wms.conveyorBeltStates[beltId] = 'stopped';
            this.wms.log('info', `Conveyor belt ${beltId} stopped for Robot ${robot.id}`);

            robot.state = ROBOT_STATE.PICKING_FROM_CONVEYOR;
        }
    }

    handlePickingFromConveyor(robot) {
        // Safety check: verify box is present (PDF requirement)
        const conveyorBoxIndex = this.wms.conveyorBoxes.findIndex(
            cb => cb.box === robot.currentTask.box
        );

        if (conveyorBoxIndex < 0) {
            robot.sendDiagnostic(`Box not found on conveyor for task`, 'error');
            this.wms.log('error', `Robot ${robot.id} cannot find box on conveyor`);
            robot.reset();
            return;
        }

        // Safety check passed, perform arm operation
        robot.armExtended = true;
        robot.consumeBatteryForArmOperation();

        const conveyorBox = this.wms.conveyorBoxes[conveyorBoxIndex];

        // Verify RFID (PDF requirement - arm has RFID reader)
        if (conveyorBox.box.rfid !== robot.currentTask.box.rfid) {
            robot.sendDiagnostic(`RFID mismatch on conveyor`, 'error');
            this.wms.log('error', `Robot ${robot.id} RFID mismatch`);
            robot.armExtended = false;
            robot.reset();
            return;
        }

        robot.carryingBox = conveyorBox.box;
        robot.carryingBox.assignedRobot = robot.id;
        this.wms.conveyorBoxes.splice(conveyorBoxIndex, 1);

        robot.armExtended = false;
        robot.state = ROBOT_STATE.MOVING_TO_SHELF;

        // Resume conveyor belt (PDF requirement)
        const beltId = 0;
        this.wms.conveyorBeltStates[beltId] = 'running';
        this.wms.log('success', `Robot ${robot.id} picked up box, conveyor belt ${beltId} resumed`);
    }

    handleMovingToShelf(robot, deltaTime) {
        robot.update(deltaTime, this.wms.robots);

        if (robot.followPath()) {
            robot.state = ROBOT_STATE.PLACING_ON_SHELF;
        }
    }

    handlePlacingOnShelf(robot) {
        // Safety checks before placing (PDF requirement)
        const task = robot.currentTask;

        // Check if robot has box in storage (weight sensor)
        if (!robot.hasBoxOnStorage()) {
            robot.sendDiagnostic(`No box on storage to place`, 'error');
            this.wms.log('error', `Robot ${robot.id} has no box to place`);
            robot.reset();
            return;
        }

        // Check if shelf location is valid and empty
        const shelf = this.wms.shelves.find(s => s.id === task.location.shelf);
        if (!shelf || !shelf.levels[task.location.level]) {
            robot.sendDiagnostic(`Invalid shelf location`, 'error');
            this.wms.log('error', `Robot ${robot.id} invalid shelf location`);
            robot.reset();
            return;
        }

        const currentBox = shelf.levels[task.location.level].positions[task.location.position];
        if (currentBox !== null) {
            robot.sendDiagnostic(`Shelf position already occupied`, 'error');
            this.wms.log('error', `Robot ${robot.id} shelf position occupied`);
            robot.reset();
            return;
        }

        // Safety checks passed, perform operation
        robot.armExtended = true;
        robot.consumeBatteryForArmOperation();

        if (this.wms.placeBoxInLocation(robot.carryingBox, task.location)) {
            this.wms.log('success',
                `Robot ${robot.id} placed box at (${task.location.shelf},${task.location.level},${task.location.position})`
            );
        }

        robot.carryingBox = null;
        robot.armExtended = false;
        robot.reset();
    }

    handleMovingToFetch(robot, deltaTime) {
        robot.update(deltaTime, this.wms.robots);

        if (robot.followPath()) {
            robot.state = ROBOT_STATE.PICKING_FROM_SHELF;
        }
    }

    handlePickingFromShelf(robot) {
        const task = robot.currentTask;

        // Safety checks before picking (PDF requirement)
        const shelf = this.wms.shelves.find(s => s.id === task.location.shelf);
        if (!shelf || !shelf.levels[task.location.level]) {
            robot.sendDiagnostic(`Invalid shelf location`, 'error');
            this.wms.log('error', `Robot ${robot.id} invalid shelf location`);
            robot.reset();
            return;
        }

        // Check if box exists at location
        const rfidAtLocation = shelf.levels[task.location.level].positions[task.location.position];
        if (!rfidAtLocation) {
            robot.sendDiagnostic(`No box at shelf location`, 'error');
            this.wms.log('error', `Robot ${robot.id} no box at shelf location`);
            robot.reset();
            return;
        }

        // Verify RFID matches (PDF requirement - arm has RFID reader)
        if (rfidAtLocation !== task.box.rfid) {
            robot.sendDiagnostic(`RFID mismatch at shelf`, 'error');
            this.wms.log('error', `Robot ${robot.id} RFID mismatch at shelf`);
            robot.reset();
            return;
        }

        // Safety checks passed, perform operation
        robot.armExtended = true;
        robot.consumeBatteryForArmOperation();

        const rfid = this.wms.removeBoxFromLocation(task.location);

        if (rfid) {
            robot.carryingBox = this.wms.boxes.get(rfid);
            robot.carryingBox.location = 'robot';
            robot.state = ROBOT_STATE.MOVING_TO_DELIVERY;

            this.wms.log('success',
                `Robot ${robot.id} picked box from (${task.location.shelf},${task.location.level},${task.location.position})`
            );
        }

        robot.armExtended = false;
    }

    handleMovingToDelivery(robot, deltaTime) {
        robot.update(deltaTime, this.wms.robots);

        if (robot.followPath()) {
            robot.state = ROBOT_STATE.PLACING_ON_CONVEYOR;
        }
    }

    handlePlacingOnConveyor(robot) {
        // Safety check: verify robot has box
        if (!robot.hasBoxOnStorage()) {
            robot.sendDiagnostic(`No box to place on conveyor`, 'error');
            this.wms.log('error', `Robot ${robot.id} has no box to deliver`);
            robot.reset();
            return;
        }

        robot.armExtended = true;
        robot.consumeBatteryForArmOperation();

        // Remove box from system (shipped out)
        this.wms.boxes.delete(robot.carryingBox.rfid);
        this.wms.log('success', `Robot ${robot.id} delivered box to conveyor`);

        robot.carryingBox = null;
        robot.armExtended = false;
        robot.reset();
    }

    handleMovingToCharging(robot, deltaTime) {
        robot.update(deltaTime, this.wms.robots);

        if (robot.isAtTarget()) {
            robot.state = ROBOT_STATE.CHARGING;
            this.wms.log('success', `Robot ${robot.id} arrived at charging station`);
        }
    }

    handleCharging(robot) {
        robot.updateBattery(0.5); // Charge rate

        if (robot.battery >= 95) {
            robot.reset();
            this.wms.log('success', `Robot ${robot.id} fully charged`);
        }
    }

    sendToCharging(robot) {
        // Find nearest charging station
        let nearest = null;
        let minDist = Infinity;

        for (let station of this.wms.chargingStations) {
            const dist = distance(robot.x, robot.y, station.x, station.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = station;
            }
        }

        if (nearest) {
            robot.moveTo(nearest.x, nearest.y);
            robot.state = ROBOT_STATE.MOVING_TO_CHARGING;
            this.wms.log('warning', `Robot ${robot.id} heading to charging station`);

            // Abandon current task if any
            if (robot.currentTask) {
                this.wms.taskQueue.unshift(robot.currentTask);
                robot.currentTask = null;
            }

            if (robot.carryingBox) {
                // Return box to conveyor
                this.wms.conveyorBoxes.push({
                    box: robot.carryingBox,
                    x: this.wms.collectionPoints[0].x + 50,
                    y: this.wms.collectionPoints[0].y,
                    targetLocation: robot.currentTask ? robot.currentTask.location : null
                });
                robot.carryingBox = null;
            }
        }
    }
}

// ============================================================================
// RENDERER
// ============================================================================

class WarehouseRenderer {
    constructor(canvas, wms) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.wms = wms;
    }

    clear() {
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawShelves() {
        for (let shelf of this.wms.shelves) {
            // Draw shelf
            this.ctx.fillStyle = '#4a90e2';
            this.ctx.fillRect(shelf.x, shelf.y, shelf.width, shelf.height);

            // Draw shelf border
            this.ctx.strokeStyle = '#2c5aa0';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(shelf.x, shelf.y, shelf.width, shelf.height);

            // Draw levels
            const levelHeight = shelf.height / WAREHOUSE.SHELF_LEVELS;
            for (let i = 1; i < WAREHOUSE.SHELF_LEVELS; i++) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = '#2c5aa0';
                this.ctx.lineWidth = 1;
                this.ctx.moveTo(shelf.x, shelf.y + levelHeight * i);
                this.ctx.lineTo(shelf.x + shelf.width, shelf.y + levelHeight * i);
                this.ctx.stroke();
            }

            // Draw shelf ID
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(
                `S${shelf.id}`,
                shelf.x + shelf.width / 2,
                shelf.y + 5
            );

            // Draw boxes in shelf
            for (let level = 0; level < WAREHOUSE.SHELF_LEVELS; level++) {
                const posWidth = shelf.width / WAREHOUSE.SHELF_POSITIONS;
                for (let pos = 0; pos < WAREHOUSE.SHELF_POSITIONS; pos++) {
                    const rfid = shelf.levels[level].positions[pos];
                    if (rfid) {
                        const x = shelf.x + posWidth * pos + posWidth / 2;
                        const y = shelf.y + levelHeight * level + levelHeight / 2;

                        this.ctx.fillStyle = '#8b4513';
                        this.ctx.fillRect(x - 6, y - 6, 12, 12);
                        this.ctx.strokeStyle = '#654321';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(x - 6, y - 6, 12, 12);
                    }
                }
            }
        }
    }

    drawCollectionPoints() {
        for (let point of this.wms.collectionPoints) {
            // Draw collection point
            this.ctx.fillStyle = '#50c878';
            this.ctx.fillRect(point.x, point.y - 20, 150, 40);

            this.ctx.strokeStyle = '#3da85f';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(point.x, point.y - 20, 150, 40);

            // Draw conveyor belt
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(point.x - 100, point.y - 10, 100, 20);

            // Conveyor pattern
            this.ctx.strokeStyle = '#888888';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(point.x - 100 + i * 25, point.y - 10);
                this.ctx.lineTo(point.x - 75 + i * 25, point.y + 10);
                this.ctx.stroke();
            }

            // Draw robotic arm (red arrow)
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.moveTo(point.x - 30, point.y - 15);
            this.ctx.lineTo(point.x - 10, point.y);
            this.ctx.lineTo(point.x - 30, point.y + 15);
            this.ctx.closePath();
            this.ctx.fill();

            // Label
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Collection', point.x + 75, point.y - 5);
            this.ctx.fillText('Point', point.x + 75, point.y + 7);
        }
    }

    drawChargingStations() {
        for (let station of this.wms.chargingStations) {
            // Draw charging station
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(station.x, station.y, 20, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = '#daa520';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Lightning symbol
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⚡', station.x, station.y);
        }
    }

    drawConveyorBoxes() {
        for (let conveyorBox of this.wms.conveyorBoxes) {
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(conveyorBox.x - 8, conveyorBox.y - 8, 16, 16);

            this.ctx.strokeStyle = '#654321';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(conveyorBox.x - 8, conveyorBox.y - 8, 16, 16);
        }
    }

    drawRobots() {
        for (let robot of this.wms.robots) {
            this.ctx.save();
            this.ctx.translate(robot.x, robot.y);
            this.ctx.rotate(robot.angle);

            // Robot base
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillRect(-15, -12, 30, 24);

            // Robot outline
            this.ctx.strokeStyle = '#c92a2a';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-15, -12, 30, 24);

            // Wheels
            this.ctx.fillStyle = '#333333';
            this.ctx.fillRect(-15, -15, 8, 6);
            this.ctx.fillRect(-15, 9, 8, 6);
            this.ctx.fillRect(7, -15, 8, 6);
            this.ctx.fillRect(7, 9, 8, 6);

            // Direction indicator
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.moveTo(15, 0);
            this.ctx.lineTo(8, -5);
            this.ctx.lineTo(8, 5);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();

            // Draw arm if extended
            if (robot.armExtended) {
                this.ctx.strokeStyle = '#888888';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(robot.x, robot.y - 12);
                this.ctx.lineTo(robot.x, robot.y - 35);
                this.ctx.stroke();

                // Gripper
                this.ctx.fillStyle = '#666666';
                this.ctx.fillRect(robot.x - 5, robot.y - 40, 10, 5);
            }

            // Draw box if carrying
            if (robot.carryingBox) {
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(robot.x - 8, robot.y - 25, 16, 16);

                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(robot.x - 8, robot.y - 25, 16, 16);
            }

            // Robot ID
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`R${robot.id}`, robot.x, robot.y + 15);

            // Battery indicator
            const batteryWidth = 30;
            const batteryHeight = 4;
            const batteryX = robot.x - batteryWidth / 2;
            const batteryY = robot.y + 25;

            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillRect(batteryX, batteryY, batteryWidth, batteryHeight);

            let batteryColor = '#50c878';
            if (robot.battery < 20) batteryColor = '#ff6b6b';
            else if (robot.battery < 50) batteryColor = '#ffa500';

            this.ctx.fillStyle = batteryColor;
            this.ctx.fillRect(
                batteryX,
                batteryY,
                (batteryWidth * robot.battery) / 100,
                batteryHeight
            );
        }
    }

    drawPaths() {
        for (let robot of this.wms.robots) {
            if (robot.path.length > 0) {
                this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);

                this.ctx.beginPath();
                this.ctx.moveTo(robot.x, robot.y);

                for (let i = robot.pathIndex; i < robot.path.length; i++) {
                    const waypoint = robot.path[i];
                    this.ctx.lineTo(waypoint.x, waypoint.y);
                }

                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }

    render() {
        this.clear();
        this.drawGrid();
        this.drawShelves();
        this.drawCollectionPoints();
        this.drawChargingStations();
        this.drawConveyorBoxes();
        this.drawPaths();
        this.drawRobots();
    }
}

// ============================================================================
// SIMULATION
// ============================================================================

class WarehouseSimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.wms = new WMS();
        this.robotController = new RobotController(this.wms);
        this.renderer = new WarehouseRenderer(canvas, this.wms);

        this.running = true;
        this.speed = 1.0;
        this.lastTime = Date.now();

        this.initialize();
    }

    initialize() {
        // Initialize collection points
        this.wms.collectionPoints = [
            { x: 550, y: 80 },   // Top
            { x: 550, y: 720 }   // Bottom
        ];

        // Initialize charging stations (corners)
        this.wms.chargingStations = [
            { x: 100, y: 100 },
            { x: 1100, y: 100 },
            { x: 100, y: 700 },
            { x: 1100, y: 700 }
        ];

        // Initialize conveyor belt states (PDF requirement)
        this.wms.conveyorBeltStates[0] = 'running'; // Top belt
        this.wms.conveyorBeltStates[1] = 'running'; // Bottom belt

        // Initialize robots around charging stations (PDF requirement)
        for (let i = 0; i < WAREHOUSE.NUM_ROBOTS; i++) {
            const station = this.wms.chargingStations[i % this.wms.chargingStations.length];
            const offset = Math.floor(i / this.wms.chargingStations.length) * 40;
            const robot = new Robot(
                i + 1,
                station.x + offset,
                station.y + offset
            );
            // Robots start fully charged and distributed around charging stations (PDF)
            this.wms.robots.push(robot);
        }

        this.wms.log('success', 'Warehouse initialized with 10 robots, 20 shelves, fully charged robots');
    }

    update() {
        if (!this.running) return;

        const currentTime = Date.now();
        const deltaTime = ((currentTime - this.lastTime) / 1000) * this.speed;
        this.lastTime = currentTime;

        // Update all robots
        for (let robot of this.wms.robots) {
            this.robotController.update(robot, deltaTime);
        }

        // Process task queue
        this.wms.processTaskQueue();
    }

    render() {
        this.renderer.render();
    }

    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    start() {
        this.running = true;
        this.lastTime = Date.now();
    }

    pause() {
        this.running = false;
    }

    reset() {
        this.wms = new WMS();
        this.robotController = new RobotController(this.wms);
        this.renderer = new WarehouseRenderer(this.canvas, this.wms);
        this.initialize();
        this.wms.log('success', 'Simulation reset');
    }

    setSpeed(speed) {
        this.speed = speed;
    }
}

// ============================================================================
// UI CONTROLLER
// ============================================================================

class UIController {
    constructor(simulation) {
        this.simulation = simulation;
        this.setupEventListeners();
        this.updateInterval = setInterval(() => this.updateUI(), 100);
    }

    setupEventListeners() {
        // Play/Pause
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            if (this.simulation.running) {
                this.simulation.pause();
                document.getElementById('playPauseBtn').innerHTML = '▶ Play';
            } else {
                this.simulation.start();
                document.getElementById('playPauseBtn').innerHTML = '⏸ Pause';
            }
        });

        // Reset
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.simulation.reset();
        });

        // Speed slider
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.simulation.setSpeed(speed);
            document.getElementById('speedValue').textContent = speed.toFixed(1) + 'x';
        });

        // Add box
        document.getElementById('addBoxBtn').addEventListener('click', () => {
            this.simulation.wms.addBox();
        });

        // Fetch box
        document.getElementById('fetchBoxBtn').addEventListener('click', () => {
            this.simulation.wms.fetchRandomBox();
        });

        // Add multiple boxes
        document.getElementById('addMultipleBtn').addEventListener('click', () => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.simulation.wms.addBox();
                }, i * 200);
            }
        });
    }

    updateUI() {
        const wms = this.simulation.wms;

        // Update status
        document.getElementById('totalBoxes').textContent = wms.getTotalBoxesStored();
        document.getElementById('storageUsed').textContent =
            `${wms.getTotalBoxesStored()}/300`;
        document.getElementById('activeRobots').textContent =
            `${wms.getActiveRobotsCount()}/10`;
        document.getElementById('pendingTasks').textContent = wms.taskQueue.length;

        // Update robots list
        const robotsList = document.getElementById('robotsList');
        robotsList.innerHTML = '';

        for (let robot of wms.robots) {
            const robotDiv = document.createElement('div');
            robotDiv.className = `robot-item ${robot.state.replace('_', '-')}`;

            const statusText = robot.state.replace(/_/g, ' ').toUpperCase();
            const carryingText = robot.carryingBox ? '📦 Carrying box' : '';

            let batteryClass = '';
            if (robot.battery < 20) batteryClass = 'low';
            else if (robot.battery < 50) batteryClass = 'medium';

            robotDiv.innerHTML = `
                <div class="robot-id">Robot ${robot.id}</div>
                <div class="robot-status">${statusText} ${carryingText}</div>
                <div class="battery">
                    <div class="battery-fill ${batteryClass}" style="width: ${robot.battery}%"></div>
                </div>
            `;

            robotsList.appendChild(robotDiv);
        }

        // Update activity log
        const activityLog = document.getElementById('activityLog');
        activityLog.innerHTML = '';

        for (let entry of wms.activityLog.slice(0, 10)) {
            const logDiv = document.createElement('div');
            logDiv.className = `log-entry ${entry.type}`;
            logDiv.innerHTML = `
                <div class="log-time">${entry.time}</div>
                <div class="log-message">${entry.message}</div>
            `;
            activityLog.appendChild(logDiv);
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('warehouseCanvas');
    const simulation = new WarehouseSimulation(canvas);
    const uiController = new UIController(simulation);

    // Start simulation loop
    simulation.loop();

    // Add some initial boxes for demonstration
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                simulation.wms.addBox();
            }, i * 1000);
        }
    }, 1000);
});
