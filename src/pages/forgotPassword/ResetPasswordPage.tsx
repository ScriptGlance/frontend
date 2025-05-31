import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import logo from "../../assets/logo.png";
import { AppInput } from "../../components/appInput/AppInput";
import { BeigeButton } from "../../components/appButton/AppButton";
import ErrorModal from "../../components/modals/error/ErrorModal.tsx";
import { useAuth } from "../../hooks/useAuth";
import "./ForgotPasswordPage.css";

type JWTPayload = { role?: string };

export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const navigate = useNavigate();

    const role = useMemo(() => {
        if (!token) return "user";
        try {
            const decoded = jwtDecode<JWTPayload>(token);
            return decoded.role || "user";
        } catch {
            return "user";
        }
    }, [token]);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const { resetPassword, isLoading, error, setError } = useAuth();
    const [showErrorModal, setShowErrorModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setError("Посилання для скидання паролю некоректне.");
            setShowErrorModal(true);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Паролі не співпадають.");
            setShowErrorModal(true);
            return;
        }

        const ok = await resetPassword(token, newPassword, role);
        if (ok) {
            navigate("/login");
        } else {
            setShowErrorModal(true);
        }
    };

    const handleCloseError = () => {
        setShowErrorModal(false);
    };

    return (
        <div className="forgot-password-page">
            <header className="header">
                <img
                    src={logo}
                    alt="Logo"
                    className="logo"
                    onClick={() => navigate("/")}
                    style={{ cursor: "pointer" }}
                />
            </header>
            <div className="center-wrapper">
                <div className="form-container">
                    <h1 className="title">Встановіть новий пароль</h1>
                    <div className="subtitle">
                        Вигадайте новий пароль для свого акаунту
                    </div>
                    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                        <AppInput
                            type="password"
                            placeholder="Новий пароль"
                            className="input"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            minLength={4}
                            disabled={isLoading}
                        />
                        <AppInput
                            type="password"
                            placeholder="Повторіть новий пароль"
                            className="input"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            minLength={4}
                            disabled={isLoading}
                        />
                        <BeigeButton
                            type="submit"
                            label="Зберегти новий пароль"
                            className="button"
                            disabled={
                                isLoading || !newPassword || !confirmPassword
                            }
                        />
                    </form>
                </div>
            </div>

            <ErrorModal
                show={showErrorModal}
                onClose={handleCloseError}
                message={error ?? ""}
            />
        </div>
    );
};

export default ResetPasswordPage;
