import { apiGet } from "./client";
import type { ZoneCoverage } from "../types/vision";

export const listZoneCoverage = () => apiGet<ZoneCoverage[]>("/api/zones");
