import { useMemo, useState, useEffect } from "react";
import "./Homepage.css";
import FilterBar from "./components/FilterBar";
import EventsTable from "./components/EventsTable";

export default function Homepage() {
  const [events, setEvents] = useState([]);
  const [sportFilter, setSportFilter] = useState("Kõik");
  const [cityFilter, setCityFilter] = useState("Kõik");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(console.error);
  }, []);

  const sportOptions = useMemo(() => {
    const unique = Array.from(
      new Set(events.map((e) => e.sport).filter(Boolean))
    ).sort();
    return ["Kõik", ...unique];
  }, [events]);

  const cityOptions = useMemo(() => {
    const unique = Array.from(
      new Set(events.map((e) => e.city).filter(Boolean))
    ).sort();
    return ["Kõik", ...unique];
  }, [events]);

  const normalizeTime = (t) => {
    if (!t) return "00:00";
    const s = String(t).trim();
    return /^\d{2}:\d{2}$/.test(s) ? s : "00:00"; // handles "—"
  };

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((e) => {
      const sportOk = sportFilter === "Kõik" || e.sport === sportFilter;
      const cityOk = cityFilter === "Kõik" || e.city === cityFilter;
      const dateOk = !dateFilter || e.date === dateFilter; // dateFilter is YYYY-MM-DD
      return sportOk && cityOk && dateOk;
    });

    return [...filtered].sort((a, b) => {
      const aDT = new Date(`${a.date}T${normalizeTime(a.time)}`);
      const bDT = new Date(`${b.date}T${normalizeTime(b.time)}`);
      return aDT - bDT;
    });
  }, [events, sportFilter, cityFilter, dateFilter]);

  const handleMapClick = () => alert("Kaart tuleb hiljem 😄");

  return (
    <div className="wrapper">
      <h1>Estonia Sports Events</h1>

      <FilterBar
        sportFilter={sportFilter}
        setSportFilter={setSportFilter}
        sportOptions={sportOptions}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        cityOptions={cityOptions}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onMapClick={handleMapClick}
      />

      <EventsTable events={visibleEvents} />
    </div>
  );
}
