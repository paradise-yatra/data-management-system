import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, Calendar, Users, IndianRupee, Clock, MessageSquare, History, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadPoolRecord, LeadPoolActivity, LeadPoolComment } from '@/types/leadsPool';
import { leadsPoolAPI, UserRecord } from '@/services/api';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from '@/components/ui/input';
import { Separator } from "@/components/ui/separator";
import { Command, CommandItem, CommandList } from "@/components/ui/command";

interface LeadsPoolDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: LeadPoolRecord | null;
    users: UserRecord[]; // Passed for mentions
}

export function LeadsPoolDetailsModal({ isOpen, onClose, record, users }: LeadsPoolDetailsModalProps) {
    const [activeTab, setActiveTab] = useState('activity');
    const [comments, setComments] = useState<LeadPoolComment[]>([]);
    const [activityLog, setActivityLog] = useState<LeadPoolActivity[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [selectedMentions, setSelectedMentions] = useState<string[]>([]);

    // Suggestion state
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentions, setShowMentions] = useState(false);

    // Version History View
    const [viewingVersion, setViewingVersion] = useState<LeadPoolRecord | null>(null);

    useEffect(() => {
        if (isOpen && record?._id) {
            fetchComments();
            fetchActivity();
            setViewingVersion(null); // Reset version view on open
            setSelectedMentions([]);
        }
    }, [isOpen, record]);

    const fetchComments = async () => {
        if (!record?._id) return;
        try {
            const data = await leadsPoolAPI.getComments(record._id);
            setComments(data);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        }
    };

    const fetchActivity = async () => {
        if (!record?._id) return;
        setIsLoadingLogs(true);
        try {
            const data = await leadsPoolAPI.getActivity(record._id);
            setActivityLog(data);
        } catch (error) {
            console.error('Failed to fetch activity', error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !record?._id) return;

        try {
            await leadsPoolAPI.addComment(record._id, newComment, selectedMentions);
            setNewComment('');
            setSelectedMentions([]);
            fetchComments();
            setShowMentions(false);
        } catch (error) {
            console.error('Failed to add comment', error);
        }
    };

    const handleViewVersion = (log: LeadPoolActivity) => {
        if (!record || !log.details?.changes) return;

        const historicalRecord = { ...record };

        // Revert fields to their 'old' values from the change log
        Object.entries(log.details.changes).forEach(([key, values]: [string, any]) => {
            if (values && values.old !== undefined) {
                (historicalRecord as any)[key] = values.old;
            }
        });

        setViewingVersion(historicalRecord);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Basic mention trigger detection handled in onChange usually, 
        // but can add key handlers here if needed (e.g. Escape to close mentions)
        if (e.key === 'Escape') setShowMentions(false);
    };

    if (typeof window === 'undefined') return null;

    // Display Record: Either the current record OR the historical version being viewed
    const displayRecord = viewingVersion || record;
    const isHistoryMode = !!viewingVersion;
    const assignedDisplayName = (() => {
        const assignedTo = displayRecord?.assignedTo;
        if (!assignedTo) return 'Unassigned';
        if (typeof assignedTo === 'object') {
            return (assignedTo as any)?.name || 'Unassigned';
        }
        const mappedUser = users.find((u) => u?._id === assignedTo);
        return mappedUser?.name || 'Unassigned';
    })();

    return createPortal(
        <AnimatePresence>
            {isOpen && record && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative z-[101] flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl md:flex-row"
                    >
                        {/* Header (Mobile only) */}
                        <div className="flex items-center justify-between border-b border-border p-4 md:hidden">
                            <h2 className="text-lg font-semibold">Lead Details</h2>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* LEFT PANEL: LEAD CARD (Static Reference) */}
                        <div className={`flex w-full flex-col border-b border-border bg-muted/10 p-6 md:w-1/3 md:border-b-0 md:border-r ${isHistoryMode ? 'ring-2 ring-primary ring-inset' : ''}`}>
                            <div className="mb-6">
                                {isHistoryMode && (
                                    <Badge variant="outline" className="mb-2 border-primary text-primary bg-primary/10 w-full justify-center">
                                        <History className="mr-1 h-3 w-3" /> Historical Version
                                    </Badge>
                                )}
                                <div className="flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                                        {displayRecord?.leadName?.charAt(0).toUpperCase()}
                                    </div>
                                    <Badge variant={(displayRecord?.status === 'Hot' || displayRecord?.status === 'New') ? 'default' : 'secondary'}>
                                        {displayRecord?.status}
                                    </Badge>
                                </div>
                                <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{displayRecord?.leadName}</h2>
                                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Added {displayRecord?.dateAdded ? format(new Date(displayRecord.dateAdded), 'PPP') : 'Unknown'}</span>
                                </div>
                            </div>

                            <Separator className="mb-6" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{displayRecord?.phone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{displayRecord?.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{displayRecord?.destination}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Assigned: {assignedDisplayName}</span>
                                </div>
                            </div>

                            <div className="mt-8 rounded-lg border border-border bg-card p-4">
                                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trip Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">Travel Date</div>
                                        <div className="text-sm font-medium flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {displayRecord?.travelDate ? format(new Date(displayRecord.travelDate), 'PP') : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">Duration</div>
                                        <div className="text-sm font-medium">{displayRecord?.duration || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">Pax</div>
                                        <div className="text-sm font-medium flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {displayRecord?.paxCount || 0}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">Budget</div>
                                        <div className="text-sm font-medium flex items-center gap-1">
                                            <IndianRupee className="h-3 w-3" />
                                            {displayRecord?.budget?.toLocaleString('en-IN') || '0'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isHistoryMode && (
                                <Button
                                    className="mt-auto w-full"
                                    variant="outline"
                                    onClick={() => setViewingVersion(null)}
                                >
                                    Return to Current Version
                                </Button>
                            )}
                        </div>

                        {/* RIGHT PANEL: ACTION HUB */}
                        <div className="flex flex-1 flex-col bg-background">
                            {/* Close Button Desktop */}
                            <div className="hidden items-center justify-end border-b border-border p-2 md:flex">
                                <Button variant="ghost" size="icon" onClick={onClose}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
                                <div className="px-6 pt-4">
                                    <TabsList className="w-full justify-start border-b border-border bg-transparent p-0">
                                        <TabsTrigger
                                            value="activity"
                                            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                                        >
                                            Activity & History
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="comments"
                                            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                                        >
                                            Comments
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* ACTIVITY TAB */}
                                <TabsContent value="activity" className="flex-1 overflow-hidden p-0">
                                    <ScrollArea className="h-full px-6 py-4">
                                        <div className="space-y-6">
                                            {activityLog.map((log) => (
                                                <div key={log._id} className="relative pl-6 border-l border-border pb-6 last:border-0 last:pb-0">
                                                    <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />

                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-primary uppercase tracking-wider">{log.action}</span>
                                                        <span className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'PP p')}</span>
                                                    </div>

                                                    <div className="text-sm text-foreground mb-2">
                                                        <span className="font-medium">{log.performedBy?.name || 'System'}</span>
                                                        {' '}
                                                        {log.action === 'UPDATE' ? 'updated this lead' :
                                                            log.action === 'CREATE' ? 'created this lead' :
                                                                log.action === 'TRANSFER' ? 'transferred this lead' : 'performed an action'}
                                                    </div>

                                                    {/* Changes Diff View */}
                                                    {log.details?.changes && Object.keys(log.details.changes).length > 0 && (
                                                        <div className="mt-2 rounded-md bg-muted/50 p-3 text-sm">
                                                            {Object.entries(log.details.changes).map(([field, diff]: [string, any]) => (
                                                                <div key={field} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center mb-1 last:mb-0">
                                                                    <div className="text-muted-foreground line-through text-xs overflow-hidden text-ellipsis whitespace-nowrap" title={diff?.old !== undefined ? String(diff.old) : 'Empty'}>
                                                                        {String(diff?.old !== undefined ? diff.old : 'Empty')}
                                                                    </div>
                                                                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                    <div className="text-green-600 font-medium text-xs overflow-hidden text-ellipsis whitespace-nowrap" title={diff?.new !== undefined ? String(diff.new) : 'Empty'}>
                                                                        {String(diff?.new !== undefined ? diff.new : 'Empty')}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground col-span-3 mt-0.5 font-medium capitalize">
                                                                        {field.replace(/([A-Z])/g, ' $1').trim()}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className="mt-3 pt-2 border-t border-border/50">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-xs w-full justify-start text-muted-foreground hover:text-primary px-0"
                                                                    onClick={() => handleViewVersion(log)}
                                                                >
                                                                    <Eye className="mr-1.5 h-3 w-3" />
                                                                    View Lead at this state
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {activityLog.length === 0 && (
                                                <div className="text-center text-sm text-muted-foreground py-8">
                                                    No activity recorded yet.
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* COMMENTS TAB */}
                                <TabsContent value="comments" className="flex flex-1 flex-col overflow-hidden p-0">
                                    <ScrollArea className="flex-1 px-6 py-4">
                                        <div className="space-y-4">
                                            {comments.map((comment) => (
                                                <div key={comment._id} className="flex gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>{comment.userName?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium">{comment.userName}</span>
                                                            <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'PP p')}</span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                                                            {comment.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            {comments.length === 0 && (
                                                <div className="text-center text-sm text-muted-foreground py-8">
                                                    No comments yet. Start the conversation!
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>

                                    <div className="p-4 border-t border-border bg-background relative">
                                        <AnimatePresence>
                                            {showMentions && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute bottom-full left-4 mb-2 w-64 rounded-md border border-border bg-popover shadow-md z-50 overflow-hidden"
                                                >
                                                    <Command className="border-0">
                                                        <CommandList className="max-h-[200px] overflow-y-auto p-1">
                                                            {users.filter(u =>
                                                                u.name.toLowerCase().includes(mentionSearch.toLowerCase())
                                                            ).map(user => (
                                                                <CommandItem
                                                                    key={user._id}
                                                                    onSelect={() => {
                                                                        const lastAt = newComment.lastIndexOf('@');
                                                                        if (lastAt !== -1) {
                                                                            const before = newComment.substring(0, lastAt);
                                                                            // Everything after the query string (if any)
                                                                            // Actually, we just want to replace up to the cursor or end
                                                                            // Simple replace:
                                                                            setNewComment(`${before}@${user.name} `);
                                                                            setSelectedMentions((prev) => (
                                                                                prev.includes(user._id) ? prev : [...prev, user._id]
                                                                            ));
                                                                        }
                                                                        setShowMentions(false);
                                                                        setMentionSearch('');
                                                                    }}
                                                                    className="flex items-center gap-2 cursor-pointer p-2 rounded-sm hover:bg-muted/50 data-[selected=true]:bg-muted/50"
                                                                >
                                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                                                                        {user.name.charAt(0)}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium">{user.name}</span>
                                                                        <span className="text-[10px] text-muted-foreground">{user.role}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                            {users.filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 && (
                                                                <div className="p-2 text-xs text-muted-foreground text-center">No users found</div>
                                                            )}
                                                        </CommandList>
                                                    </Command>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <form onSubmit={handleCommentSubmit} className="flex gap-2">
                                            <Input
                                                value={newComment}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setNewComment(val);

                                                    const lastAt = val.lastIndexOf('@');
                                                    if (lastAt !== -1 && lastAt >= val.length - 20) {
                                                        const query = val.slice(lastAt + 1);
                                                        if (!query.includes(' ')) {
                                                            setShowMentions(true);
                                                            setMentionSearch(query);
                                                        } else {
                                                            setShowMentions(false);
                                                        }
                                                    } else {
                                                        setShowMentions(false);
                                                    }
                                                }}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type a comment... (Type @ to mention)"
                                                className="flex-1"
                                                autoFocus
                                            />
                                            <Button type="submit" disabled={!newComment.trim()}>
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                Send
                                            </Button>
                                        </form>
                                        <div className="text-xs text-muted-foreground mt-2 pl-1">
                                            Tip: Type <strong>@</strong> to mention a team member.
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
