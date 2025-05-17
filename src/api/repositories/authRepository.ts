import apiClient from '../axiosClient';
import { LoginRequest, LoginResponse } from '../../types/auth';

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

export class AuthRepository {
    private static instance: AuthRepository;

    private constructor() {}

    public static getInstance(): AuthRepository {
        if (!AuthRepository.instance) {
            AuthRepository.instance = new AuthRepository();
        }
        return AuthRepository.instance;
    }

    public async login(credentials: LoginRequest): Promise<string> {
        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', credentials);

            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Authentication failed',
                };
            }

            if (response.data?.token) {
                this.saveToken(response.data.token);
                return response.data.token;
            } else {
                throw { message: 'No token received in response' };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public saveToken(token: string): void {
        localStorage.setItem(import.meta.env.VITE_APP_TOKEN_KEY, token);
    }

    public getToken(): string | null {
        return localStorage.getItem(import.meta.env.VITE_APP_TOKEN_KEY);
    }

    public removeToken(): void {
        localStorage.removeItem(import.meta.env.VITE_APP_TOKEN_KEY);
    }

    public isAuthenticated(): boolean {
        return !!this.getToken();
    }

    public async sendVerificationEmail(email: string, role: string = 'user'): Promise<void> {
        try {
            const response = await apiClient.post('/auth/send-verification-email', { email, role });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Помилка відправки листа',
                };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async verifyEmailCode(email: string, code: string): Promise<void> {
        try {
            const response = await apiClient.post('/auth/verify-email', { email, code });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Неправильний код',
                };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async register(data: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    }): Promise<string> {
        try {
            const response = await apiClient.post('/auth/register', data);
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description || 'Помилка реєстрації',
                };
            }
            if (response.data?.token) {
                this.saveToken(response.data.token);
                return response.data.token;
            } else {
                throw { message: 'No token received in response' };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async forgotPassword(email: string, role: string = 'user'): Promise<void> {
        try {
            const response = await apiClient.post('/auth/forgot-password', { email, role });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description,
                };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }

    public async resetPassword(token: string, newPassword: string, role: string = 'user'): Promise<void> {
        try {
            const response = await apiClient.post('/auth/reset-password', { token, newPassword, role });
            if (response.error) {
                throw {
                    error_code: response.error_code,
                    message: response.description,
                };
            }
        } catch (error: unknown) {
            handleApiError(error);
        }
    }
}

export default AuthRepository.getInstance();
