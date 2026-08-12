import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isStrongPassword(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'password must be at least 8 characters and contain at least one letter and one number';
  }
}

/** Per BACKEND-README.md §7 — length >= 8, at least one letter and one digit. */
export function IsStrongPassword(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
