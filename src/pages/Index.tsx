import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Bell,
  Files,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Search,
  Plus,
  CheckCircle2,
  FolderOpen,
  AlertCircle,
  Terminal,
  ArrowRight,
  FileText,
  Ticket,
  Calendar,
  Megaphone,
  Menu,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';

const pathToResourceKey: Record<string, string> = {
  '/human-resource-management': 'hr_portal',
  '/data-management': 'data_management',
  '/finance': 'finance',
};

const Index = () => {
  const navigate = useNavigate();
  const { user, canView } = useAuth();
  const [greeting, setGreeting] = useState('');

  useState(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 16) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  });

  const allModules = [
    {
      title: 'Itinerary Builder',
      description: 'Create client itineraries & auto pricing',
      icon: <FileText className="h-6 w-6" />,
      path: '/itinerary-builder',
      comingSoon: false,
    },
    {
      title: 'Human Resource Management',
      description: 'Manage leave & payroll',
      icon: <Users className="h-6 w-6" />,
      path: '/human-resource-management',
      comingSoon: false,
    },
    {
      title: 'Data Management',
      description: 'Client relationships & Sales',
      icon: <Database className="h-6 w-6" />,
      path: '/data-management',
      comingSoon: false,
    },
    {
      title: 'Finance',
      description: 'Receipts & collections',
      icon: <CreditCard className="h-6 w-6" />,
      path: '/finance',
      comingSoon: false,
    },
    {
      title: 'IT Support',
      description: 'Open tickets: 2',
      icon: <Terminal className="h-6 w-6" />,
      path: '/support',
      comingSoon: true,
    },
  ];

  const modules = allModules.filter((m) => {
    if (m.comingSoon) return true;
    const key = pathToResourceKey[m.path];
    return !key || canView(key);
  });

  const recentActivity = [
    {
      title: 'Q3 Financial Report.pdf',
      subtitle: 'Shared by Sarah Jenkins',
      time: '2m ago',
      icon: <FileText className="h-5 w-5" />,
      iconBg: 'bg-muted',
      iconColor: 'text-foreground',
    },
    {
      title: 'Ticket #4029 Updated',
      subtitle: 'Status changed to In Progress',
      time: '1h ago',
      icon: <Ticket className="h-5 w-5" />,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Weekly Standup',
      subtitle: 'Meeting scheduled for tomorrow',
      time: '3h ago',
      icon: <Calendar className="h-5 w-5" />,
      iconBg: 'bg-muted',
      iconColor: 'text-foreground',
    },
  ];

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased selection:bg-primary/30 selection:text-primary-foreground">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2.5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">Paradise Yatra</span>
          </div>
          <button className="text-foreground">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-5 flex flex-col gap-5">
          {/* Top Section: Search & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="w-full md:max-w-md">
              <div className="flex w-full items-stretch rounded-lg h-10 border border-border bg-card focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <div className="text-muted-foreground flex items-center justify-center pl-3">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  className="flex w-full min-w-0 flex-1 rounded-lg text-foreground focus:outline-0 border-none bg-transparent px-3 pl-2 text-sm font-normal leading-normal placeholder:text-muted-foreground"
                  placeholder="Search employees, documents, or tickets..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 px-3 flex items-center gap-2 text-sm font-medium border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                onClick={() => navigate('/paradise-yatra-deploy')}
              >
                <Terminal className="w-4 h-4" />
                Paradise Yatra
              </Button>
              <div
                className="h-9 px-3 flex items-center justify-center rounded-lg bg-[#e12b27] shadow-lg shadow-[#e12b27]/20 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => navigate('/voya-trail')}
              >
                <img src="/Brand/Header Logo White.png" alt="Paradise Yatra Logo" className="h-6 w-auto object-contain" />
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-primary/20 border-none">
                <Plus className="h-4 w-4" />
                <span>Create Ticket</span>
              </Button>
            </div>
          </div>

          {/* Hero Section: Greeting */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-foreground text-2xl md:text-3xl font-black leading-tight tracking-tight">
              {greeting}, {user?.name?.split(' ')[0] || 'Alex'}
            </h1>
            <p className="text-muted-foreground text-sm font-normal">
              {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())} • Dashboard Overview
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 rounded-xl p-4 border border-border bg-card hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">System Status</p>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-foreground tracking-tight text-xl font-bold leading-tight group-hover:text-primary transition-colors">Online</p>
              <p className="text-xs text-muted-foreground">All servers operational</p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl p-4 border border-border bg-card hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Active Projects</p>
                <FolderOpen className="h-4 w-4 text-primary/70" />
              </div>
              <p className="text-foreground tracking-tight text-xl font-bold leading-tight group-hover:text-primary transition-colors">12</p>
              <p className="text-xs text-muted-foreground">2 due this week</p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl p-4 border border-border bg-card hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Pending Tasks</p>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-foreground tracking-tight text-xl font-bold leading-tight group-hover:text-primary transition-colors">3</p>
              <p className="text-xs text-muted-foreground">Action required</p>
            </div>
          </div>

          {/* Main Module Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-foreground text-lg font-bold">Quick Access Modules</h2>
              <a className="text-primary text-sm font-medium hover:underline" href="#">View All</a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {modules.map((module) => (
                <div
                  key={module.title}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent transition-all cursor-pointer group"
                  onClick={() => !module.comingSoon && navigate(module.path)}
                >
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors [&_svg]:h-5 [&_svg]:w-5">
                    {module.icon}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground text-base font-bold leading-tight">{module.title}</h3>
                      {module.comingSoon && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 border-border text-muted-foreground">Soon</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm font-normal leading-normal">{module.description}</p>
                  </div>
                  <div className="mt-auto pt-1 flex items-center text-muted-foreground text-xs font-medium group-hover:text-foreground transition-colors">
                    <span>{module.comingSoon ? 'Under Development' : 'Access'}</span>
                    {!module.comingSoon && <ArrowRight className="h-4 w-4 ml-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="flex flex-col lg:flex-row gap-4 pb-5">
            <div className="flex-1 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground text-base font-bold">Recent Activity</h3>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={cn(activity.iconBg, "p-1.5 rounded-full [&_svg]:h-4 [&_svg]:w-4", activity.iconColor)}>
                      {activity.icon}
                    </div>
                    <div className={cn("flex-1", i !== recentActivity.length - 1 ? 'border-b border-border/50 pb-3' : '')}>
                      <p className="text-foreground text-sm font-medium">{activity.title}</p>
                      <p className="text-muted-foreground text-xs">{activity.subtitle}</p>
                    </div>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Side Widget */}
            <div className="w-full lg:w-[30%] rounded-xl border border-border bg-gradient-to-br from-primary/10 to-card p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                <Megaphone className="h-16 w-16 text-foreground" />
              </div>
              <h3 className="text-foreground text-base font-bold mb-1.5 relative z-10">Company Townhall</h3>
              <p className="text-muted-foreground text-xs mb-4 relative z-10">Don't forget to join the quarterly all-hands meeting this Friday at 10:00 AM PST.</p>
              <div className="flex -space-x-2 overflow-hidden mb-4 relative z-10">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                    U{i}
                  </div>
                ))}
                <div className="flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-card bg-accent text-[10px] font-medium text-foreground">+42</div>
              </div>
              <Button className="w-full bg-foreground text-background py-1.5 rounded-lg text-xs font-semibold hover:bg-foreground/90 transition-colors relative z-10 border-none">
                View Details
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
