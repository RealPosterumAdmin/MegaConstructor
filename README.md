# MegaConstructor

React MVP for editing architecture JSON files.

## Features
- import one project from JSON;
- edit logic scenarios as an executable flow;
- edit folders, files, classes, methods, data structures, databases and APIs;
- describe method internals with conditions, loops and nested steps;
- validate references and export updated JSON;
- export the current JSON schema v1.

## Development
```bash
npm install
npm run dev
```

## Validation
```bash
npm run lint
npm run build
```

## Data model
The app uses `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/schema.ts` for the schema constant and `/tmp/workspace/RealPosterumAdmin/MegaConstructor/src/sampleProject.ts` for the bundled registration/login sample.
