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