import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import {
    FileText,
    PhoneCall,
    ArrowRight,
    TrendingUp,
    Users,
    BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const salesModules = [
    {
        title: 'Itinerary Builder',
        description: 'Create and manage travel itineraries for clients',
        icon: FileText,
        path: '/sales/itinerary-builder',
        color: 'from-blue-500 to-cyan-500',
        stats: 'Build custom trips'
    },
    {
        title: 'Telecaller Panel',
        description: 'Manage leads and track telecalling activities',
        icon: PhoneCall,
        path: '/sales/telecaller',
        color: 'from-green-500 to-emerald-500',
        stats: 'Track all leads'
    },
];

export default function Sales() {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
            <Sidebar project="sales" />
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">Sales Hub</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage sales activities and customer interactions
                            </p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6 bg-muted/10">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card border border-border rounded-xl p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">12</p>
                                    <p className="text-sm text-muted-foreground">Active Itineraries</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card border border-border rounded-xl p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                    <Users className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">48</p>
                                    <p className="text-sm text-muted-foreground">Leads This Week</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-card border border-border rounded-xl p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <BarChart3 className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">₹2.4L</p>
                                    <p className="text-sm text-muted-foreground">Monthly Target</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Module Cards */}
                    <h2 className="text-lg font-semibold mb-4">Sales Modules</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {salesModules.map((module, index) => (
                            <motion.div
                                key={module.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index + 4) }}
                            >
                                <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30 overflow-hidden"
                                    onClick={() => navigate(module.path)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color} shadow-lg`}>
                                                <module.icon className="h-6 w-6 text-white" />
                                            </div>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <CardTitle className="text-lg mt-3">{module.title}</CardTitle>
                                        <CardDescription>{module.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{module.stats}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
