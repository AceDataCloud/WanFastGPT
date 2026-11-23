import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { OPERATION, project, render } from './sync-model-catalog.mjs';
const snapshot = JSON.parse(readFileSync(new URL('../contracts/model-catalog.json', import.meta.url)));
function definition(extra = {}) { return { paths: { [OPERATION.path]: { post: { requestBody: { content: { 'application/json': { schema: { required: [], properties: { model: { enum: snapshot.catalog.models }, action: { enum: OPERATION.actions }, media: { items: { properties: { type: { enum: snapshot.catalog.mediaTypes } } } } }, ...extra } } } } } } } }; }
test('renders the public model projection without manual choices', () => {
  expect(project(definition())).toEqual(snapshot.catalog);
  expect(render(snapshot.catalog)).toBe(readFileSync(new URL('../src/model-catalog.ts', import.meta.url), 'utf8'));
});
test('rejects missing model enums and new required inputs', () => {
  expect(() => project(definition({ properties: { model: { enum: [] } } }))).toThrow();
  expect(() => project(definition({ required: ['unsupported_required_input'] }))).toThrow('Required API inputs changed');
});
