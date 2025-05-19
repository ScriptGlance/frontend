import React, {KeyboardEvent, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import logo from "../../assets/logo.png";
import "./RegisterPage.css";
import {BeigeButton} from "../../components/appButton/AppButton";
import {AppInput} from "../../components/appInput/AppInput";
import ErrorModal from "../../components/modals/error/ErrorModal.tsx";
import EmailConfirmationModal from "../../components/modals/emailConfirmation/EmailConfirmation.tsx";
import {useAuth} from "../../hooks/useAuth.ts";
import {EMAIL_CONFIRMATION_TIME_SECONDS} from "../../contstants.ts";
import {Role} from "../../types/role.ts";
import {SocialAuthButtons} from "../../components/socialAuthButtons/SocialAuthButtons.tsx";

const EMAIL_CONFIRMATION_LS_KEY = "emailConfirmationInfo";


function getConfirmationInfo() {
    const raw = localStorage.getItem(EMAIL_CONFIRMATION_LS_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as { email: string; sentAt: number };
    } catch {
        return null;
    }
}

function setConfirmationInfo(email: string) {
    localStorage.setItem(
        EMAIL_CONFIRMATION_LS_KEY,
        JSON.stringify({email, sentAt: Date.now()})
    );
}

function clearConfirmationInfo() {
    localStorage.removeItem(EMAIL_CONFIRMATION_LS_KEY);
}

function getSecondsLeft(email: string) {
    const info = getConfirmationInfo();
    if (!info || info.email !== email) return 0;
    const secondsPassed = Math.floor((Date.now() - info.sentAt) / 1000);
    return Math.max(EMAIL_CONFIRMATION_TIME_SECONDS - secondsPassed, 0);
}


export const RegisterPage = () => {

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [currentSecondsLeft, setCurrentSecondsLeft] = useState(0);

    const navigate = useNavigate();
    const {
        sendVerificationEmail,
        verifyEmailCode,
        register,
        isLoading,
        error,
        setError
    } = useAuth();


    useEffect(() => {
        const checkTimer = () => {
            if (email) {
                const secondsLeft = getSecondsLeft(email);
                setCurrentSecondsLeft(secondsLeft);
            }
        };


        checkTimer();


        const interval = setInterval(checkTimer, 1000);

        return () => clearInterval(interval);
    }, [email]);


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Паролі не співпадають");
            setShowErrorModal(true);
            return;
        }


        const secondsLeft = getSecondsLeft(email);
        if (secondsLeft > 0) {

            setCurrentSecondsLeft(secondsLeft);
            setShowConfirmationModal(true);
            return;
        }


        try {
            const sent = await sendVerificationEmail(email, "user");
            if (sent) {
                setConfirmationInfo(email);
                setCurrentSecondsLeft(EMAIL_CONFIRMATION_TIME_SECONDS);
                setShowConfirmationModal(true);
            } else {
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error("Error sending verification email:", error);
            setError("Помилка надсилання листа підтвердження");
            setShowErrorModal(true);
        }
    };


    const handleVerifyCode = async (code: string): Promise<boolean> => {
        try {
            const verified = await verifyEmailCode(email, code);
            if (verified) {
                const registered = await register({firstName, lastName, email, password});
                if (registered) {
                    clearConfirmationInfo();
                    navigate("/dashboard");
                    return true;
                } else {
                    setShowErrorModal(true);
                    return false;
                }
            } else {
                setShowErrorModal(true);
                return false;
            }
        } catch (error) {
            console.error("Error verifying code:", error);
            setShowErrorModal(true);
            return false;
        }
    };


    const resendVerificationEmail = async (): Promise<void> => {

        if (getSecondsLeft(email) > 0) return;

        try {
            const sent = await sendVerificationEmail(email, "user");
            if (sent) {
                setConfirmationInfo(email);
                setCurrentSecondsLeft(EMAIL_CONFIRMATION_TIME_SECONDS);
            } else {
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error("Error resending verification email:", error);
            setError("Помилка надсилання листа підтвердження");
            setShowErrorModal(true);
        }
    };


    const handleChangeEmail = () => {
        setCurrentSecondsLeft(0);
        setShowConfirmationModal(false);
    };


    const closeConfirmationModal = () => {


        setShowConfirmationModal(false);
    };


    const handleLogin = () => {
        navigate("/login");
    };

    const closeErrorModal = () => {
        setShowErrorModal(false);
    };

    return (
        <div className="register-page">
            <header className="header">
                <img
                    src={logo}
                    alt="Logo"
                    className="logo"
                    onClick={() => navigate("/")}
                    onKeyPress={(e: KeyboardEvent) => e.key === "Enter" && navigate("/")}
                    role="button"
                    tabIndex={0}
                    style={{cursor: "pointer"}}
                />
            </header>

            <div className="register-form-wrapper">
                <div className="register-container">
                    <h1 className="register-title">Реєстрація</h1>
                    <form onSubmit={handleRegister} style={{width: "100%"}}>
                        <div className="input-wrapper">
                            <AppInput
                                type="text"
                                placeholder="Ім'я"
                                className="register-input"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                maxLength={100}
                            />
                        </div>
                        <div className="input-wrapper">
                            <AppInput
                                type="text"
                                placeholder="Прізвище"
                                className="register-input"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                maxLength={100}
                            />
                        </div>
                        <div className="input-wrapper">
                            <AppInput
                                type="email"
                                placeholder="Email"
                                className="register-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                maxLength={100}
                            />
                        </div>
                        <div className="input-wrapper">
                            <AppInput
                                type="password"
                                placeholder="Пароль"
                                className="register-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={4}
                                maxLength={255}
                            />
                        </div>
                        <div className="input-wrapper">
                            <AppInput
                                type="password"
                                placeholder="Повторіть пароль"
                                className="register-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <BeigeButton
                            type="submit"
                            label="Створити акаунт"
                            className="register-button"
                            disabled={isLoading}
                        />
                    </form>

                    <SocialAuthButtons role={Role.User} />

                    <div className="login-text">
                        <span>Вже зареєстровані? </span>
                        <span
                            className="login-link"
                            onClick={handleLogin}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                            style={{marginLeft: "5px", cursor: "pointer"}}
                        >
              Вхід
            </span>
                    </div>
                </div>
            </div>

            <EmailConfirmationModal
                show={showConfirmationModal}
                onClose={closeConfirmationModal}
                email={email}
                onVerify={handleVerifyCode}
                onResendEmail={resendVerificationEmail}
                onChangeEmail={handleChangeEmail}
                initialSecondsLeft={currentSecondsLeft}
            />

            <ErrorModal
                show={showErrorModal}
                onClose={closeErrorModal}
                message={error ?? ""}
            />
        </div>
    );
};