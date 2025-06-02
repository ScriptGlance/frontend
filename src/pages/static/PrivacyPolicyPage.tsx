import React from "react";
import logo from "../../assets/logo.png";
import "./StaticPage.css";

export const PrivacyPolicyPage: React.FC = () => (
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
                <h1 className="title">Політика конфіденційності</h1>
                <div className="subtitle">
                    Ми поважаємо вашу приватність. Збір та обробка даних відбувається лише для забезпечення роботи сервісу ScriptGlance та покращення вашого досвіду.
                </div>
                <div className="policy-content">
                    <b>Які дані ми збираємо?</b>
                    <ul>
                        <li>Ваше ім'я та email для авторизації</li>
                        <li>Дані для входу через Google/Facebook</li>
                        <li>Дані ваших презентацій та відеозаписів</li>
                    </ul>
                    <b>Як ми використовуємо ваші дані?</b>
                    <ul>
                        <li>Для входу та роботи сервісу</li>
                        <li>Для персоналізації та підтримки користувачів</li>
                    </ul>
                    <b>Чи передаємо ми дані третім особам?</b>
                    <div>
                        Ні, ваші особисті дані не передаються стороннім сервісам, окрім інтеграції з платформами для входу (Google, Facebook).
                    </div>
                    <b>Як видалити ваші дані?</b>
                    <div>
                        Ви можете видалити свій акаунт на сторінці <a href="/user-data-deletion" className="policy-link">Видалення даних</a> або звернутися до нас за підтримкою.
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default PrivacyPolicyPage;
