import React, {useState} from "react";
import BaseModal from "../base/BaseModal";
import {RedButton, GrayButton} from "../../appButton/AppButton";
import {AppInput} from "../../appInput/AppInput";
import "./DeleteConfirmationModal.css";

interface ConfirmationModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    confirmationTitle: string;
    confirmationDescription?: string;
    confirmationInputValue?: string;
    cancelButtonText?: string;
    confirmButtonText?: string;
    reloadAfterDelete?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
                                                                 open,
                                                                 onClose,
                                                                 onConfirm,
                                                                 confirmationTitle,
                                                                 confirmationDescription,
                                                                 confirmationInputValue,
                                                                 cancelButtonText = "Ні",
                                                                 confirmButtonText = "Так",
                                                                 reloadAfterDelete = true,
                                                             }) => {
    const [inputValue, setInputValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setInputValue("");
        setError(null);
        onClose();
    };

    const handleConfirm = () => {
        if (confirmationInputValue && inputValue.trim() !== confirmationInputValue.trim()) {
            setError("Введіть правильну назву для підтвердження");
            return;
        }
        setError(null);
        onConfirm();
        reset();
        if (reloadAfterDelete) {
            window.location.reload();
        }
    };

    return (
        <BaseModal show={open} onClose={reset} wide={!!confirmationDescription}>
            <div className="confirmation-modal">
                <div className="confirmation-modal-title">{confirmationTitle}</div>
                {confirmationDescription && (
                    <div className="confirmation-modal-description">{confirmationDescription}</div>
                )}

                {confirmationInputValue && (
                    <>
                        <AppInput
                            type="text"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder={confirmationInputValue}
                            className="confirmation-modal-input"
                            autoFocus
                        />
                    </>
                )}

                {error && <div className="confirmation-modal-error">{error}</div>}

                <div className="confirmation-modal-actions">
                    <GrayButton
                        type="button"
                        className="confirmation-modal-button"
                        label={cancelButtonText}
                        onClick={reset}
                    />
                    <RedButton
                        type="submit"
                        className="confirmation-modal-button"
                        label={confirmButtonText}
                        onClick={handleConfirm}
                        disabled={!!confirmationInputValue && inputValue.trim() !== confirmationInputValue.trim()}
                    />
                </div>
            </div>
        </BaseModal>
    );
};

export default ConfirmationModal;
