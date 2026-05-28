export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // apiKey + x-client-info: Supabase JS client'ın otomatik gönderdiği header'lar
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apiKey, x-client-info',
};
