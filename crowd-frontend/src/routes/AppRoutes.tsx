import { Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import SecurityTeam from "../pages/SecurityTeam";
import IncidentLog from "../pages/IncidentLog";
import DispatchControl from "../pages/DispatchControl";
import AuthorityPermissions from "../pages/AuthorityPermissions";
import SignIn from "../pages/SignIn";
import { RequireSession } from "../state/RequireSession";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/" element={<RequireSession><Dashboard /></RequireSession>} />
      <Route path="/security-team" element={<RequireSession><SecurityTeam /></RequireSession>} />
      <Route path="/incident-log" element={<RequireSession><IncidentLog /></RequireSession>} />
      <Route path="/dispatch-control" element={<RequireSession><DispatchControl /></RequireSession>} />
      <Route path="/authority-permissions" element={<RequireSession><AuthorityPermissions /></RequireSession>} />
    </Routes>
  );
}
