import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('master console security contracts', () => {
  it('requires an authenticated admin role before using service-role operations', () => {
    const auth = read('lib/masterAuth.ts');
    expect(auth).toContain("auth.getUser(token)");
    expect(auth).toContain(".from('admin_users')");
    expect(auth).toContain('admin?.is_active');
  });

  it('does not persist Master Console sessions in browser storage', () => {
    const client = read('lib/supabase/client.ts');
    const consoleSource = read('app/Master/MasterConsole.tsx');
    expect(client).toContain('persistSession: false');
    expect(client).toContain('autoRefreshToken: false');
    expect(client).toContain('detectSessionInUrl: false');
    expect(consoleSource).toContain('createMasterBrowserClient');
    expect(consoleSource).toContain("signOut({ scope: 'local' })");
  });

  it('never embeds the administrator password in tracked source', () => {
    const files = [
      'app/Master/MasterConsole.tsx',
      'app/api/master/route.ts',
      'lib/masterAuth.ts',
      'supabase/migrations/20260912000024_master_console.sql',
      'README.md',
    ];
    for (const file of files) expect(read(file)).not.toMatch(/Sh52315231/);
  });

  it('uses reversible trend deletion and filters public feed records', () => {
    const migration = read('supabase/migrations/20260912000024_master_console.sql');
    const trendsApi = read('app/api/v1/trends/route.ts');
    expect(migration).toContain('deleted_at TIMESTAMPTZ');
    expect(trendsApi).toContain(".is('deleted_at', null)");
  });

  it('does not expose secret profile columns through the master API', () => {
    const api = read('app/api/master/route.ts');
    const selectedFields = api.match(/const PROFILE_FIELDS = '([^']+)'/)?.[1] ?? '';
    expect(selectedFields).not.toContain('custom_gemini_key');
    expect(selectedFields).not.toContain('custom_apify_token');
    expect(selectedFields).not.toContain('toss_billing_key');
    expect(selectedFields).not.toContain('stripe_customer_id');
  });
});