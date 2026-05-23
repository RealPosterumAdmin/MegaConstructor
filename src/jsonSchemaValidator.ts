export interface JsonSchemaValidationError {
  path: string
  message: string
}

type JsonSchemaNode = {
  $defs?: Record<string, JsonSchemaNode>
  $ref?: string
  additionalProperties?: boolean
  const?: unknown
  enum?: readonly unknown[]
  items?: JsonSchemaNode
  minItems?: number
  minLength?: number
  oneOf?: JsonSchemaNode[]
  properties?: Record<string, JsonSchemaNode>
  required?: readonly string[]
  type?: 'array' | 'boolean' | 'object' | 'string'
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const formatPath = (path: string) => (path ? path : 'root')

const resolveRef = (root: JsonSchemaNode, ref: string): JsonSchemaNode => {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported JSON Schema ref: ${ref}`)
  }

  return ref
    .slice(2)
    .split('/')
    .reduce<JsonSchemaNode>((current, segment) => {
      const next = (current as Record<string, unknown>)[segment]
      if (!next || typeof next !== 'object') {
        throw new Error(`Unable to resolve JSON Schema ref: ${ref}`)
      }
      return next as JsonSchemaNode
    }, root)
}

const validateNode = (
  value: unknown,
  schema: JsonSchemaNode,
  path: string,
  root: JsonSchemaNode,
  errors: JsonSchemaValidationError[],
) => {
  const activeSchema = schema.$ref ? resolveRef(root, schema.$ref) : schema

  if (activeSchema.oneOf) {
    const matches = activeSchema.oneOf.filter((candidate) => {
      const candidateErrors: JsonSchemaValidationError[] = []
      validateNode(value, candidate, path, root, candidateErrors)
      return candidateErrors.length === 0
    })

    if (matches.length !== 1) {
      errors.push({
        path: formatPath(path),
        message: 'Value does not match any allowed schema variant.',
      })
    }
    return
  }

  if (Object.prototype.hasOwnProperty.call(activeSchema, 'const') && value !== activeSchema.const) {
    errors.push({
      path: formatPath(path),
      message: `Expected ${JSON.stringify(activeSchema.const)}.`,
    })
    return
  }

  if (activeSchema.enum && !activeSchema.enum.includes(value)) {
    errors.push({
      path: formatPath(path),
      message: `Expected one of ${activeSchema.enum.map((item) => JSON.stringify(item)).join(', ')}.`,
    })
    return
  }

  switch (activeSchema.type) {
    case 'object': {
      if (!isPlainObject(value)) {
        errors.push({ path: formatPath(path), message: 'Expected an object.' })
        return
      }

      const properties = activeSchema.properties ?? {}
      activeSchema.required?.forEach((key) => {
        if (!(key in value)) {
          errors.push({ path: formatPath(path ? `${path}.${key}` : key), message: 'Missing required field.' })
        }
      })

      Object.entries(properties).forEach(([key, childSchema]) => {
        if (key in value) {
          validateNode(value[key], childSchema, path ? `${path}.${key}` : key, root, errors)
        }
      })

      if (activeSchema.additionalProperties === false) {
        Object.keys(value).forEach((key) => {
          if (!(key in properties)) {
            errors.push({ path: formatPath(path ? `${path}.${key}` : key), message: 'Unknown field is not allowed.' })
          }
        })
      }
      return
    }

    case 'array': {
      if (!Array.isArray(value)) {
        errors.push({ path: formatPath(path), message: 'Expected an array.' })
        return
      }

      if (activeSchema.minItems !== undefined && value.length < activeSchema.minItems) {
        errors.push({ path: formatPath(path), message: `Expected at least ${activeSchema.minItems} items.` })
      }

      if (activeSchema.items) {
        value.forEach((item, index) => {
          validateNode(item, activeSchema.items as JsonSchemaNode, `${path}[${index}]`, root, errors)
        })
      }
      return
    }

    case 'string': {
      if (typeof value !== 'string') {
        errors.push({ path: formatPath(path), message: 'Expected a string.' })
        return
      }

      if (activeSchema.minLength !== undefined && value.length < activeSchema.minLength) {
        errors.push({ path: formatPath(path), message: `Expected at least ${activeSchema.minLength} characters.` })
      }
      return
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        errors.push({ path: formatPath(path), message: 'Expected a boolean.' })
      }
      return
    }

    default:
      return
  }
}

export const validateJsonSchema = (value: unknown, schema: JsonSchemaNode): JsonSchemaValidationError[] => {
  const errors: JsonSchemaValidationError[] = []
  validateNode(value, schema, '', schema, errors)
  return errors
}
