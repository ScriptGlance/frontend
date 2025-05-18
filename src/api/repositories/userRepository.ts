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
        return res.data;
    }
}

export default UserRepository.getInstance();
