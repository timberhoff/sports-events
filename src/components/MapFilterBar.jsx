export default function MapFilterBar({
  userPos,
  setUserPos,
  pickMode,
  setPickMode,
  radiusKm,
  setRadiusKm,
}) {
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error(err);
        alert("Could not get your location. You may need to allow permission.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clear = () => {
    setUserPos(null);
    setPickMode(false);
  };

  return (
    <div className="filters map-filters" style={{ marginTop: 10 }}>
      <div className="filter">
        <label>My location</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={useMyLocation}>
            Use GPS
          </button>
          <button
            type="button"
            onClick={() => setPickMode((v) => !v)}
            style={{ opacity: pickMode ? 0.8 : 1 }}
          >
            {pickMode ? "Click on map…" : "Select on map"}
          </button>
          <button type="button" onClick={clear}>
            Clear
          </button>
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          {userPos ? (
            <>
              Selected: {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
            </>
          ) : (
            <>No location selected</>
          )}
        </div>
      </div>

      <div className="filter">
        <label>Radius (km)</label>
        <input
          type="range"
          min="1"
          max="300"
          step="1"
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          disabled={!userPos}
        />
        <div style={{ fontSize: 12, marginTop: 4 }}>
          {radiusKm} km {userPos ? "" : "(select location first)"}
        </div>
      </div>
    </div>
  );
}
