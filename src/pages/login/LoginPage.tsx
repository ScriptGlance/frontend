import React, { useState, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import googleIcon from "../../assets/google-icon.png";
import facebookIcon from "../../assets/facebook-icon.png";
import "./style.css";
import { BeigeButton } from "../../components/appButton/AppButton";
import { AppInput } from "../../components/appInput/AppInput";
import {useAuth} from "../../hooks/useAuth.ts";
import {Role} from "../../types/role.ts"
import ErrorModal from "../../components/modals/errorModal/ErrorModal.tsx";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, error } = useAuth();
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login({ email, password, role: Role.User });
    if (success) {
      navigate('/dashboard');
    } else {
      setShowErrorModal(true);
    }
  };


  const handleSocialLogin = (provider: "google" | "facebook") => {
    // TODO: Implement social login logic
    console.log(`${provider} login attempt`);
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password logic
    console.log("Forgot password clicked");
  };

  const handleRegister = () => {
    navigate("/register");
  };

  return (
    <div className="login-page">
      <header className="header">
        <img
          src={logo}
          alt="Logo"
          className="logo"
          onClick={() => navigate("/")}
          onKeyPress={(e: KeyboardEvent) => e.key === "Enter" && navigate("/")}
          role="button"
          tabIndex={0}
          style={{ cursor: "pointer" }}
        />
      </header>

      <div className="login-form-wrapper">
        <div className="login-container">
          <h1 className="login-title">Вхід</h1>
          <form onSubmit={handleLogin} style={{ width: "100%" }}>
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
              onKeyPress={(e) => e.key === "Enter" && handleForgotPassword()}
            >
              Забули пароль?
            </div>
            <BeigeButton
              type="submit"
              label="Увійти"
              className="login-button"
            />
          </form>

          <div className="divider-container">
            <div className="divider-line" />
            <div className="divider-text">Або</div>
            <div className="divider-line" />
          </div>

          <div className="social-buttons">
            <div
              className="social-button"
              onClick={() => handleSocialLogin("google")}
              role="button"
              tabIndex={0}
              onKeyPress={(e) =>
                e.key === "Enter" && handleSocialLogin("google")
              }
            >
              <img src={googleIcon} alt="Google" className="social-icon" />
            </div>
            <div
              className="social-button"
              onClick={() => handleSocialLogin("facebook")}
              role="button"
              tabIndex={0}
              onKeyPress={(e) =>
                e.key === "Enter" && handleSocialLogin("facebook")
              }
            >
              <img src={facebookIcon} alt="Facebook" className="social-icon" />
            </div>
          </div>

          <div className="register-text">
            <span>Немає акаунту? </span>
            <span
              className="register-link"
              onClick={handleRegister}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === "Enter" && handleRegister()}
              style={{ marginLeft: "5px", cursor: "pointer" }}
            >
              Реєстрація
            </span>
          </div>
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
