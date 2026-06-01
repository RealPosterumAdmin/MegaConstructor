# MegaConstructor

MegaConstructor — React/Vite editor for architecture JSON files. The application helps model project structure, executable business scenarios, code entities, data contracts, databases, and external APIs in one JSON document.

## What the project does

The editor is built around one architecture document and supports:

- importing a project from JSON;
- strict JSON Schema validation during import;
- editing scenarios as executable logic flows;
- editing folders, files, classes, methods, data structures, databases, and APIs;
- safe deletion of entities with automatic reference cleanup;
- search and filtering in navigation and validation issues;
- exporting the current project JSON;
- exporting the current JSON Schema.

## Main concepts

### Logic view

Logic view is focused on business scenarios:

- each scenario has a trigger, request/response types, and a step tree;
- steps support nested branches and loops;
- the canvas shows used classes, methods, databases, and APIs;
- the inspector lets you edit the selected scenario or step.

### Code view

Code view is focused on project structure:

- folders and files form the source tree;
- files contain classes;
- classes contain methods;
- methods can have their own internal step flow;
- data structures, databases, and APIs are edited from the same workspace.

## Entity model

The project document contains these top-level collections:

- `folders`
- `files`
- `classes`
- `methods`
- `dataStructures`
- `scenarios`
- `databases`
- `apis`

Additional metadata is stored in:

- `schemaVersion`
- `meta.name`
- `meta.description`
- `meta.entryFileName`
- `meta.owner`

## Safe deletion behavior

Deleting entities updates dependent references automatically.

Examples:

- deleting a folder removes nested folders, files, classes, and methods;
- deleting a file removes its classes and methods;
- deleting a class removes its methods and cleans class/method references in steps and dependencies;
- deleting a method clears `call_method` references;
- deleting a data structure clears request/response and type references;
- deleting a database or table clears `save_to_db` references;
- deleting an API or endpoint clears `call_api` references.

This keeps the JSON model consistent and reduces broken references after edits.

## Search and filtering

The editor includes built-in search/filtering:

- sidebar search for scenarios in Logic view;
- sidebar search for folders, files, classes, methods, structures, databases, and APIs in Code view;
- validation issue search by text;
- validation issue filter by severity.

## Validation

Validation happens at two levels.

### 1. JSON Schema validation

Imported files are checked against a stricter schema:

- required sections must exist;
- object shapes must match expected fields;
- unknown fields are rejected for schema-defined objects;
- nested step types are validated explicitly.

### 2. Logical validation

After load and during editing, the app reports model problems such as:

- missing folders/files/classes/methods;
- missing request/response/data references;
- missing database or API references in steps;
- duplicate IDs;
- scenarios without a terminal step;
- empty branches or loop bodies.

## UI structure

The application has four main zones:

1. **Top toolbar** — switch view, create/import/export project data.
2. **Sidebar** — navigate and search entities.
3. **Main canvas** — inspect the selected scenario or code entity.
4. **Inspector** — edit fields and perform add/delete actions.

At the bottom, the validation panel shows all detected issues.

## Project structure

Important files:

- `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/App.tsx` — app shell and state wiring;
- `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/components/editor/*` — editor UI components;
- `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/schema.ts` — schema version, JSON Schema, and empty entity factories;
- `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/validation.ts` — logical validation rules;
- `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/jsonSchemaValidator.ts` — stricter JSON Schema validator;
- `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/projectMutations.ts` — safe deletion and cleanup helpers;
- `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/sampleProject.ts` — bundled sample architecture project.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Validation commands

Use the existing repository validation commands:

```bash
npm run lint
npm run build
```

## Import/export workflow

### Import JSON

1. Click **Import JSON**.
2. Select a project file.
3. The file is parsed and checked against the stricter schema.
4. If validation fails, the app shows an error message.

### Export JSON

- **Export JSON** downloads the current project.
- Export is disabled while critical validation issues exist.

### Export schema

- **Export schema** downloads the current project schema used by the editor.

## Sample project

The bundled sample demonstrates:

- a WordPress plugin blueprint with a physical plugin file layout;
- separation between file structure and logical business scenario flow;
- reusable helper behavior modeled through class methods in `includes`;
- WordPress post publication flow that sends a message to Telegram Bot API;
- plugin settings and payload structures for post and Telegram data.

## Tech stack

- React 19
- TypeScript
- Vite
- ESLint

## Current status

The project is an MVP editor with a stronger import pipeline, safer model maintenance, and a componentized React UI that is easier to extend further.
