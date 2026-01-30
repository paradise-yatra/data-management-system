import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { recruitmentService } from '@/services/recruitment';
import { Candidate, Interview } from '@/types/recruitment';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function InterviewScheduler() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        candidateId: '',
        scheduledAt: '',
        link: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [candidatesData, interviewsData] = await Promise.all([
                recruitmentService.getCandidates({ status: 'Shortlisted' }), // Only show shortlisted candidates? Or all? Let's show all for now or maybe filter.
                recruitmentService.getInterviews()
            ]);
            setCandidates(candidatesData);
            setInterviews(interviewsData);
        } catch (error) {
            console.error('Failed to load data', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.candidateId || !formData.scheduledAt) {
                toast.error('Please select a candidate and time');
                return;
            }

            await recruitmentService.scheduleInterview({
                candidateId: formData.candidateId,
                scheduledAt: formData.scheduledAt,
                link: formData.link
            });

            toast.success('Interview scheduled successfully');
            setFormData({ candidateId: '', scheduledAt: '', link: '' });
            loadData(); // Reload list

        } catch (error) {
            toast.error('Failed to schedule interview');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Schedule Interview</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Candidate</Label>
                            <Select
                                value={formData.candidateId}
                                onValueChange={(val) => setFormData({ ...formData, candidateId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select candidate..." />
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

                        <div className="space-y-2">
                            <Label>Date & Time</Label>
                            <Input
                                type="datetime-local"
                                value={formData.scheduledAt}
                                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Meeting Link (Optional)</Label>
                            <Input
                                value={formData.link}
                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                placeholder="https://meet.google.com/..."
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Scheduling...' : 'Schedule Interview'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Link</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {interviews.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4">No upcoming interviews</TableCell>
                                </TableRow>
                            ) : (
                                interviews.map((interview) => (
                                    <TableRow key={interview._id}>
                                        <TableCell className="font-medium">
                                            {(interview.candidateId as Candidate)?.name || 'Unknown'}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(interview.scheduledAt), 'MMM d, h:mm a')}
                                        </TableCell>
                                        <TableCell>
                                            {interview.link ? (
                                                <a href={interview.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    Join
                                                </a>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
