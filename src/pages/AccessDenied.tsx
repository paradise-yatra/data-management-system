import { useNavigate } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <ShieldX className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        You don&apos;t have permission to access this section. If you believe this is an error, please contact your administrator.
      </p>
      <Button onClick={() => navigate('/')} className="gap-2">
        <Home className="h-4 w-4" />
        Go to Dashboard
      </Button>
    </div>
  );
}
