export const calculateWordCount = (text: string): number => {
    if (!text) return 0;
    const words = text.trim().split(/\s+/);
    return words.filter(word => word.length > 0).length;
};

export function truncateText(text: string, maxLength: number = 30): string {
    return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}