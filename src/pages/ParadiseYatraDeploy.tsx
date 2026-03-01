import { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Terminal, Copy, CheckCircle2, XCircle, Loader2, Clock, Calendar, BarChart3, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function ParadiseYatraDeploy() {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'failed'>('idle');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleDeploy = () => {
        setStatus('deploying');
        setLogs(['Initiating deployment sequence...', 'Connecting to deployment engine...']);

        try {
            // Build the SSE Auth URL. Since EventSource doesn't support custom headers (Bearer token) easily without polyfills,
            // The standard workaround is to pass token via query URL if authentication requires it.
            const token = localStorage.getItem('token') || '';
            const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/deploy/main-site/stream?token=${token}`;

            const source = new EventSource(sseUrl);

            source.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.log) {
                        setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${data.log}`]);
                    }

                    if (data.status) {
                        if (data.status === 'success') {
                            setStatus('success');
                            toast.success('Main site deployed successfully!');
                        } else if (data.status === 'failed') {
                            setStatus('failed');
                            toast.error('Deployment finished with errors.');
                        }
                        source.close();
                    }
                } catch (e) {
                    console.error("Error parsing SSE JSON:", e);
                }
            };

            source.onerror = (err) => {
                console.error("SSE Error:", err);
                // Ignore minor reconnect errors if still deploying
                if (status !== 'success' && status !== 'failed') {
                    source.close();
                    setStatus('failed');
                    setLogs((prev) => [...prev, '[ERROR] Lost connection to deployment engine. Check backend logs.']);
                    toast.error("Lost connection to deployment engine.");
                }
            };

        } catch (error) {
            setLogs((prev) => [...prev, `[ERROR] Deployment failed to start: ${error instanceof Error ? error.message : String(error)}`]);
            setStatus('failed');
            toast.error('Deployment failed to start.');
        }
    };

    // Mock History Data
    const [history, setHistory] = useState([
        { id: 'dep-004', status: 'success', date: '2026-03-01 10:15 AM', duration: '45s', user: 'Alex (You)' },
        { id: 'dep-003', status: 'success', date: '2026-02-28 04:30 PM', duration: '42s', user: 'System Auto' },
        { id: 'dep-002', status: 'failed', date: '2026-02-26 11:20 AM', duration: '12s', user: 'Sarah Jenkins' },
        { id: 'dep-001', status: 'success', date: '2026-02-25 09:00 AM', duration: '50s', user: 'Alex (You)' },
    ]);

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full bg-background overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 pb-20">

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <Terminal className="w-8 h-8 text-primary" />
                                Deployment Console
                            </h1>
                            <p className="text-muted-foreground">
                                Deploy the newest code from GitHub to Paradise Yatra main production server.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
                            <div className="flex items-center gap-2 px-3">
                                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-medium">VPS Online</span>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div className="flex items-center gap-2 px-3">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">PM2 Status: OK</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-2">
                        <div className="flex flex-col sm:flex-row items-center justify-between bg-card p-5 rounded-xl border border-border/50 gap-4 shadow-sm text-center sm:text-left ring-1 ring-border relative overflow-hidden">
                            {/* Decorative background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground">Target Environment</span>
                                <span className="text-sm text-muted-foreground">Production VPS (Hostinger)</span>
                            </div>
                            <div className="flex flex-col sm:border-l sm:border-r border-border sm:px-6">
                                <span className="font-semibold text-foreground">Target Branch</span>
                                <span className="text-sm text-muted-foreground">main</span>
                            </div>
                            <div>
                                {status === 'idle' && (
                                    <Button onClick={handleDeploy} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[150px]">
                                        Deploy Now
                                    </Button>
                                )}
                                {status === 'deploying' && (
                                    <Button disabled size="lg" className="min-w-[150px]">
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Deploying...
                                    </Button>
                                )}
                                {status === 'success' && (
                                    <Button variant="outline" size="lg" className="text-green-600 border-green-600/50 bg-green-500/10 min-w-[150px]" disabled>
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Success
                                    </Button>
                                )}
                                {status === 'failed' && (
                                    <Button variant="destructive" size="lg" className="min-w-[150px]" disabled>
                                        <XCircle className="w-5 h-5 mr-2" />
                                        Failed
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl bg-card border border-border p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-foreground">Live Terminal Logs</span>
                                {logs.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            navigator.clipboard.writeText(logs.join('\n'));
                                            toast.success('Logs copied to clipboard');
                                        }}
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                                        Copy Logs
                                    </Button>
                                )}
                            </div>
                            <div
                                ref={scrollRef}
                                className="w-full h-[500px] bg-zinc-950/90 text-zinc-300 font-mono text-[13px] p-5 rounded-lg overflow-y-auto overflow-x-hidden shadow-inner"
                            >
                                {logs.length === 0 ? (
                                    <span className="text-zinc-500 italic flex items-center h-full justify-center">
                                        No logs yet. Click 'Deploy Now' to begin sequence.
                                    </span>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="break-words mb-1.5 w-full leading-relaxed">
                                            {log.includes('[ERROR]') || log.toLowerCase().includes('failed') ? (
                                                <span className="text-red-400">{log}</span>
                                            ) : log.toLowerCase().includes('success') ? (
                                                <span className="text-green-400 font-semibold">{log}</span>
                                            ) : (
                                                <span>{log}</span>
                                            )}
                                        </div>
                                    ))
                                )}

                                {status === 'deploying' && (
                                    <div className="flex items-center mt-3 text-zinc-500">
                                        <span className="animate-pulse text-lg">_</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Deployment History Table */}
                    <div className="flex flex-col gap-4 mt-6">
                        <h2 className="text-xl font-bold text-foreground">Deployment History</h2>
                        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Deploy ID</th>
                                            <th className="px-6 py-4 font-medium">Triggered By</th>
                                            <th className="px-6 py-4 font-medium">Date & Time</th>
                                            <th className="px-6 py-4 font-medium">Duration</th>
                                            <th className="px-6 py-4 font-medium text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {history.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-mono text-zinc-500">{item.id}</td>
                                                <td className="px-6 py-4 font-medium text-foreground">{item.user}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{item.date}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{item.duration}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.status === 'success' ? (
                                                        <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
