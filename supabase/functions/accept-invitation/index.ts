// Supabase Edge Function — Acepta una invitación de equipo
// supabase functions deploy accept-invitation
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Falta autenticación', { status: 401 });

    const { token } = await req.json();
    if (!token) return new Response('Token requerido', { status: 400 });

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response('Usuario no válido', { status: 401 });

    const { data: invitation, error: invError } = await adminClient
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invitación no válida o caducada' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userData.user.id,
        organization_id: invitation.organization_id,
        full_name: userData.user.user_metadata?.full_name ?? userData.user.email,
        email: userData.user.email,
      });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await adminClient.from('user_roles').upsert({
      user_id: userData.user.id,
      organization_id: invitation.organization_id,
      role: invitation.role,
    });

    await adminClient
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
