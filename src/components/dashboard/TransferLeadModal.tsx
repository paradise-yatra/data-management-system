import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usersAPI, telecallerAPI, UserRecord } from "@/services/api";
import { showToast } from "@/utils/notifications";
import { TelecallerLeadRecord } from "@/types/telecaller";
import { Loader2, UserCheck } from "lucide-react";

interface TransferLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: TelecallerLeadRecord | null;
    onTransferComplete: () => void;
}

export function TransferLeadModal({ isOpen, onClose, lead, onTransferComplete }: TransferLeadModalProps) {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSelectedUserId('');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            // Ideally we should filter by 'sales' role or permission, but fetching all for now
            const data = await usersAPI.getAll();
            // Filter active users
            setUsers(data.filter(u => u.isActive));
        } catch (error) {
            console.error('Failed to fetch users', error);
            showToast.error('Failed to load user list');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleTransfer = async () => {
        if (!lead || !selectedUserId) return;

        setIsTransferring(true);
        try {
            await telecallerAPI.transfer(lead._id!, selectedUserId);
            showToast.success(`Lead assigned to ${users.find(u => u._id === selectedUserId)?.name}`);
            onTransferComplete();
            onClose();
        } catch (error: any) {
            showToast.error(error.message || 'Failed to transfer lead');
        } finally {
            setIsTransferring(false);
        }
    };

    if (!lead) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        Transfer Lead
                    </DialogTitle>
                    <DialogDescription>
                        Assign <strong>{lead.leadName}</strong> to another team member.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="user">Select Team Member</Label>
                        <Select
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                            disabled={isLoadingUsers || isTransferring}
                        >
                            <SelectTrigger id="user">
                                <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"} />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user._id} value={user._id}>
                                        {user.name} ({user.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isTransferring}>
                        Cancel
                    </Button>
                    <Button onClick={handleTransfer} disabled={!selectedUserId || isTransferring}>
                        {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Transfer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
