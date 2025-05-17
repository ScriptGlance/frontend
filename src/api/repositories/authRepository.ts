import apiClient from '../axiosClient';
import { LoginRequest, LoginResponse } from '../../types/auth';

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
                throw { error_code: response.error_code, message: response.description || 'Authentication failed' };
            }

            if (response.data?.token) {
                this.saveToken(response.data.token);
                return response.data.token;
            } else {
                throw { message: 'No token received in response' };
            }
        } catch (error: any) {
            if (error.response?.data) {
                throw {
                    error_code: error.response.data.error_code,
                };
            }
            throw {
                error_code: error.error_code,
            };
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

    public async sendVerificationEmail(email: string, role: string = "user"): Promise<void> {
        try {
            const response = await apiClient.post('/auth/send-verification-email', { email, role });
            console.log('response', response);
            if (response.error) {
                throw { error_code: response.error_code, message: response.description || 'Помилка відправки листа' };
            }
        } catch (error: any) {
            if (error.response?.data) {
                throw {
                    error_code: error.response.data.error_code,
                };
            }
            throw {
                error_code: error.error_code,
            };
        }
    }

    public async verifyEmailCode(email: string, code: string): Promise<void> {
        try {
            const response = await apiClient.post('/auth/verify-email', { email, code });
            if (response.error) {
                throw { error_code: response.error_code, message: response.description || 'Неправильний код' };
            }
        } catch (error: any) {
            if (error.response?.data) {
                throw {
                    error_code: error.response.data.error_code,
                };
            }
            throw {
                error_code: error.error_code,
            };
        }
    }

    public async register(data: { firstName: string, lastName: string, email: string, password: string }): Promise<string> {
        try {
            const response = await apiClient.post('/auth/register', data);
            if (response.error) {
                throw {error_code: response.error_code, message: response.description || 'Помилка реєстрації'};
            }
            if (response.data?.token) {
                this.saveToken(response.data.token);
                return response.data.token;
            } else {
                throw {message: 'No token received in response'};
            }
        } catch (error: any) {
            if (error.response?.data) {
                throw {
                    error_code: error.response.data.error_code,
                };
            }
            throw {
                error_code: error.error_code,
            };
        }
    }
}

export default AuthRepository.getInstance();
