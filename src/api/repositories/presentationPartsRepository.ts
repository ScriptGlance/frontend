import apiClient from '../axiosClient';

export interface CursorPosition {
    user_id: number;
    part_id: number | null;
    cursor_position: number | null;
    target: 'text' | 'name' | null;
    selection_anchor_position: number | null;
}

export interface GetCursorPositionsResponse {
    data: CursorPosition[];
    error: boolean;
}

export interface PresentationPartFull {
    part_id: number;
    part_name: string;
    part_text: string;
    part_order: number;
    assignee_participant_id: number;
    part_text_version?: number;
    part_name_version?: number;
}

export interface GetPartsResponse {
    data: PresentationPartFull[];
    error: boolean;
}

export interface CreatePartRequest {
    part_order: number;
}

export interface CreatePartResponse {
    data: PresentationPartFull;
    error: boolean;
}

export interface UpdatePartRequest {
    part_order?: number;
    part_assignee_participant_id?: number;
}

export interface UpdatePartResponse {
    data: PresentationPartFull;
    error: boolean;
}

class PresentationPartsRepository {
    private static instance: PresentationPartsRepository;

    private constructor() {}

    public static getInstance(): PresentationPartsRepository {
        if (!PresentationPartsRepository.instance) {
            PresentationPartsRepository.instance = new PresentationPartsRepository();
        }
        return PresentationPartsRepository.instance;
    }

    public async getCursorPositions(token: string, presentationId: number): Promise<CursorPosition[]> {
        const res = await apiClient.get<GetCursorPositionsResponse>(
            `/presentations/${presentationId}/text/cursor-positions`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (res.error) throw new Error("Failed to fetch cursor positions");
        return res.data;
    }

    public async getParts(token: string, presentationId: number): Promise<PresentationPartFull[]> {
        const res = await apiClient.get<GetPartsResponse>(
            `/presentations/${presentationId}/parts`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (res.error) throw new Error("Failed to fetch parts");
        return res.data;
    }

    public async createPart(token: string, presentationId: number, req: CreatePartRequest): Promise<PresentationPartFull> {
        const res = await apiClient.post<CreatePartResponse>(
            `/presentations/${presentationId}/parts`,
            req,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (res.error) throw new Error("Failed to create part");
        return res.data;
    }

    public async updatePart(token: string, partId: number, req: UpdatePartRequest): Promise<PresentationPartFull> {
        const res = await apiClient.put<UpdatePartResponse>(
            `/presentations/parts/${partId}`,
            req,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (res.error) throw new Error("Failed to update part");
        return res.data;
    }

    public async deletePart(token: string, partId: number): Promise<void> {
        await apiClient.delete<void>(
            `/presentations/parts/${partId}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
    }
}

export default PresentationPartsRepository.getInstance();
