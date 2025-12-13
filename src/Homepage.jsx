import { useMemo, useState } from "react";
import { events } from "./data/events";
import "./Homepage.css";

export default function Homepage() {
  // --- UI state ---
  const [sportFilter, setSportFilter] = useState("Kõik");
  const [cityFilter, setCityFilter] = useState("Kõik");
  const [dateFilter, setDateFilter] = useState(""); // "YYYY-MM-DD"

  // --- Build dropdown options from data ---
  const sportOptions = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => e.sport))).sort();
    return ["Kõik", ...unique];
  }, []);

  const cityOptions = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => e.city))).sort();
    return ["Kõik", ...unique];
  }, []);

  // --- Filter + sort ---
  const visibleEvents = useMemo(() => {
    const filtered = events.filter((e) => {
      const sportOk = sportFilter === "Kõik" || e.sport === sportFilter;
      const cityOk = cityFilter === "Kõik" || e.city === cityFilter;
      const dateOk = !dateFilter || e.date === dateFilter; // assumes e.date is "YYYY-MM-DD"
      return sportOk && cityOk && dateOk;
    });

    // Sort by date, then time (safe even if time missing)
    return filtered.sort((a, b) => {
      const aDT = new Date(`${a.date}T${a.time || "00:00"}`);
      const bDT = new Date(`${b.date}T${b.time || "00:00"}`);
      return aDT - bDT;
    });
  }, [sportFilter, cityFilter, dateFilter]);

  const handleMapClick = () => {
    alert("Kaart tuleb hiljem 😄");
  };

  return (
    <div className="wrapper">
      <h1>Estonia Sports Events</h1>

      {/* FILTER BAR */}
      <div className="filters">
        <div className="filter">
          <label>Spordiala</label>
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
          >
            {sportOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="filter">
          <label>Sorteeri asukoha järgi</label>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="filter">
          <label>Kuupäev</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <button className="map-btn" onClick={handleMapClick}>
          Vaata kaarti
        </button>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Sport</th>
              <th>Date</th>
              <th>Time</th>
              <th>Event</th>
              <th>Location</th>
              <th>City</th>
              <th>Federation</th>
            </tr>
          </thead>

          <tbody>
            {visibleEvents.map((e, i) => (
              <tr key={i}>
                <td className="emoji">{e.emoji}</td>
                <td>{e.sport}</td>
                <td>{e.date}</td>
                <td>{e.time}</td>
                <td>{e.event}</td>
                <td>{e.location}</td>
                <td>{e.city}</td>
                <td>
                  {e.federation ? (
                    <a href={e.federation} target="_blank" rel="noreferrer">
                      {e.federationName || "Link"}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* small UX bonus */}
        {visibleEvents.length === 0 && (
          <div style={{ padding: "12px" }}>No events match your filters.</div>
        )}
      </div>
    </div>
  );
}
