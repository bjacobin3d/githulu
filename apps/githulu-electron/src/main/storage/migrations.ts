import type { StorageSchema } from '../../shared/types.js';

/**
 * Apply migrations from one version to another
 */
export function migrate(
  data: StorageSchema,
  fromVersion: number,
  toVersion: number
): StorageSchema {
  let current = { ...data };

  for (let v = fromVersion; v < toVersion; v++) {
    const migrator = migrations[v];
    if (migrator) {
      current = migrator(current);
      current.version = v + 1;
    }
  }

  return current;
}

/**
 * Migration functions keyed by the version they migrate FROM
 */
const migrations: Record<number, (data: StorageSchema) => StorageSchema> = {
  // Example: Migration from version 0 to 1
  // 0: (data) => {
  //   // Add new required fields, transform data structure, etc.
  //   return {
  //     ...data,
  //     newField: 'default value',
  //   };
  // },
};
