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

export interface Presentation {
    presentation_id: number;
    name: string;
    created_at: string;
    modified_at: string;
    owner: PresentationOwner;
    participant_count: number;
}

export interface Participant {
    participant_id: number;
    color: string;
    user: PresentationOwner;
}

export interface InvitationResponse {
    invitation_code: string;
}

export interface PresentationPart {
    part_name: string;
    part_order: number;
    words_count: number;
    text_preview: string;
    assignee: PresentationOwner;
}

export interface PresentationStructure {
    total_words_count: number;
    structure: PresentationPart[];
}

export interface AcceptInvitationsResponse {
    presentation_id: number;
}

export interface PresentationsConfig {
    words_per_minute_min: number;
    words_per_minute_max: number;
    premium_config: {
        max_free_recording_time_seconds: number;
        max_free_participants_count: number;
        max_free_video_count: number;
        premium_price_cents: number;
    };
}

export interface PresentationVideo {
    video_id: number;
    video_title: string;
    video_duration: number;
    video_thumbnail: string;
    video_author: {
        avatar: string;
        user_id: number;
        first_name: string;
        last_name: string;
        has_premium: boolean;
        email: string;
        registered_at: string;
        is_temporary_password: boolean;
    };
    presentation_start: {
        start_date: string;
        end_date: string;
    };
}

export interface PresentationActiveCurrentReadingPosition {
    partId: number;
    position: number;
}

export interface PresentationActiveStructureItem {
    partId: number;
    partTextLength: number;
    assigneeUserId: number;
}

export interface PresentationActiveJoinedUser {
    userId: number;
    isRecordingModeActive: boolean;
}

export interface PresentationActiveData {
    currentReadingPosition: PresentationActiveCurrentReadingPosition;
    structure: PresentationActiveStructureItem[];
    userRecordedVideos: any[];
    currentPresentationStartDate?: string;
    currentOwnerUserId: number;
    joinedUsers: PresentationActiveJoinedUser[];
}

export interface PresentationActiveResponse {
    data: PresentationActiveData;
    error: boolean;
}

export interface ShareLinkResponse {
    shareCode: string;
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

    public async createPresentation(
        token: string,
    ): Promise<Presentation> {
        const res = await apiClient.post(
            '/presentations',
            null,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (res.error) throw new Error(res.description || "Failed to create presentation");
        return res.data as Presentation;
    }

    public async getPresentation(token: string, id: number): Promise<Presentation> {
        const res = await apiClient.get(`/presentations/${id}`, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to load presentation details");
        return res.data as Presentation;
    }

    public async updatePresentationName(token: string, id: number, name: string): Promise<Presentation> {
        const res = await apiClient.put(`/presentations/${id}`, {name}, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to update presentation name");
        return res.data as Presentation;
    }

    public async deletePresentation(token: string, id: number): Promise<void> {
        const res = await apiClient.delete(`/presentations/${id}`, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to delete presentation");
    }

    public async getParticipants(token: string, presentationId: number): Promise<Participant[]> {
        const res = await apiClient.get(`/presentations/${presentationId}/participants`, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to load participants");
        return res.data as Participant[];
    }

    public async deleteParticipant(token: string, participantId: number): Promise<void> {
        const res = await apiClient.delete(`/presentations/participants/${participantId}`, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to delete participant");
    }

    public async inviteParticipant(token: string, presentationId: number): Promise<InvitationResponse> {
        const res = await apiClient.post(`/presentations/${presentationId}/invite`, {}, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to invite participant");
        return res.data as InvitationResponse;
    }

    public async acceptInvitation(token: string, invitationToken: string): Promise<AcceptInvitationsResponse> {
        const res = await apiClient.post(`/presentations/invitations/${invitationToken}/accept`, {}, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to accept invitation");
        return res.data as AcceptInvitationsResponse;
    }

    public async getPresentationStructure(token: string, id: number): Promise<PresentationStructure> {
        const res = await apiClient.get(`/presentations/${id}/structure`, {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to load presentation structure");
        return res.data as PresentationStructure;
    }

    public async getConfig(token: string): Promise<PresentationsConfig> {
        const res = await apiClient.get("/user/config", {
            headers: {Authorization: `Bearer ${token}`}
        });
        if (res.error) throw new Error(res.description || "Failed to load config");
        return res.data as PresentationsConfig;
    }

    public async getVideos(token: string, presentationId: number, ): Promise<PresentationVideo[]> {
        const response = await apiClient.get(`/presentations/${presentationId}/videos`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.error) throw new Error("Failed to fetch videos");
        return response.data;
    }

    public async getActivePresentation(
        token: string,
        presentationId: number
    ): Promise<PresentationActiveData> {
        const res = await apiClient.get<PresentationActiveResponse>(
            `/presentations/${presentationId}/active`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (res.error) throw new Error("Failed to get active presentation");
        return res.data;
    }

    public async getVideoFile(token: string, videoId: number): Promise<Blob> {
        return await apiClient.get<Blob>(`/presentations/videos/${videoId}`, {
            headers: {Authorization: `Bearer ${token}`},
            responseType: "blob"
        });
    }


    public async deleteVideo(token: string, videoId: number): Promise<void> {
        const res = await apiClient.delete(`/presentations/videos/${videoId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.error) throw new Error(res.description || "Failed to delete video");
    }

    public async getVideoShareLink(token: string, videoId: number): Promise<ShareLinkResponse> {
        const res = await apiClient.get(`/presentations/videos/${videoId}/share-link`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.error) throw new Error(res.description || "Failed to get video share link");
        return res.data;
    }

    public async getSharedVideo(shareCode: string): Promise<Blob> {
        return await apiClient.get<Blob>(`/shared-video/file/${shareCode}`, {
            responseType: "blob"
        });
    }
}

export default PresentationsRepository.getInstance();