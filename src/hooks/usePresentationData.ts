import { useState, useEffect, useCallback } from "react";
import presentationsRepository, {
    Participant,
    Presentation, PresentationActiveJoinedUser,
    PresentationsConfig,
    PresentationStructure,
    PresentationVideo
} from "../api/repositories/presentationsRepository";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import { DEFAULT_ERROR_MESSAGE } from "../contstants";

export function usePresentationDetails(presentationId: number) {
    const { getToken } = useAuth();
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationsRepository.getPresentation(token, presentationId);
            setPresentation(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, presentationId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { presentation, loading, error, refetch: fetchData };
}

export function usePresentationParticipants(presentationId: number) {
    const { getToken } = useAuth();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationsRepository.getParticipants(token, presentationId);
            setParticipants(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, presentationId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { participants, loading, error, refetch: fetchData };
}

export function usePresentationStructure(presentationId: number) {
    const { getToken } = useAuth();
    const [structure, setStructure] = useState<PresentationStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationsRepository.getPresentationStructure(token, presentationId);
            setStructure(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, presentationId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { structure, loading, error, refetch: fetchData };
}

export function usePresentationsConfig() {
    const { getToken } = useAuth();
    const [config, setConfig] = useState<PresentationsConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationsRepository.getConfig(token);
            setConfig(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { config, loading, error, refetch: fetchData };
}

export function usePresentationVideos(presentationId: number) {
    const { getToken } = useAuth();
    const [videos, setVideos] = useState<PresentationVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationsRepository.getVideos(token, presentationId);
            setVideos(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken, presentationId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return { videos, loading, error, refetch: fetchData };
}

export function usePresentationJoinedUsers(presentationId: number) {
    const { getToken } = useAuth();
    const [joinedUsers, setJoinedUsers] = useState<PresentationActiveJoinedUser[]>([]);
    const [currentPresentationStartDate, setCurrentPresentationStartDate] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationsRepository.getActivePresentation(token, presentationId);
            setJoinedUsers(data.joinedUsers);
            setCurrentPresentationStartDate(data.currentPresentationStartDate);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken, presentationId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    const isPresentationStarted = Boolean(currentPresentationStartDate);

    return {
        joinedUsers,
        currentPresentationStartDate,
        isPresentationStarted,
        loading,
        error,
        refetch: fetchData
    };
}

