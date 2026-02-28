import { useMemo, useState, useEffect } from "react";
import "./Homepage.css";
import FilterBar from "./components/FilterBar";
import EventsTable from "./components/EventsTable";
import EventsMap from "./components/EventsMap";
import MapFilterBar from "./components/MapFilterBar";

export default function Homepage() {
  const [leagueState, setLeagueState] = useState({});
  const allowedLeagueIds = leagueState?.allowedLeagueIds || [];
  const [events, setEvents] = useState([]);

  const [showMap, setShowMap] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // MAP STATE
  const [userPos, setUserPos] = useState(null); // {lat, lng} or null
  const [pickMode, setPickMode] = useState(false);
  const [radiusKm, setRadiusKm] = useState(30);

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
    disabledSportsSet,
    loadedSportsSet,
    allowedSet,
  ]);

  const handleMapClick = () => {
    setShowMap((v) => {
      const next = !v;
      if (!v) {
        // wait one tick so DOM renders, then scroll
        setTimeout(() => {
          document
            .getElementById("events-map")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 0);
      }
      return next;
    });
  };

  // 2) Map point selection (YOU will adjust field names once backend returns them)
  const getEventPoint = (e) => {
    // preferred: venue coords
    if (e.venue_lat != null && e.venue_lng != null) {
      const lat = Number(e.venue_lat);
      const lng = Number(e.venue_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng))
        return { point: { lat, lng }, pointSource: "venue" };
    }
    // fallback: city coords
    if (e.city_lat != null && e.city_lng != null) {
      const lat = Number(e.city_lat);
      const lng = Number(e.city_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng))
        return { point: { lat, lng }, pointSource: "city" };
    }
    return null;
  };

  const haversineKm = (a, b) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);

    const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // 3) Build events that can be mapped
  const eventsWithPoints = useMemo(() => {
    return visibleEvents
      .map((e) => {
        const info = getEventPoint(e);
        if (!info) return null;
        return { ...e, ...info };
      })
      .filter(Boolean);
  }, [visibleEvents]);

  // 4) Apply radius filter (only when userPos exists)
  const radiusFilteredEvents = useMemo(() => {
    if (!userPos) return visibleEvents;

    // If radius is enabled, it usually makes sense to only show events with coords.
    // If you prefer to keep "no coords" events visible, tell me and we’ll tweak it.
    return visibleEvents.filter((e) => {
      const info = getEventPoint(e);
      if (!info) return false;
      return haversineKm(userPos, info.point) <= radiusKm;
    });
  }, [visibleEvents, userPos, radiusKm]);

  const groupedMapEvents = useMemo(() => {
    const map = new Map();

    for (const e of eventsWithPoints) {
      // round to avoid tiny decimal differences causing separate keys
      const key = `${e.point.lat.toFixed(6)},${e.point.lng.toFixed(6)}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          point: e.point,
          pointSource: e.pointSource,
          venue: e.venue,
          city: e.city,
          events: [],
        });
      }
      map.get(key).events.push(e);
    }

    // sort events in each group (by date/time)
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
  }, [eventsWithPoints]);

  const handlePickUserPos = (pos) => {
    setUserPos(pos);
    setPickMode(false);
  };

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
        showMap={showMap}
        onMapClick={handleMapClick}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onLeagueStateChange={setLeagueState}
      />
      {showMap && (
        <>
          <MapFilterBar
            userPos={userPos}
            setUserPos={setUserPos}
            pickMode={pickMode}
            setPickMode={setPickMode}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
          />

          <div id="events-map">
            <EventsMap
              groups={
                userPos
                  ? groupedMapEvents.filter(
                      (g) => haversineKm(userPos, g.point) <= radiusKm
                    )
                  : groupedMapEvents
              }
              userPos={userPos}
              pickMode={pickMode}
              onPickUserPos={handlePickUserPos}
              radiusKm={radiusKm}
            />
          </div>
        </>
      )}

      <EventsTable events={radiusFilteredEvents} />
    </div>
  );
}
