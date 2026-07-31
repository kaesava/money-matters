import { SetupPreset } from "@money-matters/types";
interface CategorySelectStepProps {
    selectedPresets: Set<string>;
    togglePreset: (id: string) => void;
    customCategoryName: string;
    setCustomCategoryName: (name: string) => void;
    customCategories: SetupPreset[];
    onAddCustomCategory: () => void;
    targets: Record<string, string>;
    setTarget: (id: string, val: string) => void;
    defaultExcessId: string;
    setDefaultExcessId: (id: string) => void;
    onBack: () => void;
    onComplete: () => void;
    isSubmitting: boolean;
}
export declare function CategorySelectStep({ selectedPresets, togglePreset, customCategoryName, setCustomCategoryName, customCategories, onAddCustomCategory, targets, setTarget, defaultExcessId, setDefaultExcessId, onBack, onComplete, isSubmitting, }: CategorySelectStepProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CategorySelectStep.d.ts.map