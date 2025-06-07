import backgroundImage from "../../assets/hero-image.png";
import downloadApkButton from "../../assets/download-apk-button.png";
import groupPresentationsImage from "../../assets/team-presentation-icon.png";
import logo from "../../assets/logo.png";
import textScrollingImage from "../../assets/autoscroll-icon.png";
import ukrainianLanguageSupport1 from "../../assets/language-icon.png";
import "./HomePage.css";
import {
  GreenButton,
  WhiteButton,
} from "../../components/appButton/AppButton.tsx";
import { JSX } from "react";
import { useNavigate } from "react-router-dom";
import {APK_URL} from "../../contstants.ts";
import {Title} from "react-head";

export const HomePage = (): JSX.Element => {
  const navigate = useNavigate();

  const handleDownloadApk = () => {
    location.href = APK_URL;
  };

  return (
    <div className="home-page">
      <Title>Головна – ScriptGlance</Title>
      <header className="header">
        <img className="logo" alt="Logo" src={logo} />
        <div className="auth-buttons">
          <WhiteButton label="Увійти" onClick={() => navigate("/login")} />
          <GreenButton
            label="Зареєструватися"
            onClick={() => navigate("/register")}
          />
        </div>
      </header>

      <section className="intro-section">
        <div className="text-block">
          <h1 className="headline">
            Зручний телесуфлер з голосовим керуванням
          </h1>
          <p className="subtext">
            Автопрокручування тексту за допомогою голосового керування.
          </p>
          <div
            className="apk-button-container"
            onClick={handleDownloadApk}
            role="button"
            aria-label="Download APK"
          >
            <img
              className="apk-button"
              alt="Download APK"
              src={downloadApkButton}
            />
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img className="background-image" alt="Hero" src={backgroundImage} />
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <img
            src={textScrollingImage}
            alt="Autoscroll"
            className="feature-icon"
          />
          <div className="feature-text">
            <h3>
              Автоматичне
              <br />
              прокручування тексту
            </h3>
            <p>Телесуфлер адаптується до вашого темпу мовлення</p>
          </div>
        </div>
        <div className="feature">
          <img
            src={ukrainianLanguageSupport1}
            alt="Ukrainian language"
            className="feature-icon"
          />
          <div className="feature-text">
            <h3>
              Підтримка
              <br />
              української мови
            </h3>
            <p>Точне голосове керування для української мови</p>
          </div>
        </div>
        <div className="feature">
          <img
            src={groupPresentationsImage}
            alt="Shared presentations"
            className="feature-icon"
          />
          <div className="feature-text">
            <h3>Спільні виступи</h3>
            <p>Редагуйте та запускайте виступи разом із командою</p>
          </div>
        </div>
      </section>
    </div>
  );
};
