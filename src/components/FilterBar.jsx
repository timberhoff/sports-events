export default function FilterBar({
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

      <button className="map-btn" onClick={onMapClick}>
        Vaata kaarti
      </button>
    </div>
  );
}
