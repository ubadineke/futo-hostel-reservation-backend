import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const REG_NO_RE = /^\d{11}$/;
export const SCHOOL_EMAIL_RE = /^[a-z]+\.[a-z]+\.\d{11}@futo\.edu\.ng$/i;

export function isRegNo(identifier: string): boolean {
  return REG_NO_RE.test(identifier.trim());
}

export function isSchoolEmail(identifier: string): boolean {
  return SCHOOL_EMAIL_RE.test(identifier.trim());
}

export function isValidIdentifier(identifier: string): boolean {
  return isRegNo(identifier) || isSchoolEmail(identifier);
}

@ValidatorConstraint({ name: 'isIdentifier', async: false })
class IsIdentifierConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidIdentifier(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'identifier must be an 11-digit reg number or a school email (firstname.lastname.regno@futo.edu.ng)';
  }
}

/** Per BACKEND-README.md §7 — `^\d{11}$` or `^[a-z]+\.[a-z]+\.\d{11}@futo\.edu\.ng$`. */
export function IsIdentifier(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsIdentifierConstraint,
    });
  };
}
