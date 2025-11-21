# Smart Warehouse System Simulation

An interactive web-based simulation of an autonomous smart warehouse system with 10 robots, 20 multi-level shelves, and intelligent task management.

## Features

### Warehouse Components
- **20 Shelves**: Each with 3 levels and 5 positions (300 total storage locations)
- **10 Autonomous Robots**: With extendable arms, battery management, and pathfinding
- **2 Collection Points**: With conveyor belts for incoming/outgoing boxes
- **4 Charging Stations**: For robot battery recharging
- **Warehouse Management System (WMS)**: Intelligent task assignment and routing

### Robot Capabilities
- Mobile base with forward/backward movement and turning
- Extendable arm with RFID reader for box handling
- Battery management with automatic charging behavior
- Positioning system for accurate navigation
- Collision detection and pathfinding
- State machine-based behavior (idle, moving, picking, placing, charging)

### User Interactions
- **Add Box**: Add a single box to the conveyor belt
- **Add 5 Boxes**: Add multiple boxes at once
- **Fetch Random Box**: Request retrieval of a stored box
- **Simulation Control**: Play/pause the simulation
- **Speed Control**: Adjust simulation speed (0.1x to 3.0x)
- **Reset**: Reset the entire warehouse to initial state

### Real-time Monitoring
- Total boxes stored
- Storage utilization (0/300)
- Active robots count
- Pending task queue
- Individual robot status (state, battery level, carrying status)
- Activity log with timestamped events

## How to Use

1. **Open the Application**
   - Simply open `index.html` in a modern web browser
   - No build process or dependencies required

2. **Initial Setup**
   - The simulation starts automatically with 10 fully charged robots
   - 3 boxes will be added automatically as a demonstration
   - All robots start near charging stations

3. **Adding Boxes**
   - Click "📦 Add New Box" to add a single box to the conveyor
   - Click "📦📦 Add 5 Boxes" to add multiple boxes
   - Boxes appear on the conveyor and WMS assigns storage locations
   - Available robots automatically pick up and store boxes

4. **Fetching Boxes**
   - Click "📤 Fetch Random Box" to retrieve a stored box
   - Robot will collect the box from the shelf and deliver to collection point
   - Box disappears when delivered (simulating shipment)

5. **Monitoring**
   - Watch robots navigate the warehouse in real-time
   - Check robot status panel for individual robot states
   - View activity log for detailed operation history
   - Monitor battery levels (robots auto-charge when low)

6. **Controls**
   - **Play/Pause**: Pause and resume the simulation
   - **Speed Slider**: Adjust simulation speed
   - **Reset**: Clear all boxes and reset robots to initial positions

## System Behavior

### Storage Workflow
1. Box arrives on conveyor belt with RFID tag
2. WMS assigns empty shelf location
3. WMS selects closest idle robot with sufficient battery
4. Robot navigates to collection point
5. Robot picks up box from conveyor (arm extends)
6. Robot navigates to assigned shelf location
7. Robot places box in shelf slot
8. Robot returns to idle state

### Retrieval Workflow
1. Fetch request for specific box
2. WMS assigns task to available robot
3. Robot navigates to shelf location
4. Robot picks up box from shelf
5. Robot navigates to collection point
6. Robot places box on conveyor for shipment
7. Box is removed from system

### Battery Management
- Robots consume battery while moving and using arm
- Battery level displayed as colored bar (green/yellow/red)
- Robots automatically go to charging when battery < 20%
- Charging resumes robot to idle state when battery > 95%
- Critical battery (< 5%) causes robot to stop completely

### Task Management
- WMS maintains task queue for pending operations
- Tasks assigned to closest idle robot with sufficient battery
- Dynamic route computation based on current positions
- Path visualization shows planned robot routes

## Technical Implementation

- **Pure Vanilla JavaScript**: No frameworks or dependencies
- **HTML5 Canvas**: For efficient 2D rendering
- **State Machine Pattern**: For robot behavior management
- **Event-driven Architecture**: For UI and simulation updates
- **Real-time Updates**: 60 FPS rendering with adjustable simulation speed

## Legend

- 🔵 **Blue Rectangles**: Shelves (20 total)
- 🟢 **Green Rectangles**: Collection points
- 🟡 **Yellow Circles**: Charging stations
- 🔴 **Red Rectangles**: Robots with direction indicators
- 🟤 **Brown Squares**: Boxes (on shelves, conveyor, or carried by robots)
- ⚫ **Gray Belts**: Conveyor belts with robotic arms

## Project Structure

```
smart-warehouse-visualization/
├── index.html          # Main HTML structure
├── style.css           # Styling and responsive design
├── warehouse.js        # Complete simulation logic
└── README.md          # This file
```

## Based On

This simulation is based on the DD2528 Smart Warehouse Systems course description, accurately implementing:
- Warehouse layout with specified dimensions
- Robot hardware specifications
- WMS coordination and routing
- Box storage addressing system (shelf, level, position)
- Battery management and charging behavior
- Communication between WMS and robots
- Conveyor belt operations
- Task assignment and queuing

## Browser Compatibility

Works in all modern browsers supporting:
- HTML5 Canvas
- ES6+ JavaScript
- CSS Grid/Flexbox

Tested in: Chrome, Firefox, Safari, Edge