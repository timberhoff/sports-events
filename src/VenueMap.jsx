// src/VenueMap.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function VenueMap() {
  const { id } = useParams();
  const [venue, setVenue] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/venues/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setVenue(await res.json());
      } catch (e) {
        setErr(String(e.message || e));
      }
    })();
  }, [id]);

  if (err) return <div style={{ padding: 16 }}>Error: {err}</div>;
  if (!venue) return <div style={{ padding: 16 }}>Loading…</div>;
  if (venue.lat == null || venue.lng == null)
    return (
      <div style={{ padding: 16 }}>No coordinates for this venue yet.</div>
    );

  const pos = [Number(venue.lat), Number(venue.lng)];

  return (
    <div style={{ height: "100vh" }}>
      <div style={{ padding: 10 }}>
        <Link to="/">← Back</Link> &nbsp; <strong>{venue.name}</strong>
      </div>

      <MapContainer
        center={pos}
        zoom={14}
        style={{ height: "calc(100vh - 44px)" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={pos}>
          <Popup>
            <div>
              <div>
                <strong>{venue.name}</strong>
              </div>
              {venue.website_url ? (
                <a href={venue.website_url} target="_blank" rel="noreferrer">
                  Website
                </a>
              ) : null}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
