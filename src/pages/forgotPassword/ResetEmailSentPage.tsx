import {useNavigate} from "react-router-dom";
import logo from "../../assets/logo.png";
import "./ForgotPasswordPage.css";
import checkmark from "../../assets/check-mark-icon.svg";
import arrowBack from "../../assets/arrow-back-icon.svg";

export const ResetEmailSentPage = () => {
    const navigate = useNavigate();

    return (
        <div className="forgot-password-page">
            <header className="header">
                <img
                    src={logo}
                    alt="Logo"
                    className="logo"
                    onClick={() => navigate("/")}
                    style={{cursor: "pointer"}}
                />
            </header>
            <div className="center-wrapper">
                <div className="form-container">
                    <div className="checkmark-icon">
                        <img src={checkmark} alt="Успішно" style={{width: 55, height: 55}}/>
                    </div>
                    <div className="sent-text">
                        На пошту було надіслано лист із посиланням для відновлення паролю
                    </div>
                    <div
                        className="back-link"
                        onClick={() => navigate("/login")}
                        style={{cursor: "pointer"}}
                    >
                        <img src={arrowBack} alt="Назад" className="arrow"
                             style={{marginRight: 5, width: 20, height: 20}}/>
                        Повернутися до входу
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetEmailSentPage;
