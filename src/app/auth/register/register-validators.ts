import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value as string | undefined;
  const confirm = group.get('confirm')?.value as string | undefined;
  if (!password || !confirm) {
    return null;
  }
  return password === confirm ? null : { mismatch: true };
};
