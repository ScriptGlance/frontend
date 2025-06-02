import React from "react";
import "./DraggableReassignModal.css";
import warningIcon from "../../../assets/warning-icon.svg";
import {Avatar} from "../../avatar/Avatar.tsx";
import {DraggableWindow} from "../base/DraggableWindow.tsx";

export interface Candidate {
    id: number;
    firstName: string;
    lastName: string;
    avatar: string | null;
    subtitle?: string;
    selected?: boolean;
    color: string;
}

interface DraggableReassignModalProps {
    visible: boolean;
    reason: string;
    partName: string;
    candidates: Candidate[];
    selectedCandidateId: number | null;
    onSelect: (id: number) => void;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
}

const width = 360;

const DraggableReassignModal: React.FC<DraggableReassignModalProps> = ({
                                                                           visible,
                                                                           reason,
                                                                           candidates,
                                                                           selectedCandidateId,
                                                                           onSelect,
                                                                           onConfirm,
                                                                           loading = false,
                                                                       }) => {
    if (!visible) return null;

    return (
        <DraggableWindow
            width={width}
            handleSelector=".draggable-reassign-modal__handle"
            initialPosition={{
                x: Math.max(0, Math.floor(window.innerWidth / 2 - width / 2)),
                y: Math.max(0, Math.floor(window.innerHeight / 2 - width / 2)),
            }}
        >
            <div className="draggable-reassign-modal">
                <div className="draggable-reassign-modal__handle">
                    <img src={warningIcon} alt="Warning" className="warning-icon"/>
                    <span className="reassign-title">Виступ призупинено</span>
                </div>
                <div className="draggable-reassign-modal__content">
                    <div className="draggable-reassign-modal__reason">{reason}</div>
                    <div className="draggable-reassign-modal__candidates">
                        {candidates.map(u => (
                            <div
                                key={u.id}
                                className={
                                    "draggable-reassign-modal__candidate" +
                                    (u.id === selectedCandidateId ? " selected" : "")
                                }
                                onClick={() => onSelect(u.id)}
                            >
                                <Avatar
                                    src={u?.avatar ? import.meta.env.VITE_APP_API_BASE_URL + u.avatar : null}
                                    alt={u?.firstName || "Користувач"}
                                    size={42}
                                    name={u.firstName || ""}
                                    surname={u.lastName || ""}
                                    bgColor={u.color}
                                />
                                <div className="candidate-info">
                                    <div>{u.firstName} {u.lastName}</div>
                                    {u.subtitle && <div className="candidate-subtitle">{u.subtitle}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="draggable-reassign-modal__confirm-wrapper">
                        <button
                            className="draggable-reassign-modal__confirm"
                            disabled={selectedCandidateId == null || loading}
                            onClick={onConfirm}
                        >Змінити читача
                        </button>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default DraggableReassignModal;
