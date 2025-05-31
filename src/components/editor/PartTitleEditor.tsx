import React, {useRef} from "react";
import {ActiveUser} from "../../pages/presentationEditText/PresentationTextEditorPage.tsx";
import {Participant} from "../../api/repositories/presentationsRepository.ts";

const PartTitleEditor: React.FC<{
    partId: number;
    text: string;
    isEditing: boolean;
    activeUsers: ActiveUser[];
    participantColors: { [key: number]: string };
    participants: Participant[];
    currentUserId?: number;
    onEditStart: () => void;
    onTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
    onSelectionChange: React.ReactEventHandler<HTMLInputElement>;
    inputRef: (ref: HTMLInputElement | null) => void;
    resizeTick: number;
    disabled: boolean;
}> = ({
          partId,
          text,
          isEditing,
          activeUsers,
          participantColors,
          participants,
          currentUserId,
          onEditStart,
          onTextChange,
          onSave,
          onSelectionChange,
          inputRef,
          disabled
      }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const localInputRef = useRef<HTMLInputElement>(null);
    const measureDivRef = useRef<HTMLDivElement>(null);

    const saveInputRef = (ref: HTMLInputElement | null) => {
        localInputRef.current = ref;
        if (inputRef) inputRef(ref);
    };

    const calculateCharPosition = (text: string, position: number): number => {
        if (!measureDivRef.current) return position * 8;

        const div = measureDivRef.current;
        const element = isEditing ? localInputRef.current : containerRef.current;

        if (element) {
            const styles = window.getComputedStyle(element);
            div.style.font = styles.font;
            div.style.fontSize = styles.fontSize;
            div.style.fontFamily = styles.fontFamily;
            div.style.fontWeight = styles.fontWeight;
            div.style.letterSpacing = styles.letterSpacing;
        }

        div.textContent = text.substring(0, position);

        const paddingLeft = isEditing ? 13 : element ?
            (parseInt(window.getComputedStyle(element).paddingLeft) || 0) :
            0;

        return paddingLeft + div.offsetWidth;
    };

    const relevantUsers = activeUsers.filter(user =>
        user.part_id === partId &&
        user.target === 'name' &&
        user.user_id !== currentUserId &&
        user.cursor_position !== null
    );

    const handleTitleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;

            let closestPos = 0;
            let minDistance = Infinity;

            for (let i = 0; i <= text.length; i++) {
                const charPos = calculateCharPosition(text, i);
                const distance = Math.abs(charPos - clickX);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPos = i;
                }
            }

            const syntheticEvent = {
                ...e,
                target: {
                    ...e.target,
                    selectionStart: closestPos,
                    selectionEnd: closestPos
                }
                //eslint-disable-next-line
            } as any;

            onSelectionChange(syntheticEvent);

            onEditStart();

            setTimeout(() => {
                if (localInputRef.current) {
                    localInputRef.current.focus();
                    localInputRef.current.setSelectionRange(closestPos, closestPos);
                }
            }, 10);
        } else {
            onEditStart();
        }
    };

    return (
        <>
            <div
                ref={measureDivRef}
                style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    whiteSpace: 'pre',
                    height: 0,
                    overflow: 'hidden'
                }}
            />

            {isEditing ? (
                <div className="part-name-editor" style={{position: 'relative'}}>
                    <input
                        ref={saveInputRef}
                        type="text"
                        className="part-title-input"
                        value={text}
                        onChange={onTextChange}
                        onBlur={onSave}
                        onKeyDown={(e) => e.key === 'Enter' && onSave()}
                        onSelect={onSelectionChange}
                        onFocus={onSelectionChange}
                        disabled={disabled}
                    />

                    {relevantUsers.map(user => {
                        const userColor = participantColors[user.user_id] || '#6b7280';
                        const participant = participants?.find(p => p.user.user_id === user.user_id)?.user;
                        const userName = participant
                            ? `${participant.first_name} ${participant.last_name}`
                            : 'User ' + user.user_id;

                        const position = user.cursor_position || 0;
                        const cursorLeft = calculateCharPosition(text, position);

                        let selectionStart, selectionEnd, selectionWidth;
                        if (user.selection_anchor_position !== null &&
                            user.selection_anchor_position !== user.cursor_position) {
                            selectionStart = Math.min(position, user.selection_anchor_position);
                            selectionEnd = Math.max(position, user.selection_anchor_position);
                            selectionWidth = calculateCharPosition(text, selectionEnd) -
                                calculateCharPosition(text, selectionStart);
                        }

                        return (
                            <React.Fragment key={`title-cursor-${user.user_id}`}>
                                {selectionStart !== undefined && selectionWidth && (
                                    <div
                                        className="user-selection"
                                        style={{
                                            position: 'absolute',
                                            backgroundColor: `${userColor}33`,
                                            left: calculateCharPosition(text, selectionStart),
                                            top: 4,
                                            width: selectionWidth,
                                            height: 'calc(100% - 8px)',
                                            zIndex: 11,
                                            pointerEvents: 'none'
                                        }}
                                    />
                                )}

                                <div
                                    className="user-cursor name-cursor"
                                    style={{
                                        position: 'absolute',
                                        left: cursorLeft,
                                        top: 5.5,
                                        height: 22,
                                        zIndex: 20,
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <div
                                        className="cursor-line"
                                        style={{
                                            backgroundColor: userColor,
                                            height: '100%',
                                            width: 2,
                                            pointerEvents: 'none'
                                        }}
                                    ></div>
                                    <div
                                        className="cursor-flag"
                                        style={{backgroundColor: userColor}}
                                    >
                                        {userName}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className={`part-title ${disabled ? 'disabled' : ''}`}
                    onClick={handleTitleClick}
                    style={{position: 'relative'}}
                >
                    {text}

                    {relevantUsers.map(user => {
                        const userColor = participantColors[user.user_id] || '#6b7280';
                        const participant = participants?.find(p => p.user.user_id === user.user_id)?.user;
                        const userName = participant
                            ? `${participant.first_name} ${participant.last_name}`
                            : '';

                        const position = user.cursor_position || 0;
                        const cursorLeft = calculateCharPosition(text, position);

                        let selectionStart, selectionEnd;
                        if (user.selection_anchor_position !== null &&
                            user.selection_anchor_position !== user.cursor_position) {
                            selectionStart = Math.min(position, user.selection_anchor_position);
                            selectionEnd = Math.max(position, user.selection_anchor_position);
                        }

                        return (
                            <React.Fragment key={`title-cursor-${user.user_id}`}>
                                {selectionStart !== undefined && selectionEnd !== undefined && (
                                    <div
                                        className="user-selection"
                                        style={{
                                            position: 'absolute',
                                            backgroundColor: `${userColor}33`,
                                            left: calculateCharPosition(text, selectionStart),
                                            top: 4,
                                            width: calculateCharPosition(text, selectionEnd) -
                                                calculateCharPosition(text, selectionStart),
                                            height: 'calc(100% - 8px)',
                                            zIndex: 11,
                                            pointerEvents: 'none'
                                        }}
                                    />
                                )}

                                <div
                                    className="user-cursor name-cursor"
                                    style={{
                                        position: 'absolute',
                                        left: cursorLeft,
                                        top: 5.5,
                                        height: 22,
                                        zIndex: 20,
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <div
                                        className="cursor-line"
                                        style={{
                                            backgroundColor: userColor,
                                            height: '100%',
                                            width: 2
                                        }}
                                    ></div>
                                    <div
                                        className="cursor-flag"
                                        style={{backgroundColor: userColor}}
                                    >
                                        {userName}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default PartTitleEditor;