import {useState, useEffect, useCallback} from "react";
import subscriptionRepository, {
    SubscriptionData,
    Transaction,
} from "../api/repositories/subscriptionRepository";
import {useAuth} from "./useAuth";
import {Role} from "../types/role";
import {DEFAULT_ERROR_MESSAGE} from "../contstants";

export function useSubscription() {
    const {getToken} = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await subscriptionRepository.getSubscription(token);
            setSubscription(data);
        } catch (e: any) {
            if (e.name === "CanceledError" || e.name === "AbortError") return;
            setError(DEFAULT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData();
        return () => controller.abort();
    }, [fetchData]);

    return {subscription, loading, error, refetch: fetchData};
}

export function useCreateSubscriptionCheckout() {
    const {getToken} = useAuth();
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createCheckout = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const url = await subscriptionRepository.createSubscriptionCheckout(token);
            setCheckoutUrl(url);
            return url;
        } catch (e: any) {
            setError(DEFAULT_ERROR_MESSAGE);
            return null;
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    return {checkoutUrl, loading, error, createCheckout};
}

export function useCancelSubscription() {
    const {getToken} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cancel = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            await subscriptionRepository.cancelSubscription(token);
            return true;
        } catch (e: any) {
            setError(DEFAULT_ERROR_MESSAGE);
            return false;
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    return {loading, error, cancel};
}

export function useSubscriptionTransactions() {
    const { getToken } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async (offset: number, limit: number) => {
        try {
            setLoading(true); setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const data = await subscriptionRepository.getTransactions(token, offset, limit);
            setTransactions(prev =>
                offset === 0
                    ? data
                    : [
                        ...prev,
                        ...data.filter(tx => !prev.some(prevTx => prevTx.id === tx.id)),
                    ]
            );
        } catch (e: any) {
            setError(DEFAULT_ERROR_MESSAGE);
        } finally { setLoading(false); }
    }, [getToken]);

    const clearTransactions = useCallback(() => setTransactions([]), []);

    return { transactions, loading, error, fetchTransactions, clearTransactions };
}

export function useUpdateSubscriptionCard() {
    const {getToken} = useAuth();
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateCard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const url = await subscriptionRepository.updateCard(token);
            setCheckoutUrl(url);
            return url;
        } catch (e: any) {
            setError(DEFAULT_ERROR_MESSAGE);
            return null;
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    return {checkoutUrl, loading, error, updateCard};
}