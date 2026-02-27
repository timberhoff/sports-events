import { useMemo, useState, useEffect } from "react";
import "./Homepage.css";
import FilterBar from "./components/FilterBar";
import EventsTable from "./components/EventsTable";

export default function Homepage() {
  const [leagueState, setLeagueState] = useState({});
  const allowedLeagueIds = leagueState?.allowedLeagueIds || [];
  const [events, setEvents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const disabledSportsSet = useMemo(
    () => new Set(leagueState?.disabledSports || []),
    [leagueState]
  );

  const loadedSportsSet = useMemo(
    () => new Set(leagueState?.loadedSports || []),
    [leagueState]
  );

  const allowedSet = useMemo(
    () => new Set(allowedLeagueIds || []),
    [allowedLeagueIds]
  );

  useEffect(() => {
    console.log(
      "allowedLeagueIds:",
      allowedLeagueIds.length,
      allowedLeagueIds.slice(0, 10)
    );
  }, [allowedLeagueIds]);

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

  const toYmd = (value) => {
    if (!value) return "";
    const s = String(value).trim();

    // If it's a plain date like "2026-02-28" (or MySQL "2026-02-28 12:34:56")
    // treat it as already-local date and just take the date part.
    if (s.length >= 10 && s[4] === "-" && s[7] === "-" && !s.includes("T")) {
      return s.slice(0, 10);
    }

    // If it's ISO (has "T", maybe ends with Z), parse and convert to LOCAL date
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((e) => {
      // 1) sport gray = always excluded
      const sportOk = !disabledSportsSet.has(e.sport_id);
      // 2) apply league filtering ONLY if that sport’s tree is loaded
      const leagueOk = !loadedSportsSet.has(e.sport_id)
        ? true
        : e.league_node_id == null
        ? true // keep showing unmapped while you build aliases
        : allowedSet.has(e.league_node_id);

      // existing filters
      const cats = e.categories
        ? e.categories.split(",").map((x) => x.trim())
        : [];
      const categoryOk =
        categoryFilter === "All" || cats.includes(categoryFilter);

      const cityOk = cityFilter === "All" || e.city === cityFilter;
      const eventDay = toYmd(e.date);
      const dateOk = !dateFilter || eventDay >= dateFilter;

      const endDay = toYmd(e.date_end || e.date);
      const notPast = !endDay || endDay >= todayYMD;

      return sportOk && leagueOk && categoryOk && cityOk && dateOk && notPast;
    });

    return [...filtered].sort((a, b) => {
      const aDT = new Date(`${a.date}T${normalizeTime(a.time)}`);
      const bDT = new Date(`${b.date}T${normalizeTime(b.time)}`);
      return aDT - bDT;
    });
  }, [
    events,
    allowedLeagueIds,
    categoryFilter,
    cityFilter,
    dateFilter,
    todayYMD,
  ]);

  const handleMapClick = () => alert("Kaart tuleb hiljem 😄");

  return (
    <div className="wrapper">
      <h1>Estonian Sports Events</h1>

      <FilterBar
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categoryOptions={categoryOptions}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        cityOptions={cityOptions}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onMapClick={handleMapClick}
        onLeagueStateChange={setLeagueState}
      />

      <EventsTable events={visibleEvents} />
    </div>
  );
}
