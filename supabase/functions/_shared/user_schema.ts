const ALLOWED_SCALAR_TYPES = new Set([
  "string",
  "number",
  "integer",
  "boolean",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasNestedProperties(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const props = value.properties;
  return isPlainObject(props) && Object.keys(props).length > 0;
}

function isScalarType(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_SCALAR_TYPES.has(value);
}

export function validateFlatUserSchema(
  schemaJson: Record<string, unknown>,
): string[] {
  const issues: string[] = [];

  if (schemaJson.type !== "object") {
    issues.push('Top-level `type` must be "object".');
  }

  const properties = schemaJson.properties;
  if (!isPlainObject(properties)) {
    issues.push('Top-level `properties` must be an object.');
    return issues;
  }
  if (Object.keys(properties).length === 0) {
    issues.push("At least one top-level field is required.");
    return issues;
  }

  for (const [fieldKey, rawDefinition] of Object.entries(properties)) {
    if (!isPlainObject(rawDefinition)) {
      issues.push(`Field "${fieldKey}" must be a schema object.`);
      continue;
    }

    if (hasNestedProperties(rawDefinition)) {
      issues.push(
        `Field "${fieldKey}" uses nested properties; only top-level fields are allowed.`,
      );
      continue;
    }

    const type = rawDefinition.type;
    if (isScalarType(type)) {
      continue;
    }

    if (type === "array") {
      const items = rawDefinition.items;
      if (!isPlainObject(items) || !isScalarType(items.type)) {
        issues.push(
          `Field "${fieldKey}" array items must use scalar types only (string|number|integer|boolean).`,
        );
        continue;
      }
      if (hasNestedProperties(items)) {
        issues.push(
          `Field "${fieldKey}" array items must not define nested properties.`,
        );
      }
      continue;
    }

    issues.push(
      `Field "${fieldKey}" type must be one of string|number|integer|boolean or array of those scalars.`,
    );
  }

  return issues;
}
