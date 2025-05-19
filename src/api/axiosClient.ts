import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

export class ApiClient {
    private static instance: ApiClient;
    private axios: AxiosInstance;

    private constructor() {
        this.axios = axios.create({
            baseURL: import.meta.env.VITE_APP_API_BASE_URL,
        });

        this.axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem(import.meta.env.VITE_APP_TOKEN_KEY || 'auth_token');
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        this.axios.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    localStorage.removeItem(import.meta.env.VITE_APP_TOKEN_KEY || 'auth_token');
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
            headers: { 'Content-Type': 'application/json', ...(config?.headers || {}) },
            ...config
        };
        const response = await this.axios.get<T>(url, mergedConfig);
        return response.data;
    }

    public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const mergedConfig = {
            headers: { 'Content-Type': 'application/json', ...(config?.headers || {}) },
            ...config
        };
        const response = await this.axios.post<T>(url, data, mergedConfig);
        return response.data;
    }

    public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const mergedConfig = {
            headers: { 'Content-Type': 'application/json', ...(config?.headers || {}) },
            ...config
        };
        const response = await this.axios.put<T>(url, data, mergedConfig);
        return response.data;
    }

    public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const mergedConfig = {
            headers: { 'Content-Type': 'application/json', ...(config?.headers || {}) },
            ...config
        };
        const response = await this.axios.delete<T>(url, mergedConfig);
        return response.data;
    }
}

export default ApiClient.getInstance();
