import React, { useState, useEffect } from "react";
import BaseModal from "../base/BaseModal";
import { AppInput } from "../../appInput/AppInput";
import "./AdminInvite.css";

interface AdminInviteProps {
    open: boolean;
    onClose: () => void;
    onSend: (data: { first_name: string; last_name: string; email: string }) => void;
    type: "user" | "moderator";
    loading?: boolean;
    resetTrigger?: number;
}

const AdminInvite: React.FC<AdminInviteProps> = ({
                                                     open,
                                                     onClose,
                                                     onSend,
                                                     type,
                                                     loading = false,
                                                     resetTrigger = 0
                                                 }) => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (resetTrigger > 0) {
            setFirstName("");
            setLastName("");
            setEmail("");
        }
    }, [resetTrigger]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend({
            first_name: firstName,
            last_name: lastName,
            email: email
        });
    };

    const resetForm = () => {
        setFirstName("");
        setLastName("");
        setEmail("");
        onClose();
    };

    const title = type === "user" ? "Запросити користувача" : "Запросити модератора";

    return (
        <BaseModal show={open} onClose={resetForm}>
            <div className="admin-invite-modal">
                <div className="admin-invite-modal-title">{title}</div>

                <form onSubmit={handleSubmit}>
                    <AppInput
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Ім'я"
                        className="admin-invite-modal-input"
                        autoFocus
                    />

                    <AppInput
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Прізвище"
                        className="admin-invite-modal-input"
                    />

                    <AppInput
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        className="admin-invite-modal-input"
                    />

                    <button
                        type="submit"
                        className="admin-invite-submit-button"
                        disabled={!firstName || !lastName || !email || loading}
                    >
                        {loading ? "Відправка..." : "Надіслати запрошення"}
                    </button>
                </form>
            </div>
        </BaseModal>
    );
};

export default AdminInvite;