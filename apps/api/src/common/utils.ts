import { NotFoundException } from '@nestjs/common';

/**
 * Throws NotFoundException if entity is null/undefined, otherwise returns the entity.
 * Useful for consolidating null checks across service methods.
 */
export function throwIfNotFound<T>(
  entity: T | null | undefined,
  entityName: string,
  id: string
): T {
  if (!entity) {
    throw new NotFoundException(`${entityName} with ID ${id} not found`);
  }
  return entity;
}
