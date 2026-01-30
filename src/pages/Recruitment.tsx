import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    Users,
    LayoutDashboard,
    LogOut,
    Menu,
    ChevronLeft,
    Briefcase,
    CalendarDays,
    UserCheck,
    ClipboardList,
    Settings,
    PlusCircle,
    Search
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickLogForm } from '@/components/recruitment/QuickLogForm';
import { CandidateList } from '@/components/recruitment/CandidateList';
import { InterviewScheduler } from '@/components/recruitment/InterviewScheduler';
import { RecruitmentDashboard } from '@/components/recruitment/RecruitmentDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Recruitment = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [refreshStats, setRefreshStats] = useState(0);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

    const handleLogSuccess = () => {
        setRefreshStats(prev => prev + 1);
        setSelectedCandidateId(null);
    };

    const handleSelectCandidate = (id: string) => {
        setSelectedCandidateId(id);
        // Scroll to the log form on mobile
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bg-background text-foreground font-sans antialiased selection:bg-primary/30 selection:text-primary-foreground">
            <div className="flex h-screen w-full flex-row overflow-hidden">
                <Sidebar />

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background/50">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
                        <div className="flex items-center gap-3">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-muted flex items-center justify-center">
                                <Briefcase className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-bold text-foreground">Recruitment</span>
                        </div>
                        <button className="text-foreground" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8">
                        {/* Header Section */}
                        <div className="flex flex-col gap-2">
                            <h1 className="text-foreground text-3xl md:text-4xl font-black leading-tight tracking-tight">
                                HR Productivity
                            </h1>
                            <p className="text-muted-foreground text-base font-normal">
                                Track your daily interactions and manage candidates.
                            </p>
                        </div>

                        {/* Stats Dashboard */}
                        <RecruitmentDashboard key={refreshStats} />

                        {/* Main Interface */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left Column: Quick Log */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <PlusCircle className="h-5 w-5 text-primary" />
                                    <h2 className="text-xl font-bold">Log New Activity</h2>
                                </div>
                                <QuickLogForm
                                    onLogSuccess={handleLogSuccess}
                                    preSelectedCandidateId={selectedCandidateId || undefined}
                                />
                            </div>

                            {/* Right Column: Candidate Management & Interviews */}
                            <div className="lg:col-span-7 space-y-6">
                                <Tabs defaultValue="candidates" className="w-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Search className="h-5 w-5 text-primary" />
                                            <h2 className="text-xl font-bold">Manage</h2>
                                        </div>
                                        <TabsList className="bg-muted/50 p-1">
                                            <TabsTrigger value="candidates" className="data-[state=active]:bg-background">Candidates</TabsTrigger>
                                            <TabsTrigger value="interviews" className="data-[state=active]:bg-background">Interviews</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent value="candidates" className="mt-0 focus-visible:outline-none">
                                        <Card className="border-none shadow-md bg-card/80 backdrop-blur-md">
                                            <CardContent className="p-0">
                                                <CandidateList onSelectCandidate={handleSelectCandidate} />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="interviews" className="mt-0 focus-visible:outline-none">
                                        <Card className="border-none shadow-md bg-card/80 backdrop-blur-md">
                                            <CardContent className="p-6">
                                                <InterviewScheduler />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Recruitment;
