import type { ChangeEvent } from "react";
import type {
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";

export function withErrorReset<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>(field: ControllerRenderProps<TValues, TName>, onReset: () => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    field.onChange(e);
    onReset();
  };
}