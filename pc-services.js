/* ============================================================
   AFFILIATE SERVICES & BUSINESS TYPES — one shared list
   ------------------------------------------------------------
   Loaded by affiliates.html (map + list), admin.html and
   affiliate-add.html (the "Add affiliate" forms).

   Each shop in affiliates.json has:
     "type":     one business type below — sets its pin ring colour
     "services": every service it offers (ids below) — drives filters
     "logo":     path to its logo, e.g. assets/affiliates/<name>.webp

   To add a service: add it to the right group below. The map only
   shows a group or service once at least one shop offers it.
   (Plan: this list moves into Supabase with the affiliates rebuild.)
   ============================================================ */
window.PC_BUSINESS_TYPES = [
  { id: 'garage',   label: 'Shop / Garage',       color: '#3DC9F0' },
  { id: 'body',     label: 'Body & Paint',        color: '#FF8C42' },
  { id: 'studio',   label: 'Studio / Specialist', color: '#FFD600' },
  { id: 'retail',   label: 'Retailer',            color: '#B34DFF' },
  { id: 'dealer',   label: 'Dealer',              color: '#7CFF6B' },
  { id: 'mobile',   label: 'Mobile Service',      color: '#FF4DA6' },
  { id: 'provider', label: 'Service Provider',    color: '#8FA0A6' },
  { id: 'venue',    label: 'Track / Venue',       color: '#FF5A5A' }
];

window.PC_SERVICE_GROUPS = [
  { id: 'perf', label: 'Performance & Tuning', services: [
    ['ecu', 'ECU tuning & remaps'], ['dyno', 'Dyno tuning'], ['forced', 'Turbo & supercharger installs'],
    ['engine', 'Engine builds & swaps'], ['exhaust', 'Exhaust & intake'], ['fuel', 'Fuel systems & E85'],
    ['trans', 'Transmission & clutch'], ['evperf', 'EV performance'], ['trackprep', 'Motorsport & track prep'] ] },
  { id: 'chassis', label: 'Suspension, Brakes & Alignment', services: [
    ['coilovers', 'Coilovers & lowering'], ['air', 'Air suspension'], ['lift', 'Lift kits'],
    ['align', 'Performance alignment'], ['bbk', 'Big brake kits'], ['brakes', 'Brake service'] ] },
  { id: 'wheels', label: 'Wheels & Tires', services: [
    ['tiresales', 'Tire sales'], ['mount', 'Mount & balance'], ['swap', 'Seasonal swaps & storage'],
    ['wheelrepair', 'Wheel repair & refinishing'], ['powder', 'Powder coating'], ['fitment', 'Custom fitment'] ] },
  { id: 'repair', label: 'Repair & Maintenance', services: [
    ['mechanical', 'General mechanical'], ['oil', 'Oil & fluids'], ['diag', 'Diagnostics'],
    ['electrical', 'Electrical repair'], ['ac', 'A/C'], ['safety', 'Safety certificates & inspections'],
    ['evservice', 'Hybrid & EV service'], ['truck', 'Truck & heavy-duty'], ['fleet', 'Fleet'] ] },
  { id: 'body', label: 'Body, Paint & Collision', services: [
    ['collision', 'Collision & insurance claims'], ['paint', 'Paint & custom paint'], ['resto', 'Restoration'],
    ['rust', 'Rust repair'], ['pdr', 'Paintless dent repair'], ['bumper', 'Bumper & plastic repair'],
    ['glass', 'Glass & windshields'], ['aero', 'Body kits & aero install'] ] },
  { id: 'appearance', label: 'Appearance & Protection', services: [
    ['detail', 'Detailing'], ['correction', 'Paint correction'], ['ceramic', 'Ceramic coating'],
    ['ppf', 'PPF'], ['wrap', 'Vinyl wraps & colour change'], ['tint', 'Window tint'], ['chromedelete', 'Chrome delete'] ] },
  { id: 'electronics', label: 'Interior, Audio & Electronics', services: [
    ['audio', 'Car audio'], ['remote', 'Remote starters & alarms'], ['security', 'Security & trackers'],
    ['lighting', 'Lighting'], ['dashcam', 'Dash cams'], ['headunit', 'Head units & CarPlay'], ['upholstery', 'Upholstery & interior trim'] ] },
  { id: 'fab', label: 'Fabrication & Custom', services: [
    ['welding', 'Welding & metal fab'], ['exhaustfab', 'Exhaust fabrication'], ['custom', 'Custom builds'],
    ['cage', 'Roll cages'], ['carbon', 'Carbon & 3D-printed parts'] ] },
  { id: 'parts', label: 'Parts & Supplies', services: [
    ['perfparts', 'Performance parts'], ['oemparts', 'OEM parts'], ['usedparts', 'Used parts & part-outs'],
    ['tools', 'Tools & equipment'], ['supplies', 'Fluids & detailing supplies'] ] },
  { id: 'sales', label: 'Buy, Sell & Import', services: [
    ['dealer', 'Vehicle sales'], ['consign', 'Consignment'], ['finance', 'Financing'],
    ['import', 'JDM & import specialists'], ['ppi', 'Pre-purchase inspections'], ['appraisal', 'Appraisals'] ] },
  { id: 'storage', label: 'Storage & Transport', services: [
    ['winter', 'Winter storage'], ['tow', 'Towing & flatbed'], ['enclosed', 'Enclosed transport'], ['diy', 'DIY bays & garage rentals'] ] },
  { id: 'track', label: 'Track, Media & Experiences', services: [
    ['trackdays', 'Track day organizers'], ['school', 'Driving schools'], ['karting', 'Karting'],
    ['photo', 'Car photography & video'], ['venue', 'Event venues'] ] }
];

/* Flat list + lookups (built from the groups above) */
window.PC_SERVICES = [];
window.PC_SERVICE_INDEX = {};
window.PC_SERVICE_GROUPS.forEach(function (g) {
  g.services = g.services.map(function (s) { return { id: s[0], label: s[1], group: g.id }; });
  g.services.forEach(function (s) { window.PC_SERVICES.push(s); window.PC_SERVICE_INDEX[s.id] = s; });
});

/* Shops saved before the 12 groups existed used older ids — map them across. */
window.PC_LEGACY_SERVICES = {
  tuning: ['ecu'], repair: ['mechanical'], diag: ['diag'], collision: ['collision'],
  paint: ['paint', 'resto'], protect: ['wrap', 'ppf', 'ceramic'], audio: ['audio'],
  electrical: ['remote', 'electrical'], ev: ['evperf'], parts: ['perfparts'],
  truck: ['truck'], tires: ['tiresales'], tools: ['tools'], sales: ['dealer']
};
window.PC_LEGACY_TYPES = {
  perf: 'garage', body: 'body', spec: 'studio', after: 'retail', tire: 'retail',
  tool: 'retail', oem: 'dealer', dealer: 'dealer'
};

window.pcServicesFor = function (loc) {
  var out = [], seen = {};
  ((loc && loc.services) || []).forEach(function (id) {
    var ids = window.PC_SERVICE_INDEX[id] ? [id] : (window.PC_LEGACY_SERVICES[id] || []);
    ids.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
  });
  return out;
};

window.pcTypeFor = function (loc) {
  var id = (loc && loc.type) || window.PC_LEGACY_TYPES[loc && loc.cat] || 'garage';
  for (var i = 0; i < window.PC_BUSINESS_TYPES.length; i++) {
    if (window.PC_BUSINESS_TYPES[i].id === id) return window.PC_BUSINESS_TYPES[i];
  }
  return window.PC_BUSINESS_TYPES[0];
};

window.pcServiceLabel = function (id) {
  return window.PC_SERVICE_INDEX[id] ? window.PC_SERVICE_INDEX[id].label : id;
};

window.pcGroupLabel = function (id) {
  for (var i = 0; i < window.PC_SERVICE_GROUPS.length; i++) {
    if (window.PC_SERVICE_GROUPS[i].id === id) return window.PC_SERVICE_GROUPS[i].label;
  }
  return id;
};
