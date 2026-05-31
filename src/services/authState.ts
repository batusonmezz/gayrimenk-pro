let _organizationId: string | null = null;

export function setOrganizationId(id: string | null): void {
  _organizationId = id;
}

export function getOrganizationId(): string | null {
  return _organizationId;
}
