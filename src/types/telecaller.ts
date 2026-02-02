export interface TelecallerLeadRecord {
    _id?: string;
    uniqueId?: string;
    leadName: string;
    phone: string;
    email: string;
    destination: string;
    duration: string;
    travelDate: string;
    budget?: number;
    paxCount?: number;
    status: 'Hot' | 'Cold' | 'Not Reachable' | 'Not Interested' | 'Follow-up';
    nextFollowUp?: string;
    remarks: string;
    addedById?: string;
    addedBy?: string;
    assignedTo?: string | { _id: string, name: string };
    assignedBy?: string | { _id: string, name: string };
}

export interface TelecallerLog {
    _id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'TRANSFER';
    entityId: string;
    entityName?: string;
    performedBy: {
        userId?: string;
        name: string;
        role: string;
    };
    details?: any;
    timestamp: string;
}

export interface TelecallerTrashRecord {
    _id: string;
    originalId: string;
    leadData: TelecallerLeadRecord;
    deletedBy?: string;
    deletedAt: string;
}

export type TelecallerFilterState = {
    search: string;
    statusFilter: string;
    destinationFilter: string;
    dateFilter: string;
};
