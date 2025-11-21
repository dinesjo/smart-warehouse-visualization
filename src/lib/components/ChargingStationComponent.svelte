<script lang="ts">
  import type { ChargingStation } from '../types';
  import { CHARGING_STATION_SIZE } from '../types';

  interface Props {
    station: ChargingStation;
  }

  let { station }: Props = $props();
</script>

<g
  class="charging-station"
  transform={`translate(${station.position.x}, ${station.position.y})`}
>
  <!-- Station base -->
  <rect
    x={-CHARGING_STATION_SIZE / 2}
    y={-CHARGING_STATION_SIZE / 2}
    width={CHARGING_STATION_SIZE}
    height={CHARGING_STATION_SIZE}
    fill={station.occupied ? '#fbbf24' : '#fef3c7'}
    stroke="#92400e"
    stroke-width="2"
    rx="4"
  />

  <!-- Lightning bolt icon -->
  <path
    d="M -4 -8 L 2 0 L -2 0 L 4 8 L 0 2 L 2 2 Z"
    fill={station.occupied ? '#78350f' : '#ca8a04'}
    stroke="none"
  />

  <!-- Occupied indicator -->
  {#if station.occupied}
    <circle
      cx={CHARGING_STATION_SIZE / 2 - 5}
      cy={-CHARGING_STATION_SIZE / 2 + 5}
      r="3"
      fill="#ef4444"
      stroke="#7f1d1d"
      stroke-width="1"
    />
  {/if}

  <!-- Station ID label -->
  <text
    x="0"
    y={CHARGING_STATION_SIZE / 2 + 12}
    text-anchor="middle"
    font-size="8"
    fill="#78350f"
    font-weight="bold"
  >
    {station.id.toUpperCase()}
  </text>
</g>

<style>
  .charging-station {
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .charging-station:hover {
    opacity: 0.85;
  }
</style>
