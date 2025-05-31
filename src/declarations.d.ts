declare module '*.png' {
    const value: string;
    export default value;
}

declare module '*.svg' {
    import * as React from 'react';
    export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    const value: string;
    export default value;
}

declare module '*.css';
declare module '*.module.css' {
    const classes: { [key: string]: string };
    export default classes;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    //eslint-disable-next-line
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    //eslint-disable-next-line
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    //eslint-disable-next-line
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    //eslint-disable-next-line
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    //eslint-disable-next-line
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    //eslint-disable-next-line
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    //eslint-disable-next-line
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    //eslint-disable-next-line
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    //eslint-disable-next-line
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    //eslint-disable-next-line
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    //eslint-disable-next-line
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    abort(): void;
    start(): void;
    stop(): void;
}

interface Window {
    SpeechRecognition: {
        new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
        new(): SpeechRecognition;
    };
}

declare let webkitSpeechRecognition: {
    new(): SpeechRecognition;
};

interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}
