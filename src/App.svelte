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
  const ACTOR_GROUPS_DISPLAY = ['eeuu-israel', 'iran', 'otros'];

  const ACTOR_LABELS = {
    'eeuu-israel': 'EEUU / Israel',
    'iran': 'Irán',
    'protestas': 'Protestas',
    'otros': 'Otros',
  };

  const ACTOR_COLORS = {
    'eeuu-israel': '#cf023d',
    'iran': '#305cfa',
    'protestas': '#01f3b3',
    'otros': '#aaaaaa',
  };

  function getActorGroup(actor1) {
    if (/United States|Israel|United Kingdom|NATO|Global Coalition/i.test(actor1)) return 'eeuu-israel';
    if (/Iran/i.test(actor1)) return 'iran';
    return 'otros';
  }

  // ── Nombres de actores en español ───────────────────────────────
  const ACTOR_NAMES_ES = {
    'Civilians (Azerbaijan)':                                              'Civiles (Azerbaiyán)',
    'Civilians (Bangladesh)':                                              'Civiles (Bangladés)',
    'Civilians (India)':                                                   'Civiles (India)',
    'Civilians (International)':                                           'Civiles (Internacional)',
    'Civilians (Iran)':                                                    'Civiles (Irán)',
    'Civilians (Israel)':                                                  'Civiles (Israel)',
    'Civilians (Kuwait)':                                                  'Civiles (Kuwait)',
    'Civilians (Oman)':                                                    'Civiles (Omán)',
    'Civilians (United Arab Emirates)':                                    'Civiles (Emiratos Árabes Unidos)',
    'Civilians (United States)':                                           'Civiles (Estados Unidos)',
    'Global Coalition Against Daesh':                                      'Coalición Global contra Daesh',
    'KSZK: Komala Party of Iranian Kurdistan':                             'KSZK: Partido Komala del Kurdistán iraní',
    'Military Forces of Bahrain (1999-)':                                  'Baréin',
    'Military Forces of France (2017-)':                                   'Francia',
    'Military Forces of Iran (1989-)':                                     'Irán',
    'Military Forces of Iran (1989-) 65th Airborne Special Forces':        'Irán — Fuerzas Especiales',
    'Military Forces of Iran (1989-) Basij Force':                         'Irán — Basij',
    'Military Forces of Iran (1989-) Islamic Republic of Iran Air Force':  'Irán — Fuerza Aérea',
    'Military Forces of Iran (1989-) Islamic Revolutionary Guard Corps':   'Irán — CGRI',
    'Military Forces of Iran (1989-) Islamic Revolutionary Guard Corps Navy (IRGCN)': 'Irán — Marina del CGRI',
    'Military Forces of Iraq (2022-) Peshmerga':                           'Irak — Peshmerga',
    'Military Forces of Israel (2022-)':                                   'Israel',
    'Military Forces of Kuwait (2020-)':                                   'Kuwait',
    'Military Forces of Oman (2020-)':                                     'Omán',
    'Military Forces of Qatar (2013-)':                                    'Catar',
    'Military Forces of Saudi Arabia (2015-)':                             'Arabia Saudí',
    'Military Forces of the United Arab Emirates (2022-)':                 'Emiratos Árabes Unidos',
    'Military Forces of the United Kingdom (2024-)':                       'Reino Unido',
    'Military Forces of the United States (2025-)':                        'Estados Unidos',
    'MPF: Mobarizoun Popular Front':                                       'MPF: Frente Popular Mobarizoun',
    'NATO: North Atlantic Treaty Organization':                            'OTAN',
    'PAK: Kurdistan Freedom Party':                                        'PAK: Partido de la Libertad del Kurdistán',
    'PFF: People\'s Fighters Front':                                       'PFF: Frente de Combatientes del Pueblo',
    'Police Forces of Iran (1989-)':                                       'Fuerzas Policiales de Irán',
    'Police Forces of Iran (1989-) Islamic Republic of Iran Border Guard Command': 'Fuerzas Policiales de Irán — Guardia Fronteriza',
    'Police Forces of Iran (1989-) Ministry of Intelligence':              'Fuerzas Policiales de Irán — Ministerio de Inteligencia',
    'Police Forces of Iraq (2022-) Asayish':                               'Fuerzas Policiales de Irak — Asayish',
    'Protesters (Iran)':                                                   'Manifestantes (Irán)',
    'Protesters (Iraq)':                                                   'Manifestantes (Irak)',
    'Unidentified Armed Group (Iran)':                                     'Grupo armado no identificado (Irán)',
  };

  function translateActor(name) {
    return ACTOR_NAMES_ES[name] || name;
  }

  let activeActors = new Set(ACTOR_GROUPS);

  function toggleActor(group) {
    activeActors.has(group) ? activeActors.delete(group) : activeActors.add(group);
    activeActors = new Set(activeActors);
  }

  let onlyFatalities = false;

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
    return activeActors.has(e.actorGroup) && activeTypes.has(e.event_type);
  });

  // ── Sidebar ──────────────────────────────────────────────────────
  let selectedEvent = null;

  $: eventColor = selectedEvent ? ACTOR_COLORS[selectedEvent.actorGroup] : '#94a3b8';
  $: eventLabel = selectedEvent ? ACTOR_LABELS[selectedEvent.actorGroup] : '';

  $: totalFatalities = filteredEvents.reduce((s, e) => s + e.fatalities, 0);
</script>

<div class="app">
  <header>
    <div class="header-left">
      <h1>Monitor de la guerra de Irán</h1>
      <span class="subtitle"><a href="https://acleddata.com/about-acled" target="_blank" rel="noreferrer">ACLED Data</a> · 28 feb – actualidad · {events.length} eventos registrados</span>
      <span class="subtitle">Datos actualizados a diario</span>
    </div>
    <img src="./newtral.gif" alt="Newtral" class="logo" />
  </header>

  <div class="controls">
    <div class="filters">
      <!-- Fila 1: actores -->
      <div class="filter-row">
        {#each ACTOR_GROUPS_DISPLAY as group}
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
      </div>

      <!-- Fila 2: categorías -->
      <div class="filter-row">
        <span class="filter-row-label">Categoría</span>
        <div class="v-divider"></div>
        {#each EVENT_TYPES as type}
          <button
            class="filter-btn filter-btn-neutral"
            class:active={activeTypes.has(type)}
            on:click={() => toggleType(type)}
          >
            <span class="checkbox">{activeTypes.has(type) ? '✓' : ''}</span>
            {TYPE_LABELS_ES[type]}
          </button>
        {/each}
      </div>

      <!-- Fila 3: solo bajas -->
      <div class="filter-row">
        <button class="bajas-toggle" class:active={onlyFatalities} on:click={() => onlyFatalities = !onlyFatalities}>
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          Solo bajas
        </button>
      </div>
    </div>

    {#if allDates.length > 0}
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
        <div class="slider-wrap-outer">
          <DateSlider dates={allDates} bind:lo={dateLo} bind:hi={dateHi} />
          <p class="slider-hint">Arrastra para aislar eventos de diferentes días</p>
        </div>
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
        typeColors={ACTOR_COLORS}
        colorField="actorGroup"
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
        <div class="event-category" style="color: {eventColor}">
          {TYPE_LABELS_ES[selectedEvent.event_type]}
        </div>
        <h2>{selectedEvent.location}</h2>
        <p class="meta">{selectedEvent.admin1}, {selectedEvent.country}</p>
        <p class="date">{selectedEvent.event_date.split('-').reverse().join('/')}</p>
        {#if selectedEvent.fatalities > 0}
          <div class="fatalities">
            {selectedEvent.fatalities} {selectedEvent.fatalities === 1 ? 'baja' : 'bajas'}
          </div>
        {/if}
        <div class="actors">
          <strong>Acción de:</strong> {translateActor(selectedEvent.actor1 || '—')}<br/>
          {#if selectedEvent.actor2}
            <strong>Sobre:</strong> {translateActor(selectedEvent.actor2)}
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

  .subtitle a {
    color: #94a3b8;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .subtitle a:hover {
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
    flex-direction: column;
    gap: 5px;
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-row-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    white-space: nowrap;
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

  .bajas-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.72rem;
    font-family: inherit;
    color: #64748b;
    padding: 0;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .toggle-track {
    width: 28px;
    height: 16px;
    background: #e2e8f0;
    border-radius: 8px;
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform 0.2s;
  }

  .bajas-toggle.active { color: #0f172a; }
  .bajas-toggle.active .toggle-track { background: #01f3b3; }
  .bajas-toggle.active .toggle-thumb { transform: translateX(12px); }

  .divider {
    width: 1px;
    height: 28px;
    background: #e2e8f0;
    flex-shrink: 0;
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 22px;
  }

  .slider-wrap-outer {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .slider-hint {
    margin: 0;
    font-size: 0.6rem;
    color: #cbd5e1;
    text-align: center;
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

  .filter-btn-neutral {
    --color: #0f172a;
    border-color: #e2e8f0;
    background: #fff;
    color: #94a3b8;
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    letter-spacing: 0.01em;
  }

  .filter-btn-neutral:hover {
    border-color: #cbd5e1;
    color: #475569;
    box-shadow: 0 2px 6px rgba(0,0,0,0.09);
  }

  .filter-btn-neutral.active {
    background: #fff;
    border-color: #0f172a;
    color: #0f172a;
    box-shadow: 0 2px 8px rgba(15,23,42,0.1);
  }

  .checkbox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    border: 1.5px solid #d1d5db;
    border-radius: 3px;
    font-size: 0.65rem;
    line-height: 1;
    flex-shrink: 0;
    transition: all 0.15s;
    background: #fff;
  }

  .filter-btn-neutral.active .checkbox {
    border-color: #0f172a;
    background: #0f172a;
    color: #fff;
  }

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
    margin-bottom: 4px;
  }

  .event-category {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
    color: #0f172a;
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

  .meta-label {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #cbd5e1;
    margin: 0;
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
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
    }

    .filters {
      width: 100%;
      align-items: center;
    }

    .filter-row {
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
    }

    .slider-group {
      width: 100%;
      justify-content: center;
    }

    .divider {
      display: none;
    }
  }
</style>
