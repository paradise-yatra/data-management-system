import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, User, ChevronDown, Shield, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'manager':
        return <Briefcase className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleBadgeClass = () => {
    switch (user?.role) {
      case 'admin':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'manager':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-background py-6"
    >
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <h1
          className="text-4xl font-extrabold tracking-tight text-foreground cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          Paradise Yatra
        </h1>

        <div className="flex items-center gap-3">
        </div>
      </div>
    </motion.header>
  );
}
