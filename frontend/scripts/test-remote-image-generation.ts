import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Authenticating test user...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test_user_a@tattva.ai',
    password: 'TestPasswordA123!'
  });

  if (authErr || !auth.session) {
    console.error('Auth error:', authErr);
    process.exit(1);
  }

  console.log('Got user session token, sending request to production Vercel deployment...');
  const res = await fetch('https://tattva-ai-phi.vercel.app/api/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.session.access_token}`
    },
    body: JSON.stringify({
      prompt: 'A minimal modern geometric glass icon with warm sunset gradient',
      aspectRatio: '1:1',
      quality: 'standard'
    })
  });

  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Response provider:', data.metadata?.provider);
  console.log('Response model:', data.metadata?.model);
  console.log('Image data present:', typeof data.image === 'string' && data.image.startsWith('data:image/'));
  console.log('Image length:', data.image ? data.image.length : 0);
  console.log('Storage record:', data.storage ? JSON.stringify(data.storage) : 'none');
}

main().catch(console.error);
