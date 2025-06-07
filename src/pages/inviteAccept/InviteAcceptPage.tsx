import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePresentationGlobalActions } from "../../hooks/usePresentationActions";
import { GreenButton } from "../../components/appButton/AppButton";
import { useAuth } from "../../hooks/useAuth";
import './InviteAcceptPage.css';
import { Role } from "../../types/role.ts";
import {Title} from "react-head";

const InviteAcceptPage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const { acceptInvitation, acceptLoading, acceptError } = usePresentationGlobalActions();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!code) return;
        acceptInvitation(code)
            .then((res) => {
                if (res) {
                    navigate(`/presentation/${res.presentation_id}`);
                }
            })
            .catch(() => {});
    }, [acceptInvitation, code, navigate]);

    if (!code) {
        return <div>Посилання на запрошення некоректне</div>;
    }

    return (
        <div className="invite-accept-page">
            <Title>Запрошення – ScriptGlance</Title>
            <div className="invite-accept-card">
                <div className="invite-accept-title">Запрошення до виступу</div>
                {acceptLoading && (
                    <div className="invite-accept-loading">Приєднання...</div>
                )}
                {acceptError || !isAuthenticated(Role.User) ? (
                    <>
                        <div className="invite-accept-error">
                            {!isAuthenticated(Role.User)
                                ? "Ви не авторизовані для приєднання до виступу. Будь ласка, увійдіть у свій акаунт."
                                : "Сталася помилка. Перевірте, будь ласка, посилання на запрошення"
                            }
                        </div>
                        <GreenButton
                            label={isAuthenticated(Role.User) ? "До виступів" : "Повернутися на головну"}
                            onClick={() => navigate(isAuthenticated(Role.User) ? "/dashboard" : "/")}
                        />
                    </>
                ) : (
                    <div className="invite-accept-desc">Обробка запрошення...</div>
                )}
            </div>
        </div>
    );
};

export default InviteAcceptPage;
