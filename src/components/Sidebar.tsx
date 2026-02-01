import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    Home,
    Bell,
    Files,
    Users,
    CreditCard,
    Settings,
    LogOut,
    Database,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    User,
    Shield,
    ShieldCheck,
    ChevronDown,
    Package,
    FileText,
    Tags,
    LayoutDashboard,
    MapPin,
    FileSearch
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsModal } from './dashboard/SettingsModal';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, X as CloseIcon } from 'lucide-react';

interface NavItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    badge?: number;
    subItems?: {
        label: string;
        icon: React.ReactNode;
        path: string;
    }[];
}

interface SidebarProps {
    activePage?: string;
    project?: 'crm' | 'voya-trail';
}

const pathToResourceKey: Record<string, string> = {
    '/': 'dashboard',
    '/users': 'manage_users',
    '/data-management': 'data_management',
    '/human-resource-management': 'hr_portal',
    '/human-resource-management/recruitment': 'recruitment',
    '/voya-trail': 'voya_trail',
    '/voya-trail/packages': 'voya_trail_packages',
    '/voya-trail/packages/category': 'voya_trail_category',
    '/voya-trail/packages/destinations': 'voya_trail_destinations',
    '/rbac': 'rbac_system',
    '/rbac/roles': 'rbac_system',
    '/rbac/users': 'rbac_system',
    '/rbac/logs': 'rbac_system',
    '/itinerary-builder': 'itinerary_builder',
};

export const Sidebar = ({ activePage, project = 'crm' }: SidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, canView } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const [deniedItem, setDeniedItem] = useState<{ label: string; path: string } | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const toggleMenu = (menu: string) => {
        setExpandedMenus(prev =>
            prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
        );
    };

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

    const isActive = (item: NavItem) => {
        if (item.path === '/') return location.pathname === '/';
        if (item.path === '/voya-trail') return location.pathname === '/voya-trail';
        if (item.path !== '#' && location.pathname.startsWith(item.path)) return true;
        if (item.subItems) {
            return item.subItems.some((sub) => location.pathname === sub.path);
        }
        return false;
    };

    const navItems: NavItem[] = [
        {
            label: 'Dashboard',
            icon: <Home className="h-5 w-5" />,
            path: '/',
        },
        {
            label: 'Notifications',
            icon: <Bell className="h-5 w-5" />,
            path: '#',
            badge: 3
        },
        {
            label: 'Documents',
            icon: <Files className="h-5 w-5" />,
            path: '#',
        },
    ];

    const moduleItems = [
        {
            label: 'Itinerary Builder',
            icon: <FileText className="h-5 w-5" />,
            path: '/itinerary-builder',
        },
        {
            label: 'HR Portal',
            icon: <Users className="h-5 w-5" />,
            path: '/human-resource-management',
        },
        {
            label: 'Recruitment',
            icon: <Briefcase className="h-5 w-5" />,
            path: '/human-resource-management/recruitment',
        },
        {
            label: 'Data Management',
            icon: <Database className="h-5 w-5" />,
            path: '/data-management',
        },
        {
            label: 'Finance',
            icon: <CreditCard className="h-5 w-5" />,
            path: '#',
        },
    ];

    const rbacItems: NavItem[] = [
        {
            label: 'RBAC System',
            icon: <ShieldCheck className="h-5 w-5" />,
            path: '/rbac',
            subItems: [
                { label: 'Roles', icon: <Shield className="h-3.5 w-3.5" />, path: '/rbac/roles' },
                { label: 'Manage Users', icon: <Users className="h-3.5 w-3.5" />, path: '/rbac/users' },
                { label: 'Logs', icon: <FileSearch className="h-3.5 w-3.5" />, path: '/rbac/logs' },
            ],
        },
    ];

    const voyaTrailItems: NavItem[] = [
        {
            label: 'Voya Trail',
            icon: <LayoutDashboard className="h-5 w-5" />,
            path: '/voya-trail',
        },
        {
            label: 'Packages',
            icon: <Package className="h-5 w-5" />,
            path: '#',
            subItems: [
                { label: 'Packages', icon: <Package className="h-3.5 w-3.5" />, path: '/voya-trail/packages' },
                { label: 'Category', icon: <Tags className="h-3.5 w-3.5" />, path: '/voya-trail/packages/category' },
                { label: 'Destinations', icon: <MapPin className="h-3.5 w-3.5" />, path: '/voya-trail/packages/destinations' }
            ]
        },
        {
            label: 'Blog',
            icon: <FileText className="h-5 w-5" />,
            path: '#',
            subItems: [
                { label: 'Category', icon: <Tags className="h-3.5 w-3.5" />, path: '/voya-trail/blog/category' }
            ]
        },
    ];

    const canAccessPath = (path: string) => {
        if (path === '#') return true;
        const key = pathToResourceKey[path];
        return key ? canView(key) : true;
    };

    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items;
    };

    const filterModuleItems = (items: typeof moduleItems): typeof moduleItems => {
        return items;
    };

    const handleNavigate = (path: string, label: string) => {
        if (path === '#') return;

        if (!canAccessPath(path)) {
            setDeniedItem({ label, path });
            return;
        }

        navigate(path);
    };

    const isRbacPanel = location.pathname.startsWith('/rbac');

    const currentNavItems = (project === 'voya-trail')
        ? filterNavItems(voyaTrailItems)
        : isRbacPanel
            ? []
            : filterNavItems(navItems);

    const currentModuleItems = (project === 'voya-trail' || isRbacPanel) ? [] : filterModuleItems(moduleItems);

    const currentRbacItems = (project === 'voya-trail' || !isRbacPanel)
        ? []
        : filterNavItems(rbacItems);

    useEffect(() => {
        const activeMenus: string[] = [];
        ([...currentNavItems, ...currentModuleItems, ...currentRbacItems] as NavItem[]).forEach(item => {
            if (item.subItems) {
                const isSubItemActive = item.subItems.some(subItem => location.pathname === subItem.path);
                if (isSubItemActive) {
                    activeMenus.push(item.label);
                }
            }
        });

        if (activeMenus.length > 0) {
            setExpandedMenus(prev => {
                const newMenus = [...prev];
                activeMenus.forEach(menu => {
                    if (!newMenus.includes(menu)) {
                        newMenus.push(menu);
                    }
                });
                return newMenus;
            });
        }
    }, [location.pathname, currentNavItems, currentModuleItems, currentRbacItems]);

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 288 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col gap-4 border-r border-border bg-card py-6 flex-shrink-0 hidden lg:flex relative h-screen sticky top-0"
        >
            {/* Collapse Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-12 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-sm transition-colors"
            >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* User Profile Summary */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className={cn("flex items-center gap-3 mb-6 transition-all duration-300 overflow-hidden hover:bg-accent/50 p-2 rounded-lg mx-4", isCollapsed ? "px-0 justify-center" : "px-2")}>
                        <div className="flex items-center justify-center flex-shrink-0">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.div
                                    key="profile"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col items-start overflow-hidden"
                                >
                                    <h1 className="text-foreground text-base font-semibold leading-tight truncate">{user?.name || 'User'}</h1>
                                    <p className="text-muted-foreground text-xs font-normal capitalize truncate">{user?.role || 'Administrator'}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {!isCollapsed && <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isCollapsed ? "center" : "start"} className="w-56 ml-2">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email}
                            </p>
                            <Badge
                                variant="outline"
                                className={cn("mt-2 w-fit", getRoleBadgeClass())}
                            >
                                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                            </Badge>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigate('/', 'Dashboard')} className="cursor-pointer border-0 hover:border-0 focus:border-0 focus:outline-none">
                        <span>Home</span>
                        <span className="ml-auto flex items-center gap-1">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                <span className="text-xs">Ctrl</span>H
                            </kbd>
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigate('/users', 'Manage Users')} className="cursor-pointer border-0 hover:border-0 focus:border-0 focus:outline-none">
                        Manage Users
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigate('/rbac', 'RBAC System')} className="cursor-pointer border-0 hover:border-0 focus:border-0 focus:outline-none">
                        RBAC System
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            setIsSettingsOpen(true);
                        }}
                        className="cursor-pointer border-0 hover:border-0 focus:border-0 focus:outline-none"
                    >
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleLogout}
                        variant="destructive"
                        className="text-destructive focus:text-destructive cursor-pointer border-0 hover:border-0 focus:border-0 focus:outline-none"
                    >
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Navigation Links */}
            <nav className={cn("flex flex-col gap-2 flex-1 px-4", isCollapsed && "items-center")}>
                {currentNavItems.map((item) => (
                    <div key={item.label} className="flex flex-col gap-1 w-full">
                        <button
                            onClick={() => {
                                if (item.subItems && !isCollapsed) {
                                    toggleMenu(item.label);
                                } else {
                                    handleNavigate(item.path, item.label);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group w-full text-left",
                                isActive(item)
                                    ? "bg-primary/10 border-l-2 border-primary"
                                    : "hover:bg-accent",
                                isCollapsed && "justify-center px-0 w-10 border-l-0"
                            )}
                        >
                            <div className={cn(
                                "flex-shrink-0 transition-colors",
                                isActive(item) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                                {item.icon}
                            </div>
                            <AnimatePresence mode="wait">
                                {!isCollapsed && (
                                    <motion.div
                                        key={`${item.label}-label`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex items-center flex-1 overflow-hidden"
                                    >
                                        <p className={cn(
                                            "text-sm font-medium leading-normal whitespace-nowrap",
                                            isActive(item) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                        )}>
                                            {item.label}
                                        </p>
                                        {item.badge && (
                                            <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                        {item.subItems && (
                                            <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", expandedMenus.includes(item.label) ? "rotate-180" : "")} />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                        <AnimatePresence>
                            {!isCollapsed && item.subItems && expandedMenus.includes(item.label) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden flex flex-col pl-9 gap-1"
                                >
                                    {item.subItems.map((subItem) => (
                                        <button
                                            key={subItem.label}
                                            onClick={() => handleNavigate(subItem.path, subItem.label)}
                                            className={cn(
                                                "text-sm py-2 text-left flex items-center gap-2 transition-colors",
                                                location.pathname === subItem.path
                                                    ? "text-primary font-medium"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {subItem.icon}
                                            {subItem.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}

                {currentModuleItems.length > 0 && (
                    <>
                        <div className="my-2 border-t border-border/50 w-full"></div>
                        {!isCollapsed && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 whitespace-nowrap"
                            >
                                Modules
                            </motion.p>
                        )}

                        {currentModuleItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavigate(item.path, item.label)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group w-full text-left",
                                    isActive(item)
                                        ? "bg-primary/10 border-l-2 border-primary"
                                        : "hover:bg-accent",
                                    isCollapsed && "justify-center px-0 w-10 border-l-0"
                                )}
                            >
                                <div className={cn(
                                    "flex-shrink-0 transition-colors",
                                    isActive(item) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    {item.icon}
                                </div>
                                <AnimatePresence mode="wait">
                                    {!isCollapsed && (
                                        <motion.p
                                            key={`${item.label}-label`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className={cn(
                                                "text-sm font-medium leading-normal whitespace-nowrap",
                                                isActive(item) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                            )}
                                        >
                                            {item.label}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </button>
                        ))}
                    </>
                )}

                {currentRbacItems.length > 0 && (
                    <>
                        <div className="my-2 border-t border-border/50 w-full"></div>
                        {!isCollapsed && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 whitespace-nowrap"
                            >
                                RBAC
                            </motion.p>
                        )}

                        {currentRbacItems.map((item) => (
                            <div key={item.label} className="flex flex-col gap-1 w-full">
                                <button
                                    onClick={() => {
                                        if (item.subItems && !isCollapsed) {
                                            toggleMenu(item.label);
                                        } else {
                                            handleNavigate(item.path, item.label);
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group w-full text-left",
                                        isActive(item)
                                            ? "bg-primary/10 border-l-2 border-primary"
                                            : "hover:bg-accent",
                                        isCollapsed && "justify-center px-0 w-10 border-l-0"
                                    )}
                                >
                                    <div className={cn(
                                        "flex-shrink-0 transition-colors",
                                        isActive(item) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}>
                                        {item.icon}
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {!isCollapsed && (
                                            <motion.div
                                                key={`${item.label}-label`}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center flex-1 overflow-hidden"
                                            >
                                                <p className={cn(
                                                    "text-sm font-medium leading-normal whitespace-nowrap",
                                                    isActive(item) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                                )}>
                                                    {item.label}
                                                </p>
                                                {item.subItems && (
                                                    <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", expandedMenus.includes(item.label) ? "rotate-180" : "")} />
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </button>
                                <AnimatePresence>
                                    {!isCollapsed && item.subItems && expandedMenus.includes(item.label) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden flex flex-col pl-9 gap-1"
                                        >
                                            {item.subItems.map((subItem) => (
                                                <button
                                                    key={subItem.label}
                                                    onClick={() => handleNavigate(subItem.path, subItem.label)}
                                                    className={cn(
                                                        "text-sm py-2 text-left flex items-center gap-2 transition-colors",
                                                        location.pathname === subItem.path
                                                            ? "text-primary font-medium"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {subItem.icon}
                                                    {subItem.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </>
                )}
            </nav>

            {/* Access Denied Popup - Rendered via Portal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {deniedItem && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setDeniedItem(null)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative z-[101] w-full max-w-sm mx-4 rounded-lg border border-border bg-background p-6 shadow-xl"
                            >
                                <div className="flex flex-col items-center text-center">
                                    <div className="rounded-full bg-destructive/10 p-3 mb-4">
                                        <ShieldAlert className="h-6 w-6 text-destructive" />
                                    </div>

                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        Access Denied
                                    </h3>

                                    <p className="text-sm text-muted-foreground mb-6">
                                        You do not have the required permissions to access <span className="font-medium text-foreground">"{deniedItem.label}"</span>. Please contact your administrator for clearance.
                                    </p>

                                    <div className="flex gap-3 w-full">
                                        <Button
                                            onClick={() => setDeniedItem(null)}
                                            className="grow bg-foreground text-background hover:bg-foreground/90 font-medium"
                                        >
                                            Got it, thanks.
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </motion.aside>
    );
};
