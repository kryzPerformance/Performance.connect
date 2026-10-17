/* ============================================================
   AFFILIATE SERVICES — one shared list
   ------------------------------------------------------------
   Loaded by affiliates.html (map filters + popups), admin.html and
   affiliate-add.html (the "Add affiliate" forms).

   Each shop in affiliates.json has:
     "cat":      its main type — sets the pin's icon and colour
     "services": every service it offers — drives the filter pills

   To add a new service: add one line below. The map shows a filter
   pill for a service as soon as at least one shop lists it.
   ============================================================ */
window.PC_SERVICES = [
  { id: 'tuning',     label: 'Performance Tuning' },
  { id: 'repair',     label: 'Repairs & Maintenance' },
  { id: 'diag',       label: 'Diagnostics' },
  { id: 'collision',  label: 'Collision & Body' },
  { id: 'paint',      label: 'Paint & Restoration' },
  { id: 'protect',    label: 'Wraps, PPF & Ceramic' },
  { id: 'audio',      label: 'Car Audio' },
  { id: 'electrical', label: 'Remote Starts & Alarms' },
  { id: 'ev',         label: 'EV & Tesla' },
  { id: 'parts',      label: 'Performance Parts' },
  { id: 'truck',      label: 'Truck & Fleet' },
  { id: 'tires',      label: 'Tires & Wheels' },
  { id: 'tools',      label: 'Tools & Equipment' },
  { id: 'sales',      label: 'Vehicle Sales' }
];

/* Shops added before services existed only have "cat".
   This gives them a sensible service so they still show in filters. */
window.PC_SERVICE_FALLBACK = {
  oem: ['sales'], dealer: ['sales'], perf: ['tuning'], after: ['parts'],
  body: ['collision'], tire: ['tires'], tool: ['tools'], spec: []
};

window.pcServicesFor = function (loc) {
  if (loc && Array.isArray(loc.services) && loc.services.length) return loc.services;
  return (loc && window.PC_SERVICE_FALLBACK[loc.cat]) || [];
};

window.pcServiceLabel = function (id) {
  for (var i = 0; i < window.PC_SERVICES.length; i++) {
    if (window.PC_SERVICES[i].id === id) return window.PC_SERVICES[i].label;
  }
  return id;
};
