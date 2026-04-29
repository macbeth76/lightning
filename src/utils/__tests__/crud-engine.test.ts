/**
 * CrudEngine tests — create/update/delete with 24-line enforcement
 */

import * as fs from 'fs';
import * as path from 'path';
import { CrudEngine } from '../crud-engine';
import { FileOperationError } from '../../types/errors';

const TMP_DIR = path.join(__dirname, '../../__tests__/fixtures/crud');

beforeAll(() => { fs.mkdirSync(TMP_DIR, { recursive: true }); });
afterAll(() => { fs.rmSync(TMP_DIR, { recursive: true, force: true }); });

/** Write a temp TS file and return its path */
function writeTmp(name: string, content: string): string {
  const p = path.join(TMP_DIR, name);
  fs.writeFileSync(p, content, 'utf-8');
  return p;
}

describe('CrudEngine', () => {
  const engine = new CrudEngine();

  describe('create', () => {
    it('creates a new file on disk', async () => {
      const filePath = path.join(TMP_DIR, 'user.service.ts');
      const result = await engine.create(filePath, { type: 'service', methods: ['findAll'] });
      expect(result.operation).toBe('create');
      expect(result.success).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
    }, 60000);

    it('creates parent directories if missing', async () => {
      const filePath = path.join(TMP_DIR, 'nested/deep/order.repository.ts');
      await engine.create(filePath, { type: 'repository' });
      expect(fs.existsSync(filePath)).toBe(true);
    }, 60000);

    it('reports linesWritten > 0', async () => {
      const filePath = path.join(TMP_DIR, 'auth.middleware.ts');
      const result = await engine.create(filePath, { type: 'middleware' });
      expect(result.linesWritten).toBeGreaterThan(0);
    }, 60000);

    it('tracks attempt count', async () => {
      const filePath = path.join(TMP_DIR, 'product.model.ts');
      const result = await engine.create(filePath, { type: 'model' });
      expect(result.attempts).toBeGreaterThanOrEqual(1);
    }, 60000);
  });

  describe('update', () => {
    it('appends a method to an existing file', async () => {
      const filePath = writeTmp('update-target.ts', `export class UserService {\n  findAll(): string[] { return []; }\n}\n`);
      const before = fs.readFileSync(filePath, 'utf-8').length;
      await engine.update(filePath, { addMethod: 'findById' });
      const after = fs.readFileSync(filePath, 'utf-8').length;
      expect(after).toBeGreaterThan(before);
    }, 60000);

    it('throws FileOperationError if file missing', async () => {
      await expect(
        engine.update(path.join(TMP_DIR, 'nonexistent.ts'), { addMethod: 'foo' })
      ).rejects.toBeInstanceOf(FileOperationError);
    });

    it('result operation is update', async () => {
      const filePath = writeTmp('update-op.ts', `export class Svc {}\n`);
      const result = await engine.update(filePath, { addMethod: 'ping' });
      expect(result.operation).toBe('update');
    }, 60000);
  });

  describe('delete', () => {
    it('removes a named method from a file', () => {
      const src = `export class Svc {\n  foo() {\n    return 1;\n  }\n  bar() {\n    return 2;\n  }\n}\n`;
      const filePath = writeTmp('delete-target.ts', src);
      engine.delete(filePath, { method: 'foo' });
      const result = fs.readFileSync(filePath, 'utf-8');
      expect(result).not.toContain('foo()');
      expect(result).toContain('bar()');
    });

    it('throws FileOperationError if file missing', () => {
      expect(() =>
        engine.delete(path.join(TMP_DIR, 'ghost.ts'), { method: 'foo' })
      ).toThrow(FileOperationError);
    });

    it('throws FileOperationError if method not found', () => {
      const filePath = writeTmp('no-method.ts', `export class Svc { bar() { return 1; } }\n`);
      expect(() =>
        engine.delete(filePath, { method: 'nonexistent' })
      ).toThrow(FileOperationError);
    });

    it('result operation is delete', () => {
      const filePath = writeTmp('delete-op.ts', `export class Svc {\n  toRemove() {\n    return 0;\n  }\n}\n`);
      const result = engine.delete(filePath, { method: 'toRemove' });
      expect(result.operation).toBe('delete');
      expect(result.success).toBe(true);
    });
  });
});
