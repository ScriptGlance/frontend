import apiClient from '../axiosClient';

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

export interface UserProfileUpdateData {
    avatar?: File | null;
    first_name?: string;
    last_name?: string;
    password?: string;
}

class UserRepository {
    private static instance: UserRepository;

    private constructor() {}

    public static getInstance(): UserRepository {
        if (!UserRepository.instance) {
            UserRepository.instance = new UserRepository();
        }
        return UserRepository.instance;
    }

    public async getProfile(token: string): Promise<UserProfile> {
        const res = await apiClient.get("/user/profile", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.error) throw new Error(res.description || "Failed to load user profile");
        return res.data as UserProfile;
    }

    public async updateProfile(
        token: string,
        data: UserProfileUpdateData
    ): Promise<UserProfile> {
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

        const res = await apiClient.put("/user/profile", formData, {
            headers: { Authorization: `Bearer ${token}`, headers: undefined }
        });
        if (res.error) throw new Error(res.description || "Failed to update user profile");
        return res.data as UserProfile;
    }
}

export default UserRepository.getInstance();
