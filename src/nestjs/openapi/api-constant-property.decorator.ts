import { ApiProperty, type ApiPropertyOptions } from '@nestjs/swagger';

/**
 * Decorates a property to mark it as constant in the OpenAPI documentation.
 *
 * @param options Options for the property, including the value in the `const` field.
 */
export function ApiConstantProperty(
  options: { const: any } & ApiPropertyOptions,
): PropertyDecorator {
  const { const: value, ...baseOptions } = options;

  let constType: ApiPropertyOptions['type'] | string = options.type;
  if (!constType) {
    constType = typeof value;

    if (constType !== 'string' && constType !== 'number') {
      throw new Error(
        `Unhandled type inferred from constant value '${value}'.`,
      );
    }

    if (constType === 'number' && Number.isInteger(value)) {
      constType = 'integer';
    }
  }

  return ApiProperty({
    examples: [value],
    const: value,
    type: constType,
    ...baseOptions,
  } as any);
}
