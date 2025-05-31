import React, {useEffect, useRef, useState} from 'react';
import timeIcon from "../../assets/time-icon.svg";
import {Avatar} from "../avatar/Avatar.tsx";
import sidebarIcon from "../../assets/sidebar-icon.svg";
import './StructureSidebar.css';
import {Participant} from "../../api/repositories/presentationsRepository.ts";

export interface SidebarPart {
    part_id: number;
    assignee_user_id: number | null;
    part_name: string;
}

interface StructureSidebarProps {
    totalDuration?: string;
    parts: SidebarPart[];
    participants: Participant[];
    onPartClick?: (partId: number) => void;
    highlightedPartId: number | null;
    showReadParts?: boolean;
    marginBottom?: string;
}

const StructureSidebar: React.FC<StructureSidebarProps> = ({
                                                               totalDuration,
                                                               parts,
                                                               participants,
                                                               onPartClick,
                                                               highlightedPartId,
                                                               showReadParts = false,
                                                               marginBottom = '0',
                                                           }) => {
    const [isFolded, setIsFolded] = useState(false);
    const partRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const toggleFold = () => {
        setIsFolded(!isFolded);
    };

    useEffect(() => {
        const container = document.querySelector('.structure-parts') as HTMLDivElement | null;
        const target = partRefs.current[highlightedPartId ?? -1];

        if (container && target) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            const offset = targetRect.top - containerRect.top;
            const scrollTarget = container.scrollTop + offset - container.clientHeight / 2 + target.clientHeight / 2;

            smoothScrollTo(container, scrollTarget, 75);
        }
    }, [highlightedPartId]);

    const smoothScrollTo = (container: Element, targetScrollTop: number, duration = 200) => {
        const start = container.scrollTop;
        const change = targetScrollTop - start;
        const startTime = performance.now();

        function animateScroll(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = easeInOutQuad(progress);

            container.scrollTop = start + change * ease;

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        }

        requestAnimationFrame(animateScroll);
    };

    const easeInOutQuad = (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const activeIndex = highlightedPartId != null
        ? parts.findIndex(p => p.part_id === highlightedPartId)
        : -1;

    return (
        <div className={`structure-sidebar ${isFolded ? 'folded' : ''}`}>
            <div className="structure-header">
                <div className="structure-header-left">
                    <button
                        className="fold-button"
                        onClick={toggleFold}
                        aria-label={isFolded ? "Розгорнути" : "Згорнути"}
                    >
                        <img
                            src={sidebarIcon}
                            alt={isFolded ? "Розгорнути" : "Згорнути"}
                            className={`chevron-icon ${isFolded ? 'rotated' : ''}`}
                        />
                    </button>
                    <span className="structure-title">
                    Структура виступу
                </span>
                </div>

                {totalDuration && <div className="structure-header-right">
                    <span className="structure-time">
                        <img src={timeIcon} alt="Time" className="time-icon"/>
                        {totalDuration}
                    </span>
                </div>}
            </div>

            {!isFolded && (
                <div className="structure-parts" style={{marginBottom: marginBottom}}>
                    {parts.map((part, index) => {
                        const partId = part.part_id;
                        const participantColor = participants?.find(p => p.user.user_id === part.assignee_user_id)?.color || '#6b7280';
                        const assignee = participants?.find(p => p.user.user_id === part.assignee_user_id)?.user;
                        const isRead = showReadParts && activeIndex > 0 && index < activeIndex;

                        return (
                            <div
                                className={`structure-part-stack ${isRead ? 'read' : ''} ${onPartClick ? 'clickable' : ''}`}>
                                <div
                                    className="structure-part background"
                                    style={{backgroundColor: participantColor}}
                                />
                                <div
                                    className={`structure-part foreground ${highlightedPartId === partId ? 'active' : ''}`}
                                    onClick={() => onPartClick ? onPartClick(partId) : null}
                                    ref={(el) => {
                                        partRefs.current[partId] = el;
                                    }}
                                >
                                    <div className="structure-part-row-header">
                                        <div className="structure-part-number">{index + 1}</div>
                                        <div className="structure-part-title">{part.part_name}</div>
                                    </div>
                                    <div className="structure-part-row-footer">
                                        <div className="structure-part-assignee">
                                            <Avatar
                                                src={assignee?.avatar ? import.meta.env.VITE_APP_API_BASE_URL + assignee.avatar : null}
                                                alt={assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Невідомий'}
                                                size={36}
                                                name={assignee?.first_name}
                                                surname={assignee?.last_name}
                                                bgColor={participantColor}
                                            />
                                            <span className="structure-assignee-name">
                                                {assignee
                                                    ? `${assignee.first_name} ${assignee.last_name}`
                                                    : 'Невідомий'}
                                              </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StructureSidebar;