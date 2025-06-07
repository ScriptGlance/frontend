import apiClient from '../axiosClient';

export type ProfileUpdateData = {
    avatar?: File | null;
    first_name?: string;
    last_name?: string;
    password?: string;
};

class ProfileRepository<TProfile, TUpdateData extends ProfileUpdateData> {
    private readonly endpoint: string;
    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    public async getProfile(token: string): Promise<TProfile> {
        const res = await apiClient.get(`${this.endpoint}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.error) throw new Error(res.description || "Failed to load profile");
        return res.data as TProfile;
    }

    public async updateProfile(
        token: string,
        data: TUpdateData
    ): Promise<TProfile> {
        const formData = new FormData();
        if (data.avatar && data.avatar instanceof File) {
            formData.append('avatar', data.avatar);
        }
        if (data.first_name !== undefined) {
            formData.append('first_name', data.first_name);
        }
        if (data.last_name !== undefined) {
            formData.append('last_name', data.last_name);
        }
        if (data.password !== undefined) {
            formData.append('password', data.password);
        }

        const res = await apiClient.put(`${this.endpoint}/profile`, formData, {
            headers: { Authorization: `Bearer ${token}`, headers: undefined }
        });
        if (res.error) throw new Error(res.description || "Failed to update profile");
        return res.data as TProfile;
    }
}

export interface UserProfile {
    avatar: string | null;
    user_id: number;
    first_name: string;
    last_name: string;
    has_premium: boolean;
    email: string;
    registered_at: string;
    is_temporary_password: boolean;
}
export type UserProfileUpdateData = ProfileUpdateData;

export interface ModeratorProfile {
    avatar: string | null;
    moderator_id: number;
    first_name: string;
    last_name: string;
    email: string;
    joined_at: string;
    is_temporary_password: boolean;
}
export type ModeratorProfileUpdateData = ProfileUpdateData;

export const userRepository = new ProfileRepository<UserProfile, UserProfileUpdateData>("/user");
export const moderatorRepository = new ProfileRepository<ModeratorProfile, ModeratorProfileUpdateData>("/moderator");


