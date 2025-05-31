import React, { useState } from "react";
import BaseModal from "../base/BaseModal";
import { usePresentationMutations } from "../../../hooks/usePresentationActions.ts";
import { GrayButton, GreenButton } from "../../appButton/AppButton.tsx";
import { AppInput } from "../../appInput/AppInput";
import './EditPresentationNameModal.css'

interface EditPresentationNameModalProps {
    open: boolean;
    onClose: () => void;
    currentName: string;
    presentationId: number;
    onSuccess?: (newName: string) => void;
}

const EditPresentationNameModal: React.FC<EditPresentationNameModalProps> = ({
                                                                                 open,
                                                                                 onClose,
                                                                                 currentName,
                                                                                 presentationId,
                                                                                 onSuccess,
                                                                             }) => {
    const [name, setName] = useState(currentName);
    const [error, setError] = useState<string | null>(null);

    const { updateName, updateLoading } = usePresentationMutations(presentationId);

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Введіть нову назву");
            return;
        }
        try {
            await updateName(name.trim());
            onSuccess?.(name.trim());
            onClose();
        } catch {
            setError("Не вдалося зберегти назву. Спробуйте ще раз.");
        }
    };

    const handleClose = () => {
        setName(currentName);
        setError(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSave();
    };

    return (
        <BaseModal show={open} onClose={handleClose}>
            <div className="edit-presentation-name-modal">
                <div className="edit-presentation-name-title">
                    Змінити назву виступу
                </div>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <AppInput
                        className="edit-presentation-name-input"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={80}
                        autoFocus
                        placeholder="Введіть нову назву"
                    />
                    {error && <div className="edit-presentation-name-error">{error}</div>}
                    <div className="edit-presentation-name-actions">
                        <GrayButton
                            type="button"
                            className="edit-presentation-name-button"
                            label="Скасувати"
                            onClick={handleClose}
                        />
                        <GreenButton
                            type="submit"
                            className="edit-presentation-name-button"
                            label="Зберегти"
                            disabled={updateLoading || !name.trim()}
                        />
                    </div>
                </form>
            </div>
        </BaseModal>
    );
};

export default EditPresentationNameModal;
