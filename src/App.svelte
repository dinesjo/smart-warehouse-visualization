<script lang="ts">
  import WarehouseView from './lib/components/WarehouseView.svelte';
  import ControlPanel from './lib/components/ControlPanel.svelte';
</script>

<div class="app-container">
  <header class="app-header">
    <h1 class="app-title">Smart Warehouse Simulation</h1>
    <p class="app-description">
      Real-time warehouse management system with autonomous robots
    </p>
  </header>

  <main class="app-main">
    <div class="warehouse-section">
      <WarehouseView />
    </div>

    <aside class="control-section">
      <ControlPanel />
    </aside>
  </main>

  <footer class="app-footer">
    <p>
      Smart Warehouse Visualization | Built with Svelte 5 + TypeScript + Tailwind
    </p>
  </footer>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 16px;
  }

  .app-header {
    text-align: center;
    color: white;
    margin-bottom: 20px;
  }

  .app-title {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  }

  .app-description {
    font-size: 1.125rem;
    margin: 8px 0 0 0;
    opacity: 0.95;
  }

  .app-main {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 16px;
    margin-bottom: 16px;
  }

  .warehouse-section {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .control-section {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .app-footer {
    text-align: center;
    color: white;
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .app-footer p {
    margin: 0;
  }

  @media (max-width: 1400px) {
    .app-main {
      grid-template-columns: 1fr 300px;
    }
  }

  @media (max-width: 1024px) {
    .app-main {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
    }

    .control-section {
      max-height: 400px;
    }
  }

  @media (max-width: 768px) {
    .app-container {
      padding: 8px;
    }

    .app-title {
      font-size: 1.75rem;
    }

    .app-description {
      font-size: 0.875rem;
    }
  }
</style>
