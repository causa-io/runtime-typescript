import { ValidatorOptions } from 'class-validator';

/**
 * The validator options to use when parsing unknown inputs.
 * This is the default when parsing and validating objects.
 */
export const validatorOptions: ValidatorOptions = {
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  whitelist: true,
  skipUndefinedProperties: false,
  skipNullProperties: false,
};
