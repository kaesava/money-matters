interface FileNotesDrawerProps {
    entityType: 'expenses' | 'categories' | string;
    entity: any | null;
    onClose: () => void;
    onBack?: () => void;
}
export declare function FileNotesDrawer({ entityType, entity, onClose, onBack }: FileNotesDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export default FileNotesDrawer;
//# sourceMappingURL=FileNotesDrawer.d.ts.map