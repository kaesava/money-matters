import React from 'react';
export interface FormFieldDefinition {
    key: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'cents' | 'select' | 'textarea' | 'checkbox';
    required?: boolean;
    options?: {
        value: string;
        label: string;
    }[];
    placeholder?: string;
    helperText?: string;
}
export interface GenericEditFormProps {
    title: string;
    values: any;
    onChange: (key: string, val: any) => void;
    fields?: FormFieldDefinition[];
    onSubmit: (e: React.FormEvent) => void | Promise<void>;
    onCancel: () => void;
    onDelete?: () => void | Promise<void>;
    isSubmitting?: boolean;
    isDeleting?: boolean;
    error?: string | null;
    children?: React.ReactNode;
}
export declare function GenericEditForm({ title, values, onChange, fields, onSubmit, onCancel, onDelete, isSubmitting, isDeleting, error, children, }: GenericEditFormProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GenericEditForm.d.ts.map