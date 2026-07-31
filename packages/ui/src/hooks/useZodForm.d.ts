import { UseFormReturn } from 'react-hook-form';
import { ZodSchema, z } from 'zod';
/**
 * Thin wrapper around react-hook-form with zodResolver pre-wired.
 * Returns a fully-typed form instance with field-level error access.
 *
 * Usage:
 *   const form = useZodForm(CustomerFormSchema, { defaultValues: EMPTY_FORM });
 *   form.register('name')  ← fully typed
 *   form.formState.errors.name?.message
 */
export declare function useZodForm<T extends ZodSchema>(schema: T, options?: {
    defaultValues?: Partial<z.infer<T>>;
}): UseFormReturn<z.infer<T>>;
//# sourceMappingURL=useZodForm.d.ts.map