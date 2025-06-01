import {PUNCTUATION_REGEX} from "../contstants.ts";

export const calculateLevenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + 1));
            }
        }
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = (b.charAt(i - 1) === a.charAt(j - 1)) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
};

export const getSimilarity = (word1: string, word2: string): number => {
    const w1 = word1.toLowerCase().replace(/[.,!?]/g, '');
    const w2 = word2.toLowerCase().replace(/[.,!?]/g, '');
    if (!w1 || !w2) return 0;
    if (w1 === w2) return 1;
    const distance = calculateLevenshteinDistance(w1, w2);
    const maxLength = Math.max(w1.length, w2.length);
    if (maxLength === 0) return 1;
    return (maxLength - distance) / maxLength;
};

export const findLastNonWhitespaceIdx = (wordsArray: string[], startIdx: number, endIdx: number): number => {
    for (let i = endIdx; i >= startIdx; i--) {
        if (wordsArray[i] && wordsArray[i].trim().length > 0) {
            return i;
        }
    }
    return -1;
};


export interface HandleSpeechResultOptions {
    transcript: string;
    scriptWords: string[];
    currentWordIndex: number;
    currentPartId: number;
    isNearEndOfPart: (partId: number, wordIdx: number) => boolean;
    calculateCharPosition: (partId: number, wordIdx: number) => number;
    updateHighlightAndScroll: (partId: number, wordIdx: number) => void;
    sendReadingPosition: (data: { position: number }) => void;
    sendFinalPosition: (partId: number) => void;
    timeAtCurrentPositionRef: React.MutableRefObject<number>;
    lastWordAdvanceTimeRef: React.MutableRefObject<number>;
}

export function handleSpeechRecognitionResult({
                                                  transcript,
                                                  scriptWords,
                                                  currentWordIndex,
                                                  currentPartId,
                                                  isNearEndOfPart,
                                                  calculateCharPosition,
                                                  updateHighlightAndScroll,
                                                  sendReadingPosition,
                                                  sendFinalPosition,
                                                  timeAtCurrentPositionRef,
                                                  lastWordAdvanceTimeRef,
                                              }: HandleSpeechResultOptions): void {
    const recognizedWords = transcript
        .toLowerCase()
        .replace(PUNCTUATION_REGEX, '')
        .split(/\s+/)
        .filter(Boolean);

    if (recognizedWords.length === 0) {
        console.log('[Speech] No recognized words in transcript:', transcript);
        return;
    }

    const lastMeaningfulWordIdx = findLastNonWhitespaceIdx(scriptWords, 0, scriptWords.length - 1);
    if (lastMeaningfulWordIdx === -1) {
        console.warn('[Speech] No meaningful words found in script.');
        return;
    }

    if (currentWordIndex >= lastMeaningfulWordIdx) {
        console.log('[Speech] Current word index is beyond the last meaningful word index. Sending final position.');
        sendFinalPosition(currentPartId);
        return;
    }

    let currentPosition = currentWordIndex;
    const MAX_LOOKAHEAD = 3;
    const MIN_MS_PER_WORD = 100;

    console.groupCollapsed(`[Speech] Розпізнано: "${transcript}" (позиція: ${currentWordIndex})`);
    console.log(`Recognized words: ${transcript}`);

    for (let i = 0; i < recognizedWords.length; i++) {
        const recognizedWord = recognizedWords[i];

        const searchWindowWords: { word: string; index: number }[] = [];
        let lookAheadCount = 0;
        let searchIdx = currentPosition + 1;

        while (lookAheadCount < MAX_LOOKAHEAD && searchIdx < scriptWords.length) {
            if (scriptWords[searchIdx] && scriptWords[searchIdx].trim().length > 0) {
                const cleanWord = scriptWords[searchIdx].toLowerCase().replace(PUNCTUATION_REGEX, '');
                searchWindowWords.push({word: cleanWord, index: searchIdx});
                lookAheadCount++;
            }
            searchIdx++;
        }

        if (searchWindowWords.length === 0) {
            console.log(`[Speech] No valid words found in the next ${MAX_LOOKAHEAD} positions after current position ${currentPosition}.`);
            if (isNearEndOfPart(currentPartId, currentPosition)) {
                sendFinalPosition(currentPartId);
            }
            break;
        }

        let bestMatchIdx = -1;
        let bestSimilarity = 0;
        for (let j = 0; j < searchWindowWords.length; j++) {
            const similarity = getSimilarity(recognizedWord, searchWindowWords[j].word);
            if (similarity > bestSimilarity && similarity >= 0.6) {
                bestSimilarity = similarity;
                bestMatchIdx = searchWindowWords[j].index;
                if (similarity >= 0.95) break;
            }
        }

        if (bestMatchIdx !== -1) {
            const now = Date.now();
            const msSinceLastWord = now - lastWordAdvanceTimeRef.current;

            if (msSinceLastWord < MIN_MS_PER_WORD) {
                console.log(`[Speech] too fast (${msSinceLastWord} ms since last word). Ignoring "${recognizedWord}"`);
                continue;
            }

            lastWordAdvanceTimeRef.current = now;
            currentPosition = bestMatchIdx;
            const charPos = calculateCharPosition(currentPartId, currentPosition);
            updateHighlightAndScroll(currentPartId, currentPosition);
            sendReadingPosition({position: charPos});
            timeAtCurrentPositionRef.current = Date.now();
            if (currentPosition >= lastMeaningfulWordIdx) {
                sendFinalPosition(currentPartId);
                break;
            }
        }
    }

    if (isNearEndOfPart(currentPartId, currentPosition)) {
        const now = Date.now();
        const timeAtPosition = now - timeAtCurrentPositionRef.current;
        if (timeAtPosition > 5000) {
            console.log('[Speech] Near end of part, sending final position after 5 seconds of inactivity at current position.');
            sendFinalPosition(currentPartId);
        }
    }
    console.groupEnd();
}
