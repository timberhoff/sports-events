import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:3001";

export default function AdminVenues() {
  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [aliases, setAliases] = useState([]);
  const [aliasInput, setAliasInput] = useState("");
  const [q, setQ] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:3001/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      alert("Failed to create venue");
      return;
    }

    const created = await res.json();

    setVenues((v) => [...v, created]);
    setForm({
      name: "",
      city_id: "",
      address: "",
      lat: "",
      lng: "",
      website_url: "",
    });
  };

  const [form, setForm] = useState({
    name: "",
    city_id: "",
    address: "",
    lat: "",
    lng: "",
    website_url: "",
  });

  async function loadVenues() {
    const r = await fetch(`${API}/api/admin/venues`);
    setVenues(await r.json());
  }

  async function loadCities() {
    const r = await fetch(`${API}/api/admin/cities`);
    setCities(await r.json());
  }

  async function loadAliases(venueId) {
    const r = await fetch(`${API}/api/admin/venues/${venueId}/aliases`);
    setAliases(await r.json());
  }

  useEffect(() => {
    loadVenues().catch(console.error);
    loadCities().catch(console.error);
  }, []);

  const filteredVenues = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return venues;
    return venues.filter((v) => {
      return (
        (v.name || "").toLowerCase().includes(s) ||
        (v.city_name || "").toLowerCase().includes(s) ||
        (v.address || "").toLowerCase().includes(s)
      );
    });
  }, [venues, q]);

  async function createVenue(e) {
    e.preventDefault();
    if (!form.name.trim()) return alert("Venue name is required");

    const payload = {
      name: form.name.trim(),
      city_id: form.city_id ? Number(form.city_id) : null,
      address: form.address.trim() || null,
      lat: form.lat !== "" ? Number(form.lat) : null,
      lng: form.lng !== "" ? Number(form.lng) : null,
      website_url: form.website_url.trim() || null,
    };

    await fetch(`${API}/api/admin/venues`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setForm({
      name: "",
      city_id: "",
      address: "",
      lat: "",
      lng: "",
      website_url: "",
    });
    await loadVenues();
  }

  async function deleteVenue(id) {
    if (!confirm("Delete this venue? (Aliases will be deleted too)")) return;
    await fetch(`${API}/api/admin/venues/${id}`, { method: "DELETE" });
    if (selectedVenueId === id) {
      setSelectedVenueId(null);
      setAliases([]);
    }
    await loadVenues();
  }

  async function openAliases(venueId) {
    setSelectedVenueId(venueId);
    await loadAliases(venueId);
  }

  async function addAlias() {
    if (!selectedVenueId) return;

    const alias = aliasInput.trim();
    if (!alias) return;

    const r = await fetch(
      `${API}/api/admin/venues/${selectedVenueId}/aliases`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alias }), // <-- NOT payload
      }
    );

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Failed to add alias");
      return;
    }

    setAliasInput("");
    await loadAliases(selectedVenueId);
  }

  async function deleteAlias(aliasId) {
    await fetch(`${API}/api/admin/aliases/${aliasId}`, { method: "DELETE" });
    await loadAliases(selectedVenueId);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Admin: Venues</h2>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Create venue */}
        <form
          onSubmit={createVenue}
          style={{
            width: 420,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Add venue</h3>

          <label>Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <label>City</label>
          <select
            value={form.city_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, city_id: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 8 }}
          >
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label>Address</label>
          <input
            value={form.address}
            onChange={(e) =>
              setForm((p) => ({ ...p, address: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 8 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Lat</label>
              <input
                value={form.lat}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lat: e.target.value }))
                }
                style={{ width: "100%", marginBottom: 8 }}
                placeholder="59.4370"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Lng</label>
              <input
                value={form.lng}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lng: e.target.value }))
                }
                style={{ width: "100%", marginBottom: 8 }}
                placeholder="24.7536"
              />
            </div>
          </div>

          <label>Website</label>
          <input
            value={form.website_url}
            onChange={(e) =>
              setForm((p) => ({ ...p, website_url: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 12 }}
            placeholder="https://..."
          />

          <button type="submit">Create venue</button>
        </form>

        {/* Venue list */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Venues</h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search venue/city/address..."
              style={{ width: 280 }}
            />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>Name</th>
                <th>City</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{v.name}</td>
                  <td>{v.city_name || "—"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openAliases(v.id)}
                      style={{ marginRight: 8 }}
                    >
                      Aliases
                    </button>
                    <button onClick={() => deleteVenue(v.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredVenues.length === 0 && (
            <div style={{ padding: 12 }}>No venues found.</div>
          )}
        </div>
      </div>

      {/* Alias panel */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Venue aliases</h3>

        {!selectedVenueId ? (
          <div>Select a venue and click “Aliases”.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="Add alias (exact scraper spelling)..."
                style={{ flex: 1 }}
              />
              <button onClick={addAlias}>Add alias</button>
            </div>

            {aliases.length === 0 ? (
              <div>No aliases yet.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {aliases.map((a) => (
                  <li key={a.id} style={{ marginBottom: 6 }}>
                    {a.alias}{" "}
                    <button
                      onClick={() => deleteAlias(a.id)}
                      style={{ marginLeft: 8 }}
                    >
                      delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
