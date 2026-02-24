# AGENTS.md - n8n-nodes-aps

Guidelines for agentic coding agents working on this n8n community node package for Autodesk Platform Services (APS).

## Build & Development Commands

```bash
# Build (clean, compile TypeScript, copy icons)
npm run build

# Development - watch mode
npm run dev

# Format code with Prettier
npm run format

# Lint
npm run lint

# Lint with auto-fix
npm run lintfix

# Pre-publish check
npm run prepublishOnly
```

**Note:** No test framework is currently configured in this project.

## Project Structure

```
nodes/           - n8n node implementations (*.node.ts)
credentials/     - credential implementations (*.credentials.ts)
dist/            - Compiled output (not committed)
gulpfile.js      - Icon copy build step
```

## Code Style Guidelines

### Formatting (Prettier)

- **Indent:** Tabs (width 2)
- **Quotes:** Single quotes
- **Semicolons:** Required
- **Trailing commas:** All
- **Print width:** 100
- **End of line:** LF

### TypeScript

- **Target:** ES2019
- **Strict mode:** Enabled
- **Module:** CommonJS
- Use `type` keyword for type imports when possible
- Explicit types on function parameters and returns
- Use `any` sparingly; prefer `unknown` with type guards

### Naming Conventions

- **Files:** PascalCase for classes (e.g., `ApsDataManagement.node.ts`)
- **Classes:** PascalCase (e.g., `ApsDataManagement`)
- **Types:** PascalCase (e.g., `Operation`)
- **Variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE for true constants

### Imports

```typescript
// Preferred: type imports
import type { IExecuteFunctions, INodeType } from 'n8n-workflow';

// Regular imports
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
```

### n8n Node Patterns

#### Node Class Structure

```typescript
export class MyNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Human Readable Name',
		name: 'myNode', // camelCase
		group: ['transform'],
		version: 1,
		description: 'What this node does.',
		defaults: { name: 'My Node' },
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [{ name: 'credentialName', required: true }],
		requestDefaults: { baseURL: 'https://api.example.com' },
		properties: [
			/* parameters */
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// Operation logic
				const response = await this.helpers.requestWithAuthentication.call(this, 'credentialName', {
					method: 'GET',
					url,
					json: true,
				});

				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: i });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
```

#### Credential Class Structure

```typescript
export class MyCredential implements ICredentialType {
	name = 'myCredential';
	displayName = 'My Credential';
	documentationUrl = 'https://docs.example.com';
	extends = ['oAuth2Api'];

	properties: INodeProperties[] = [
		{ displayName: 'Auth URL', name: 'authUrl', type: 'hidden', default: 'https://...' },
	];

	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.example.com', url: '/test' },
	};
}
```

### Error Handling

- Always wrap operations in try/catch within the execute loop
- Use `NodeOperationError` for n8n-specific errors
- Support `this.continueOnFail()` pattern
- Include `itemIndex` in errors when possible

### Parameter Guidelines

- Include `description` for all visible parameters
- End descriptions with a period
- Use `noDataExpression: true` for operation/resource fields
- Group related parameters logically
- Use `displayOptions.show` to conditionally show fields

## ESLint Rules

## Implemented Operations

The node currently implements two main APS API groups:

### Data Management API (Project/Folder operations)

- `getHubs` - List all hubs available to the user
- `getProjects` - List projects within a hub
- `getTopFolders` - List top-level folders in a project
- `getItems` - List items within a folder
- `getItemVersions` - List versions of an item

### OSS (Object Storage Service) API

Bucket operations:

- `listBuckets` - List all buckets with region/limit filters
- `createBucket` - Create bucket with policy (transient/temporary/persistent)
- `getBucketDetails` - Get bucket metadata
- `deleteBucket` - Delete bucket and all contents

Object operations:

- `uploadObject` - Upload files (text or base64 binary)
- `downloadObject` - Download file content as binary
- `getObjectDetails` - Get object metadata
- `deleteObject` - Delete an object
- `copyObject` - Copy object within same bucket

### Model Derivative API

Translation operations:

- `createJob` - Submit a file for translation to another format (SVF, SVF2, DWG, FBX, IFC, IGES, OBJ, STEP, STL, Thumbnail)
- `getManifest` - Get the manifest and status of a translation job
- `deleteManifest` - Delete the manifest and all translated output files

Metadata operations:

- `getMetadata` - Get metadata about the model
- `getMetadataTree` - Get the object tree hierarchy for the model

Thumbnail operations:

- `getThumbnail` - Get a thumbnail preview image of the model

## ESLint Rules

This project uses `eslint-plugin-n8n-nodes-base` with strict rules:

- Credential files: `plugin:n8n-nodes-base/credentials`
- Node files: `plugin:n8n-nodes-base/nodes`
- Package.json: `plugin:n8n-nodes-base/community`

Key enforced rules:

- Correct naming conventions for files and classes
- Proper parameter descriptions and display names
- Required fields must have descriptions
- Boolean descriptions should start with "Whether"
- Avoid duplicate option names/values

## Adding New Operations

1. Add operation value to the `Operation` type union
2. Add option to the `operation` parameter's `options` array
3. Add required parameter fields with `displayOptions.show.operation`
4. Implement case in the `execute` method's switch statement
5. Run `npm run lint` to verify compliance

## API Integration Patterns

- Use `this.helpers.requestWithAuthentication.call(this, 'credentialName', options)`
- Base URLs in `requestDefaults` when consistent
- Use `encodeURIComponent()` for URL path parameters
- Set appropriate Accept headers for JSON:API responses
