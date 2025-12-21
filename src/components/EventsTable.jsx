export default function EventsTable({ events }) {
  function formatDateEE(dateStr) {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("et-EE").format(new Date(dateStr));
  }
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Sport</th>
            <th>Date</th>
            <th>Time</th>
            <th>Event</th>
            <th>Location</th>
            <th>City</th>
            <th>Federation</th>
          </tr>
        </thead>

        <tbody>
          {events.map((e, i) => (
            <tr key={i}>
              <td className="emoji">{e.emoji}</td>
              <td>{e.sport}</td>
              <td title={e.date}>{formatDateEE(e.date)}</td>
              <td>{e.time}</td>
              <td>
                <div style={{ fontWeight: 600 }}>
                  {e.home_team && e.away_team
                    ? `${e.home_team} vs ${e.away_team}`
                    : e.title}
                </div>

                {e.league && (
                  <div style={{ fontSize: "0.85em", opacity: 0.8 }}>
                    {e.league}
                  </div>
                )}
              </td>
              <td>{e.location}</td>
              <td>{e.city}</td>
              <td>
                {e.federation ? (
                  <a href={e.federation} target="_blank" rel="noreferrer">
                    {e.federationName || "Link"}
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {events.length === 0 && (
        <div style={{ padding: "12px" }}>No events match your filters.</div>
      )}
    </div>
  );
}
