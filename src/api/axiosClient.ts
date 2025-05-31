import axios, {AxiosError, AxiosInstance, AxiosRequestConfig} from 'axios';
import {jwtDecode} from 'jwt-decode';

export class ApiClient {
    private static instance: ApiClient;
    private axios: AxiosInstance;

    private constructor() {
        this.axios = axios.create({
            baseURL: import.meta.env.VITE_APP_API_BASE_URL,
        });

        this.axios.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    let role = 'user';

                    const authHeader =
                        error.config?.headers?.Authorization ||
                        error.config?.headers?.authorization;

                    let token: string | undefined = undefined;

                    if (typeof authHeader === 'string') {
                        token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
                    } else if (Array.isArray(authHeader) && typeof authHeader[0] === 'string') {
                        token = authHeader[0].startsWith('Bearer ') ? authHeader[0].split(' ')[1] : undefined;
                    }

                    if (token) {
                        try {
                            const payload: { role?: string  } = jwtDecode(token);
                            if (payload && payload.role) {
                                role = payload.role;
                            }
                        } catch (e) {}
                    }

                    if (role === 'admin') {
                        localStorage.removeItem('admin_token');
                        window.location.href = '/admin/login';
                    } else if (role === 'moderator') {
                        localStorage.removeItem('moderator_token');
                        window.location.href = '/moderator/login';
                    } else {
                        localStorage.removeItem(import.meta.env.VITE_APP_TOKEN_KEY || 'auth_token');
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    public static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const mergedConfig = {
            ...config,
            headers: {...(config?.headers || {})},
        };
        const response = await this.axios.get<T>(url, mergedConfig);
        return response.data;
    }


    public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const mergedConfig = {
            headers: {'Content-Type': 'application/json', ...(config?.headers || {})},
            ...config
        };
        const response = await this.axios.post<T>(url, data, mergedConfig);
        return response.data;
    }

    public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const mergedConfig = {
            headers: {'Content-Type': 'application/json', ...(config?.headers || {})},
            ...config
        };
        const response = await this.axios.put<T>(url, data, mergedConfig);
        return response.data;
    }

    public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const mergedConfig = {
            headers: {'Content-Type': 'application/json', ...(config?.headers || {})},
            ...config
        };
        const response = await this.axios.delete<T>(url, mergedConfig);
        return response.data;
    }
}

export default ApiClient.getInstance();
