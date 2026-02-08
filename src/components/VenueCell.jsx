import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

function isMobileLike() {
  // simple + reliable enough
  return window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
}

export default function VenueCell({ e }) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(isMobileLike());
  const anchorRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = () => setMobile(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // For now mapped == raw (because your DB duplicates).
  // Later you can change mappedVenue to e.venue_name (from JOIN) and rawVenue to e.venue_raw / e.location_raw.
  const mappedVenue = e.venue;
  const rawVenue = e.venue_raw || e.location_raw || "—";
  const city = e.city; // mapped city

  // Close on ESC and outside click
  useEffect(() => {
    if (!open) return;

    const onKey = (ev) => {
      if (ev.key === "Escape") setOpen(false);
    };

    const onClick = (ev) => {
      // If click is inside the anchor or inside the panel, ignore.
      const panel = document.getElementById(`venue-panel-${e.id}`);
      if (anchorRef.current?.contains(ev.target)) return;
      if (panel?.contains(ev.target)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onClick, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onClick);
    };
  }, [open, e.id]);

  const TitleLine = (
    <div style={{ fontWeight: 600, marginBottom: 6 }}>Venue</div>
  );

  const Body = (
    <>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Mapped venue</div>
        <div style={{ fontWeight: 600 }}>{mappedVenue}</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Original venue (source)
        </div>
        <div>{rawVenue}</div>
      </div>

      {city && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>City</div>
          <div>{city}</div>
        </div>
      )}

      {e.venue_id ? (
        <Link
          to={`/venues/${e.venue_id}`}
          onClick={() => setOpen(false)}
          style={{
            display: "inline-block",
            padding: "8px 10px",
            borderRadius: 10,
            textDecoration: "none",
            border: "1px solid rgba(0,0,0,0.15)",
          }}
        >
          Open venue page →
        </Link>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          (Not linked to a saved venue yet)
        </div>
      )}
    </>
  );

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: "100%",
      }}
    >
      {/* Clickable venue text (works on mobile + desktop) */}
      <span
        ref={anchorRef}
        onClick={() => setOpen(true)}
        title={mobile ? "" : `Original: ${rawVenue}`} // desktop hover hint
        style={{
          cursor: "pointer",
          textDecoration: e.venue_id ? "underline" : "dotted underline",
          textUnderlineOffset: 3,
          display: "inline-block",
          maxWidth: 260,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          verticalAlign: "bottom",
        }}
      >
        {e.venue_id ? mappedVenue : e.venue || "—"}
        <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>ⓘ</span>
      </span>

      {/* Desktop popover */}
      {open && !mobile && (
        <div
          id={`venue-panel-${e.id}`}
          style={{
            position: "absolute",
            zIndex: 50,
            top: "120%",
            left: 0,
            width: 320,
            background: "white",
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          {TitleLine}
          {Body}
        </div>
      )}

      {/* Mobile bottom-sheet */}
      {open && mobile && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 80,
            }}
          />
          <div
            id={`venue-panel-${e.id}`}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 90,
              background: "white",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: 14,
              boxShadow: "0 -10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 700 }}>Venue</div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ height: 8 }} />
            {Body}
            <div style={{ height: 10 }} />
          </div>
        </>
      )}
    </div>
  );
}
