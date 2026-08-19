export interface Role {
  key: string;
  label: string;
}

export interface Permission {
  key: string;
  label: string;
}

export interface PermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<string, string[]>; // roleKey -> permissionKey[]
}
