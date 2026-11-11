/* ============================================================
   FITMENT DROPDOWNS — makes, models, wheel and tire specs
   ------------------------------------------------------------
   Loaded by marketplace.html. Turns plain text/number inputs into
   dropdowns without changing the inputs themselves: each dropdown
   writes its choice back into the original input (and fires an
   "input" event), so the rest of the page keeps reading
   input.value exactly as before. Picking "Other…" shows the
   original input so people can type something not in the list.

   To add a make or model: add it to PC_FIT.MAKES below.
   ============================================================ */
(function(){
  var MAKES = {
    'Acura': ['CL','CSX','ILX','Integra','MDX','NSX','RDX','RL','RSX','TL','TLX','TSX','ZDX'],
    'Alfa Romeo': ['4C','Giulia','Stelvio','Tonale'],
    'Aston Martin': ['DB11','DB9','DBX','Vantage'],
    'Audi': ['A3','A4','A5','A6','A7','A8','Q3','Q5','Q7','Q8','R8','RS3','RS4','RS5','RS6','RS7','S3','S4','S5','S6','S7','SQ5','SQ7','SQ8','TT','TT RS','e-tron GT'],
    'Bentley': ['Bentayga','Continental GT','Flying Spur'],
    'BMW': ['1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','8 Series','i4','i8','M2','M3','M4','M5','M6','M8','X1','X2','X3','X3 M','X4','X5','X5 M','X6','X6 M','X7','Z3','Z4'],
    'Buick': ['Enclave','Encore','Envision','Grand National','Regal','Regal GS'],
    'Cadillac': ['ATS','ATS-V','CT4','CT4-V','CT5','CT5-V','CTS','CTS-V','Escalade','XT4','XT5','XT6'],
    'Chevrolet': ['Blazer','Camaro','Colorado','Corvette','Cruze','Equinox','Impala','Malibu','Silverado 1500','Silverado 2500HD','SS','Suburban','Tahoe','Trailblazer','Trax'],
    'Chrysler': ['300','300C','Crossfire','Pacifica'],
    'Dodge': ['Challenger','Charger','Dart','Durango','Hornet','Journey','Magnum','Neon SRT-4','Viper'],
    'Ferrari': ['296','458','488','812','California','F8','Portofino','Roma','SF90'],
    'Fiat': ['124 Spider','500','500 Abarth'],
    'Ford': ['Bronco','Bronco Sport','Edge','Escape','Expedition','Explorer','F-150','F-150 Raptor','F-250','Fiesta ST','Focus','Focus RS','Focus ST','GT','Maverick','Mustang','Mustang Mach-E','Ranger'],
    'Genesis': ['G70','G80','G90','GV60','GV70','GV80','Genesis Coupe'],
    'GMC': ['Acadia','Canyon','Sierra 1500','Sierra 2500HD','Terrain','Yukon'],
    'Honda': ['Accord','Civic','Civic Si','Civic Type R','CR-V','CR-Z','Del Sol','Element','Fit','HR-V','Insight','Integra','NSX','Odyssey','Passport','Pilot','Prelude','Ridgeline','S2000'],
    'Hyundai': ['Elantra','Elantra N','Genesis Coupe','Ioniq 5','Ioniq 5 N','Kona','Kona N','Palisade','Santa Fe','Sonata','Tiburon','Tucson','Veloster','Veloster N'],
    'Infiniti': ['FX35','FX45','G35','G37','M35','M37','Q50','Q60','QX50','QX56','QX60','QX80'],
    'Jaguar': ['E-Pace','F-Pace','F-Type','XE','XF','XJ'],
    'Jeep': ['Cherokee','Compass','Gladiator','Grand Cherokee','Grand Cherokee SRT','Grand Cherokee Trackhawk','Renegade','Wrangler'],
    'Kia': ['EV6','Forte','K5','Optima','Seltos','Sorento','Soul','Sportage','Stinger','Telluride'],
    'Lamborghini': ['Aventador','Gallardo','Huracan','Revuelto','Urus'],
    'Land Rover': ['Defender','Discovery','Range Rover','Range Rover Sport','Range Rover Velar'],
    'Lexus': ['ES','GS','GX','IS','IS 300','IS 350','IS 500','IS F','LC','LS','LX','NX','RC','RC F','RX','SC'],
    'Lincoln': ['Aviator','Continental','MKZ','Navigator'],
    'Lotus': ['Elise','Emira','Evora','Exige'],
    'Maserati': ['Ghibli','GranTurismo','Levante','MC20','Quattroporte'],
    'Mazda': ['CX-30','CX-5','CX-50','CX-9','CX-90','Mazda3','Mazda6','Mazdaspeed3','Mazdaspeed6','MX-5 Miata','RX-7','RX-8'],
    'McLaren': ['570S','600LT','720S','750S','Artura','GT'],
    'Mercedes-Benz': ['A-Class','AMG GT','C-Class','C 43 AMG','C 63 AMG','CLA','CLA 45 AMG','CLS','E-Class','E 63 AMG','G-Class','G 63 AMG','GLA','GLC','GLE','GLS','S-Class','SL','SLK'],
    'MINI': ['Clubman','Cooper','Cooper S','Countryman','John Cooper Works'],
    'Mitsubishi': ['3000GT','Eclipse','Eclipse Cross','Lancer','Lancer Evolution','Lancer Ralliart','Outlander','RVR'],
    'Nissan': ['180SX','240SX','300ZX','350Z','370Z','Altima','Frontier','GT-R','Juke','Maxima','Pathfinder','Rogue','Sentra','Sentra SE-R','Silvia','Skyline','Titan','Z'],
    'Polestar': ['Polestar 1','Polestar 2'],
    'Pontiac': ['Firebird','G8','GTO','Solstice'],
    'Porsche': ['718 Boxster','718 Cayman','911','Boxster','Cayenne','Cayman','Macan','Panamera','Taycan'],
    'Ram': ['1500','1500 TRX','2500','3500'],
    'Rolls-Royce': ['Cullinan','Ghost','Wraith'],
    'Scion': ['FR-S','tC','xB'],
    'Subaru': ['BRZ','Crosstrek','Forester','Impreza','Legacy','Outback','WRX','WRX STI'],
    'Suzuki': ['Swift','SX4'],
    'Tesla': ['Model 3','Model S','Model X','Model Y'],
    'Toyota': ['4Runner','86','Camry','Celica','Corolla','Corolla Hatchback','GR Corolla','GR86','GR Supra','Highlander','Land Cruiser','MR2','RAV4','Sequoia','Sienna','Supra','Tacoma','Tundra'],
    'Volkswagen': ['Arteon','Atlas','Beetle','Golf','Golf GTI','Golf R','Jetta','Jetta GLI','Passat','Tiguan'],
    'Volvo': ['S60','S90','V60','XC40','XC60','XC90']
  };

  function range(from, to, step, fmt){
    var out = [];
    for(var v = from; step > 0 ? v <= to + 1e-9 : v >= to - 1e-9; v += step){
      var n = Math.round(v * 10) / 10;
      out.push([String(n), fmt ? fmt(n) : String(n)]);
    }
    return out;
  }
  var thisYear = new Date().getFullYear();

  var PC_FIT = window.PC_FIT = {
    MAKES: MAKES,
    makes: function(){ return Object.keys(MAKES).map(function(m){ return [m, m]; }); },
    models: function(make){ return (MAKES[make] || []).map(function(m){ return [m, m]; }); },
    PS_MAKES: ['Aprilia','Arctic Cat','BMW','Can-Am','CFMOTO','Ducati','Harley-Davidson','Honda','Husqvarna','Indian','Kawasaki','KTM','Lynx','Polaris','Royal Enfield','Sea-Doo','Segway','Ski-Doo','Suzuki','Triumph','Yamaha'].map(function(m){ return [m, m]; }),
    YEARS: range(thisYear + 1, 1960, -1),
    BOLTS: ['4x98','4x100','4x108','4x114.3','5x98','5x100','5x105','5x108','5x110','5x112','5x114.3','5x115','5x120','5x120.7','5x127','5x130','5x135','5x139.7','6x114.3','6x120','6x135','6x139.7','8x165.1','8x170'].map(function(b){ return [b, b]; }),
    DIAMETERS: range(13, 24, 1, function(n){ return n + '"'; }),
    WIDTHS: range(5, 13, 0.5, function(n){ return n + '"'; }),
    OFFSETS: range(-45, 65, 1, function(n){ return n > 0 ? '+' + n : String(n); }),
    BORES: ['54.1','56.1','56.6','57.1','60.1','63.4','64.1','66.1','66.5','66.6','67.1','70.1','70.3','71.5','71.6','72.6','73.1','74.1','78.1','84.1','87.1','106.1','108'].map(function(b){ return [b, b + ' mm']; }),
    TIRE_WIDTHS: range(135, 355, 10),
    TIRE_ASPECTS: range(25, 80, 5),
    TIRE_RIMS: range(13, 24, 1, function(n){ return 'R' + n; })
  };

  var controllers = [];

  function fire(el){
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
  }
  function fillOptions(sel, opts, placeholder, allowOther){
    sel.innerHTML = '';
    var p = document.createElement('option'); p.value = ''; p.textContent = placeholder; sel.appendChild(p);
    opts.forEach(function(o){ var e = document.createElement('option'); e.value = o[0]; e.textContent = o[1]; sel.appendChild(e); });
    if(allowOther){ var x = document.createElement('option'); x.value = '__other'; x.textContent = 'Other…'; sel.appendChild(x); }
  }
  function hasOption(sel, v){
    for(var i = 0; i < sel.options.length; i++){ if(sel.options[i].value === v) return true; }
    return false;
  }

  /* One input -> one dropdown. opts: array of [value,label] or a function returning one. */
  PC_FIT.select = function(input, opts, settings){
    if(!input || input._pcfit) return input && input._pcfit;
    settings = settings || {};
    var placeholder = settings.placeholder || 'Select';
    var allowOther = settings.other !== false;
    var sel = document.createElement('select');
    sel.className = 'pcfit-select';
    sel.setAttribute('aria-label', settings.label || input.getAttribute('aria-label') || placeholder);
    input.parentNode.insertBefore(sel, input);
    var typedPh = input.getAttribute('placeholder') || '';

    function getOpts(){ return typeof opts === 'function' ? opts() : opts; }
    function showInput(show){
      input.style.display = show ? '' : 'none';
      if(show){ input.classList.add('pcfit-other'); input.setAttribute('placeholder', 'Type it — ' + typedPh); }
    }
    var ctl = {
      sel: sel, input: input,
      refresh: function(){ fillOptions(sel, getOpts(), placeholder, allowOther); ctl.syncFromInput(); },
      syncFromInput: function(){
        var v = String(input.value || '').trim();
        if(!v){ sel.value = ''; showInput(false); return; }
        if(hasOption(sel, v)){ sel.value = v; showInput(false); }
        else if(allowOther){ sel.value = '__other'; showInput(true); }
        else { sel.value = ''; showInput(false); }
      },
      clear: function(){ input.value = ''; ctl.syncFromInput(); }
    };
    sel.addEventListener('change', function(){
      if(sel.value === '__other'){ input.value = ''; showInput(true); input.focus(); }
      else { input.value = sel.value; showInput(false); }
      fire(input);
      if(settings.onChange) settings.onChange(sel.value);
    });
    input._pcfit = ctl;
    controllers.push(ctl);
    ctl.refresh();
    return ctl;
  };

  /* Make + model pair: the model list follows the chosen make. */
  PC_FIT.makeModel = function(makeInput, modelInput, settings){
    settings = settings || {};
    var modelCtl;
    var makeCtl = PC_FIT.select(makeInput, PC_FIT.makes(), {
      placeholder: settings.makePlaceholder || 'Select make', label: 'Make',
      onChange: function(){ modelInput.value = ''; modelCtl.refresh(); fire(modelInput); }
    });
    modelCtl = PC_FIT.select(modelInput, function(){ return PC_FIT.models(makeInput.value); }, {
      placeholder: settings.modelPlaceholder || 'Select model', label: 'Model'
    });
    makeInput.addEventListener('input', function(){ if(document.activeElement === makeInput){ modelCtl.refresh(); } });
    return { make: makeCtl, model: modelCtl };
  };

  /* Tire size: width / aspect R rim, written into one input as "225/40R18". */
  PC_FIT.tireSize = function(input, settings){
    if(!input || input._pcfit) return input && input._pcfit;
    settings = settings || {};
    var row = document.createElement('div');
    row.className = 'pcfit-tire';
    var parts = [
      ['Width', PC_FIT.TIRE_WIDTHS, 'Tire width'],
      ['Aspect', PC_FIT.TIRE_ASPECTS, 'Aspect ratio'],
      ['Rim', PC_FIT.TIRE_RIMS, 'Rim diameter']
    ].map(function(p){
      var s = document.createElement('select');
      s.className = 'pcfit-select';
      s.setAttribute('aria-label', p[2]);
      fillOptions(s, p[1], p[0], false);
      row.appendChild(s);
      return s;
    });
    input.parentNode.insertBefore(row, input);
    input.style.display = 'none';
    function compose(){
      var w = parts[0].value, a = parts[1].value, r = parts[2].value;
      input.value = (w && a && r) ? (w + '/' + a + 'R' + r) : '';
      input._partial = !!(w || a || r) && !input.value;
      fire(input);
    }
    parts.forEach(function(s){ s.addEventListener('change', compose); });
    var ctl = {
      sel: parts[0], input: input, parts: parts,
      refresh: function(){ ctl.syncFromInput(); },
      syncFromInput: function(){
        var m = String(input.value || '').match(/(\d{3})\s*\/\s*(\d{2})\s*Z?R?\s*(\d{2})/i);
        parts[0].value = m && hasOption(parts[0], m[1]) ? m[1] : '';
        parts[1].value = m && hasOption(parts[1], m[2]) ? m[2] : '';
        parts[2].value = m && hasOption(parts[2], m[3]) ? m[3] : '';
        input._partial = false;
      },
      clear: function(){ input.value = ''; ctl.syncFromInput(); }
    };
    input._pcfit = ctl;
    controllers.push(ctl);
    ctl.syncFromInput();
    return ctl;
  };

  /* After code sets input values directly (form reset, saved filters), re-sync the dropdowns. */
  PC_FIT.syncAll = function(){ controllers.forEach(function(c){ c.refresh(); }); };

  /* Parse "245/40R18" -> {w:'245', a:'40', r:'18'} */
  PC_FIT.parseTire = function(s){
    var m = String(s || '').match(/(\d{3})\s*\/\s*(\d{2})\s*Z?R?\s*(\d{2})/i);
    return m ? { w:m[1], a:m[2], r:m[3] } : null;
  };
})();
