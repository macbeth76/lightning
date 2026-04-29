# Lightning Chat - Interactive Code Generation

## Quick Start

The `lightning chat` command lets you generate TypeScript code interactively using template-based generation.

### Basic Usage

```bash
# Start interactive chat
lightning chat

# Or pipe a prompt
echo "lambda handler" | lightning chat
```

### Examples

#### Generate Lambda Handler
```bash
$ echo "lambda" | lightning chat

```typescript
export async function handler(event: any): Promise<any> {
  console.log('Event received:', event);

  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: 'Lambda executed' }),
  };

  return response;
}
```

✅ Code Analysis: PASS
   All functions ≤ 24 lines
   All rules satisfied
```

#### Generate API Endpoint
```bash
$ echo "api" | lightning chat

```typescript
export async function handler(event: any): Promise<any> {
  const { path, method } = event;
  
  if (method === 'GET') {
    return { statusCode: 200, body: JSON.stringify({ data: [] }) };
  }
  
  return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
}
```

✅ Code Analysis: PASS
   All functions ≤ 24 lines
   All rules satisfied
```

#### Generate Generic Function
```bash
$ echo "process" | lightning chat

```typescript
export function process(data: any): any {
  console.log('Processing:', data);
  return { success: true, data };
}
```

✅ Code Analysis: PASS
   All functions ≤ 24 lines
   All rules satisfied
```

### Interactive Mode

Run `lightning chat` without input to enter interactive mode:

```bash
$ lightning chat

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          ⚡ Lightning Chat - Interactive Code Gen ⚡      ║
║                                                            ║
║  Ask Lightning to generate code. It validates as it goes. ║
║  Type 'exit' to quit, 'help' for commands                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

You: lambda handler
⚡ Lightning is thinking...

📝 Generating code from templates...

```typescript
export async function handler(event: any): Promise<any> {
  ...
}
```

✅ Code Analysis: PASS

You: api endpoint
...

You: exit

✅ Goodbye!
```

### Supported Keywords

The chat recognizes these keywords in prompts:

- **lambda**: Generates AWS Lambda handler function
- **api**: Generates API endpoint handler with GET/404
- *(others)*: Falls back to generic function template

All generated code follows Lightning's 24-line rule for methods and functions.

### Features

✅ Instant code generation (no network delays)
✅ Template validation (all functions ≤ 24 lines)
✅ Interactive multi-command sessions
✅ Clean, professional output format

### Command-Line Options

```bash
lightning help      # Show help message
lightning chat      # Start chat mode
```

