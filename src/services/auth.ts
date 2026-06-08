import { supabase } from '../storage/supabaseClient';
import { setOrganizationId, setRole, setEmail, setMustChangePassword } from './authState';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  user: User;
  organizationId: string | null;
  role: string | null;
  mustChangePassword: boolean;
}

export interface SignUpResult extends AuthUser {
  needsEmailConfirmation: boolean;
}

function authHataMesaji(message: string): string {
  if (message.includes('already registered'))  return 'Bu email adresi zaten kayıtlı.';
  if (message.includes('Password should be'))  return 'Şifre en az 6 karakter olmalı.';
  if (message.includes('Invalid login'))       return 'Email veya şifre hatalı.';
  if (message.includes('Email not confirmed')) return 'Email adresinizi doğrulayın.';
  if (message.includes('User not found'))      return 'Bu email adresi bulunamadı.';
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) throw new Error(authHataMesaji(authError.message));
  if (!authData.user) throw new Error('Kayıt tamamlanamadı.');

  if (authData.session === null) {
    return { user: authData.user, organizationId: null, role: null, mustChangePassword: false, needsEmailConfirmation: true };
  }

  const { data: userRecord, error: userFetchError } = await supabase
    .from('users')
    .select('organization_id, role, must_change_password')
    .eq('id', authData.user.id)
    .single();

  if (userFetchError || !userRecord?.organization_id) {
    throw new Error('Kullanıcı kaydı hazırlanamadı. Lütfen tekrar deneyin.');
  }

  const orgId = userRecord.organization_id;
  const userRole = userRecord.role ?? null;
  console.log('[auth] signUp başarılı, org_id:', orgId, 'role:', userRole);

  setOrganizationId(orgId);
  setRole(userRole);
  setEmail(authData.user.email ?? null);
  setMustChangePassword(false);
  return { user: authData.user, organizationId: orgId, role: userRole, mustChangePassword: false, needsEmailConfirmation: false };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authHataMesaji(error.message));
  if (!data.user) throw new Error('Giriş tamamlanamadı.');

  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id, role, must_change_password')
    .eq('id', data.user.id)
    .single();

  const orgId = userRecord?.organization_id ?? null;
  const userRole = userRecord?.role ?? null;
  const mustChangePw = userRecord?.must_change_password ?? false;
  setOrganizationId(orgId);
  setRole(userRole);
  setEmail(data.user.email ?? null);
  setMustChangePassword(mustChangePw);
  return { user: data.user, organizationId: orgId, role: userRole, mustChangePassword: mustChangePw };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Çıkış yapılamadı. Lütfen tekrar deneyin.');
  setOrganizationId(null);
  setRole(null);
  setEmail(null);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id, role, must_change_password')
    .eq('id', user.id)
    .single();

  if (!userRecord?.organization_id) {
    console.warn('[auth] Kullanıcının organization_id\'si yok (yetim kullanıcı) - userId:', user.id);
  }

  const userRole = userRecord?.role ?? null;
  const mustChangePw = userRecord?.must_change_password ?? false;
  setRole(userRole);
  setEmail(user.email ?? null);
  setMustChangePassword(mustChangePw);
  return { user, organizationId: userRecord?.organization_id ?? null, role: userRole, mustChangePassword: mustChangePw };
}

export async function getSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}
