import { Sidebar } from '@/components/Sidebar';
import { UserManagementPanel } from '@/components/user-management/UserManagementPanel';

export default function Users() {
  return (
    <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
      <Sidebar />
      <main className="flex-1 overflow-auto px-6 py-8">
        <UserManagementPanel embedded={false} />
      </main>
    </div>
  );
}
