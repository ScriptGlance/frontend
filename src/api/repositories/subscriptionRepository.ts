import apiClient from '../axiosClient';

export enum SubscriptionStatus {
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    CANCELLED = 'cancelled',
    CREATED = 'created',
}

export enum InvoiceStatus {
    PROCESSING = 'processing',
    SUCCESS = 'success',
    FAILURE = 'failure',
}

function isApiError(error: unknown): error is {
    response?: {
        data?: {
            error_code?: string;
        };
    };
    error_code?: string;
} {
    return (
        typeof error === 'object' &&
        error !== null &&
        ('response' in error || 'error_code' in error)
    );
}

function handleApiError(error: unknown): never {
    if (isApiError(error)) {
        if (error.response?.data?.error_code) {
            throw { error_code: error.response.data.error_code };
        }
        if (error.error_code) {
            throw { error_code: error.error_code };
        }
    }
    throw { error_code: 'UNKNOWN_ERROR' };
}

export interface PaymentCard {
    masked_number: string;
    payment_system: string;
}

export interface SubscriptionData {
    status: SubscriptionStatus;
    next_payment_date: string;
    payment_card: PaymentCard;
}

export interface Transaction {
    id: number;
    date: string;
    amount: number;
    currency: number;
    status: InvoiceStatus | null;
}

export class SubscriptionRepository {
    private static instance: SubscriptionRepository;

    private constructor() {}

    public static getInstance(): SubscriptionRepository {
        if (!SubscriptionRepository.instance) {
            SubscriptionRepository.instance = new SubscriptionRepository();
        }
        return SubscriptionRepository.instance;
    }

    public async createSubscriptionCheckout(token: string): Promise<string> {
        try {
            const response = await apiClient.post('/payments/subscription/checkout', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Subscription checkout failed',
                };
            }
            if (response.data?.checkout_url) {
                return response.data.checkout_url;
            } else {
                throw { message: 'No checkout_url received in response' };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async getSubscription(token: string): Promise<SubscriptionData> {
        try {
            const response = await apiClient.get('/payments/subscription', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Failed to fetch subscription',
                };
            }
            if (response.data) {
                return response.data as SubscriptionData;
            } else {
                throw { message: 'No subscription data in response' };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async cancelSubscription(token: string): Promise<void> {
        try {
            const response = await apiClient.delete('/payments/subscription', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Failed to cancel subscription',
                };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async getTransactions(token: string, offset: number, limit: number): Promise<Transaction[]> {
        try {
            const response = await apiClient.get(`/payments/subscription/transactions?offset=${offset}&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Failed to fetch transactions',
                };
            }
            if (Array.isArray(response.data)) {
                return response.data as Transaction[];
            } else if (Array.isArray(response.data?.data)) {
                return response.data.data as Transaction[];
            } else {
                throw { message: 'No transactions data in response' };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async updateCard(token: string): Promise<string> {
        try {
            const response = await apiClient.post('/payments/subscription/card/update', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Card update failed',
                };
            }
            if (response.data?.checkout_url) {
                return response.data.checkout_url;
            } else {
                throw { message: 'No checkout_url received in response' };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }
}

export default SubscriptionRepository.getInstance();