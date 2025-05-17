import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { AppInput } from "../../components/appInput/AppInput";
import { BeigeButton } from "../../components/appButton/AppButton";
import "./ForgotPasswordPage.css";
import arrowBack from "../../assets/arrow-back-icon.svg";
import { useAuth } from "../../hooks/useAuth";
import ErrorModal from "../../components/modals/errorModal/ErrorModal.tsx";
import { Role } from "../../types/role.ts";

interface ForgotPasswordPageProps {
    role: Role;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ role }) => {
    const [email, setEmail] = useState("");
    const navigate = useNavigate();
    const { forgotPassword, isLoading, error, setError } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const ok = await forgotPassword(email, role);
        if (ok) {
            navigate("/forgot-password/sent");
        }
    };

    const handleBackToLogin = () => {
        switch (role) {
            case Role.Moderator:
                navigate("/moderator/login");
                break;
            case Role.Admin:
                navigate("/admin/login");
                break;
            default:
                navigate("/login");
                break;
        }
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
                    <h1 className="title">Забули пароль?</h1>
                    <div className="subtitle">
                        Введіть вашу електронну пошту, і ми надішлемо інструкції для відновлення паролю
                    </div>
                    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                        <AppInput
                            type="email"
                            placeholder="Email"
                            className="input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                        <BeigeButton
                            type="submit"
                            label={isLoading ? "Відправка..." : "Відновити пароль"}
                            className="button"
                            disabled={!email || isLoading}
                        />
                    </form>
                    <div
                        className="back-link"
                        onClick={handleBackToLogin}
                        style={{ cursor: "pointer" }}
                    >
                        <img src={arrowBack} alt="Назад" className="arrow"
                             style={{ marginRight: 5, width: 20, height: 20 }} />
                        Повернутися до входу
                    </div>
                </div>
            </div>

            <ErrorModal
                show={!!error}
                onClose={() => setError(null)}
                message={error ?? ""}
            />
        </div>
    );
};

export default ForgotPasswordPage;
