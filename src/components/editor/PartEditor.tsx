import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import undoIcon from "../../assets/undo-icon.svg";
import redoIcon from "../../assets/redo-icon.svg";
import wordsIcon from "../../assets/words-icon.svg";
import timeIcon from "../../assets/time-icon.svg";
import {ActiveUser} from "../../pages/presentationEditText/PresentationTextEditorPage.tsx";
import {pluralizeUkrainian} from "../../utils/plurals.ts";
import {Participant} from "../../api/repositories/presentationsRepository.ts";
import {createOps, transformPosition} from '../../utils/operationalTransform.ts';

interface PartEditorProps {
    partId: number;
    text: string;
    pendingOpsCount: number;
    wordCount: number;
    durationText: string;
    activeUsers: ActiveUser[];
    participantColors: { [key: number]: string };
    participants: Participant[];
    currentUserId?: number;
    textAreaRef: (ref: HTMLTextAreaElement | null) => void;
    onTextChange: (
        eventData: { target: { value: string } },
        intendedSelection?: { start: number; end: number }
    ) => void;
    onSelectionChange: React.ReactEventHandler<HTMLTextAreaElement>;
    onUndo: () => void;
    onRedo: () => void;
    resizeTick: number;
    disabled: boolean;
}

const PartEditor: React.FC<PartEditorProps> = ({
                                                   partId,
                                                   text,
                                                   pendingOpsCount,
                                                   wordCount,
                                                   durationText,
                                                   activeUsers,
                                                   participantColors,
                                                   participants,
                                                   currentUserId,
                                                   textAreaRef,
                                                   onTextChange,
                                                   onSelectionChange,
                                                   onUndo,
                                                   onRedo,
                                                   resizeTick,
                                                   disabled
                                               }) => {
    const INDENT = '    ';

    const localTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const [renderCursors, setRenderCursors] = useState<{
        userId: number;
        position: { top: number, left: number };
        height: number;
        color: string;
        userName: string;
        selections: { top: number, left: number, width: number, height: number }[];
    }[]>([]);

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const saveTextAreaRef = (ref: HTMLTextAreaElement | null) => {
        localTextAreaRef.current = ref;
        if (textAreaRef) textAreaRef(ref);
    };

    const autoResizeTextarea = () => {
        const textarea = localTextAreaRef.current;
        if (!textarea) return;

        textarea.style.setProperty("height", "auto", "important");

        const newHeight = Math.max(textarea.scrollHeight, 200);
        textarea.style.setProperty("height", `${newHeight}px`, "important");
    };

    useLayoutEffect(() => {
        autoResizeTextarea();
    }, [text]);

    const createMeasureDiv = (textarea: HTMLTextAreaElement): HTMLDivElement => {
        const div = document.createElement('div');
        const style = window.getComputedStyle(textarea);

        div.style.position = 'fixed';
        const textareaRect = textarea.getBoundingClientRect();
        div.style.top = textareaRect.top + 'px';
        div.style.left = textareaRect.left + 'px';
        div.style.visibility = 'hidden';
        div.style.pointerEvents = 'none';

        const stylesToCopy: (keyof CSSStyleDeclaration)[] = [
            'fontFamily', 'fontSize', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'letterSpacing', 'overflowWrap', 'whiteSpace'
        ];
        stylesToCopy.forEach(key => {
            // eslint-disable-next-line
            // @ts-expect-error
            div.style[key] = style[key];
        });

        div.style.boxSizing = 'content-box';
        div.style.border = 'none';

        const paddingLeftNum = parseFloat(style.paddingLeft) || 0;
        const paddingRightNum = parseFloat(style.paddingRight) || 0;
        const textareaContentWidth = textarea.clientWidth - paddingLeftNum - paddingRightNum;
        div.style.width = textareaContentWidth + 'px';

        div.style.whiteSpace = 'pre-wrap';

        return div;
    };

    const getCoordinatesForPosition = (position: number): { top: number, left: number, height: number } => {
        const textarea = localTextAreaRef.current;
        if (!textarea) return {top: 0, left: 0, height: 0};

        const measureDiv = createMeasureDiv(textarea);
        const style = window.getComputedStyle(textarea);

        const textBeforeCursor = text.substring(0, position);
        measureDiv.innerHTML = textBeforeCursor
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>') +
            '<span id="cursor-marker" style="display:inline;font-size:inherit;"></span>';

        document.body.appendChild(measureDiv);
        void measureDiv.offsetHeight;

        const marker = measureDiv.querySelector('#cursor-marker') as HTMLElement;
        let coords = {top: 0, left: 0, height: parseInt(style.lineHeight) || 20};

        if (marker) {
            const markerRect = marker.getBoundingClientRect();
            const textareaRect = textarea.getBoundingClientRect();
            coords = {
                top: (markerRect.top - textareaRect.top) + textarea.scrollTop,
                left: (markerRect.left - textareaRect.left) + textarea.scrollLeft,
                height: markerRect.height || parseInt(style.lineHeight) || 20
            };
        }

        document.body.removeChild(measureDiv);
        return coords;
    };

    const getSelectionRects = (start: number, end: number): {
        top: number,
        left: number,
        width: number,
        height: number
    }[] => {
        const textarea = localTextAreaRef.current;
        if (!textarea || start === end) return [];

        const measureDiv = createMeasureDiv(textarea);

        const startPos = Math.min(start, end);
        const endPos = Math.max(start, end);

        const textBefore = text.substring(0, startPos);
        const selectedText = text.substring(startPos, endPos);

        measureDiv.innerHTML =
            textBefore.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') +
            '<span id="selection-span" style="display:inline;font-size:inherit;">' +
            selectedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') +
            '</span>';

        document.body.appendChild(measureDiv);
        void measureDiv.offsetHeight;

        const selectionSpan = measureDiv.querySelector('#selection-span');
        const rects: { top: number, left: number, width: number, height: number }[] = [];

        if (selectionSpan) {
            const range = document.createRange();
            range.selectNodeContents(selectionSpan);
            const clientRects = range.getClientRects();
            const textareaRect = textarea.getBoundingClientRect();

            for (let i = 0; i < clientRects.length; i++) {
                const rect = clientRects[i];
                rects.push({
                    top: (rect.top - textareaRect.top) + textarea.scrollTop,
                    left: (rect.left - textareaRect.left) + textarea.scrollLeft,
                    width: rect.width,
                    height: rect.height
                });
            }
        }

        document.body.removeChild(measureDiv);
        return rects;
    };

    useEffect(() => {
        if (!localTextAreaRef.current) return;

        const relevantUsers = activeUsers.filter(user =>
            user.part_id === partId &&
            user.target === 'text' &&
            user.user_id !== currentUserId &&
            user.cursor_position !== null
        );

        const newCursors = relevantUsers.map(user => {
            const position = user.cursor_position || 0;
            const coords = getCoordinatesForPosition(position);
            const userColor = participantColors[user.user_id] || '#6b7280';
            const participant = participants?.find(p => p.user.user_id === user.user_id)?.user;
            const userName = participant
                ? `${participant.first_name} ${participant.last_name}`
                : 'User ' + user.user_id;

            let selections: { top: number, left: number, width: number, height: number }[] = [];
            if (user.selection_anchor_position !== null &&
                user.selection_anchor_position !== user.cursor_position) {
                selections = getSelectionRects(position, user.selection_anchor_position);
            }

            return {
                userId: user.user_id,
                position: {top: coords.top, left: coords.left},
                height: coords.height,
                color: userColor,
                userName,
                selections
            };
        });
        setRenderCursors(newCursors);
    }, [activeUsers, participantColors, participants, currentUserId, partId, text, resizeTick]);

    const getLineInfo = (value: string, position: number) => {
        let lineStart = 0;
        for (let i = position - 1; i >= 0; i--) {
            if (value[i] === '\n') {
                lineStart = i + 1;
                break;
            }
        }

        let lineEnd = value.length;
        for (let i = position; i < value.length; i++) {
            if (value[i] === '\n') {
                lineEnd = i;
                break;
            }
        }

        return {lineStart, lineEnd};
    };
    const isEmptyLine = (line: string): boolean => {
        return line.trim() === '' || line === INDENT;
    };

    const removeConsecutiveEmptyLines = (text: string): string => {
        const lines = text.split('\n');
        const resultLines: string[] = [];
        let lastLineWasEmpty = false;

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];
            const isCurrentLineEmpty = isEmptyLine(currentLine);

            if (isCurrentLineEmpty) {
                if (lastLineWasEmpty) {
                    continue;
                }
                resultLines.push(INDENT);
                lastLineWasEmpty = true;
            } else {
                resultLines.push(currentLine);
                lastLineWasEmpty = false;
            }
        }

        return resultLines.join('\n');
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        e.preventDefault();

        const textarea = localTextAreaRef.current;
        if (!textarea) return;

        const {selectionStart, selectionEnd, value} = textarea;
        const clipboardText = e.clipboardData.getData('text') || '';

        const lines = clipboardText.split('\n');

        let processedText = lines[0];

        let lastLineWasEmpty = false;

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].trim();
            const isCurrentLineEmpty = currentLine === '';

            if (isCurrentLineEmpty && lastLineWasEmpty) {
                continue;
            }

            processedText += '\n' + INDENT;
            if (!isCurrentLineEmpty) {
                processedText += currentLine;
            }

            lastLineWasEmpty = isCurrentLineEmpty;
        }

        let newText = value.substring(0, selectionStart) + processedText + value.substring(selectionEnd);

        if (!newText.startsWith(INDENT)) {
            newText = INDENT + newText.replace(/^( *)/, '');
        }

        const textBeforeCleaning = newText;
        const caretAfterPaste = selectionStart + processedText.length;

        const finalPastedText = removeConsecutiveEmptyLines(textBeforeCleaning);
        let finalCaretPosition = caretAfterPaste;

        if (finalPastedText !== textBeforeCleaning) {
            const ops = createOps(textBeforeCleaning, finalPastedText, 0);
            finalCaretPosition = transformPosition(ops, caretAfterPaste);
        }
        finalCaretPosition = Math.max(0, Math.min(finalCaretPosition, finalPastedText.length));


        onTextChange({
            ...e,
            // eslint-disable-next-line
            target: {...e.target as any, value: finalPastedText}
            // eslint-disable-next-line
        } as any);

        setTimeout(() => {
            textarea.setSelectionRange(finalCaretPosition, finalCaretPosition);
        }, 0);
    };

    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = localTextAreaRef.current;
        if (!textarea) return;

        const initialValue = textarea.value;
        const initialSelectionStart = textarea.selectionStart;
        const initialSelectionEnd = textarea.selectionEnd;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

        if (ctrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            onUndo();
            return;
        }
        if (
            (ctrlOrCmd && !isMac && e.key.toLowerCase() === 'y') ||
            (ctrlOrCmd && isMac && e.shiftKey && e.key.toLowerCase() === 'z')
        ) {
            e.preventDefault();
            onRedo();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();

            const {lineStart} = getLineInfo(initialValue, initialSelectionStart);
            const currentLineText = initialValue.substring(lineStart, initialValue.indexOf('\n', lineStart) === -1 ? initialValue.length : initialValue.indexOf('\n', lineStart));
            const isCurrentLineEffectivelyEmpty = isEmptyLine(currentLineText);

            let prevLineEffectivelyEmpty = false;
            if (lineStart > 0) {
                const prevLineActualEnd = lineStart - 1;
                const prevLineActualStart = initialValue.lastIndexOf('\n', prevLineActualEnd - 1) + 1;
                const prevLineText = initialValue.substring(prevLineActualStart, prevLineActualEnd);
                prevLineEffectivelyEmpty = isEmptyLine(prevLineText);
            }

            if (isCurrentLineEffectivelyEmpty && prevLineEffectivelyEmpty) {
                if (initialSelectionStart !== lineStart + INDENT.length) {
                    textarea.setSelectionRange(lineStart + INDENT.length, lineStart + INDENT.length);
                }
                return;
            }

            const beforeSelection = initialValue.substring(0, initialSelectionStart);
            const afterSelection = initialValue.substring(initialSelectionEnd);

            let valueBeforeCleaning: string;
            let caretBeforeCleaning: number;

            const cursorAtStartOfTextAfterIndent = initialSelectionStart === lineStart + INDENT.length && !isCurrentLineEffectivelyEmpty;
            if (prevLineEffectivelyEmpty && cursorAtStartOfTextAfterIndent) {
                valueBeforeCleaning = initialValue.substring(0, lineStart) + INDENT + '\n' + initialValue.substring(lineStart);
                caretBeforeCleaning = initialSelectionStart;
            } else {
                const textToInsert = '\n' + INDENT;
                valueBeforeCleaning = beforeSelection + textToInsert + afterSelection;
                caretBeforeCleaning = initialSelectionStart + textToInsert.length;
            }

            if (valueBeforeCleaning.length > 0 && !valueBeforeCleaning.startsWith(INDENT)) {
                valueBeforeCleaning = INDENT + valueBeforeCleaning.replace(/^( *)/, '');
                if (initialSelectionStart === 0 && lineStart === 0) {
                    caretBeforeCleaning += INDENT.length;
                }
            } else if (valueBeforeCleaning.length === 0) {
                valueBeforeCleaning = INDENT;
                caretBeforeCleaning = INDENT.length;
            }

            const textAfterInitialLogic = valueBeforeCleaning;
            const caretAfterInitialLogic = caretBeforeCleaning;

            const finalNewValue = removeConsecutiveEmptyLines(textAfterInitialLogic);
            let finalNewCaretPosition = caretAfterInitialLogic;

            if (finalNewValue !== textAfterInitialLogic) {
                const ops = createOps(textAfterInitialLogic, finalNewValue, 0);
                finalNewCaretPosition = transformPosition(ops, caretAfterInitialLogic);
            }
            finalNewCaretPosition = Math.max(0, Math.min(finalNewCaretPosition, finalNewValue.length));

            textarea.value = finalNewValue;
            textarea.setSelectionRange(finalNewCaretPosition, finalNewCaretPosition);
            // eslint-disable-next-line
            onTextChange({...e, target: textarea} as any);
            return;
        }

        if ((e.key === 'Backspace' || e.key === 'Delete') && initialSelectionStart !== initialSelectionEnd) {
            e.preventDefault();

            let valueBeforeCleaning = initialValue.substring(0, initialSelectionStart) + initialValue.substring(initialSelectionEnd);
            let caretBeforeCleaning = initialSelectionStart;

            if (valueBeforeCleaning.length > 0 && !valueBeforeCleaning.startsWith(INDENT)) {
                valueBeforeCleaning = INDENT + valueBeforeCleaning.replace(/^( *)/, '');
                if (initialSelectionStart === 0) {
                    caretBeforeCleaning = INDENT.length;
                }
            } else if (valueBeforeCleaning.length === 0) {
                valueBeforeCleaning = INDENT;
                caretBeforeCleaning = INDENT.length;
            }

            const textAfterInitialLogic = valueBeforeCleaning;
            const caretAfterInitialLogic = caretBeforeCleaning;

            const finalNewValue = removeConsecutiveEmptyLines(textAfterInitialLogic);
            let finalNewCaretPosition = caretAfterInitialLogic;

            if (finalNewValue !== textAfterInitialLogic) {
                const ops = createOps(textAfterInitialLogic, finalNewValue, 0);
                finalNewCaretPosition = transformPosition(ops, caretAfterInitialLogic);
            }
            finalNewCaretPosition = Math.max(0, Math.min(finalNewCaretPosition, finalNewValue.length));

            textarea.value = finalNewValue;
            textarea.setSelectionRange(finalNewCaretPosition, finalNewCaretPosition);
            // eslint-disable-next-line
            onTextChange({...e, target: textarea} as any);
            return;
        }

        if (e.key === 'Backspace' && initialSelectionStart === initialSelectionEnd) {
            const lineStart = initialValue.lastIndexOf('\n', initialSelectionStart - 1) + 1;
            const isAtStartOfIndent = initialSelectionStart === lineStart + INDENT.length;
            const isWithinInitialIndent = initialSelectionStart > lineStart && initialSelectionStart < lineStart + INDENT.length;

            if (isAtStartOfIndent && lineStart > 0) {
                e.preventDefault();
                const prevLineEnd = lineStart - 1;
                const currentLineContentAfterIndent = initialValue.substring(lineStart + INDENT.length,
                    initialValue.indexOf('\n', lineStart) === -1 ? initialValue.length : initialValue.indexOf('\n', lineStart)
                );

                const valueBeforeCleaning = initialValue.substring(0, prevLineEnd) +
                    currentLineContentAfterIndent +
                    initialValue.substring(initialValue.indexOf('\n', lineStart) === -1 ? initialValue.length : initialValue.indexOf('\n', lineStart));
                const caretBeforeCleaning = prevLineEnd;

                const textAfterInitialLogic = valueBeforeCleaning;
                let caretAfterInitialLogic = caretBeforeCleaning;

                const mergedLineStartForCheck = textAfterInitialLogic.lastIndexOf('\n', caretAfterInitialLogic - 1) + 1;
                const mergedLineTextForCheck = textAfterInitialLogic.substring(mergedLineStartForCheck, textAfterInitialLogic.indexOf('\n', mergedLineStartForCheck) === -1 ? textAfterInitialLogic.length : textAfterInitialLogic.indexOf('\n', mergedLineStartForCheck));
                if (isEmptyLine(mergedLineTextForCheck) && caretAfterInitialLogic > mergedLineStartForCheck + INDENT.length) {
                    caretAfterInitialLogic = mergedLineStartForCheck + INDENT.length;
                }

                const finalNewValue = removeConsecutiveEmptyLines(textAfterInitialLogic);
                let finalNewCaretPosition = caretAfterInitialLogic;

                if (finalNewValue !== textAfterInitialLogic) {
                    const ops = createOps(textAfterInitialLogic, finalNewValue, 0);
                    finalNewCaretPosition = transformPosition(ops, caretAfterInitialLogic);
                }
                finalNewCaretPosition = Math.max(0, Math.min(finalNewCaretPosition, finalNewValue.length));

                textarea.value = finalNewValue;
                textarea.setSelectionRange(finalNewCaretPosition, finalNewCaretPosition);
                // eslint-disable-next-line
                onTextChange({...e, target: textarea} as any);
                return;
            }

            if (lineStart === 0 && initialSelectionStart > 0 && initialSelectionStart <= INDENT.length && initialValue.startsWith(INDENT)) {
                e.preventDefault();
                textarea.setSelectionRange(INDENT.length, INDENT.length);
                return;
            }

            if (lineStart > 0 && isWithinInitialIndent && initialValue.substring(lineStart, lineStart + INDENT.length) === INDENT) {
                e.preventDefault();
                textarea.setSelectionRange(lineStart + INDENT.length, lineStart + INDENT.length);
                return;
            }
        }

        if (e.key === 'Delete' && initialSelectionStart === initialSelectionEnd) {
            const lineStart = initialValue.lastIndexOf('\n', initialSelectionStart - 1) + 1;
            const lineEnd = initialValue.indexOf('\n', initialSelectionStart);
            const effectiveLineEnd = lineEnd === -1 ? initialValue.length : lineEnd;

            if (initialSelectionStart === effectiveLineEnd && lineEnd !== -1) {
                e.preventDefault();
                const nextLineStart = lineEnd + 1;
                const nextLineIndentEnd = nextLineStart + INDENT.length;
                const nextLineContentAfterIndent = initialValue.substring(
                    Math.min(nextLineIndentEnd, initialValue.length),
                    initialValue.indexOf('\n', nextLineStart) === -1 ? initialValue.length : initialValue.indexOf('\n', nextLineStart)
                );

                const valueBeforeCleaning = initialValue.substring(0, effectiveLineEnd) +
                    nextLineContentAfterIndent +
                    initialValue.substring(initialValue.indexOf('\n', nextLineStart) === -1 ? initialValue.length : initialValue.indexOf('\n', nextLineStart));
                const caretBeforeCleaning = effectiveLineEnd;

                const textAfterInitialLogic = valueBeforeCleaning;
                let caretAfterInitialLogic = caretBeforeCleaning;

                const currentLineMergedTextForCheck = textAfterInitialLogic.substring(lineStart, textAfterInitialLogic.indexOf('\n', lineStart) === -1 ? textAfterInitialLogic.length : textAfterInitialLogic.indexOf('\n', lineStart));
                if (isEmptyLine(currentLineMergedTextForCheck) && caretAfterInitialLogic > lineStart + INDENT.length) {
                    caretAfterInitialLogic = lineStart + INDENT.length;
                }

                const finalNewValue = removeConsecutiveEmptyLines(textAfterInitialLogic);
                let finalNewCaretPosition = caretAfterInitialLogic;

                if (finalNewValue !== textAfterInitialLogic) {
                    const ops = createOps(textAfterInitialLogic, finalNewValue, 0);
                    finalNewCaretPosition = transformPosition(ops, caretAfterInitialLogic);
                }
                finalNewCaretPosition = Math.max(0, Math.min(finalNewCaretPosition, finalNewValue.length));

                textarea.value = finalNewValue;
                textarea.setSelectionRange(finalNewCaretPosition, finalNewCaretPosition);
                // eslint-disable-next-line
                onTextChange({...e, target: textarea} as any);
                return;
            }
        }
    };

    function ensureIndentAtStart(text: string) {
        if (text === null || text === undefined) return INDENT;
        return text.startsWith(INDENT) ? text : INDENT + text.replace(/^( *)/, '');
    }

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        const scrollTop = textarea.scrollTop;
        const cursorAtEnd = textarea.selectionStart === textarea.value.length;
        let value = e.target.value;

        const lines = value.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].startsWith(INDENT) && lines[i].trim().length > 0) {
                lines[i] = INDENT + lines[i].replace(/^( *)/, '');
            } else if (lines[i].trim().length === 0 && lines.length > 1) {
                lines[i] = INDENT;
            } else if (lines[i].trim().length === 0 && lines.length === 1 && value !== INDENT) {
                lines[i] = INDENT;
            }
        }

        value = lines.join('\n');

        if (value.length === 0) {
            value = INDENT;
        } else if (!value.startsWith(INDENT)) {
            value = INDENT + value.replace(/^( *)/, '');
        }

        value = removeConsecutiveEmptyLines(value);
        if (value.length === 0) {
            value = INDENT;
        }


        onTextChange({...e, target: {...e.target, value}});

        setTimeout(() => {
            if (localTextAreaRef.current) {
                if (cursorAtEnd) {
                    localTextAreaRef.current.scrollTop = localTextAreaRef.current.scrollHeight;
                } else {
                    localTextAreaRef.current.scrollTop = scrollTop;
                }
            }
        }, 0);
    };

    const fixCaretPosition = () => {
        const textarea = localTextAreaRef.current;
        if (!textarea) return;

        const value = textarea.value;
        const {selectionStart, selectionEnd} = textarea;


        const currentLineStart = selectionStart > 0 ?
            value.lastIndexOf('\n', selectionStart - 1) + 1 : 0;

        const safeCurrentLineStart = Math.max(0, currentLineStart);

        const currentLineText = value.substring(safeCurrentLineStart, value.indexOf('\n', safeCurrentLineStart) === -1 ? value.length : value.indexOf('\n', safeCurrentLineStart));

        let isWithinOrAtStartOfIndent = selectionStart - safeCurrentLineStart < INDENT.length;
        if (currentLineText.length < INDENT.length && selectionStart - safeCurrentLineStart === currentLineText.length) {
            isWithinOrAtStartOfIndent = selectionStart - safeCurrentLineStart < currentLineText.length;
        }


        if (isWithinOrAtStartOfIndent && value.substring(safeCurrentLineStart, safeCurrentLineStart + INDENT.length).startsWith(INDENT.substring(0, 1))) {
            const targetPos = safeCurrentLineStart + INDENT.length;
            if (selectionStart === selectionEnd) {
                if (selectionStart < targetPos) {
                    textarea.setSelectionRange(targetPos, targetPos);
                }
            } else {
                let newSelStart = selectionStart;
                let newSelEnd = selectionEnd;
                let changed = false;

                if (selectionStart < safeCurrentLineStart + INDENT.length) {
                    newSelStart = safeCurrentLineStart + INDENT.length;
                    changed = true;
                }
                if (selectionEnd < safeCurrentLineStart + INDENT.length && selectionEnd > selectionStart) {
                    newSelEnd = safeCurrentLineStart + INDENT.length;
                    changed = true;
                }

                if (newSelStart > newSelEnd) newSelStart = newSelEnd;

                if (changed) {
                    textarea.setSelectionRange(newSelStart, newSelEnd);
                }
            }
        }
    };

    useEffect(() => {
        const textarea = localTextAreaRef.current;
        if (!textarea) return;

        const handleCaretFix = () => {
            setTimeout(fixCaretPosition, 0);
        };

        textarea.addEventListener('keyup', handleCaretFix);
        textarea.addEventListener('mouseup', handleCaretFix);
        textarea.addEventListener('focus', handleCaretFix);

        return () => {
            textarea.removeEventListener('keyup', handleCaretFix);
            textarea.removeEventListener('mouseup', handleCaretFix);
            // textarea.removeEventListener('click', handleCaretFix);
            textarea.removeEventListener('focus', handleCaretFix);
        };
    }, [partId, text]);

    return (
        <>
            <div
                className="part-editor-container"
                ref={scrollContainerRef}
                style={{position: "relative"}}
            >
                <div className="part-editor-wrapper">
                    <textarea
                        id={`editor-${partId}`}
                        ref={saveTextAreaRef}
                        className="part-editor-textarea plain-text"
                        value={ensureIndentAtStart(text)}
                        onChange={handleTextChange}
                        onSelect={(e) => {
                            onSelectionChange(e);
                        }}
                        onKeyUp={() => {
                            autoResizeTextarea();
                        }}
                        onKeyDown={handleEditorKeyDown}
                        onPaste={handlePaste}
                        onMouseUp={(e) => {
                            onSelectionChange(e);
                        }}
                        onClick={(e) => {
                            onSelectionChange(e);
                        }}
                        placeholder="Введіть текст тут..."
                        spellCheck={true}
                        style={{minHeight: '0', height: 'auto', maxHeight: 'none', overflowY: 'hidden'}}
                        disabled={disabled}
                    />


                    {renderCursors.map(cursor =>
                        cursor.selections.map((rect, idx) => (
                            <div
                                key={`selection-${cursor.userId}-${idx}`}
                                className="user-selection"
                                style={{
                                    position: "absolute",
                                    backgroundColor: `${cursor.color}33`,
                                    left: rect.left,
                                    top: rect.top,
                                    width: rect.width,
                                    height: rect.height,
                                    zIndex: 11,
                                }}
                            />
                        ))
                    )}

                    {renderCursors.map(cursor => (
                        <div
                            key={`cursor-${cursor.userId}`}
                            className="user-cursor"
                            style={{
                                position: "absolute",
                                left: cursor.position.left,
                                top: cursor.position.top,
                                zIndex: 20,
                            }}
                        >
                            <div
                                className="cursor-line"
                                style={{
                                    backgroundColor: cursor.color,
                                    height: cursor.height,
                                    width: 2
                                }}
                            ></div>
                            <div
                                className="cursor-flag"
                                style={{backgroundColor: cursor.color}}
                            >
                                {cursor.userName}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="formatting-toolbar simplified">
                    <button className="format-btn" disabled={disabled} title="Скасувати (Undo)" onClick={onUndo}>
                        <img src={undoIcon} alt="Undo"/>
                    </button>
                    <button className="format-btn" disabled={disabled} title="Повторити (Redo)" onClick={onRedo}>
                        <img src={redoIcon} alt="Redo"/>
                    </button>
                </div>
            </div>

            <div className="part-footer">
                <div className="part-sync-status">
                    {pendingOpsCount > 0 ? (
                        <span className="sync-status syncing">Синхронізація... ({pendingOpsCount})</span>
                    ) : (
                        <span className="sync-status synced">Всі зміни збережено</span>
                    )}
                </div>
                <div className="part-stats">
                    <img src={wordsIcon} className="part-stats-icon"/>
                    <span
                        className="word-count">{wordCount} {pluralizeUkrainian(wordCount, ['слово', 'cлова', 'слів'])}</span>
                    <img src={timeIcon} className="part-stats-icon"/>
                    <span className="duration">{durationText}</span>
                </div>
            </div>
        </>
    );
};

export default PartEditor;