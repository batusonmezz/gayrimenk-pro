import { supabase } from '../storage/supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  user: User;
  organizationId: string | null;
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

  const orgName = email.split('@')[0] || 'Yeni Organizasyon';

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName })
    .select('id')
    .single();

  if (orgError) throw new Error('Organizasyon oluşturulamadı. Lütfen tekrar deneyin.');

  const { error: userError } = await supabase
    .from('users')
    .insert({ id: authData.user.id, organization_id: org.id });

  if (userError) {
    await supabase.from('organizations').delete().eq('id', org.id);
    throw new Error('Kullanıcı kaydı tamamlanamadı. Lütfen tekrar deneyin.');
  }

  const needsEmailConfirmation = authData.session === null;
  console.log('[auth] signUp başarılı, needsEmailConfirmation:', needsEmailConfirmation);

  return { user: authData.user, organizationId: org.id, needsEmailConfirmation };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authHataMesaji(error.message));
  if (!data.user) throw new Error('Giriş tamamlanamadı.');

  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', data.user.id)
    .single();

  return { user: data.user, organizationId: userRecord?.organization_id ?? null };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Çıkış yapılamadı. Lütfen tekrar deneyin.');
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!userRecord?.organization_id) {
    console.warn('[auth] Kullanıcının organization_id\'si yok (yetim kullanıcı) - userId:', user.id);
  }

  return { user, organizationId: userRecord?.organization_id ?? null };
}

export async function getSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}
