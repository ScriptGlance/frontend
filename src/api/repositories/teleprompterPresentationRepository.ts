import apiClient from '../axiosClient';


export interface ParticipantVideoCount {
    user_id: number;
    videos_left: number | null;
}

export interface ParticipantsVideosLeftResponse {
    error: boolean;
    data: ParticipantVideoCount[];
}

export interface SetActiveReaderRequest {
    new_reader_id: number;
}

export interface ConfirmActiveReaderRequest {
    is_from_start_position: boolean;
}

class TeleprompterPresentationRepository {
    private static instance: TeleprompterPresentationRepository;

    private constructor() {}

    public static getInstance(): TeleprompterPresentationRepository {
        if (!TeleprompterPresentationRepository.instance) {
            TeleprompterPresentationRepository.instance = new TeleprompterPresentationRepository();
        }
        return TeleprompterPresentationRepository.instance;
    }

    public async startPresentation(token: string, presentationId: number): Promise<void> {
        const res = await apiClient.post(
            `/presentations/${presentationId}/start`,
            null,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (res.error) {
            throw new Error(res.description || 'Failed to start presentation');
        }
    }

    public async stopPresentation(token: string, presentationId: number): Promise<void> {
        const res = await apiClient.post(
            `/presentations/${presentationId}/stop`,
            null,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (res.error) {
            throw new Error(res.description || 'Failed to stop presentation');
        }
    }
    public async setRecordingMode(
        token: string,
        presentationId: number,
        isActive: boolean
    ): Promise<void> {
        const res = await apiClient.put(
            `/presentations/${presentationId}/recording-mode`,
            { is_active: isActive },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (res.error) {
            throw new Error('Failed to set recording mode');
        }
    }


    public async getParticipantsVideosLeft(
        token: string,
        presentationId: number
    ): Promise<ParticipantVideoCount[]> {
        const res = await apiClient.get<ParticipantsVideosLeftResponse>(
            `/presentations/${presentationId}/participants/videos-left`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (res.error) {
            throw new Error('Failed to get participants videos left');
        }
        if (!res.data) {
            throw new Error('No data received for participants videos left');
        }
        return res.data;
    }


    public async setActiveReader(
        token: string,
        presentationId: number,
        newReaderId: number
    ): Promise<void> {
        const requestBody: SetActiveReaderRequest = { new_reader_id: newReaderId };
        const res = await apiClient.put(
            `/presentations/${presentationId}/active/reader`,
            requestBody,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (res.error) {
            throw new Error(res.description || 'Failed to set active reader');
        }
    }

    public async confirmActiveReader(
        token: string,
        presentationId: number,
        isFromStartPosition: boolean
    ): Promise<void> {
        const requestBody: ConfirmActiveReaderRequest = { is_from_start_position: isFromStartPosition };
        const res = await apiClient.post(
            `/presentations/${presentationId}/active/reader/confirm`,
            requestBody,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (res.error) {
            throw new Error(res.description || 'Failed to confirm active reader');
        }
    }
}

export default TeleprompterPresentationRepository.getInstance();