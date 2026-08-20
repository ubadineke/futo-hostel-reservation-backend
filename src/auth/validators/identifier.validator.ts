import {
  isEmail,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const REG_NO_RE = /^\d{11}$/;

export function isRegNo(identifier: string): boolean {
  return REG_NO_RE.test(identifier.trim());
}

export function isEmailIdentifier(identifier: string): boolean {
  return isEmail(identifier.trim());
}

export function isValidIdentifier(identifier: string): boolean {
  return isRegNo(identifier) || isEmailIdentifier(identifier);
}

@ValidatorConstraint({ name: 'isIdentifier', async: false })
class IsIdentifierConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidIdentifier(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'identifier must be an 11-digit registration number or a valid email address';
  }
}

/** Accept an 11-digit registration number or any syntactically valid email. */
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
