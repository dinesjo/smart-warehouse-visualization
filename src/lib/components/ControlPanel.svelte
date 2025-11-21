<script lang="ts">
  import { simulation } from '../simulation';

  const state = simulation.stateStore;
  const pendingTasks = simulation.pendingTasksStore;

  function handleStartPause() {
    simulation.toggle();
  }

  function handleReset() {
    simulation.reset();
  }

  function handleAddBox() {
    simulation.addBox();
  }

  function handleSpeedChange(event: Event) {
    const target = event.target as HTMLInputElement;
    simulation.setSpeed(parseFloat(target.value));
  }
</script>

<div class="control-panel">
  <!-- Control buttons -->
  <div class="controls-section">
    <h2 class="section-title">Controls</h2>
    <div class="button-group">
      <button
        class="btn btn-primary"
        onclick={handleStartPause}
      >
        {$state.isRunning ? '⏸ Pause' : '▶ Start'}
      </button>
      <button
        class="btn btn-secondary"
        onclick={handleReset}
      >
        🔄 Reset
      </button>
      <button
        class="btn btn-success"
        onclick={handleAddBox}
      >
        + Add Box
      </button>
    </div>
  </div>

  <!-- Speed control -->
  <div class="controls-section">
    <h2 class="section-title">Speed</h2>
    <div class="speed-control">
      <label for="speed-slider" class="speed-label">
        {$state.speed.toFixed(1)}x
      </label>
      <input
        id="speed-slider"
        type="range"
        min="0.1"
        max="3"
        step="0.1"
        value={$state.speed}
        oninput={handleSpeedChange}
        class="slider"
      />
      <div class="speed-marks">
        <span>0.1x</span>
        <span>1.5x</span>
        <span>3x</span>
      </div>
    </div>
  </div>

  <!-- Statistics -->
  <div class="controls-section">
    <h2 class="section-title">Statistics</h2>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">{$state.statistics.totalBoxes}</div>
        <div class="stat-label">Total Boxes</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{$state.statistics.boxesStored}</div>
        <div class="stat-label">Stored</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{$state.statistics.boxesFetched}</div>
        <div class="stat-label">Fetched</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{$state.statistics.activeRobots}</div>
        <div class="stat-label">Active Robots</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{$state.statistics.chargingRobots}</div>
        <div class="stat-label">Charging</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{$state.statistics.pendingTasks}</div>
        <div class="stat-label">Pending Tasks</div>
      </div>
    </div>
  </div>

  <!-- Runtime info -->
  <div class="controls-section">
    <h2 class="section-title">Runtime</h2>
    <div class="runtime-info">
      <div class="runtime-item">
        <span class="runtime-label">Time:</span>
        <span class="runtime-value">{$state.time.toFixed(1)}s</span>
      </div>
      <div class="runtime-item">
        <span class="runtime-label">Status:</span>
        <span class="runtime-value status-badge" class:running={$state.isRunning}>
          {$state.isRunning ? 'Running' : 'Paused'}
        </span>
      </div>
    </div>
  </div>

  <!-- Pending tasks -->
  {#if $pendingTasks.length > 0}
    <div class="controls-section">
      <h2 class="section-title">Pending Tasks ({$pendingTasks.length})</h2>
      <div class="task-list">
        {#each $pendingTasks.slice(0, 5) as task}
          <div class="task-item">
            <span class="task-type" class:store={task.type === 'store'} class:fetch={task.type === 'fetch'}>
              {task.type.toUpperCase()}
            </span>
            <span class="task-rfid">{task.boxRfid.split('-')[1].substring(0, 8)}</span>
          </div>
        {/each}
        {#if $pendingTasks.length > 5}
          <div class="task-more">+ {$pendingTasks.length - 5} more</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    height: 100%;
    overflow-y: auto;
  }

  .controls-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn {
    padding: 12px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  .btn-success {
    background: #10b981;
    color: white;
  }

  .btn-success:hover {
    background: #059669;
  }

  .speed-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .speed-label {
    font-size: 24px;
    font-weight: 700;
    color: #3b82f6;
    text-align: center;
  }

  .slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    outline: none;
    -webkit-appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
  }

  .speed-marks {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #6b7280;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-item {
    padding: 12px;
    background: #f3f4f6;
    border-radius: 6px;
    text-align: center;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #111827;
    line-height: 1;
  }

  .stat-label {
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
  }

  .runtime-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .runtime-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f3f4f6;
    border-radius: 6px;
  }

  .runtime-label {
    font-weight: 600;
    color: #6b7280;
    font-size: 14px;
  }

  .runtime-value {
    font-weight: 600;
    color: #111827;
    font-size: 14px;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.running {
    background: #d1fae5;
    color: #065f46;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 12px;
  }

  .task-type {
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 10px;
  }

  .task-type.store {
    background: #dbeafe;
    color: #1e40af;
  }

  .task-type.fetch {
    background: #fce7f3;
    color: #9f1239;
  }

  .task-rfid {
    font-family: monospace;
    color: #374151;
  }

  .task-more {
    padding: 6px 8px;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
    font-style: italic;
  }
</style>
