/* ============================================================
   PHOTO SIZES — serve listing photos at the size they're shown
   ------------------------------------------------------------
   pcImg(url, width) turns a Supabase photo address into a
   Cloudflare-resized copy (e.g. 600px wide WebP for a card),
   instead of the full 3–5 MB original.

   It only switches on when ENABLED is true AND the page is on
   performanceconnect.ca. Before turning it on, in Cloudflare:
     1. Images > Transformations > performanceconnect.ca > Enable
     2. Same page > Sources > Add origin:
        myapluhgfpnyjsfrflhd.supabase.co
   Free plan: 5,000 unique resized copies a month.
   ============================================================ */
(function(){
  var ENABLED = false;
  var STORAGE = 'https://myapluhgfpnyjsfrflhd.supabase.co/storage/v1/object/public/';
  var HOSTS = { 'performanceconnect.ca':1, 'www.performanceconnect.ca':1 };

  window.pcImg = function(url, width){
    url = String(url || '');
    if (!ENABLED || !HOSTS[location.hostname] || url.indexOf(STORAGE) !== 0) return url;
    return '/cdn-cgi/image/width=' + (width || 800) + ',quality=80,format=auto,fit=scale-down/' + url;
  };
})();
