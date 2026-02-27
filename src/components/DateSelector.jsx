// src/components/DateSelector.jsx
export default function DateSelector({ date, setDate }) {
  return (
    <div className="filter">
      <label>Date (from)</label>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="date"
          value={date || ""}
          onChange={(e) => setDate(e.target.value)}
        />

        {date && (
          <button type="button" onClick={() => setDate("")}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
