// ProfileContext.tsx
import React, {
    createContext,
    Dispatch,
    ReactNode,
    SetStateAction,
    useContext,
} from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import { DEFAULT_ERROR_MESSAGE } from "../contstants.ts";
import {
    ModeratorProfile,
    ModeratorProfileUpdateData,
    moderatorRepository,
    UserProfile,
    UserProfileUpdateData,
    userRepository
} from "../api/repositories/profileRepository.ts";

export type AnyProfile = UserProfile | ModeratorProfile;
export type AnyProfileUpdate = UserProfileUpdateData | ModeratorProfileUpdateData;

interface ProfileContextType {
    getProfile: (role: Role) => Promise<AnyProfile | null>;
    updateProfile: (fields: AnyProfileUpdate, role: Role) => Promise<AnyProfile | null>;
    setProfile: Dispatch<SetStateAction<AnyProfile | null>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { getToken } = useAuth();

    const getRepository = (role: Role) =>
        role === Role.Moderator ? moderatorRepository : userRepository;

    const getProfile = async (role: Role): Promise<AnyProfile | null> => {
        if (!role) return null;
        try {
            const token = getToken(role);
            if (!token) throw new Error("Not authenticated");
            return await getRepository(role).getProfile(token);
        } catch {
            return null;
        }
    };

    const updateProfile = async (
        fields: AnyProfileUpdate,
        role: Role
    ): Promise<AnyProfile | null> => {
        if (!role) return null;
        try {
            const token = getToken(role);
            if (!token) throw new Error("Not authenticated");
            return await getRepository(role).updateProfile(token, fields as never);
        } catch {
            return null;
        }
    };

    return (
        <ProfileContext.Provider
            value={{
                getProfile,
                updateProfile,
                setProfile: () => {},
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};

import { useState, useEffect, useCallback } from "react";
export const useProfile = (role: Role) => {
    const ctx = useContext(ProfileContext);
    if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
    const { getProfile, updateProfile } = ctx;

    const [profile, setProfile] = useState<AnyProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setError(null);
        getProfile(role)
            .then((data) => {
                if (!ignore) setProfile(data);
            })
            .catch(() => {
                if (!ignore) setError(DEFAULT_ERROR_MESSAGE);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [role, getProfile]);

    const handleUpdateProfile = useCallback(
        async (fields: AnyProfileUpdate) => {
            setLoading(true);
            setError(null);
            try {
                const updated = await updateProfile(fields, role);
                setProfile(updated);
            } catch {
                setError(DEFAULT_ERROR_MESSAGE);
            } finally {
                setLoading(false);
            }
        },
        [role, updateProfile]
    );

    return {
        profile,
        loading,
        error,
        updateProfile: handleUpdateProfile,
        setProfile,
    };
};
