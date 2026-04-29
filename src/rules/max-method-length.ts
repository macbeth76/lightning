/**
 * ESLint rule: max-method-length
 * Enforces maximum method length of 24 lines
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Rule } from 'eslint';

const MAX_METHOD_LENGTH = 24;

function countMethodLines(node: any): number {
  if (!node.body || node.body.type !== 'BlockStatement') {
    return 0;
  }
  return node.body.loc.end.line - node.body.loc.start.line + 1;
}

function getMethodName(node: any): string {
  if (node.id?.name) {
    return node.id.name;
  }
  if (node.parent?.type === 'MethodDefinition' && node.parent.key) {
    const key = node.parent.key;
    if (key.type === 'Identifier') {
      return key.name;
    }
  }
  return '<anonymous>';
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce maximum method length of 24 lines',
      recommended: true,
      url: 'https://github.com/macbeth76/lightning',
    },
    messages: {
      methodTooLong:
        "Method '{{ methodName }}' has {{ lineCount }} lines, exceeds max of {{ maxLines }} lines",
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            default: MAX_METHOD_LENGTH,
          },
        },
      },
    ],
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const maxLines = (context.options[0]?.max ?? MAX_METHOD_LENGTH) as number;

    return {
      FunctionDeclaration(node: any): void {
        const lineCount = countMethodLines(node);
        const methodName = getMethodName(node);

        if (lineCount > maxLines) {
          context.report({
            node,
            messageId: 'methodTooLong',
            data: { methodName, lineCount, maxLines },
          });
        }
      },
      MethodDefinition(node: any): void {
        const method = node.value;
        if (method && method.type === 'FunctionExpression') {
          const lineCount = countMethodLines(method);
          const methodName = getMethodName(method);

          if (lineCount > maxLines) {
            context.report({
              node,
              messageId: 'methodTooLong',
              data: { methodName, lineCount, maxLines },
            });
          }
        }
      },
      ArrowFunctionExpression(node: any): void {
        const lineCount = countMethodLines(node);
        const methodName = getMethodName(node);

        if (lineCount > maxLines && node.body?.type === 'BlockStatement') {
          context.report({
            node,
            messageId: 'methodTooLong',
            data: { methodName, lineCount, maxLines },
          });
        }
      },
    };
  },
};

export default rule;
