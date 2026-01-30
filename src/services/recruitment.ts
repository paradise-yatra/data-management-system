import { Candidate, CreateCandidateData, InteractionLog, Interview, LogInteractionData } from '../types/recruitment';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const recruitmentService = {
    // Candidates
    getCandidates: async (params?: { status?: string; search?: string }): Promise<Candidate[]> => {
        const query = new URLSearchParams(params as any).toString();
        const response = await fetch(`${API_URL}/candidates?${query}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch candidates');
        return response.json();
    },

    createCandidate: async (data: CreateCandidateData): Promise<Candidate> => {
        const response = await fetch(`${API_URL}/candidates`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create candidate');
        return response.json();
    },

    updateCandidate: async (id: string, data: Partial<Candidate>): Promise<Candidate> => {
        const response = await fetch(`${API_URL}/candidates/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update candidate');
        return response.json();
    },

    deleteCandidate: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/candidates/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete candidate');
    },

    // Interactions
    logInteraction: async (data: LogInteractionData): Promise<InteractionLog> => {
        const response = await fetch(`${API_URL}/interactions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to log interaction');
        return response.json();
    },

    getInteractions: async (candidateId: string): Promise<InteractionLog[]> => {
        const response = await fetch(`${API_URL}/interactions/candidate/${candidateId}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch interactions');
        return response.json();
    },

    // Interviews
    scheduleInterview: async (data: Partial<Interview>): Promise<Interview> => {
        const response = await fetch(`${API_URL}/interviews`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to schedule interview');
        return response.json();
    },

    getInterviews: async (params?: { start?: string; end?: string; status?: string }): Promise<Interview[]> => {
        const query = new URLSearchParams(params as any).toString();
        const response = await fetch(`${API_URL}/interviews?${query}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch interviews');
        return response.json();
    },

    updateInterview: async (id: string, data: Partial<Interview>): Promise<Interview> => {
        const response = await fetch(`${API_URL}/interviews/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update interview');
        return response.json();
    },

    getStats: async (): Promise<{ callsToday: number; interviewsScheduledToday: number; candidatesAddedToday: number }> => {
        const response = await fetch(`${API_URL}/interactions/stats`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    }
};
