/* Static scrolly: all data is local under data/. No Google Doc, Gatsby service account or external data API. */
const DATA = {
  stats: 'data/stats.json',
  crashes: 'data/crashes.geojson',
  corridors: 'data/corridors.geojson'
};

let map;
let crashLayer = L.layerGroup();
let corridorLayer = L.layerGroup();
let allCrashes = [];
let allCorridors = [];
let steps = [];

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function popup(properties) {
  const outcome = properties.deaths ? `${properties.deaths} death${properties.deaths === 1 ? '' : 's'}` : `${properties.serious_injuries} serious injur${properties.serious_injuries === 1 ? 'y' : 'ies'}`;
  return `<strong>Crash ${esc(properties.crash_id)}</strong><br>${esc(properties.year)} — ${outcome}<br>Street: ${esc(properties.street_name)}<br>Age: ${esc(properties.victim_ages)}<br>Helmet: ${esc(properties.victim_helmets)}`;
}

function drawCrashPoints(group = null) {
  crashLayer.clearLayers();
  allCrashes.filter(feature => group === null || feature.properties.candidate_group === group).forEach(feature => {
    const p = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;
    L.circleMarker([lat, lng], {
      radius: p.deaths ? 7 : 5,
      color: p.deaths ? '#222' : '#fff',
      weight: 1.5,
      fillColor: p.deaths ? '#e67e22' : '#3478a4',
      fillOpacity: .95
    }).bindPopup(popup(p)).addTo(crashLayer);
  });
  if (!map.hasLayer(crashLayer)) crashLayer.addTo(map);
}

function drawCorridor(group = null) {
  corridorLayer.clearLayers();
  allCorridors.filter(feature => group === null || feature.properties.candidate_group === group).forEach(feature => {
    L.geoJSON(feature, { style: { color: '#d95f02', weight: 6, opacity: .85 } })
      .bindTooltip(`${esc(feature.properties.roads)} — ${feature.properties.crashes} crashes`)
      .addTo(corridorLayer);
  });
  if (group === null && map.hasLayer(corridorLayer)) map.removeLayer(corridorLayer);
  if (group !== null && !map.hasLayer(corridorLayer)) corridorLayer.addTo(map);
}

function fitToVisible(group = null) {
  const features = allCrashes.filter(f => group === null || f.properties.candidate_group === group);
  const coords = features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
  if (group !== null) allCorridors.filter(f => f.properties.candidate_group === group).forEach(f => {
    const bounds = L.geoJSON(f).getBounds();
    if (bounds.isValid()) coords.push(bounds.getNorthWest(), bounds.getSouthEast());
  });
  if (coords.length) map.fitBounds(coords, { padding: [30, 30], maxZoom: group === null ? 12 : 14 });
}

function activate(group, step) {
  steps.forEach(s => s.classList.toggle('is-active', s === step));
  drawCrashPoints(group);
  drawCorridor(group);
  fitToVisible(group);
}

function buildSteps(stats, corridors) {
  const container = document.getElementById('steps');
  const overview = document.createElement('article');
  overview.className = 'step is-active';
  overview.dataset.group = 'overview';
  overview.innerHTML = `<div class="count">San Antonio bicyclist crashes</div><h1>Where bicyclists are being killed and seriously injured</h1><p>${stats.crashes} crashes involving ${stats.bicyclists} bicyclists were reported from Jan. 1, 2024, through Sept. 1, 2026. Scroll to zoom into repeat-crash stretches.</p>`;
  container.appendChild(overview);
  steps = [overview];
  corridors.forEach(feature => {
    const p = feature.properties;
    const step = document.createElement('article');
    step.className = 'step';
    step.dataset.group = p.candidate_group;
    const outcome = p.deaths ? `${p.deaths} death${p.deaths === 1 ? '' : 's'} and ${p.serious_injuries} serious injur${p.serious_injuries === 1 ? 'y' : 'ies'}` : `${p.serious_injuries} suspected serious injuries`;
    step.innerHTML = `<div class="count">Candidate stretch ${p.display_order}</div><h2>${esc(p.roads)}</h2><p>${p.crashes} crashes produced ${outcome} between ${p.first_year} and ${p.last_year}.</p><p class="muted">From ${esc(p.from_streets)} to ${esc(p.to_streets)}.</p>`;
    container.appendChild(step);
    steps.push(step);
  });
}

async function start() {
  map = L.map('map', { scrollWheelZoom: false }).setView([29.4241, -98.4936], 11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  try {
    const [stats, crashes, corridors] = await Promise.all(Object.values(DATA).map(path => fetch(path).then(r => { if (!r.ok) throw new Error(`${path} returned ${r.status}`); return r.json(); })));
    allCrashes = crashes.features.filter(f => f.geometry && f.geometry.coordinates);
    allCorridors = corridors.features;
    buildSteps(stats, allCorridors.sort((a,b) => a.properties.display_order - b.properties.display_order));
    drawCrashPoints();
    fitToVisible();
    document.getElementById('map-status').textContent = `${stats.mapped_points} mapped points · ${stats.corridors} candidate stretches`;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) activate(entry.target.dataset.group === 'overview' ? null : Number(entry.target.dataset.group), entry.target);
    }), { rootMargin: '-35% 0px -45% 0px', threshold: 0 });
    steps.forEach(step => observer.observe(step));
  } catch (error) {
    console.error(error);
    const panel = document.getElementById('load-error');
    panel.hidden = false;
    panel.textContent = `The map data could not load: ${error.message}. Check that the files under data/ were deployed with the page.`;
    document.getElementById('map-status').textContent = 'Map data failed to load';
  }
}

start();
