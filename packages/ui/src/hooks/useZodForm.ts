import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
export function useZodForm<T extends ZodSchema>(
  schema: T,
  options?: { defaultValues?: Partial<z.infer<T>> }
): UseFormReturn<z.infer<T>> {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: options?.defaultValues as any,
    mode: 'onBlur',
  });
}
