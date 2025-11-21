<script lang="ts">
  import type { ShelfData } from '../types';
  import { SHELF_WIDTH, SHELF_HEIGHT, WAREHOUSE_CONFIG } from '../types';

  interface Props {
    shelf: ShelfData;
  }

  let { shelf }: Props = $props();

  const cellWidth = SHELF_WIDTH / WAREHOUSE_CONFIG.shelfPositions;
  const cellHeight = SHELF_HEIGHT / WAREHOUSE_CONFIG.shelfLevels;

  function hasBox(level: number, position: number): boolean {
    const key = `${level}-${position}`;
    return shelf.storage.has(key);
  }

  function getBox(level: number, position: number) {
    const key = `${level}-${position}`;
    return shelf.storage.get(key);
  }
</script>

<g class="shelf" transform={`translate(${shelf.position.x}, ${shelf.position.y})`}>
  <!-- Shelf background -->
  <rect
    x="0"
    y="0"
    width={SHELF_WIDTH}
    height={SHELF_HEIGHT}
    fill="#e5e7eb"
    stroke="#374151"
    stroke-width="2"
    rx="2"
  />

  <!-- Shelf grid -->
  {#each Array(WAREHOUSE_CONFIG.shelfLevels) as _, levelIndex}
    {#each Array(WAREHOUSE_CONFIG.shelfPositions) as _, posIndex}
      {@const level = levelIndex + 1}
      {@const position = posIndex + 1}
      {@const x = posIndex * cellWidth}
      {@const y = levelIndex * cellHeight}
      {@const occupied = hasBox(level, position)}

      <g>
        <!-- Cell border -->
        <rect
          x={x}
          y={y}
          width={cellWidth}
          height={cellHeight}
          fill="none"
          stroke="#9ca3af"
          stroke-width="1"
        />

        <!-- Box if present -->
        {#if occupied}
          {@const box = getBox(level, position)}
          <rect
            x={x + 1}
            y={y + 1}
            width={cellWidth - 2}
            height={cellHeight - 2}
            fill="#f59e0b"
            stroke="#92400e"
            stroke-width="1"
          />
          <text
            x={x + cellWidth / 2}
            y={y + cellHeight / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="6"
            fill="#78350f"
            font-weight="bold"
          >
            {box?.rfid.split('-')[1].substring(0, 4)}
          </text>
        {/if}
      </g>
    {/each}
  {/each}

  <!-- Shelf ID label -->
  <text
    x={SHELF_WIDTH / 2}
    y={SHELF_HEIGHT + 12}
    text-anchor="middle"
    font-size="10"
    fill="#374151"
    font-weight="bold"
  >
    S{shelf.id}
  </text>
</g>

<style>
  .shelf {
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .shelf:hover {
    opacity: 0.9;
  }
</style>
