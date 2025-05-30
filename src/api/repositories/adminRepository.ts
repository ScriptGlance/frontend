import apiClient from '../axiosClient';

export interface User {
    avatar: string | null;
    user_id: number;
    first_name: string;
    last_name: string;
    has_premium: boolean;
    email: string;
    registered_at: string;
    is_temporary_password: boolean;
}

export interface Moderator {
    avatar: string | null;
    moderator_id: number;
    first_name: string;
    last_name: string;
    email: string;
    joined_at: string;
}

export interface GetUsersParams {
    limit?: number;
    offset?: number;
    sort: 'registeredAt' | 'name' | 'email';
    order: 'asc' | 'desc';
    search?: string;
}

export interface GetModeratorsParams {
    limit?: number;
    offset?: number;
    sort: 'joinedAt' | 'name' | 'email';
    order: 'asc' | 'desc';
    search?: string;
}

export interface InviteUserRequest {
    first_name: string;
    last_name: string;
    email: string;
}

export interface InviteModeratorRequest {
    first_name: string;
    last_name: string;
    email: string;
}

export interface UpdateUserProfileRequest {
    first_name: string;
    last_name: string;
    avatar?: File;
}

export interface UpdateModeratorProfileRequest {
    first_name: string;
    last_name: string;
    avatar?: File;
}

export interface DailyStats {
    period_start: string;
    total_users_count: number;
    total_presentation_duration_seconds: number;
    videos_recorded_count: number;
}

export interface MonthlyStats {
    period_start: string;
    total_users_count: number;
    total_presentation_duration_seconds: number;
    videos_recorded_count: number;
}

export interface GetStatsParams {
    limit?: number;
    offset?: number;
}

class AdminRepository {
    private static instance: AdminRepository;

    private constructor() {}

    public static getInstance(): AdminRepository {
        if (!AdminRepository.instance) {
            AdminRepository.instance = new AdminRepository();
        }
        return AdminRepository.instance;
    }

    public async getUsers(token: string, params: GetUsersParams): Promise<User[]> {
        const res = await apiClient.get("/admin/users", {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });
        if (res.error) throw new Error(res.description || "Failed to load users");
        return res.data;
    }

    public async getModerators(token: string, params: GetModeratorsParams): Promise<Moderator[]> {
        const res = await apiClient.get("/admin/moderators", {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });
        if (res.error) throw new Error(res.description || "Failed to load moderators");
        return res.data;
    }

    public async updateUserProfile(token: string, userId: number, data: UpdateUserProfileRequest): Promise<User> {
        const formData = new FormData();
        formData.append('first_name', data.first_name);
        formData.append('last_name', data.last_name);
        if (data.avatar) {
            formData.append('avatar', data.avatar);
        }

        const res = await apiClient.put(`/admin/user/${userId}`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            },
        });
        if (res.error) throw new Error(res.description || "Failed to update user profile");
        return res.data;
    }

    public async deleteUser(token: string, userId: number): Promise<void> {
        const res = await apiClient.delete(`/admin/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.error) throw new Error(res.description || "Failed to delete user");
    }

    public async updateModeratorProfile(token: string, moderatorId: number, data: UpdateModeratorProfileRequest): Promise<Moderator> {
        const formData = new FormData();
        formData.append('first_name', data.first_name);
        formData.append('last_name', data.last_name);
        if (data.avatar) {
            formData.append('avatar', data.avatar);
        }

        const res = await apiClient.put(`/admin/moderator/${moderatorId}`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            },
        });
        if (res.error) throw new Error(res.description || "Failed to update moderator profile");
        return res.data;
    }

    public async deleteModerator(token: string, moderatorId: number): Promise<void> {
        const res = await apiClient.delete(`/admin/moderator/${moderatorId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.error) throw new Error(res.description || "Failed to delete moderator");
    }

    public async inviteUser(token: string, data: InviteUserRequest): Promise<void> {
        const res = await apiClient.post('/admin/user/invite', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.error) throw new Error(res.description || "Failed to invite user");
    }

    public async inviteModerator(token: string, data: InviteModeratorRequest): Promise<void> {
        const res = await apiClient.post('/admin/moderator/invite', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.error) throw new Error(res.description || "Failed to invite moderator");
    }

    public async getDailyStats(token: string, params: GetStatsParams = {}): Promise<DailyStats[]> {
        const res = await apiClient.get("/admin/stats/daily", {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });
        if (res.error) throw new Error(res.description || "Failed to load daily stats");
        return res.data;
    }

    public async getMonthlyStats(token: string, params: GetStatsParams = {}): Promise<MonthlyStats[]> {
        const res = await apiClient.get("/admin/stats/monthly", {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });
        if (res.error) throw new Error(res.description || "Failed to load monthly stats");
        return res.data;
    }
}

export default AdminRepository.getInstance();