import React, {useEffect, useRef, useState} from "react";
import "./UpdateProfileModal.css";
import {UserProfile} from "../../../api/repositories/userRepository.ts";
import {AppInput} from "../../appInput/AppInput.tsx";
import {Avatar} from "../../avatar/Avatar.tsx";
import {GrayButton, GreenButton} from "../../appButton/AppButton.tsx";
import BaseModal from "../base/BaseModal.tsx";
import uploadIcon from "../../../assets/upload-icon.svg";

export interface UpdateProfileModalProps {
    initialProfile: Pick<UserProfile, "first_name" | "last_name" | "avatar">;
    open: boolean;
    onClose: () => void;
    onSave: (fields: { first_name: string; last_name: string; avatar?: File | null }) => Promise<void>;
    loading?: boolean;
}

function usePrevious<T>(value: T) {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}


const UpdateProfileModal: React.FC<UpdateProfileModalProps> = ({
                                                                   initialProfile,
                                                                   open,
                                                                   onClose,
                                                                   onSave,
                                                                   loading = false,
                                                               }) => {
    const [firstName, setFirstName] = useState(initialProfile.first_name);
    const [lastName, setLastName] = useState(initialProfile.last_name);
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(
        initialProfile?.avatar ? import.meta.env.VITE_APP_API_BASE_URL + initialProfile.avatar : null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            setAvatar(file);
            const reader = new FileReader();
            reader.onload = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAvatarClick = () => fileInputRef.current?.click();


    const prevOpen = usePrevious(open);

    useEffect(() => {
        if (!prevOpen && open) {
            setFirstName(initialProfile.first_name);
            setLastName(initialProfile.last_name);
            setAvatar(null);
            setAvatarPreview(
                initialProfile?.avatar
                    ? import.meta.env.VITE_APP_API_BASE_URL + initialProfile.avatar
                    : null
            );
        }
    }, [open, initialProfile]);

    return (
        <BaseModal show={open} onClose={onClose} closeOnBackdropClick>
            <form
                className="update-profile-modal-dialog"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (loading || !firstName.trim() || !lastName.trim()) return;
                    await onSave({ first_name: firstName, last_name: lastName, avatar });
                }}
            >
                <div className="update-profile-avatar-block">
                    <button
                        type="button"
                        className="update-profile-avatar-btn"
                        onClick={handleAvatarClick}
                        aria-label="Завантажити новий аватар"
                        tabIndex={0}
                    >
                        <Avatar
                            src={avatarPreview}
                            alt="Avatar"
                            size={78}
                            className="update-profile-avatar"
                        />
                        <span className="update-profile-avatar-upload-circle">
                        <img
                            src={uploadIcon}
                            alt="Upload"
                            className="update-profile-avatar-upload-icon"
                            draggable={false}
                        />
                    </span>
                    </button>
                    <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                    />
                </div>
                <AppInput
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Ім'я"
                    className="update-profile-input"
                    disabled={loading}
                    autoFocus
                />
                <AppInput
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Прізвище"
                    className="update-profile-input"
                    disabled={loading}
                />
                <div className="update-profile-modal-actions">
                    <GrayButton
                        label="Скасувати"
                        type="button"
                        className="update-profile-cancel-btn"
                        onClick={onClose}
                        disabled={loading}
                    />
                    <GreenButton
                        label="Зберегти"
                        type="submit"
                        className="update-profile-save-btn"
                        disabled={loading || !firstName.trim() || !lastName.trim()}
                    />
                </div>
            </form>
        </BaseModal>
    );
};

export default UpdateProfileModal;
