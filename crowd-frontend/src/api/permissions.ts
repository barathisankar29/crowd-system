import { apiGet, apiPatch } from "./client";
import type { PermissionMatrix } from "../types/permissions";

export const getPermissionMatrix = () => apiGet<PermissionMatrix>("/api/role-permissions");

export const setRolePermission = (role: string, permission: string, enabled: boolean) =>
  apiPatch<PermissionMatrix>("/api/role-permissions", { role, permission, enabled });
