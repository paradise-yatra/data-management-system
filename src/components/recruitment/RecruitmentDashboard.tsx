import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recruitmentService } from '@/services/recruitment';
import { Phone, Calendar, UserPlus, TrendingUp } from 'lucide-react';

export function RecruitmentDashboard() {
    const [stats, setStats] = useState({
        callsToday: 0,
        interviewsScheduledToday: 0,
        candidatesAddedToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await recruitmentService.getStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: "Calls Today",
            value: stats.callsToday,
            icon: Phone,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Interviews Scheduled",
            value: stats.interviewsScheduledToday,
            icon: Calendar,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            title: "New Candidates",
            value: stats.candidatesAddedToday,
            icon: UserPlus,
            color: "text-green-500",
            bg: "bg-green-500/10"
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {statCards.map((stat, index) => (
                <Card key={index} className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                                <h3 className="text-3xl font-bold tracking-tight">
                                    {loading ? "..." : stat.value}
                                </h3>
                            </div>
                            <div className={`${stat.bg} p-3 rounded-xl`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                            <span className="text-green-500 font-medium mr-1">Live</span>
                            tracking for today
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
