<script lang="ts">
  import { simulation } from '../simulation';
  import RobotComponent from './RobotComponent.svelte';
  import ShelfComponent from './ShelfComponent.svelte';
  import ChargingStationComponent from './ChargingStationComponent.svelte';
  import ConveyorBeltComponent from './ConveyorBeltComponent.svelte';
  import { WAREHOUSE_CONFIG } from '../types';
  import type { Position } from '../types';

  const robots = simulation.robotsStore;
  const shelves = simulation.shelvesStore;
  const chargingStations = simulation.chargingStationsStore;
  const conveyorBelts = simulation.conveyorBeltsStore;

  let selectedRobotId = $state<string | null>(null);
  let selectedShelfId = $state<number | null>(null);

  function handleRobotClick(robotId: string) {
    selectedRobotId = selectedRobotId === robotId ? null : robotId;
    selectedShelfId = null;
  }

  function handleShelfClick(shelfId: number) {
    selectedShelfId = selectedShelfId === shelfId ? null : shelfId;
    selectedRobotId = null;
  }

  function handleWarehouseClick() {
    selectedRobotId = null;
    selectedShelfId = null;
  }

  const selectedRobot = $derived(
    selectedRobotId ? $robots.find((r) => r.id === selectedRobotId) : null
  );

  const selectedShelf = $derived(
    selectedShelfId ? $shelves.find((s) => s.id === selectedShelfId) : null
  );
</script>

<div class="warehouse-container">
  <svg
    width={WAREHOUSE_CONFIG.warehouseWidth}
    height={WAREHOUSE_CONFIG.warehouseHeight}
    viewBox={`0 0 ${WAREHOUSE_CONFIG.warehouseWidth} ${WAREHOUSE_CONFIG.warehouseHeight}`}
    class="warehouse-svg"
    onclick={handleWarehouseClick}
  >
    <!-- Background -->
    <rect
      width={WAREHOUSE_CONFIG.warehouseWidth}
      height={WAREHOUSE_CONFIG.warehouseHeight}
      fill="#f3f4f6"
    />

    <!-- Grid lines -->
    {#each Array(Math.floor(WAREHOUSE_CONFIG.warehouseWidth / 50)) as _, i}
      <line
        x1={i * 50}
        y1="0"
        x2={i * 50}
        y2={WAREHOUSE_CONFIG.warehouseHeight}
        stroke="#e5e7eb"
        stroke-width="1"
      />
    {/each}
    {#each Array(Math.floor(WAREHOUSE_CONFIG.warehouseHeight / 50)) as _, i}
      <line
        x1="0"
        y1={i * 50}
        x2={WAREHOUSE_CONFIG.warehouseWidth}
        y2={i * 50}
        stroke="#e5e7eb"
        stroke-width="1"
      />
    {/each}

    <!-- Conveyor belts -->
    {#each $conveyorBelts as conveyor (conveyor.id)}
      <ConveyorBeltComponent {conveyor} />
    {/each}

    <!-- Charging stations -->
    {#each $chargingStations as station (station.id)}
      <ChargingStationComponent {station} />
    {/each}

    <!-- Shelves -->
    {#each $shelves as shelf (shelf.id)}
      <g onclick={(e) => {
        e.stopPropagation();
        handleShelfClick(shelf.id);
      }}>
        <ShelfComponent {shelf} />
        {#if selectedShelfId === shelf.id}
          <rect
            x={shelf.position.x - 5}
            y={shelf.position.y - 5}
            width={50}
            height={90}
            fill="none"
            stroke="#3b82f6"
            stroke-width="3"
            rx="4"
          />
        {/if}
      </g>
    {/each}

    <!-- Robots -->
    {#each $robots as robot (robot.id)}
      <g onclick={(e) => {
        e.stopPropagation();
        handleRobotClick(robot.id);
      }}>
        <RobotComponent {robot} />
        {#if selectedRobotId === robot.id}
          <circle
            cx={robot.position.x}
            cy={robot.position.y}
            r="25"
            fill="none"
            stroke="#3b82f6"
            stroke-width="2"
            stroke-dasharray="4 4"
          />
        {/if}
      </g>
    {/each}
  </svg>

  <!-- Info panel -->
  {#if selectedRobot}
    <div class="info-panel">
      <h3 class="text-lg font-bold mb-2">Robot {selectedRobot.id}</h3>
      <div class="info-grid">
        <div>
          <span class="label">Status:</span>
          <span class="value capitalize">{selectedRobot.status}</span>
        </div>
        <div>
          <span class="label">Battery:</span>
          <span class="value">{selectedRobot.batteryLevel.toFixed(1)}%</span>
        </div>
        <div>
          <span class="label">Position:</span>
          <span class="value">({selectedRobot.position.x.toFixed(0)}, {selectedRobot.position.y.toFixed(0)})</span>
        </div>
        <div>
          <span class="label">Has Box:</span>
          <span class="value">{selectedRobot.hasBox ? 'Yes' : 'No'}</span>
        </div>
        {#if selectedRobot.currentBox}
          <div>
            <span class="label">Box RFID:</span>
            <span class="value">{selectedRobot.currentBox.rfid}</span>
          </div>
        {/if}
        {#if selectedRobot.assignment}
          <div>
            <span class="label">Task:</span>
            <span class="value capitalize">{selectedRobot.assignment.type}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if selectedShelf}
    <div class="info-panel">
      <h3 class="text-lg font-bold mb-2">Shelf {selectedShelf.id}</h3>
      <div class="info-grid">
        <div>
          <span class="label">Position:</span>
          <span class="value">({selectedShelf.position.x.toFixed(0)}, {selectedShelf.position.y.toFixed(0)})</span>
        </div>
        <div>
          <span class="label">Boxes:</span>
          <span class="value">{selectedShelf.storage.size} / 15</span>
        </div>
        <div>
          <span class="label">Capacity:</span>
          <span class="value">{((selectedShelf.storage.size / 15) * 100).toFixed(0)}%</span>
        </div>
      </div>
      {#if selectedShelf.storage.size > 0}
        <div class="mt-2">
          <span class="label">Stored Boxes:</span>
          <div class="box-list">
            {#each Array.from(selectedShelf.storage.values()) as box}
              <div class="box-item">{box.rfid}</div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .warehouse-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #f9fafb;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .warehouse-svg {
    display: block;
    cursor: default;
  }

  .info-panel {
    position: absolute;
    top: 16px;
    right: 16px;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    min-width: 250px;
    max-width: 350px;
    max-height: 400px;
    overflow-y: auto;
  }

  .info-grid {
    display: grid;
    gap: 8px;
  }

  .info-grid > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-weight: 600;
    color: #6b7280;
    font-size: 14px;
  }

  .value {
    font-weight: 500;
    color: #111827;
    font-size: 14px;
  }

  .box-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 150px;
    overflow-y: auto;
    margin-top: 8px;
  }

  .box-item {
    padding: 4px 8px;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    color: #374151;
  }
</style>
