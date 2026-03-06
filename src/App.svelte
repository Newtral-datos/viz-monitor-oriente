<script>
  import { onMount, onDestroy } from 'svelte';
  import Map from './lib/Map.svelte';
  import DateSlider from './lib/DateSlider.svelte';
  import rawEvents from './data/events.csv';

  let events = [];
  let loading = true;
  let error = null;

  // ── Categorías ──────────────────────────────────────────────────
  const EVENT_TYPES = [
    'Battles',
    'Explosions/Remote violence',
    'Protests',
    'Strategic developments',
  ];

  const TYPE_LABELS_ES = {
    'Battles': 'Combates',
    'Explosions/Remote violence': 'Ataques aéreos',
    'Protests': 'Protestas',
    'Strategic developments': 'Acciones defensivas',
  };

  const TYPE_COLORS = {
    'Battles': '#ef4444',
    'Explosions/Remote violence': '#f97316',
    'Protests': '#3b82f6',
    'Strategic developments': '#8b5cf6',
  };

  let activeTypes = new Set(EVENT_TYPES);

  function toggleType(type) {
    activeTypes.has(type) ? activeTypes.delete(type) : activeTypes.add(type);
    activeTypes = new Set(activeTypes);
  }

  // ── Actores ─────────────────────────────────────────────────────
  const ACTOR_GROUPS = ['eeuu-israel', 'iran', 'protestas', 'otros'];

  const ACTOR_LABELS = {
    'eeuu-israel': 'EEUU / Israel',
    'iran': 'Irán',
    'protestas': 'Protestas',
    'otros': 'Otros',
  };

  const ACTOR_COLORS = {
    'eeuu-israel': '#01f3b3',
    'iran': '#cf023d',
    'protestas': '#eaea40',
    'otros': '#d8d8d8',
  };

  function getActorGroup(actor1) {
    if (/United States|Israel|United Kingdom|NATO|Global Coalition/i.test(actor1)) return 'eeuu-israel';
    if (/Iran/i.test(actor1)) return 'iran';
    if (/Protesters/i.test(actor1)) return 'protestas';
    return 'otros';
  }

  let activeActors = new Set(ACTOR_GROUPS);

  function toggleActor(group) {
    activeActors.has(group) ? activeActors.delete(group) : activeActors.add(group);
    activeActors = new Set(activeActors);
  }

  // ── Modo de vista ────────────────────────────────────────────────
  let viewMode = 'actor'; // 'category' | 'actor'
  let onlyFatalities = false;

  $: activeColors = viewMode === 'category' ? TYPE_COLORS : ACTOR_COLORS;
  $: colorField   = viewMode === 'category' ? 'event_type' : 'actorGroup';

  // ── Fechas y play ────────────────────────────────────────────────
  let allDates = [];
  let dateLo = 0;
  let dateHi = 0;

  let playing = false;
  let playTimer = null;
  let playIndex = 0;
  const PLAY_INTERVAL = 900;

  function startPlay() {
    playing = true;
    playTimer = setInterval(() => {
      if (playIndex < allDates.length - 1) {
        playIndex += 1;
        dateLo = playIndex;
        dateHi = playIndex;
      } else {
        stopPlay();
        dateLo = 0;
        dateHi = allDates.length - 1;
      }
    }, PLAY_INTERVAL);
  }

  function stopPlay() {
    playing = false;
    clearInterval(playTimer);
    playTimer = null;
  }

  function togglePlay() {
    if (playing) {
      stopPlay();
      dateLo = 0;
      dateHi = allDates.length - 1;
    } else {
      playIndex = 0;
      dateLo = 0;
      dateHi = 0;
      startPlay();
    }
  }

  // ── Carga ────────────────────────────────────────────────────────
  onMount(() => {
    try {
      events = rawEvents.map(d => ({
        ...d,
        latitude: parseFloat(d.latitude),
        longitude: parseFloat(d.longitude),
        fatalities: parseInt(d.fatalities) || 0,
        actorGroup: getActorGroup(d.actor1 || ''),
      })).filter(d => !isNaN(d.latitude) && !isNaN(d.longitude));

      allDates = [...new Set(events.map(e => e.event_date))].sort();
      playIndex = 0;
      dateLo = 0;
      dateHi = 0;
      setTimeout(startPlay, 400);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  });

  onDestroy(() => clearInterval(playTimer));

  // ── Filtrado ─────────────────────────────────────────────────────
  $: filteredEvents = events.filter(e => {
    if (e.event_date < allDates[dateLo] || e.event_date > allDates[dateHi]) return false;
    if (onlyFatalities && e.fatalities === 0) return false;
    if (viewMode === 'category') return activeTypes.has(e.event_type);
    return activeActors.has(e.actorGroup);
  });

  // ── Sidebar ──────────────────────────────────────────────────────
  let selectedEvent = null;

  $: eventColor = selectedEvent
    ? (viewMode === 'category' ? TYPE_COLORS[selectedEvent.event_type] : ACTOR_COLORS[selectedEvent.actorGroup])
    : '#94a3b8';

  $: eventLabel = selectedEvent
    ? (viewMode === 'category' ? TYPE_LABELS_ES[selectedEvent.event_type] : ACTOR_LABELS[selectedEvent.actorGroup])
    : '';

  $: totalFatalities = filteredEvents.reduce((s, e) => s + e.fatalities, 0);
</script>

<div class="app">
  <header>
    <div class="header-left">
      <h1>Monitor de la guerra en Oriente Medio</h1>
      <span class="subtitle">ACLED Data · 28 feb – actualidad · {events.length} eventos registrados</span>
    </div>
    <img src="./newtral.gif" alt="Newtral" class="logo" />
  </header>

  <div class="controls">
    <div class="filters">
      <!-- Toggle de modo -->
      <div class="mode-toggle">
        <button
          class="mode-btn"
          class:active={viewMode === 'actor'}
          on:click={() => viewMode = 'actor'}
        >Actor</button>
        <button
          class="mode-btn"
          class:active={viewMode === 'category'}
          on:click={() => viewMode = 'category'}
        >Categoría</button>
        <button
          class="mode-btn"
          class:active={onlyFatalities}
          on:click={() => onlyFatalities = !onlyFatalities}
        >Eventos con bajas</button>
      </div>

      <div class="v-divider"></div>

      <!-- Filtros según modo -->
      {#if viewMode === 'category'}
        {#each EVENT_TYPES as type}
          <button
            class="filter-btn"
            class:active={activeTypes.has(type)}
            style="--color: {TYPE_COLORS[type]}"
            on:click={() => toggleType(type)}
          >
            <span class="dot"></span>
            {TYPE_LABELS_ES[type]}
          </button>
        {/each}
      {:else}
        {#each ACTOR_GROUPS as group}
          <button
            class="filter-btn"
            class:active={activeActors.has(group)}
            style="--color: {ACTOR_COLORS[group]}"
            on:click={() => toggleActor(group)}
          >
            <span class="dot"></span>
            {ACTOR_LABELS[group]}
          </button>
        {/each}
      {/if}
    </div>

    {#if allDates.length > 0}
      <div class="divider"></div>
      <div class="slider-group">
        <button class="play-btn" on:click={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {#if playing}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="4" height="12" rx="1"/>
              <rect x="8" y="1" width="4" height="12" rx="1"/>
            </svg>
          {:else}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5l10 5.5-10 5.5V1.5z"/>
            </svg>
          {/if}
        </button>
        <DateSlider dates={allDates} bind:lo={dateLo} bind:hi={dateHi} />
      </div>
    {/if}
  </div>

  <div class="map-container">
    {#if loading}
      <div class="overlay">Cargando datos…</div>
    {:else if error}
      <div class="overlay error">Error: {error}</div>
    {:else}
      <Map
        events={filteredEvents}
        typeColors={activeColors}
        {colorField}
        bind:selectedEvent
      />
    {/if}

    <div class="map-stats">
      <div class="map-stat">
        <span class="map-stat-value">{filteredEvents.length}</span>
        <span class="map-stat-label">eventos</span>
      </div>
      <div class="map-stat-divider"></div>
      <div class="map-stat">
        <span class="map-stat-value">{totalFatalities}</span>
        <span class="map-stat-label">bajas</span>
      </div>
    </div>

    {#if selectedEvent}
      <div class="sidebar">
        <button class="close" on:click={() => selectedEvent = null}>✕</button>
        <div class="event-type" style="color: {eventColor}">
          {eventLabel}
        </div>
        <h2>{selectedEvent.location}</h2>
        <p class="meta">{selectedEvent.country} · {selectedEvent.admin1}</p>
        <p class="date">{selectedEvent.event_date}</p>
        {#if selectedEvent.fatalities > 0}
          <div class="fatalities">
            {selectedEvent.fatalities} {selectedEvent.fatalities === 1 ? 'baja' : 'bajas'}
          </div>
        {/if}
        <div class="actors">
          <strong>Actor 1:</strong> {selectedEvent.actor1 || '—'}<br/>
          {#if selectedEvent.actor2}
            <strong>Actor 2:</strong> {selectedEvent.actor2}
          {/if}
        </div>
        <p class="notes">{selectedEvent.notes}</p>
        {#if selectedEvent.source}
          <p class="source">Fuente: {selectedEvent.source}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    background: #fff;
    color: #1e293b;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
  }

  .subtitle {
    font-size: 0.7rem;
    color: #94a3b8;
  }

  .header-left {
    display: flex;
    flex-direction: column;
  }

  .logo {
    height: 28px;
    width: auto;
    opacity: 0.85;
  }

  /* ── Controles ── */
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  /* Toggle categoría/actor */
  .mode-toggle {
    display: flex;
    background: #f1f5f9;
    border-radius: 20px;
    padding: 2px;
    gap: 2px;
    flex-shrink: 0;
  }

  .mode-btn {
    padding: 3px 10px;
    border-radius: 18px;
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 0.72rem;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .mode-btn.active {
    background: #fff;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  .v-divider {
    width: 1px;
    height: 20px;
    background: #e2e8f0;
    flex-shrink: 0;
  }

  .divider {
    width: 1px;
    height: 28px;
    background: #e2e8f0;
    flex-shrink: 0;
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.5px solid #0f172a;
    background: #0f172a;
    color: #fff;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: opacity 0.15s;
  }

  .play-btn:hover { opacity: 0.75; }

  /* Filtros */
  .filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.75rem;
    font-family: inherit;
    transition: all 0.15s;
  }

  .filter-btn.active {
    border-color: var(--color);
    color: #0f172a;
    background: color-mix(in srgb, var(--color) 10%, #fff);
  }

  .filter-btn .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color);
    opacity: 0.35;
    flex-shrink: 0;
  }

  .filter-btn.active .dot { opacity: 1; }

  /* Mapa */
  .map-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    font-size: 1rem;
    color: #94a3b8;
    z-index: 10;
  }

  .overlay.error { color: #ef4444; }

  /* Stats flotantes */
  .map-stats {
    position: absolute;
    bottom: 24px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.10);
    z-index: 1000;
  }

  .map-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .map-stat-value {
    font-size: 1.4rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
  }

  .map-stat-label {
    font-size: 0.6rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 2px;
  }

  .map-stat-divider {
    width: 1px;
    height: 28px;
    background: #e2e8f0;
  }

  /* Sidebar */
  .sidebar {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 300px;
    max-height: calc(100% - 24px);
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  }

  .close {
    float: right;
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
  }

  .close:hover { color: #0f172a; }

  .event-type {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .sidebar h2 {
    margin: 0 0 4px;
    font-size: 1rem;
    color: #0f172a;
  }

  .meta {
    margin: 0 0 2px;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .date {
    margin: 0 0 10px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .fatalities {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #fef2f2;
    color: #b91c1c;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    margin-bottom: 10px;
    border: 1px solid #fecaca;
  }

  .actors {
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 10px;
    line-height: 1.6;
  }

  .notes {
    font-size: 0.78rem;
    line-height: 1.55;
    color: #334155;
    margin: 0 0 8px;
  }

  .source {
    font-size: 0.68rem;
    color: #94a3b8;
    margin: 0;
  }

  /* Mobile */
  @media (max-width: 640px) {
    .controls {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
    }

    .filters {
      width: 100%;
    }

    .filter-btn {
      flex: 1 1 auto;
      justify-content: center;
    }

    .divider {
      display: none;
    }
  }
</style>
