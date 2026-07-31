interface ViewToggleProps {
    viewMode: 'list' | 'board';
    onChange: (mode: 'list' | 'board') => void;
    showBoardOption?: boolean;
    listLabel?: string;
    boardLabel?: string;
}
export declare function ViewToggle({ viewMode, onChange, showBoardOption, listLabel, boardLabel, }: ViewToggleProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ViewToggle.d.ts.map