import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:3001";

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/õ/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminSports() {
  const [sports, setSports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const [form, setForm] = useState({ name: "", slug: "", emoji: "" });
  const [q, setQ] = useState("");

  async function loadSports() {
    const r = await fetch(`${API}/api/admin/sports`);
    setSports(await r.json());
  }

  async function loadCategories() {
    const r = await fetch(`${API}/api/admin/categories`);
    setCategories(await r.json());
  }

  async function loadSportCategories(sportId) {
    const r = await fetch(`${API}/api/admin/sports/${sportId}/categories`);
    setSelectedCategoryIds(await r.json());
  }

  useEffect(() => {
    loadSports().catch(console.error);
    loadCategories().catch(console.error);
  }, []);

  const filteredSports = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sports;
    return sports.filter(
      (sp) =>
        (sp.name || "").toLowerCase().includes(s) ||
        (sp.slug || "").toLowerCase().includes(s)
    );
  }, [sports, q]);

  async function createSport(e) {
    e.preventDefault();
    const name = form.name.trim();
    const slug = form.slug.trim();

    if (!name) return alert("Sport name is required");
    if (!slug) return alert("Slug is required");

    const r = await fetch(`${API}/api/admin/sports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, emoji: form.emoji.trim() || null }),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Failed to create sport");
      return;
    }

    setForm({ name: "", slug: "", emoji: "" });
    await loadSports();
  }

  async function deleteSport(id) {
    if (!confirm("Delete this sport?")) return;
    const r = await fetch(`${API}/api/admin/sports/${id}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Failed to delete sport");
      return;
    }
    if (selectedSportId === id) {
      setSelectedSportId(null);
      setSelectedCategoryIds([]);
    }
    await loadSports();
  }

  async function selectSport(id) {
    setSelectedSportId(id);
    await loadSportCategories(id);
  }

  function toggleCategory(cid) {
    setSelectedCategoryIds((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
    );
  }

  async function saveSportCategories() {
    if (!selectedSportId) return;
    const r = await fetch(
      `${API}/api/admin/sports/${selectedSportId}/categories`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryIds: selectedCategoryIds }),
      }
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Failed to save categories");
      return;
    }
    alert("Saved!");
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Admin: Sports</h2>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <form
          onSubmit={createSport}
          style={{
            width: 420,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Add sport</h3>

          <label>Name *</label>
          <input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((p) => ({ ...p, name, slug: p.slug || slugify(name) }));
            }}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <label>Slug *</label>
          <input
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="figure-skating"
          />

          <label>Emoji</label>
          <input
            value={form.emoji}
            onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
            style={{ width: "100%", marginBottom: 12 }}
            placeholder="⛸️"
          />

          <button type="submit">Create sport</button>
        </form>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Sports</h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              style={{ width: 240 }}
            />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>Name</th>
                <th>Slug</th>
                <th>Emoji</th>
                <th style={{ width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSports.map((sp) => (
                <tr key={sp.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{sp.name}</td>
                  <td>{sp.slug}</td>
                  <td>{sp.emoji || "—"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => selectSport(sp.id)}
                      style={{ marginRight: 8 }}
                    >
                      Categories
                    </button>
                    <button type="button" onClick={() => deleteSport(sp.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSports.length === 0 && (
            <div style={{ padding: 12 }}>No sports found.</div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Sport categories</h3>

        {!selectedSportId ? (
          <div>Select a sport and click “Categories”.</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  {cat.name}
                </label>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={saveSportCategories}>
                Save categories for this sport
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
