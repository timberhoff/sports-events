import SportLeagueDropdown from "./SportLeagueDropdown";

export default function FilterBar({
  // NEW ↓
  categoryFilter,
  setCategoryFilter,
  categoryOptions,

  sportFilter,
  setSportFilter,
  sportOptions,

  cityFilter,
  setCityFilter,
  cityOptions,

  dateFilter,
  setDateFilter,

  onMapClick,
}) {
  return (
    <div className="filters">
      {/* CATEGORY */}
      <div className="filter">
        <label>Category</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* SPORT */}
      <div className="filter">
        <SportLeagueDropdown />
      </div>

      {/* CITY */}
      <div className="filter">
        <label>Filter by location</label>
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

      {/* DATE */}
      <div className="filter">
        <label>Date</label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      <button className="map-btn" onClick={onMapClick}>
        Check the map
      </button>
    </div>
  );
}
