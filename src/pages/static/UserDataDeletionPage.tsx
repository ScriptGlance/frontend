import React from "react";
import logo from "../../assets/logo.png";
import "./StaticPage.css";

export const UserDataDeletionPage: React.FC = () => (
    <div className="static-page">
        <header className="header">
            <img
                src={logo}
                alt="Logo"
                className="logo"
                onClick={() => window.location.href = "/"}
                style={{ cursor: "pointer" }}
            />
        </header>
        <div className="center-wrapper">
            <div className="form-container">
                <h1 className="title">Видалення особистих даних</h1>
                <div className="subtitle">
                    Якщо ви бажаєте видалити всі свої особисті дані з нашого сервісу, будь ласка, надішліть запит на email підтримки.
                </div>
                <div className="policy-content">
                    <b>Як подати запит:</b>
                    <ul>
                        <li>Надішліть листа на адресу <a href="mailto:support@scriptglance.com" className="policy-link">support@scriptglance.com</a></li>
                        <li>Вкажіть у темі листа: <b>"Видалення даних"</b></li>
                        <li>З того ж email, який використовується у ScriptGlance</li>
                    </ul>
                    <div style={{ marginTop: 16 }}>
                        Ми видалимо ваш акаунт і всі особисті дані протягом 48 годин після отримання запиту.
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default UserDataDeletionPage;
