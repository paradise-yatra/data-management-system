import { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Terminal, Copy, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function DeploymentModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'failed'>('idle');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleDeploy = async () => {
        setStatus('deploying');
        setLogs(['Initiating deployment sequence...', 'Connecting to deployment engine...']);

        try {
            // Connect to SSE API (Mocked for now)
            setLogs((prev) => [...prev, 'Starting bash script: deploy-main-site.sh']);
            // We'll replace this with an EventSource pointing to our backend endpoint later.

            // MOCK BEHAVIOR:
            const mockLogs = [
                'Fetching latest code from GitHub branch "main"...',
                'Fast-forwarding to latest commit...',
                'Installing dependencies across repositories...',
                'Running Next.js build: npm run build',
                'Building frontend output...',
                'Restarting pm2 processes...',
                'paradise-frontend restarting...',
                'paradise-backend restarting...',
                'Deployment complete successfully.',
            ];

            for (let i = 0; i < mockLogs.length; i++) {
                await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));
                setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${mockLogs[i]}`]);
            }

            setStatus('success');
            toast.success('Main site deployed successfully!');
        } catch (error) {
            setLogs((prev) => [...prev, `[ERROR] Deployment failed: ${error instanceof Error ? error.message : String(error)}`]);
            setStatus('failed');
            toast.error('Deployment failed.');
        }
    };

    const handleReset = () => {
        setStatus('idle');
        setLogs([]);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (status === 'deploying' && !val) {
                toast.warning('Deployment is running! Please wait.');
                return;
            }
            onOpenChange(val);
            if (!val) {
                setTimeout(handleReset, 300); // clear on close
            }
        }}>
            <DialogContent className="sm:max-w-2xl bg-card">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-primary" />
                        Deployment Console: Main Site
                    </DialogTitle>
                    <DialogDescription>
                        Deploy the newest code from GitHub to Paradise Yatra main production server.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/50 p-4 rounded-lg border border-border gap-4 text-center sm:text-left">
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground">Target Environment</span>
                            <span className="text-sm text-muted-foreground">Production VPS (Hostinger)</span>
                        </div>
                        <div className="flex flex-col sm:border-l sm:border-r border-border sm:px-4">
                            <span className="font-semibold text-foreground">Target Branch</span>
                            <span className="text-sm text-muted-foreground">main</span>
                        </div>
                        <div>
                            {status === 'idle' && (
                                <Button onClick={handleDeploy} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]">
                                    Deploy Now
                                </Button>
                            )}
                            {status === 'deploying' && (
                                <Button disabled className="min-w-[140px]">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deploying...
                                </Button>
                            )}
                            {status === 'success' && (
                                <Button variant="outline" className="text-green-600 border-green-600/50 bg-green-500/10 min-w-[140px]" disabled>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Success
                                </Button>
                            )}
                            {status === 'failed' && (
                                <Button variant="destructive" className="min-w-[140px]" disabled>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Failed
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">Live Terminal Logs</span>
                            {logs.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        navigator.clipboard.writeText(logs.join('\n'));
                                        toast.success('Logs copied to clipboard');
                                    }}
                                >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy Logs
                                </Button>
                            )}
                        </div>
                        <div
                            ref={scrollRef}
                            className="w-full h-80 bg-zinc-950 text-zinc-300 font-mono text-[13px] p-4 rounded-lg overflow-y-auto overflow-x-hidden border border-border shadow-inner"
                        >
                            {logs.length === 0 ? (
                                <span className="text-zinc-600 italic">No logs yet. Click 'Deploy Now' to begin sequence.</span>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="break-words mb-1 w-full leading-5">
                                        {log.includes('[ERROR]') || log.toLowerCase().includes('failed') ? (
                                            <span className="text-red-400">{log}</span>
                                        ) : log.toLowerCase().includes('success') ? (
                                            <span className="text-green-400">{log}</span>
                                        ) : (
                                            <span>{log}</span>
                                        )}
                                    </div>
                                ))
                            )}

                            {status === 'deploying' && (
                                <div className="flex items-center mt-2 text-zinc-500">
                                    <span className="animate-pulse">_</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
