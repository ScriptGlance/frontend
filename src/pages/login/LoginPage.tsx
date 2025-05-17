import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import logo from "../../assets/logo.png";
import "./LoginPage.css";
import {BeigeButton} from "../../components/appButton/AppButton";
import {AppInput} from "../../components/appInput/AppInput";
import {useAuth} from "../../hooks/useAuth.ts";
import {Role} from "../../types/role.ts"
import ErrorModal from "../../components/modals/errorModal/ErrorModal.tsx";
import {SocialAuthButtons} from "../../components/socialAuthButtons/SocialAuthButtons";

interface LoginPageProps {
    role: Role;
}

export const LoginPage: React.FC<LoginPageProps> = ({role}) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const {login, error} = useAuth();
    const [showErrorModal, setShowErrorModal] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login({email, password, role});
        if (success) {
            navigate('/dashboard');
        } else {
            setShowErrorModal(true);
        }
    };

    const handleForgotPassword = () => {
        switch (role) {
            case Role.Moderator:
                navigate("/moderator/forgot-password");
                break;
            case Role.Admin:
                navigate("/admin/forgot-password");
                break;
            default:
                navigate("/forgot-password");
                break;
        }
    };

    const handleRegister = () => {
        navigate("/register");
    };

    const getRoleLabel = () => {
        switch (role) {
            case Role.Moderator:
                return "модератор";
            case Role.Admin:
                return "адміністратор";
            default:
                return "";
        }
    };

    const handleButtonKeyDown = (e: React.KeyboardEvent, handler: () => void) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handler();
        }
    };

    return (
        <div className="login-page">
            <header className="header">
                <img
                    src={logo}
                    alt="Logo"
                    className="logo"
                    onClick={() => navigate("/")}
                    onKeyDown={(e) => handleButtonKeyDown(e, () => navigate("/"))}
                    role="button"
                    tabIndex={0}
                    style={{cursor: "pointer"}}
                />
            </header>

            <div className="login-form-wrapper">
                <div className="login-container">
                    <h1 className="login-title">
                        Вхід {getRoleLabel() && <span>– {getRoleLabel()}</span>}
                    </h1>
                    <form onSubmit={handleLogin} style={{width: "100%"}}>
                        <div className="input-wrapper">
                            <AppInput
                                type="email"
                                placeholder="Email"
                                className="login-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-wrapper">
                            <AppInput
                                type="password"
                                placeholder="Пароль"
                                className="login-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div
                            className="forgot-password"
                            onClick={handleForgotPassword}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => handleButtonKeyDown(e, handleForgotPassword)}
                        >
                            Забули пароль?
                        </div>
                        <BeigeButton
                            type="submit"
                            label="Увійти"
                            className="login-button"
                        />
                    </form>

                    <SocialAuthButtons role={role}/>

                    {role === Role.User && <div className="register-text">
                        <span>Немає акаунту? </span>
                        <span
                            className="register-link"
                            onClick={handleRegister}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => handleButtonKeyDown(e, handleRegister)}
                            style={{marginLeft: "5px", cursor: "pointer"}}
                        >Реєстрація</span>
                    </div>}
                </div>
            </div>

            <ErrorModal
                show={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                message={error ?? ''}
            />
        </div>
    );
};
