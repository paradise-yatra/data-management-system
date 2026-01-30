import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recruitmentService } from '@/services/recruitment';
import { Candidate } from '@/types/recruitment';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Search } from 'lucide-react';

interface CandidateListProps {
    onSelectCandidate?: (id: string) => void;
}

export function CandidateList({ onSelectCandidate }: CandidateListProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        search: ''
    });

    useEffect(() => {
        loadCandidates();
    }, [filters]);

    const loadCandidates = async () => {
        setLoading(true);
        try {
            const data = await recruitmentService.getCandidates(filters);
            setCandidates(data);
        } catch (error) {
            console.error('Failed to load candidates', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800';
            case 'Shortlisted': return 'bg-green-100 text-green-800';
            case 'Interview Scheduled': return 'bg-purple-100 text-purple-800';
            case 'Hired': return 'bg-emerald-100 text-emerald-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'On Hold': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border/50 flex flex-col md:flex-row gap-4 bg-muted/20">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search candidates..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="pl-9 bg-background/50 border-none shadow-none focus-visible:ring-1"
                    />
                </div>
                <Select
                    value={filters.status}
                    onValueChange={(val) => setFilters({ ...filters, status: val === 'All' ? '' : val })}
                >
                    <SelectTrigger className="w-full md:w-[160px] bg-background/50 border-none shadow-none">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
                        <SelectItem value="Hired">Hired</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="overflow-auto max-h-[600px]">
                <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="text-xs font-bold uppercase tracking-wider">Candidate</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider">Position</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider">Last Activity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-muted-foreground">Loading candidates...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : candidates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                    No candidates found matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            candidates.map((candidate) => (
                                <TableRow
                                    key={candidate._id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                    onClick={() => onSelectCandidate?.(candidate._id)}
                                >
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm group-hover:text-primary transition-colors">{candidate.name}</span>
                                            <span className="text-xs text-muted-foreground">{candidate.contactNumber}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium">{candidate.currentPosition}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`${getStatusColor(candidate.status)} border-none text-[10px] px-2 py-0 h-5`}>
                                            {candidate.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(candidate.updatedAt), 'MMM d')}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
