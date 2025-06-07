import React, { useState, useEffect, useRef } from "react";
import BaseModal from "../base/BaseModal";
import { AppInput } from "../../appInput/AppInput";
import { GreenButton } from "../../appButton/AppButton";
import './ChangePasswordModal.css'

export interface ChangePasswordModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (fields: { password: string }) => Promise<void>;
    loading?: boolean;
}

function usePrevious<T>(value: T) {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => { ref.current = value; }, [value]);
    return ref.current;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
                                                                     open,
                                                                     onClose,
                                                                     onSave,
                                                                     loading = false,
                                                                 }) => {
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const prevOpen = usePrevious(open);

    useEffect(() => {
        if (!prevOpen && open) {
            setPassword("");
            setRepeatPassword("");
            setError(null);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        if (!password.trim() || !repeatPassword.trim()) {
            setError("Введіть пароль і повторіть його");
            return;
        }
        if (password !== repeatPassword) {
            setError("Паролі не співпадають");
            return;
        }
        setError(null);
        await onSave({ password });
    };

    return (
        <BaseModal show={open} onClose={onClose}>
            <form
                className="change-password-modal-dialog"
                onSubmit={handleSubmit}
                autoComplete="off"
            >
                <div className="change-password-modal-title">Зміна паролю</div>
                <div className="change-password-modal-desc">
                    Ви увійшли з тимчасовим паролем.<br />
                    Встановіть новий пароль для безпеки.
                </div>
                <AppInput
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Пароль"
                    className="change-password-input"
                    disabled={loading}
                    autoFocus
                    minLength={4}
                    maxLength={255}
                />
                <AppInput
                    type="password"
                    value={repeatPassword}
                    onChange={e => setRepeatPassword(e.target.value)}
                    placeholder="Повторіть пароль"
                    className="change-password-input"
                    disabled={loading}
                    minLength={4}
                    maxLength={255}
                />
                {error && <div className="change-password-modal-error">{error}</div>}
                <div className="change-password-modal-actions">
                    <GreenButton
                        label="Змінити пароль"
                        type="submit"
                        className="change-password-save-btn"
                        disabled={
                            loading ||
                            !password.trim() ||
                            !repeatPassword.trim()
                        }
                    />
                </div>
            </form>
        </BaseModal>
    );
};

export default ChangePasswordModal;
