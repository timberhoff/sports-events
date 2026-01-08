import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./Homepage";
import VenueMap from "./VenueMap";
import AdminVenues from "./AdminVenues";
import AdminSports from "./AdminSports";
import AdminManualEvents from "./AdminManualEvents";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/venues/:id" element={<VenueMap />} />
        <Route path="/admin/venues" element={<AdminVenues />} />
        <Route path="/admin/sports" element={<AdminSports />} />
        <Route path="/admin/events" element={<AdminManualEvents />} />
      </Routes>
    </BrowserRouter>
  );
}
