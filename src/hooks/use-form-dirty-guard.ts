import { UseFormReturn, FieldValues } from 'react-hook-form';

interface UseFormDirtyGuardOptions<TFieldValues extends FieldValues> {
	form: UseFormReturn<TFieldValues>;
	isEditing: boolean;
	isLoading: boolean;
}

/**
 * Reusable Dirty State Guard Hook for Dashboard Forms & Modals
 * - Checks if the form has any modified/dirty fields compared to initial values.
 * - Keeps the Save button disabled when editing an existing item until a field is actually changed.
 * - Provides `resetDirtyState` helper to reset form dirty baseline after successful save.
 */
export function useFormDirtyGuard<TFieldValues extends FieldValues>({
	form,
	isEditing,
	isLoading,
}: UseFormDirtyGuardOptions<TFieldValues>) {
	const isDirty = form.formState.isDirty;
	// Save button disabled if form is loading, OR if editing an existing item and no changes have been made yet
	const isSaveDisabled = isLoading || (isEditing && !isDirty);

	const resetDirtyState = (updatedValues?: TFieldValues) => {
		form.reset(updatedValues || form.getValues());
	};

	return {
		isDirty,
		isSaveDisabled,
		resetDirtyState,
	};
}
