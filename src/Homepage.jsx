import { events } from "./data/events";
import "./Homepage.css";

export default function Homepage() {
  // SORT EVENTS BY DATE AUTOMATICALLY
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  return (
    <div className="wrapper">
      <h1>Estonia Sports Events</h1>

      <div className="date-select">
        <input type="date" />
      </div>

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
              <th>Tickets</th>
              <th>Federation</th>
            </tr>
          </thead>

          <tbody>
            {sortedEvents.map((e, i) => (
              <tr key={i}>
                <td className="emoji">{e.emoji}</td>
                <td>{e.sport}</td>
                <td>{e.date}</td>
                <td>{e.time}</td>
                <td>{e.event}</td>
                <td>{e.location}</td>
                <td>{e.city}</td>
                <td>{e.tickets}</td>
                <td>
                  <a href={e.federation} target="_blank">
                    {e.federationName}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
