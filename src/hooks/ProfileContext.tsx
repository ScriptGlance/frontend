import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
    Dispatch,
    SetStateAction,
} from "react";
import { UserProfile, UserProfileUpdateData } from "../api/repositories/userRepository";
import userRepository from "../api/repositories/userRepository";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import { DEFAULT_ERROR_MESSAGE } from "../contstants.ts";

interface ProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    refreshProfile: () => Promise<void>;
    updateProfile: (fields: UserProfileUpdateData) => Promise<void>;
    setProfile: Dispatch<SetStateAction<UserProfile | null>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { getToken } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await userRepository.getProfile(token);
            setProfile(data);
        } catch {
            setError(DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchProfile().then();
    }, [fetchProfile]);

    const updateProfile = useCallback(
        async (fields: UserProfileUpdateData) => {
            setLoading(true);
            setError(null);
            try {
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                const updated = await userRepository.updateProfile(token, fields);
                setProfile(updated);
            } catch (e) {
                setError(DEFAULT_ERROR_MESSAGE);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return (
        <ProfileContext.Provider
            value={{
                profile,
                loading,
                error,
                refreshProfile: fetchProfile,
                updateProfile,
                setProfile,
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const ctx = useContext(ProfileContext);
    if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
    return ctx;
};
