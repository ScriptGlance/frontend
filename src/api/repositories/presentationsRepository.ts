import apiClient from '../axiosClient';

export interface PresentationStats {
    presentation_count: number;
    invited_participants: number;
    recordings_made: number;
}

export interface PresentationOwner {
    avatar: string | null;
    user_id: number;
    first_name: string;
    last_name: string;
    has_premium: boolean;
    email: string;
    registered_at: string;
    is_temporary_password: boolean;
}

export interface PresentationItem {
    presentation_id: number;
    name: string;
    created_at: string;
    modified_at: string;
    owner: PresentationOwner;
    participant_count: number;
}

export interface GetPresentationsParams {
    limit?: number;
    offset?: number;
    search?: string;
    sort?: 'byUpdatedAt' | 'byName' | 'byCreatedAt' | 'byParticipantsCount';
    owner?: 'me' | 'others' | 'all';
    lastChange?: 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'allTime';
    type?: 'individual' | 'group' | 'all';
}

class PresentationsRepository {
    private static instance: PresentationsRepository;

    private constructor() {}

    public static getInstance(): PresentationsRepository {
        if (!PresentationsRepository.instance) {
            PresentationsRepository.instance = new PresentationsRepository();
        }
        return PresentationsRepository.instance;
    }

    public async getStats(token: string): Promise<PresentationStats> {
        const res = await apiClient.get("/presentations/stats", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.error) throw new Error(res.description || "Failed to load stats");
        return res.data;
    }

    public async getPresentations(token: string, params: GetPresentationsParams = {}, signal?: AbortSignal): Promise<PresentationItem[]> {
        const res = await apiClient.get("/presentations", {
            headers: { Authorization: `Bearer ${token}` },
            params,
            signal,
        });
        if (res.error) throw new Error(res.description || "Failed to load presentations");
        return res.data;
    }
}

export default PresentationsRepository.getInstance();
