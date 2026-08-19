/*import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
    </Routes>
  );
}*/
import { Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import SecurityTeam from "../pages/SecurityTeam";
import IncidentLog from "../pages/IncidentLog";
import DispatchControl from "../pages/DispatchControl";
import AuthorityPermissions from "../pages/AuthorityPermissions";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/security-team" element={<SecurityTeam />} />
      <Route path="/incident-log" element={<IncidentLog />} />
      <Route path="/dispatch-control" element={<DispatchControl />} />
      <Route path="/authority-permissions" element={<AuthorityPermissions />} />
    </Routes>
  );
}