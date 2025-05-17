import { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./NotFound.css";
import {GreenButton} from "../../components/appButton/AppButton.tsx";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
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

      <div className="not-found-content">
        <div className="not-found-container">
          <h1 className="not-found-title">404</h1>
          <h2 className="not-found-subtitle">Сторінку не знайдено</h2>
          <p className="not-found-message">
            Сторінка, яку ви шукаєте, не існує або була переміщена.
          </p>
          <div className="not-found-buttons">
            <GreenButton
              label="На головну" 
              onClick={() => navigate("/")} 
              className="not-found-button"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
