export type AccessLevel = 'none' | 'view' | 'edit' | 'full';

export interface Resource {
  key: string;
  label: string;
  path: string;
  description?: string;
}

export interface Permission {
  resourceKey: string;
  accessLevel: AccessLevel;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PermissionsMap = Record<string, AccessLevel>;
