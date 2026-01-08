import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:3001";

export default function AdminManualEvents() {
  const [sports, setSports] = useState([]);
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);

  const [form, setForm] = useState({
    sport_id: "",
    title: "",
    subtitle: "",
    date: "",
    date_end: "",
    time: "",
    venue_id: "",
    federation_link: "",
    federation_name: "",
  });

  async function loadSports() {
    const r = await fetch(`${API}/api/admin/sports`);
    setSports(await r.json());
  }

  async function loadVenues() {
    const r = await fetch(`${API}/api/admin/venues`);
    setVenues(await r.json());
  }

  async function loadManualEvents() {
    const r = await fetch(`${API}/api/admin/manual-events`);
    setEvents(await r.json());
  }

  useEffect(() => {
    loadSports().catch(console.error);
    loadVenues().catch(console.error);
    loadManualEvents().catch(console.error);
  }, []);

  const venueOptions = useMemo(() => {
    return venues.map((v) => ({
      id: v.id,
      label: `${v.name}${v.city_name ? ` (${v.city_name})` : ""}`,
    }));
  }, [venues]);

  async function createEvent(e) {
    e.preventDefault();

    if (!form.sport_id) return alert("Pick a sport");
    if (!form.title.trim()) return alert("Title is required");
    if (!form.date) return alert("Date is required");

    const payload = {
      sport_id: Number(form.sport_id),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      date: form.date,
      date_end: form.date_end || null,
      time: form.time.trim() || null,
      venue_id: form.venue_id ? Number(form.venue_id) : null,
      federation_link: form.federation_link.trim() || null,
      federation_name: form.federation_name.trim() || null,
    };

    const r = await fetch(`${API}/api/admin/manual-events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Failed to create event");
      return;
    }

    setForm({
      sport_id: "",
      title: "",
      subtitle: "",
      date: "",
      date_end: "",
      time: "",
      venue_id: "",
      federation_link: "",
      federation_name: "",
    });

    await loadManualEvents();
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this manual event?")) return;
    const r = await fetch(`${API}/api/admin/manual-events/${id}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Failed to delete");
      return;
    }
    await loadManualEvents();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Admin: Manual Events</h2>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <form
          onSubmit={createEvent}
          style={{
            width: 460,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Add manual event</h3>

          <label>Sport *</label>
          <select
            value={form.sport_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, sport_id: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 8 }}
          >
            <option value="">—</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji ? `${s.emoji} ` : ""}
                {s.name}
              </option>
            ))}
          </select>

          <label>Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="e.g. Masters Swimming Cup"
          />

          <label>Subtitle</label>
          <input
            value={form.subtitle}
            onChange={(e) =>
              setForm((p) => ({ ...p, subtitle: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="e.g. 50m freestyle / U18"
          />

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                style={{ width: "100%", marginBottom: 8 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>End date</label>
              <input
                type="date"
                value={form.date_end}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date_end: e.target.value }))
                }
                style={{ width: "100%", marginBottom: 8 }}
              />
            </div>
          </div>

          <label>Time</label>
          <input
            value={form.time}
            onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="18:30"
          />

          <label>Venue</label>
          <select
            value={form.venue_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, venue_id: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 8 }}
          >
            <option value="">—</option>
            {venueOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>

          <label>Federation name</label>
          <input
            value={form.federation_name}
            onChange={(e) =>
              setForm((p) => ({ ...p, federation_name: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="e.g. Eesti Ujumisliit"
          />

          <label>Federation link</label>
          <input
            value={form.federation_link}
            onChange={(e) =>
              setForm((p) => ({ ...p, federation_link: e.target.value }))
            }
            style={{ width: "100%", marginBottom: 12 }}
            placeholder="https://..."
          />

          <button type="submit">Create manual event</button>
        </form>

        <div style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Existing manual events</h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>Date</th>
                <th>Sport</th>
                <th>Title</th>
                <th>Venue</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>
                    {e.date}
                    {e.date_end ? ` → ${e.date_end}` : ""}
                  </td>
                  <td>
                    {e.emoji ? `${e.emoji} ` : ""}
                    {e.sport}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.title}</div>
                    {e.subtitle ? (
                      <div style={{ fontSize: "0.85em", opacity: 0.8 }}>
                        {e.subtitle}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {e.venue
                      ? `${e.venue}${e.city ? ` (${e.city})` : ""}`
                      : "—"}
                  </td>
                  <td>
                    <button type="button" onClick={() => deleteEvent(e.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {events.length === 0 && (
            <div style={{ padding: 12 }}>No manual events yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
