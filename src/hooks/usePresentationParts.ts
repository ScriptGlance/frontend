import { useState, useEffect, useCallback } from "react";
import presentationPartsRepository, {
    PresentationPartFull,
    CreatePartRequest,
    UpdatePartRequest,
    CursorPosition,
} from "../api/repositories/presentationPartsRepository";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import { DEFAULT_ERROR_MESSAGE } from "../contstants";

export function usePresentationParts(presentationId: number) {
    const { getToken } = useAuth();
    const [parts, setParts] = useState<PresentationPartFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchParts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationPartsRepository.getParts(token, presentationId);
            setParts(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken, presentationId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchParts();
        return () => controller.abort();
    }, [fetchParts]);

    return { parts, loading, error, refetch: fetchParts };
}

export function useCreatePresentationPart(presentationId: number) {
    const { getToken } = useAuth();
    const [part, setPart] = useState<PresentationPartFull | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createPart = useCallback(
        async (request: CreatePartRequest) => {
            try {
                setLoading(true);
                setError(null);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                const data = await presentationPartsRepository.createPart(token, presentationId, request);
                setPart(data);
                return data;
            } catch (e: any) {
                setError(DEFAULT_ERROR_MESSAGE);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [getToken, presentationId]
    );

    return { part, loading, error, createPart };
}

export function useUpdatePresentationPart() {
    const { getToken } = useAuth();
    const [part, setPart] = useState<PresentationPartFull | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updatePart = useCallback(
        async (partId: number, request: UpdatePartRequest) => {
            try {
                setLoading(true);
                setError(null);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                const data = await presentationPartsRepository.updatePart(token, partId, request);
                setPart(data);
                return data;
            } catch (e: any) {
                setError(DEFAULT_ERROR_MESSAGE);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return { part, loading, error, updatePart };
}

export function useDeletePresentationPart() {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deletePart = useCallback(
        async (partId: number) => {
            try {
                setLoading(true);
                setError(null);
                const token = getToken(Role.User);
                if (!token) throw new Error("Not authenticated");
                await presentationPartsRepository.deletePart(token, partId);
                return true;
            } catch (e: any) {
                setError(DEFAULT_ERROR_MESSAGE);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [getToken]
    );

    return { loading, error, deletePart };
}

export function usePresentationCursorPositions(presentationId: number) {
    const { getToken } = useAuth();
    const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCursorPositions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await presentationPartsRepository.getCursorPositions(token, presentationId);
            setCursorPositions(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken, presentationId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchCursorPositions();
        return () => controller.abort();
    }, [fetchCursorPositions]);

    return { cursorPositions, loading, error, refetch: fetchCursorPositions };
}
