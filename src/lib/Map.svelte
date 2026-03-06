<script>
  import { onMount, onDestroy } from 'svelte';

  export let events = [];
  export let typeColors = {};
  export let colorField = 'event_type';
  export let selectedEvent = null;

  let mapEl;
  let map;
  let L;
  let markersLayer;

  onMount(async () => {
    L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');

    map = L.map(mapEl, {
      center: [30, 45],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 18,
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    renderMarkers();
  });

  onDestroy(() => {
    if (map) map.remove();
  });

  function makeIcon(color) {
    const size = 10;
    return L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};
        border-radius:50%;
        border:1.5px solid rgba(255,255,255,0.4);
        box-shadow:0 0 6px ${color}88;
        cursor:pointer;
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function renderMarkers() {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    for (const ev of events) {
      const color = typeColors[ev[colorField]] || '#94a3b8';
      const marker = L.marker([ev.latitude, ev.longitude], {
        icon: makeIcon(color),
      });

      marker.on('click', () => {
        selectedEvent = ev;
      });

      markersLayer.addLayer(marker);
    }
  }

  $: if (markersLayer) renderMarkers(events, colorField, typeColors);
</script>

<div bind:this={mapEl} style="width:100%;height:100%;"></div>

<style>
  :global(.leaflet-container) {
    background: #0f172a;
  }
</style>
