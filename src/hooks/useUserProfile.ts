import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import userRepository, { UserProfile } from "../api/repositories/userRepository";
import { Role } from "../types/role";

export const useUserProfile = () => {
    const { getToken } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                const data = await userRepository.getProfile(token);
                setProfile(data);
            } catch (e: any) {
                setError(e.message || "Unknown error");
            } finally {
                setLoading(false);
            }
        };
        fetchData().then();
    }, [getToken]);

    return { profile, loading, error };
};
