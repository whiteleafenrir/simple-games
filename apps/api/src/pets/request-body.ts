import { BadRequestException } from '@nestjs/common';

export function parseRequestBody(value: unknown, allowedFields: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }
  if (Object.keys(value).some((key) => !allowedFields.includes(key))) {
    throw new BadRequestException('Request body contains unknown fields.');
  }
  return value as Record<string, unknown>;
}
