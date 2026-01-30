import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    Users,
    LayoutDashboard,
    Clock,
    CalendarOff,
    FolderSearch,
    Settings,
    LogOut,
    Search,
    CheckCircle2,
    PlaneTakeoff,
    History,
    Badge as BadgeIcon,
    CalendarDays,
    Folder,
    ArrowUpRight,
    Menu,
    Briefcase
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HumanResourceManagement = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="bg-background text-foreground font-sans antialiased selection:bg-primary/30 selection:text-primary-foreground">
            <div className="flex h-screen w-full flex-row overflow-hidden">
                <Sidebar />

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
                        <div className="flex items-center gap-3">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-bold text-foreground">HR Portal</span>
                        </div>
                        <button className="text-foreground">
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-foreground text-3xl md:text-4xl font-black leading-tight tracking-tight">
                                    Human Resource Management
                                </h1>
                                <p className="text-muted-foreground text-base font-normal">
                                    Dashboard Overview • {new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date())}
                                </p>
                            </div>
                            <div className="w-full md:w-auto flex items-center gap-3">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                                    <input
                                        className="w-full bg-card border border-border text-foreground text-sm rounded-lg pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                                        placeholder="Search employees..."
                                        type="text"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-2 rounded-xl p-6 border border-border bg-card hover:border-primary/50 transition-colors group">
                                <div className="flex justify-between items-start">
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                        Total Employees
                                    </p>
                                    <Users className="h-5 w-5 text-primary opacity-50" />
                                </div>
                                <p className="text-foreground tracking-tight text-3xl font-bold leading-tight mt-2">
                                    142
                                </p>
                                <p className="text-xs text-muted-foreground">+4 new this month</p>
                            </div>
                            <div className="flex flex-col gap-2 rounded-xl p-6 border border-border bg-card hover:border-primary/50 transition-colors group">
                                <div className="flex justify-between items-start">
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                        Present Today
                                    </p>
                                    <CheckCircle2 className="h-5 w-5 text-primary opacity-50" />
                                </div>
                                <p className="text-foreground tracking-tight text-3xl font-bold leading-tight mt-2">
                                    128
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    90% Attendance rate
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 rounded-xl p-6 border border-border bg-card hover:border-primary/50 transition-colors group">
                                <div className="flex justify-between items-start">
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                        On Leave
                                    </p>
                                    <PlaneTakeoff className="h-5 w-5 text-primary opacity-50" />
                                </div>
                                <p className="text-foreground tracking-tight text-3xl font-bold leading-tight mt-2">
                                    8
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Returning: 2 tomorrow
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 rounded-xl p-6 border border-border bg-card hover:border-primary/50 transition-colors group">
                                <div className="flex justify-between items-start">
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                        Pending Requests
                                    </p>
                                    <Clock className="h-5 w-5 text-primary opacity-50" />
                                </div>
                                <p className="text-foreground tracking-tight text-3xl font-bold leading-tight mt-2">
                                    6
                                </p>
                                <p className="text-xs text-muted-foreground">Requires attention</p>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1">
                                <h2 className="text-foreground text-lg font-bold mb-4">
                                    Quick Actions
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                                    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 hover:bg-accent transition-all cursor-pointer group">
                                        <div className="flex items-start justify-between">
                                            <div className="bg-muted p-3 rounded-lg text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <BadgeIcon className="h-6 w-6" />
                                            </div>
                                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="mt-4">
                                            <h3 className="text-foreground text-xl font-bold">
                                                Employees
                                            </h3>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                Manage personnel records & directory
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 hover:bg-accent transition-all cursor-pointer group">
                                        <div className="flex items-start justify-between">
                                            <div className="bg-muted p-3 rounded-lg text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <CalendarDays className="h-6 w-6" />
                                            </div>
                                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="mt-4">
                                            <h3 className="text-foreground text-xl font-bold">
                                                Attendance
                                            </h3>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                View logs and timesheets
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 hover:bg-accent transition-all cursor-pointer group">
                                        <div className="flex items-start justify-between">
                                            <div className="bg-muted p-3 rounded-lg text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <CalendarOff className="h-6 w-6" />
                                            </div>
                                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="mt-4">
                                            <h3 className="text-foreground text-xl font-bold">
                                                Leave Management
                                            </h3>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                Approve or reject time-off
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 hover:bg-accent transition-all cursor-pointer group">
                                        <div className="flex items-start justify-between">
                                            <div className="bg-muted p-3 rounded-lg text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Folder className="h-6 w-6" />
                                            </div>
                                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="mt-4">
                                            <h3 className="text-foreground text-xl font-bold">
                                                Documents
                                            </h3>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                Contracts, policies & files
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 hover:bg-accent transition-all cursor-pointer group"
                                        onClick={() => navigate('/human-resource-management/recruitment')}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="bg-muted p-3 rounded-lg text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Briefcase className="h-6 w-6" />
                                            </div>
                                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="mt-4">
                                            <h3 className="text-foreground text-xl font-bold">
                                                Recruitment
                                            </h3>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                Hiring, job posts & candidates
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Widget */}
                            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-foreground text-lg font-bold">
                                        Action Required
                                    </h2>
                                    <Badge className="bg-primary text-primary-foreground">3</Badge>
                                </div>
                                <div className="flex-1 rounded-xl border border-border bg-card p-1 flex flex-col gap-1 overflow-hidden">
                                    <div className="p-4 hover:bg-accent rounded-lg transition-colors border-b border-border/50 last:border-0 cursor-pointer">
                                        <div className="flex justify-between mb-1">
                                            <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5">
                                                Leave Approval
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">
                                                2h ago
                                            </span>
                                        </div>
                                        <p className="text-foreground text-sm font-semibold">
                                            Sarah Jenkins
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-0.5">
                                            Sick leave for Oct 25-26
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <Button size="sm" className="h-7 text-[10px] px-3">Approve</Button>
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-3">Deny</Button>
                                        </div>
                                    </div>
                                    <div className="p-4 hover:bg-accent rounded-lg transition-colors border-b border-border/50 last:border-0 cursor-pointer">
                                        <div className="flex justify-between mb-1">
                                            <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5">
                                                Missing Doc
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">
                                                1d ago
                                            </span>
                                        </div>
                                        <p className="text-foreground text-sm font-semibold">
                                            Michael Chen
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-0.5">
                                            Pending: Tax Declaration Form
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] w-full">Remind</Button>
                                        </div>
                                    </div>
                                    <div className="p-4 hover:bg-accent rounded-lg transition-colors border-b border-border/50 last:border-0 cursor-pointer">
                                        <div className="flex justify-between mb-1">
                                            <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5">
                                                Leave Approval
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">
                                                1d ago
                                            </span>
                                        </div>
                                        <p className="text-foreground text-sm font-semibold">
                                            Jessica Wong
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-0.5">
                                            Vacation request (5 days)
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <Button size="sm" className="h-7 text-[10px] px-3">Approve</Button>
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-3">Deny</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Table */}
                        <div className="pb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-foreground text-lg font-bold">
                                    Recent Activity Logs
                                </h2>
                                <button className="text-primary hover:underline text-sm font-medium">
                                    View All Logs
                                </button>
                            </div>
                            <div className="rounded-xl border border-border bg-card overflow-hidden">
                                <table className="w-full text-left text-sm text-muted-foreground">
                                    <thead className="bg-muted text-xs uppercase font-semibold text-foreground">
                                        <tr>
                                            <th className="px-6 py-3">Employee</th>
                                            <th className="px-6 py-3">Action</th>
                                            <th className="px-6 py-3">Time</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        <tr className="hover:bg-accent transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                                                <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="h-3 w-3 text-primary" />
                                                </div>
                                                David Miller
                                            </td>
                                            <td className="px-6 py-4">Check-in</td>
                                            <td className="px-6 py-4">09:42 AM</td>
                                            <td className="px-6 py-4">
                                                <span className="text-green-500 font-medium">
                                                    On Time
                                                </span>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-accent transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                                                <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="h-3 w-3 text-primary" />
                                                </div>
                                                Sarah Jenkins
                                            </td>
                                            <td className="px-6 py-4">Check-out</td>
                                            <td className="px-6 py-4">06:15 PM</td>
                                            <td className="px-6 py-4">
                                                <span className="text-muted-foreground">Regular</span>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-accent transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                                                <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="h-3 w-3 text-primary" />
                                                </div>
                                                James Wilson
                                            </td>
                                            <td className="px-6 py-4">Check-in</td>
                                            <td className="px-6 py-4">10:05 AM</td>
                                            <td className="px-6 py-4">
                                                <span className="text-yellow-500 font-medium">Late</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HumanResourceManagement;
