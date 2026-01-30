import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recruitmentService } from '@/services/recruitment';
import { Candidate } from '@/types/recruitment';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface QuickLogFormProps {
    onLogSuccess?: () => void;
    preSelectedCandidateId?: string;
}

export function QuickLogForm({ onLogSuccess, preSelectedCandidateId }: QuickLogFormProps) {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [isNewCandidate, setIsNewCandidate] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedCandidateId, setSelectedCandidateId] = useState('');

    useEffect(() => {
        if (preSelectedCandidateId) {
            setSelectedCandidateId(preSelectedCandidateId);
            setIsNewCandidate(false);
        }
    }, [preSelectedCandidateId]);
    const [newCandidateData, setNewCandidateData] = useState({
        name: '',
        contactNumber: '',
        email: '',
        source: '',
        currentPosition: '',
        status: 'New'
    });
    const [interactionData, setInteractionData] = useState({
        type: 'Call',
        response: '',
        conclusion: '',
        notes: ''
    });
    const [interviewData, setInterviewData] = useState({
        scheduledAt: '',
        link: ''
    });

    useEffect(() => {
        loadCandidates();
    }, []);

    const loadCandidates = async () => {
        try {
            const data = await recruitmentService.getCandidates();
            setCandidates(data);
        } catch (error) {
            console.error('Failed to load candidates', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!isNewCandidate && !selectedCandidateId) {
                toast.error('Please select a candidate or create a new one');
                return;
            }

            if (isNewCandidate) {
                if (!newCandidateData.name || !newCandidateData.contactNumber || !newCandidateData.source || !newCandidateData.currentPosition) {
                    toast.error('Please fill in all required candidate details');
                    return;
                }
            }

            if (!interactionData.conclusion) {
                toast.error('Please specify a conclusion');
                return;
            }

            if (interactionData.conclusion === 'Schedule Interview' && !interviewData.scheduledAt) {
                toast.error('Please specify interview date and time');
                return;
            }

            if (!user?._id) {
                toast.error('User session not found. Please login again.');
                return;
            }

            await recruitmentService.logInteraction({
                candidateId: selectedCandidateId,
                hrId: user._id,
                type: interactionData.type,
                response: interactionData.response,
                conclusion: interactionData.conclusion,
                notes: interactionData.notes,
                createNewCandidate: isNewCandidate,
                candidateData: isNewCandidate ? newCandidateData : undefined,
                interviewData: interactionData.conclusion === 'Schedule Interview' ? {
                    scheduledAt: new Date(interviewData.scheduledAt).toISOString(),
                    link: interviewData.link
                } : undefined
            });

            toast.success('Interaction logged successfully');

            // Reset form
            setInteractionData({
                type: 'Call',
                response: '',
                conclusion: '',
                notes: ''
            });
            setInterviewData({
                scheduledAt: '',
                link: ''
            });
            setNewCandidateData({
                name: '',
                contactNumber: '',
                email: '',
                source: '',
                currentPosition: '',
                status: 'New'
            });
            setIsNewCandidate(false);
            setSelectedCandidateId('');

            loadCandidates(); // Reload to get new candidate if added
            if (onLogSuccess) onLogSuccess();

        } catch (error) {
            toast.error('Failed to log interaction');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-md bg-card/80 backdrop-blur-md">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Log Interaction</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="flex p-1 bg-muted rounded-lg">
                        <button
                            type="button"
                            onClick={() => setIsNewCandidate(true)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isNewCandidate ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            New Candidate
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNewCandidate(false)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isNewCandidate ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Existing Candidate
                        </button>
                    </div>

                    {isNewCandidate ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="Full Name"
                                    value={newCandidateData.name}
                                    onChange={(e) => setNewCandidateData({ ...newCandidateData, name: e.target.value })}
                                    className="bg-background/50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact *</Label>
                                <Input
                                    id="contact"
                                    placeholder="Phone Number"
                                    value={newCandidateData.contactNumber}
                                    onChange={(e) => setNewCandidateData({ ...newCandidateData, contactNumber: e.target.value })}
                                    className="bg-background/50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={newCandidateData.email}
                                    onChange={(e) => setNewCandidateData({ ...newCandidateData, email: e.target.value })}
                                    className="bg-background/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="source" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source *</Label>
                                <Select
                                    value={newCandidateData.source}
                                    onValueChange={(val) => setNewCandidateData({ ...newCandidateData, source: val })}
                                >
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue placeholder="Select Source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                        <SelectItem value="Naukri">Naukri</SelectItem>
                                        <SelectItem value="Indeed">Indeed</SelectItem>
                                        <SelectItem value="Referral">Referral</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label htmlFor="position" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Position *</Label>
                                <Input
                                    id="position"
                                    placeholder="e.g. Sales Executive"
                                    value={newCandidateData.currentPosition}
                                    onChange={(e) => setNewCandidateData({ ...newCandidateData, currentPosition: e.target.value })}
                                    className="bg-background/50"
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Candidate</Label>
                            <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                                <SelectTrigger className="h-12 bg-muted/30 border-none">
                                    <SelectValue placeholder="Search or select candidate..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {candidates.map((c) => (
                                        <SelectItem key={c._id} value={c._id}>
                                            {c.name} - {c.currentPosition}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interaction Type</Label>
                            <Select
                                value={interactionData.type}
                                onValueChange={(val) => setInteractionData({ ...interactionData, type: val })}
                            >
                                <SelectTrigger className="bg-muted/30 border-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Call">Call</SelectItem>
                                    <SelectItem value="Message">WhatsApp/Message</SelectItem>
                                    <SelectItem value="Email">Email</SelectItem>
                                    <SelectItem value="Note">Note Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outcome / Conclusion *</Label>
                            <Select
                                value={interactionData.conclusion}
                                onValueChange={(val) => setInteractionData({ ...interactionData, conclusion: val })}
                            >
                                <SelectTrigger className="bg-muted/30 border-none">
                                    <SelectValue placeholder="Select outcome" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                                    <SelectItem value="Schedule Interview">Schedule Interview</SelectItem>
                                    <SelectItem value="Call Later">Call Later</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                    <SelectItem value="No Answer">No Answer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {interactionData.conclusion === 'Schedule Interview' && (
                        <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                Schedule Interview Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date & Time *</Label>
                                    <Input
                                        type="datetime-local"
                                        value={interviewData.scheduledAt}
                                        onChange={(e) => setInterviewData({ ...interviewData, scheduledAt: e.target.value })}
                                        className="bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meeting Link (Optional)</Label>
                                    <Input
                                        placeholder="Google Meet / Zoom link"
                                        value={interviewData.link}
                                        onChange={(e) => setInterviewData({ ...interviewData, link: e.target.value })}
                                        className="bg-background"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Response / Notes</Label>
                        <Textarea
                            value={interactionData.notes}
                            onChange={(e) => setInteractionData({ ...interactionData, notes: e.target.value })}
                            placeholder="Add any specific details about the conversation..."
                            className="min-h-[100px] bg-muted/30 border-none resize-none"
                        />
                    </div>

                    <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
                        {loading ? 'Processing...' : 'Save & Log Activity'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
