import Sidebar from '@/components/ui/Sidebar';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Derive display name from email (e.g. admin@kezkamhomes.app → "admin")
  const username = user?.email?.split('@')[0] ?? 'User';

  return (
    <div className="flex min-h-screen">
      <Sidebar username={username} />
      {/* pt-14 on mobile = space for the fixed top bar (56px); removed on lg where sidebar is always visible */}
      <main
        className="flex-1 lg:ml-60 min-h-screen pt-14 lg:pt-0"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
