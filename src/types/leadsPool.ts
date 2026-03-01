export interface LeadPoolComment {
    _id: string;
    leadId: string;
    text: string;
    userId: string;
    userName: string;
    mentions: string[];
    externalCommentId?: string | null;
    sourceSystem?: 'pool' | 'telecaller';
    createdAt: string;
    updatedAt?: string;
}

export interface LeadPoolRecord {
    _id?: string;
    uniqueId?: string;
    leadName: string;
    phone: string;
    email: string;
    source?: string;
    destination: string;
    duration: string;
    travelDate: string;
    budget?: number;
    paxCount?: number;
    adults?: number;
    children?: number;
    status: 'Hot' | 'Cold' | 'Not Reachable' | 'Not Interested' | 'Follow-up';
    nextFollowUp?: string;
    remarks: string;
    addedById?: string;
    addedBy?: string;
    assignedTo?: string | { _id: string, name: string };
    assignedBy?: string | { _id: string, name: string };
    assignedAt?: string;
    dateAdded?: string;
    createdAt?: string;
    updatedAt?: string;
    isDeleted?: boolean;
}

export interface LeadPoolActivity {
    _id: string;
    leadId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'TRANSFER' | 'COMMENT' | 'SYNC';
    entityId: string;
    entityName?: string;
    performedBy: {
        userId?: string;
        name: string;
        role: string;
    };
    details?: {
        changes?: Record<string, { old: any; new: any }>;
        [key: string]: any;
    };
    timestamp: string;
}

