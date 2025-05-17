import {useState, useCallback} from 'react';
import authRepository from '../api/repositories/authRepository';
import {LoginRequest} from '../types/auth';
import {getErrorMessage} from "../utils/errorMessages";

type RegisterData = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
};

export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await authRepository.login(credentials);
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const sendVerificationEmail = useCallback(async (email: string, role: string = "user"): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await authRepository.sendVerificationEmail(email, role);
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const verifyEmailCode = useCallback(async (email: string, code: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await authRepository.verifyEmailCode(email, code);
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(async (data: RegisterData): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await authRepository.register(data);
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const forgotPassword = useCallback(async (email: string, role: string = "user"): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await authRepository.forgotPassword(email, role);
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const resetPassword = useCallback(async (token: string, newPassword: string, role: string = "user"): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await authRepository.resetPassword(token, newPassword, role);
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);


    const logout = useCallback(() => {
        authRepository.removeToken();
    }, []);

    const isAuthenticated = useCallback(() => {
        return authRepository.isAuthenticated();
    }, []);

    return {
        login,
        sendVerificationEmail,
        verifyEmailCode,
        register,
        logout,
        forgotPassword,
        resetPassword,
        isAuthenticated,
        isLoading,
        error,
        setError,
        saveToken: authRepository.saveToken,
    };
};
