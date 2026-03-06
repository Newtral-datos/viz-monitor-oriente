<script>
  export let dates = [];   // array ordenado de strings 'YYYY-MM-DD'
  export let lo = 0;       // índice inicio
  export let hi = 0;       // índice fin

  let trackEl;

  // Porcentajes para colorear el rango activo
  $: pLo = dates.length > 1 ? (lo / (dates.length - 1)) * 100 : 0;
  $: pHi = dates.length > 1 ? (hi / (dates.length - 1)) * 100 : 100;

  function fmtDate(str) {
    const [, m, d] = str.split('-');
    const months = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun',
                    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d)} ${months[parseInt(m)]}`;
  }

  function onLo(e) {
    const v = parseInt(e.target.value);
    const clamped = Math.min(v, hi);
    lo = clamped;
    e.target.value = clamped;
  }

  function onHi(e) {
    const v = parseInt(e.target.value);
    const clamped = Math.max(v, lo);
    hi = clamped;
    e.target.value = clamped;
  }
</script>

<div class="slider-wrap">
  <div class="label-row">
    <span class="range-label">Período</span>
    <span class="range-value">
      {fmtDate(dates[lo])}
      {#if lo !== hi} – {fmtDate(dates[hi])}{/if}
    </span>
  </div>

  <div class="track-wrap" bind:this={trackEl}>
    <!-- Relleno de rango activo -->
    <div
      class="range-fill"
      style="left:{pLo}%; right:{100 - pHi}%"
    ></div>

    <input
      type="range"
      min="0" max={dates.length - 1}
      value={lo}
      on:input={onLo}
      class="thumb thumb-lo"
    />
    <input
      type="range"
      min="0" max={dates.length - 1}
      value={hi}
      on:input={onHi}
      class="thumb thumb-hi"
    />
  </div>

  <!-- Etiquetas de fechas -->
  <div class="ticks">
    {#each dates as d, i}
      <span
        class="tick"
        class:active={i >= lo && i <= hi}
        style="left: {dates.length > 1 ? (i / (dates.length - 1)) * 100 : 0}%"
      >{fmtDate(d)}</span>
    {/each}
  </div>
</div>

<style>
  .slider-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 220px;
    padding: 0 4px;
  }

  .label-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .range-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
  }

  .range-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0f172a;
  }

  .track-wrap {
    position: relative;
    height: 4px;
    background: #e2e8f0;
    border-radius: 4px;
    margin: 6px 0 2px;
  }

  .range-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    background: #0f172a;
    border-radius: 4px;
    pointer-events: none;
  }

  .thumb {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    height: 4px;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    pointer-events: none;
    margin: 0;
    padding: 0;
  }

  .thumb::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #0f172a;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    pointer-events: all;
    cursor: grab;
    position: relative;
    z-index: 2;
  }

  .thumb::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #0f172a;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    pointer-events: all;
    cursor: grab;
  }

  .thumb-hi {
    z-index: 3;
  }

  .ticks {
    position: relative;
    height: 14px;
    margin-top: 4px;
  }

  .tick {
    position: absolute;
    transform: translateX(-50%);
    font-size: 0.6rem;
    color: #cbd5e1;
    white-space: nowrap;
    transition: color 0.15s;
  }

  .tick.active {
    color: #64748b;
  }
</style>
