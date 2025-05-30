import { useState, useEffect, useCallback } from "react";
import adminRepository, {
    User,
    Moderator,
    GetUsersParams,
    GetModeratorsParams,
    InviteUserRequest,
    InviteModeratorRequest,
    UpdateUserProfileRequest,
    UpdateModeratorProfileRequest,
    DailyStats,
    MonthlyStats,
    GetStatsParams
} from "../api/repositories/adminRepository";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import { DEFAULT_ERROR_MESSAGE } from "../contstants";

export function useAdminUsers(params: GetUsersParams) {
    const { getToken } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            const data = await adminRepository.getUsers(token, params);
            setUsers(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, params]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { users, loading, error, refetch: fetchData };
}

export function useAdminModerators(params: GetModeratorsParams) {
    const { getToken } = useAuth();
    const [moderators, setModerators] = useState<Moderator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            const data = await adminRepository.getModerators(token, params);
            setModerators(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, params]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { moderators, loading, error, refetch: fetchData };
}

export function useAdminDailyStats(params: GetStatsParams = {}) {
    const { getToken } = useAuth();
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            const data = await adminRepository.getDailyStats(token, params);
            setDailyStats(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, params]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { dailyStats, loading, error, refetch: fetchData };
}

export function useAdminMonthlyStats(params: GetStatsParams = {}) {
    const { getToken } = useAuth();
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            const data = await adminRepository.getMonthlyStats(token, params);
            setMonthlyStats(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, params]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { monthlyStats, loading, error, refetch: fetchData };
}

export function useAdminUserActions() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateUserProfile = useCallback(async (userId: number, data: UpdateUserProfileRequest): Promise<User | null> => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            const result = await adminRepository.updateUserProfile(token, userId, data);
            return result;
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return null;
            setError(DEFAULT_ERROR_MESSAGE);
            return null;
        } finally { setLoading(false); }
    }, [getToken]);

    const deleteUser = useCallback(async (userId: number): Promise<boolean> => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            await adminRepository.deleteUser(token, userId);
            return true;
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return false;
            setError(DEFAULT_ERROR_MESSAGE);
            return false;
        } finally { setLoading(false); }
    }, [getToken]);

    const inviteUser = useCallback(async (data: InviteUserRequest): Promise<boolean> => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            await adminRepository.inviteUser(token, data);
            return true;
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return false;
            setError(DEFAULT_ERROR_MESSAGE);
            return false;
        } finally { setLoading(false); }
    }, [getToken]);

    return { updateUserProfile, deleteUser, inviteUser, loading, error };
}

export function useAdminModeratorActions() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateModeratorProfile = useCallback(async (moderatorId: number, data: UpdateModeratorProfileRequest): Promise<Moderator | null> => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            const result = await adminRepository.updateModeratorProfile(token, moderatorId, data);
            return result;
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return null;
            setError(DEFAULT_ERROR_MESSAGE);
            return null;
        } finally { setLoading(false); }
    }, [getToken]);

    const deleteModerator = useCallback(async (moderatorId: number): Promise<boolean> => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            await adminRepository.deleteModerator(token, moderatorId);
            return true;
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return false;
            setError(DEFAULT_ERROR_MESSAGE);
            return false;
        } finally { setLoading(false); }
    }, [getToken]);

    const inviteModerator = useCallback(async (data: InviteModeratorRequest): Promise<boolean> => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.Admin);
            if (!token) throw new Error("Not authenticated");
            await adminRepository.inviteModerator(token, data);
            return true;
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return false;
            setError(DEFAULT_ERROR_MESSAGE);
            return false;
        } finally { setLoading(false); }
    }, [getToken]);

    return { updateModeratorProfile, deleteModerator, inviteModerator, loading, error };
}