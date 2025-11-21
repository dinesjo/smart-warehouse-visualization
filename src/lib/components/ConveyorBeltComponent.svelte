<script lang="ts">
  import type { ConveyorBelt } from '../types';
  import { CONVEYOR_WIDTH, CONVEYOR_HEIGHT } from '../types';
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    conveyor: ConveyorBelt;
  }

  let { conveyor }: Props = $props();
  let animationOffset = $state(0);
  let animationFrameId: number | null = null;

  function animate() {
    if (conveyor.isRunning) {
      animationOffset = (animationOffset + 1) % 20;
    }
    animationFrameId = requestAnimationFrame(animate);
  }

  onMount(() => {
    animate();
  });

  onDestroy(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  });
</script>

<g
  class="conveyor-belt"
  transform={`translate(${conveyor.position.x}, ${conveyor.position.y})`}
>
  <!-- Belt background -->
  <rect
    x="0"
    y="0"
    width={CONVEYOR_WIDTH}
    height={CONVEYOR_HEIGHT}
    fill="#4b5563"
    stroke="#1f2937"
    stroke-width="2"
    rx="4"
  />

  <!-- Animated belt lines -->
  {#each Array(Math.ceil(CONVEYOR_WIDTH / 20) + 1) as _, i}
    <line
      x1={i * 20 - animationOffset}
      y1={CONVEYOR_HEIGHT / 2}
      x2={i * 20 - animationOffset + 10}
      y2={CONVEYOR_HEIGHT / 2}
      stroke="#6b7280"
      stroke-width="2"
      stroke-linecap="round"
    />
  {/each}

  <!-- Boxes on conveyor -->
  {#each conveyor.boxes as box, index}
    {@const boxSize = 10}
    {@const spacing = CONVEYOR_WIDTH / (conveyor.boxes.length + 1)}
    {@const x = spacing * (index + 1) - boxSize / 2}
    {@const y = CONVEYOR_HEIGHT / 2 - boxSize / 2}

    <rect
      x={x}
      y={y}
      width={boxSize}
      height={boxSize}
      fill="#f59e0b"
      stroke="#92400e"
      stroke-width="1"
    />
  {/each}

  <!-- Conveyor ID label -->
  <text
    x={CONVEYOR_WIDTH / 2}
    y={-5}
    text-anchor="middle"
    font-size="10"
    fill="#374151"
    font-weight="bold"
  >
    {conveyor.id.toUpperCase()}
  </text>
</g>

<style>
  .conveyor-belt {
    cursor: pointer;
  }
</style>
