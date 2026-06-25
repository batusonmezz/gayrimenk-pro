let _organizationId: string | null = null;
let _role: string | null = null;
let _email: string | null = null;

export function setOrganizationId(id: string | null): void { _organizationId = id; }
export function getOrganizationId(): string | null { return _organizationId; }

export function setRole(role: string | null): void { _role = role; }
export function getRole(): string | null { return _role; }

export function setEmail(email: string | null): void { _email = email; }
export function getEmail(): string | null { return _email; }

let _avatarUrl: string | null = null;
export function setAvatarUrl(v: string | null): void { _avatarUrl = v; }
export function getAvatarUrl(): string | null { return _avatarUrl; }

let _mustChangePassword: boolean = false;
export function setMustChangePassword(v: boolean): void { _mustChangePassword = v; }
export function getMustChangePassword(): boolean { return _mustChangePassword; }
