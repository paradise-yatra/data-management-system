export interface Candidate {
    _id: string;
    name: string;
    contactNumber: string;
    email?: string;
    source: string;
    currentPosition: string;
    status: 'New' | 'Shortlisted' | 'Interview Scheduled' | 'Hired' | 'Rejected' | 'On Hold';
    createdAt: string;
    updatedAt: string;
}

export interface InteractionLog {
    _id: string;
    candidateId: string;
    hrId: string;
    type: 'Call' | 'Message' | 'Email' | 'Note';
    response?: string;
    conclusion: string;
    notes?: string;
    loggedAt: string;
}

export interface Interview {
    _id: string;
    candidateId: string | Candidate; // Can be populated
    scheduledAt: string;
    link?: string;
    status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
    createdAt: string;
    updatedAt: string;
}

export interface CreateCandidateData {
    name: string;
    contactNumber: string;
    email?: string;
    source: string;
    currentPosition: string;
    status?: string;
}

export interface LogInteractionData {
    candidateId: string;
    hrId: string;
    type: string;
    response?: string;
    conclusion: string;
    notes?: string;
    createNewCandidate?: boolean;
    candidateData?: CreateCandidateData;
}
