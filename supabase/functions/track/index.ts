// @ts-nocheck
// supabase/functions/track/index.ts
// Live location tracking web page served as an Edge Function
// Contact opens: https://[project].supabase.co/functions/v1/track?id=SESSION_ID

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON   = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOOGLE_MAPS_KEY  = Deno.env.get("GOOGLE_MAPS_KEY") || "";

Deno.serve(async (req) => {
  const url       = new URL(req.url);
  const sessionId = url.searchParams.get("id");

  if (!sessionId) {
    return new Response("Missing session ID", { status: 400 });
  }

  // Fetch initial location
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: session, error } = await supabase
    .from("live_sessions")
    .select("lat, lng, is_active, started_at")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return new Response("Session not found or expired.", { status: 404 });
  }

  const startTime = new Date(session.started_at).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit"
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ShieldHer — Live Location</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #f0f6fc; }
    #header { padding: 16px 20px; background: #161b22; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 12px; }
    #shield { width: 36px; height: 36px; background: #8b5cf6; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    #title { font-weight: 700; font-size: 16px; color: #f0f6fc; }
    #subtitle { font-size: 12px; color: #8b949e; margin-top: 2px; }
    #status-bar { padding: 10px 20px; background: ${session.is_active ? "rgba(34,197,94,0.1)" : "rgba(139,92,246,0.1)"}; border-bottom: 1px solid ${session.is_active ? "rgba(34,197,94,0.2)" : "rgba(139,92,246,0.2)"}; display: flex; align-items: center; gap: 8px; font-size: 13px; }
    #status-dot { width: 8px; height: 8px; border-radius: 50%; background: ${session.is_active ? "#22c55e" : "#8b5cf6"}; ${session.is_active ? "animation: pulse 1.5s infinite;" : ""} }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
    #map { width: 100%; height: calc(100vh - 160px); }
    #footer { padding: 12px 20px; background: #161b22; text-align: center; font-size: 11px; color: #8b949e; }
    #ended-banner { display: none; padding: 20px; text-align: center; background: rgba(34,197,94,0.1); margin: 16px; border-radius: 12px; border: 1px solid rgba(34,197,94,0.3); }
    #ended-banner h2 { color: #22c55e; font-size: 20px; margin-bottom: 8px; }
    #ended-banner p { color: #8b949e; font-size: 13px; }
  </style>
</head>
<body>
  <div id="header">
    <div id="shield">🛡️</div>
    <div>
      <div id="title">ShieldHer Live Location</div>
      <div id="subtitle">Escort started at ${startTime}</div>
    </div>
  </div>
  <div id="status-bar">
    <div id="status-dot"></div>
    <span id="status-text">${session.is_active ? "Live tracking active — updates every 2 seconds" : "Journey completed safely ✅"}</span>
  </div>
  <div id="ended-banner" ${!session.is_active ? 'style="display:block"' : ""}>
    <h2>✅ Arrived Safely</h2>
    <p>The live escort session has ended.<br/>Your contact has completed their journey safely.</p>
  </div>
  <div id="map"></div>
  <div id="footer">Powered by ShieldHer • Link is valid while the escort session is active</div>

  <script>
    const SESSION_ID   = "${sessionId}";
    const SUPABASE_URL = "${SUPABASE_URL}";
    const SUPABASE_KEY = "${SUPABASE_ANON}";
    const GOOGLE_KEY   = "${GOOGLE_MAPS_KEY}";
    let map, marker, isActive = ${session.is_active};
    let lat = ${session.lat || 0}, lng = ${session.lng || 0};

    async function fetchLocation() {
      const res = await fetch(
        \`\${SUPABASE_URL}/rest/v1/live_sessions?id=eq.\${SESSION_ID}&select=lat,lng,is_active\`,
        { headers: { apikey: SUPABASE_KEY, Authorization: \`Bearer \${SUPABASE_KEY}\` } }
      );
      const data = await res.json();
      if (!data || !data[0]) return;
      const session = data[0];
      lat = session.lat; lng = session.lng; isActive = session.is_active;
      if (map && marker) {
        const pos = { lat, lng };
        marker.setPosition(pos);
        // Only pan if user hasn't manually panned
        if (!userPanned) map.panTo(pos);
      }
      if (!isActive) {
        document.getElementById("status-dot").style.animation = "none";
        document.getElementById("status-dot").style.background = "#8b5cf6";
        document.getElementById("status-text").textContent = "Journey completed safely ✅";
        document.getElementById("ended-banner").style.display = "block";
        document.getElementById("map").style.height = "calc(100vh - 330px)";
        clearInterval(pollInterval);
      }
    }

    let userPanned = false;
    let pollInterval;

    function initMap() {
      const pos = { lat, lng };
      map = new google.maps.Map(document.getElementById("map"), {
        center: pos,
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {elementType:"geometry",stylers:[{color:"#212121"}]},
          {elementType:"labels.text.fill",stylers:[{color:"#757575"}]},
          {featureType:"road",elementType:"geometry",stylers:[{color:"#383838"}]},
          {featureType:"water",elementType:"geometry",stylers:[{color:"#000000"}]}
        ],
        disableDefaultUI: false,
        zoomControl: true,
      });
      map.addListener("dragstart", () => { userPanned = true; });
      marker = new google.maps.Marker({
        position: pos,
        map,
        title: "Live Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#8b5cf6",
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: "#ffffff",
        }
      });
      // Start polling every 2 seconds
      if (isActive) {
        pollInterval = setInterval(fetchLocation, 2000);
      }
    }

    // Load Google Maps
    const script = document.createElement("script");
    script.src = \`https://maps.googleapis.com/maps/api/js?key=\${GOOGLE_KEY}&callback=initMap\`;
    script.async = true;
    document.head.appendChild(script);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
});
