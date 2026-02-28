import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";

/** Click-on-map to pick user location */
function PickLocation({ enabled, onPick }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Safe formatter for your popup */
function formatEventDateTime(e) {
  // Your dates are ISO strings from MySQL like "2026-03-08T22:00:00.000Z"
  const datePart = e?.date ? String(e.date).slice(0, 10) : "";
  const timePart = e?.time ? String(e.time).slice(0, 5) : "";
  return `${datePart}${timePart ? " " + timePart : ""}`.trim();
}

/** Group events by coordinate so one marker can represent many events */
function groupByPoint(eventsWithPoints) {
  const map = new Map();

  for (const e of eventsWithPoints || []) {
    if (!e?.point) continue;

    // Round to avoid tiny decimal differences creating separate markers
    const lat = Number(e.point.lat);
    const lng = Number(e.point.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        point: { lat, lng },
        pointSource: e.pointSource,
        venue: e.venue,
        city: e.city,
        events: [],
      });
    }

    map.get(key).events.push(e);
  }

  // Sort events in each popup by date/time
  for (const g of map.values()) {
    g.events.sort((a, b) => {
      const aDT = new Date(
        `${String(a.date).slice(0, 10)}T${a.time || "00:00"}`
      );
      const bDT = new Date(
        `${String(b.date).slice(0, 10)}T${b.time || "00:00"}`
      );
      return aDT - bDT;
    });
  }

  return Array.from(map.values());
}

export default function EventsMap({
  groups, // optional (if you pre-group in Homepage)
  eventsWithPoints, // optional (if you pass raw events)
  userPos,
  pickMode,
  onPickUserPos,
  radiusKm,
}) {
  const estoniaCenter = { lat: 58.7, lng: 25.0 };

  // Decide what to render: prefer `groups` prop, otherwise group `eventsWithPoints`
  const finalGroups = groups?.length ? groups : groupByPoint(eventsWithPoints);

  const center =
    userPos ||
    finalGroups[0]?.point ||
    eventsWithPoints?.[0]?.point ||
    estoniaCenter;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          height: 360,
          width: "100%",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <MapContainer
          center={center}
          zoom={7}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <PickLocation enabled={pickMode} onPick={onPickUserPos} />

          {userPos && (
            <>
              <Marker position={userPos}>
                <Popup>
                  <b>Your location</b>
                  <div>
                    {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
                  </div>
                </Popup>
              </Marker>

              <Circle center={userPos} radius={radiusKm * 1000} />
            </>
          )}

          {/* One marker per coordinate-group */}
          {finalGroups.map((g) => (
            <Marker key={g.key} position={g.point}>
              <Popup>
                <div style={{ maxWidth: 340 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>
                    {g.venue || "Unknown venue"} {g.city ? `(${g.city})` : ""}
                  </div>

                  {/* Scrollable list if many events */}
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: "auto",
                      paddingRight: 6,
                    }}
                  >
                    {g.events.map((e) => (
                      <div
                        key={e.id ?? `${e.source}-${e.source_event_id}`}
                        style={{
                          padding: "6px 0",
                          borderBottom: "1px solid rgba(0,0,0,0.12)",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{e.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                          {formatEventDateTime(e)}
                          {e.subtitle ? ` — ${e.subtitle}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    {g.events.length} event{g.events.length !== 1 ? "s" : ""}{" "}
                    here •{" "}
                    {g.pointSource === "venue" ? "Venue coords" : "City coords"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
