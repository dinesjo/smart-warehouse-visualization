<script lang="ts">
  import type { RobotStatus } from '../types';
  import { ROBOT_SIZE } from '../types';

  interface Props {
    robot: RobotStatus;
  }

  let { robot }: Props = $props();

  // Battery color based on level
  const batteryColor = $derived(() => {
    if (robot.batteryLevel > 50) return '#22c55e'; // green
    if (robot.batteryLevel > 20) return '#eab308'; // yellow
    return '#ef4444'; // red
  });

  // Robot color based on status
  const robotColor = $derived(() => {
    switch (robot.status) {
      case 'moving':
        return '#3b82f6'; // blue
      case 'picking':
        return '#a855f7'; // purple
      case 'placing':
        return '#ec4899'; // pink
      case 'charging':
        return '#eab308'; // yellow
      default:
        return '#6b7280'; // gray
    }
  });
</script>

<g
  class="robot"
  transform={`translate(${robot.position.x}, ${robot.position.y}) rotate(${robot.angle})`}
>
  <!-- Robot body -->
  <circle
    cx="0"
    cy="0"
    r={ROBOT_SIZE / 2}
    fill={robotColor()}
    stroke="#1f2937"
    stroke-width="2"
  />

  <!-- Direction indicator -->
  <line
    x1="0"
    y1="0"
    x2={ROBOT_SIZE / 2}
    y2="0"
    stroke="#1f2937"
    stroke-width="2"
  />

  <!-- Battery indicator -->
  <g transform={`rotate(${-robot.angle})`}>
    <rect
      x={-ROBOT_SIZE / 4}
      y={-ROBOT_SIZE / 2 - 8}
      width={ROBOT_SIZE / 2}
      height="4"
      fill="#1f2937"
      rx="2"
    />
    <rect
      x={-ROBOT_SIZE / 4}
      y={-ROBOT_SIZE / 2 - 8}
      width={(ROBOT_SIZE / 2) * (robot.batteryLevel / 100)}
      height="4"
      fill={batteryColor()}
      rx="2"
    />
  </g>

  <!-- Box indicator (if carrying) -->
  {#if robot.hasBox}
    <g transform={`rotate(${-robot.angle})`}>
      <rect
        x={-6}
        y={-6}
        width="12"
        height="12"
        fill="#f59e0b"
        stroke="#92400e"
        stroke-width="1"
      />
    </g>
  {/if}

  <!-- Robot ID label -->
  <g transform={`rotate(${-robot.angle})`}>
    <text
      x="0"
      y={ROBOT_SIZE / 2 + 15}
      text-anchor="middle"
      font-size="10"
      fill="#374151"
      font-weight="bold"
    >
      {robot.id.split('-')[1]}
    </text>
  </g>
</g>

<style>
  .robot {
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .robot:hover {
    opacity: 0.8;
  }
</style>
