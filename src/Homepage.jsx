import { useMemo, useState, useEffect } from "react";
import "./Homepage.css";
import FilterBar from "./components/FilterBar";
import EventsTable from "./components/EventsTable";

export default function Homepage() {
  const [events, setEvents] = useState([]);
  const [sportFilter, setSportFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/events")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        else {
          console.error("Expected array from /api/events, got:", data);
          setEvents([]);
        }
      })
      .catch((err) => {
        console.error(err);
        setEvents([]);
      });
  }, []);

  const sportOptions = useMemo(() => {
    const unique = Array.from(
      new Set(events.map((e) => e.sport).filter(Boolean))
    ).sort();
    return ["All", ...unique];
  }, [events]);

  const categoryOptions = useMemo(() => {
    const all = events
      .flatMap((e) =>
        e.categories ? e.categories.split(",").map((x) => x.trim()) : []
      )
      .filter(Boolean);
    const unique = Array.from(new Set(all)).sort();
    return ["All", ...unique];
  }, [events]);

  const cityOptions = useMemo(() => {
    const unique = Array.from(
      new Set(events.map((e) => e.city).filter(Boolean))
    ).sort();
    return ["All", ...unique];
  }, [events]);

  const normalizeTime = (t) => {
    if (!t) return "00:00";
    const s = String(t).trim();
    return /^\d{2}:\d{2}$/.test(s) ? s : "00:00";
  };
  const ymd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayYMD = ymd(new Date());

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((e) => {
      const sportOk = sportFilter === "All" || e.sport === sportFilter;

      const cats = e.categories
        ? e.categories.split(",").map((x) => x.trim())
        : [];
      const categoryOk =
        categoryFilter === "All" || cats.includes(categoryFilter);

      const cityOk = cityFilter === "All" || e.city === cityFilter;
      const dateOk = !dateFilter || e.date === dateFilter;

      // ✅ keep event if it hasn't ended yet
      const endDate = e.date_end || e.date; // YYYY-MM-DD
      const notPast = !endDate || endDate >= todayYMD;

      return sportOk && categoryOk && cityOk && dateOk && notPast;
    });

    return [...filtered].sort((a, b) => {
      const aDT = new Date(`${a.date}T${normalizeTime(a.time)}`);
      const bDT = new Date(`${b.date}T${normalizeTime(b.time)}`);
      return aDT - bDT;
    });
  }, [events, sportFilter, categoryFilter, cityFilter, dateFilter, todayYMD]);

  const handleMapClick = () => alert("Kaart tuleb hiljem 😄");

  return (
    <div className="wrapper">
      <h1>Estonian Sports Events</h1>

      <FilterBar
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categoryOptions={categoryOptions}
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
