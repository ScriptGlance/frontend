import { PresentationsConfig } from "../api/repositories/presentationsRepository";
import {pluralizeUkrainian} from "./plurals.ts";

export function getPartDuration(
    words: number,
    config?: PresentationsConfig,
    showRange: boolean = true
): string {
    if (!config) return "";
    const minWPM = config.words_per_minute_min;
    const maxWPM = config.words_per_minute_max;

    const min = Math.ceil(words / maxWPM);
    const max = Math.ceil(words / minWPM);

    if (showRange && max > min) {
        return `~${min}-${max} ${pluralizeUkrainian(max, ["хвилина", "хвилини", "хвилин"])}`;
    } else if (minWPM) {
        return `${max > 0 ? '~' : ''}${max} ${pluralizeUkrainian(max, ["хвилина", "хвилини", "хвилин"])}`;
    }
    return "";
}