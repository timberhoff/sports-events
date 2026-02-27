import SportLeagueDropdown from "./SportLeagueDropdown";
import DateSelector from "./DateSelector";

export default function FilterBar({
  categoryFilter,
  setCategoryFilter,
  categoryOptions,

  cityFilter,
  setCityFilter,
  cityOptions,

  dateFilter,
  setDateFilter,

  onMapClick,
  onLeagueStateChange,
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
        <SportLeagueDropdown onStateChange={onLeagueStateChange} />
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

      {/* DATE (single) */}
      <DateSelector date={dateFilter} setDate={setDateFilter} />

      <button className="map-btn" onClick={onMapClick}>
        Check the map
      </button>
    </div>
  );
}
