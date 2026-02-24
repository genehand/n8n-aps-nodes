import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

type Operation =
	| 'getHubs'
	| 'getProjects'
	| 'getTopFolders'
	| 'getItems'
	| 'getItemVersions'
	| 'listBuckets'
	| 'createBucket'
	| 'getBucketDetails'
	| 'deleteBucket'
	| 'uploadObject'
	| 'downloadObject'
	| 'getObjectDetails'
	| 'deleteObject'
	| 'copyObject';

export class ApsDataManagement implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Autodesk APS - Data Management',
		name: 'apsDataManagement',
		group: ['transform'],
		version: 1,
		description: 'Read data from Autodesk Platform Services Data Management API.',
		defaults: {
			name: 'APS Data Management',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'autodeskPlatformServicesOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://developer.api.autodesk.com',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Copy Object',
						value: 'copyObject',
						action: 'Copy OSS object',
						description: 'Copy an object within OSS',
					},
					{
						name: 'Create Bucket',
						value: 'createBucket',
						action: 'Create OSS bucket',
						description: 'Create a new OSS bucket',
					},
					{
						name: 'Delete Bucket',
						value: 'deleteBucket',
						action: 'Delete OSS bucket',
						description: 'Delete a bucket and all its contents',
					},
					{
						name: 'Delete Object',
						value: 'deleteObject',
						action: 'Delete OSS object',
						description: 'Delete an object from OSS bucket',
					},
					{
						name: 'Download Object',
						value: 'downloadObject',
						action: 'Download file from OSS',
						description: 'Download a file from OSS bucket',
					},
					{
						name: 'Get Bucket Details',
						value: 'getBucketDetails',
						action: 'Get OSS bucket details',
						description: 'Get details of a specific bucket',
					},
					{
						name: 'Get Hubs',
						value: 'getHubs',
						action: 'List hubs available to the user',
						description: 'List hubs available to the user',
					},
					{
						name: 'Get Item Versions',
						value: 'getItemVersions',
						action: 'List versions for an item',
						description: 'List versions for an item',
					},
					{
						name: 'Get Items',
						value: 'getItems',
						action: 'List items for a folder',
						description: 'List items for a folder',
					},
					{
						name: 'Get Object Details',
						value: 'getObjectDetails',
						action: 'Get OSS object details',
						description: 'Get metadata of an object in OSS',
					},
					{
						name: 'Get Projects',
						value: 'getProjects',
						action: 'List projects for a hub',
						description: 'List projects for a hub',
					},
					{
						name: 'Get Top Folders',
						value: 'getTopFolders',
						action: 'List top folders of a project',
						description: 'List top folders of a project',
					},
					{
						name: 'List Buckets',
						value: 'listBuckets',
						action: 'List OSS buckets',
						description: 'List all OSS buckets for the application',
					},
					{
						name: 'Upload Object',
						value: 'uploadObject',
						action: 'Upload file to OSS',
						description: 'Upload a file to OSS bucket',
					},
				],
				default: 'getHubs',
			},

			// Output options
			{
				displayName: 'Simplify Output',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to flatten each JSON:API entity to useful fields (ID, type, href, and all attributes)',
			},
			{
				displayName: 'Split Into Items',
				name: 'splitItems',
				type: 'boolean',
				default: true,
				description: 'Whether to split arrays so each element becomes an individual n8n item',
			},
			{
				displayName: 'Split Into Items',
				name: 'splitItems',
				type: 'boolean',
				default: true,
				description: 'Whether to split arrays so each element becomes an individual n8n item',
			},

			// Common inputs for specific operations
			{
				displayName: 'Hub ID',
				name: 'hubId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['getProjects'] } },
				description: 'ID of the hub (e.g., b.123...)',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['getTopFolders', 'getItems', 'getItemVersions'] } },
				description: 'ID of the project (e.g., b.123... or a GUID).',
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['getItems'] } },
				description: 'ID of the folder (URN-style, e.g., urn:adsk.wipprod:fs.folder:co.xxxx)',
			},
			{
				displayName: 'Item ID',
				name: 'itemId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['getItemVersions'] } },
				description: 'ID of the item (URN-style, e.g., urn:adsk.wipprod:dm.lineage:xxxx)',
			},
			// OSS Bucket parameters
			{
				displayName: 'Bucket Key',
				name: 'bucketKey',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getBucketDetails',
							'deleteBucket',
							'uploadObject',
							'downloadObject',
							'getObjectDetails',
							'deleteObject',
							'copyObject',
						],
					},
				},
				description: 'Key of the OSS bucket',
			},
			{
				displayName: 'New Bucket Key',
				name: 'newBucketKey',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['createBucket'] } },
				description: 'Unique key for the new bucket (must be globally unique)',
			},
			{
				displayName: 'Policy Key',
				name: 'policyKey',
				type: 'options',
				options: [
					{ name: 'Transient', value: 'transient', description: 'Objects deleted after 24 hours' },
					{ name: 'Temporary', value: 'temporary', description: 'Objects deleted after 30 days' },
					{ name: 'Persistent', value: 'persistent', description: 'Objects kept until deleted' },
				],
				default: 'temporary',
				required: true,
				displayOptions: { show: { operation: ['createBucket'] } },
				description: 'Retention policy for the bucket',
			},
			// OSS Object parameters
			{
				displayName: 'Object Name',
				name: 'objectName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'uploadObject',
							'downloadObject',
							'getObjectDetails',
							'deleteObject',
							'copyObject',
						],
					},
				},
				description: 'Name of the object (file name) in the bucket',
			},
			{
				displayName: 'New Object Name',
				name: 'newObjectName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['copyObject'] } },
				description: 'New name for the copied object',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				displayOptions: { show: { operation: ['uploadObject'] } },
				description: 'Content of the file to upload (text content or binary data as base64)',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				default: 'application/octet-stream',
				displayOptions: { show: { operation: ['uploadObject'] } },
				description: 'MIME type of the file content',
			},
			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['uploadObject'] } },
				description: 'Whether the file content is binary data (base64 encoded)',
			},
			{
				displayName: 'Region',
				name: 'region',
				type: 'options',
				options: [
					{ name: 'US', value: 'US' },
					{ name: 'EMEA', value: 'EMEA' },
				],
				default: 'US',
				displayOptions: { show: { operation: ['listBuckets', 'createBucket'] } },
				description: 'Region for bucket operations',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				displayOptions: { show: { operation: ['listBuckets'] } },
				description: 'Max number of results to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const BASE_URL = 'https://developer.api.autodesk.com';

		const simplifyEntity = (entity: any) => {
			const href = entity?.links?.self?.href ?? entity?.links?.href ?? undefined;
			const attributes =
				entity?.attributes && typeof entity.attributes === 'object' ? entity.attributes : {};
			return {
				id: entity?.id,
				type: entity?.type,
				href,
				...attributes,
			} as Record<string, unknown>;
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as Operation;

				let url = '';
				switch (operation) {
					case 'getHubs': {
						url = `${BASE_URL}/project/v1/hubs`;
						break;
					}
					case 'getProjects': {
						const hubId = this.getNodeParameter('hubId', i) as string;
						url = `${BASE_URL}/project/v1/hubs/${encodeURIComponent(hubId)}/projects`;
						break;
					}
					case 'getTopFolders': {
						const projectId = this.getNodeParameter('projectId', i) as string;
						url = `${BASE_URL}/project/v1/projects/${encodeURIComponent(projectId)}/topFolders`;
						break;
					}
					case 'getItems': {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const folderId = this.getNodeParameter('folderId', i) as string;
						url = `${BASE_URL}/data/v1/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderId)}/contents`;
						break;
					}
					case 'getItemVersions': {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const itemId = this.getNodeParameter('itemId', i) as string;
						url = `${BASE_URL}/data/v1/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/versions`;
						break;
					}
				}

				// Prepare request options based on operation
				let requestOptions: any = {
					method: 'GET',
					url,
					json: true,
					headers: {
						Accept: 'application/vnd.api+json, application/json;q=0.9',
					},
				};

				// Handle OSS operations
				if (operation === 'listBuckets') {
					const region = this.getNodeParameter('region', i, 'US') as string;
					const limit = this.getNodeParameter('limit', i, 10) as number;
					requestOptions = {
						...requestOptions,
						url: `${BASE_URL}/oss/v2/buckets`,
						headers: {
							Accept: 'application/vnd.api+json, application/json;q=0.9',
							region,
						},
						qs: { limit },
					};
				} else if (operation === 'createBucket') {
					const newBucketKey = this.getNodeParameter('newBucketKey', i) as string;
					const policyKey = this.getNodeParameter('policyKey', i) as string;
					const region = this.getNodeParameter('region', i, 'US') as string;
					requestOptions = {
						method: 'POST',
						url: `${BASE_URL}/oss/v2/buckets`,
						body: {
							bucketKey: newBucketKey,
							policyKey,
						},
						json: true,
						headers: {
							'Content-Type': 'application/json',
							region,
						},
					};
				} else if (operation === 'getBucketDetails') {
					const bucketKey = this.getNodeParameter('bucketKey', i) as string;
					requestOptions = {
						...requestOptions,
						url: `${BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/details`,
					};
				} else if (operation === 'deleteBucket') {
					const bucketKey = this.getNodeParameter('bucketKey', i) as string;
					requestOptions = {
						...requestOptions,
						method: 'DELETE',
						url: `${BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}`,
					};
				} else if (operation === 'uploadObject') {
					const bucketKey = this.getNodeParameter('bucketKey', i) as string;
					const objectName = this.getNodeParameter('objectName', i) as string;
					const fileContent = this.getNodeParameter('fileContent', i) as string;
					const contentType = this.getNodeParameter(
						'contentType',
						i,
						'application/octet-stream',
					) as string;
					const binaryData = this.getNodeParameter('binaryData', i, false) as boolean;

					requestOptions = {
						method: 'PUT',
						url: `${BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectName)}`,
						body: binaryData ? Buffer.from(fileContent, 'base64') : fileContent,
						headers: {
							'Content-Type': contentType,
						},
						json: false,
					};
				} else if (operation === 'downloadObject') {
					const bucketKey = this.getNodeParameter('bucketKey', i) as string;
					const objectName = this.getNodeParameter('objectName', i) as string;
					requestOptions = {
						...requestOptions,
						url: `${BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectName)}`,
						encoding: null,
						json: false,
					};
				} else if (operation === 'getObjectDetails') {
					const bucketKey = this.getNodeParameter('bucketKey', i) as string;
					const objectName = this.getNodeParameter('objectName', i) as string;
					requestOptions = {
						...requestOptions,
						url: `${BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectName)}/details`,
					};
				} else if (operation === 'deleteObject') {
					const bucketKey = this.getNodeParameter('bucketKey', i) as string;
					const objectName = this.getNodeParameter('objectName', i) as string;
					requestOptions = {
						...requestOptions,
						method: 'DELETE',
						url: `${BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectName)}`,
					};
				} else if (operation === 'copyObject') {
					const bucketKey = this.getNodeParameter('bucketKey', i) as string;
					const objectName = this.getNodeParameter('objectName', i) as string;
					const newObjectName = this.getNodeParameter('newObjectName', i) as string;
					requestOptions = {
						...requestOptions,
						method: 'PUT',
						url: `${BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectName)}/copyTo/${encodeURIComponent(newObjectName)}`,
					};
				}

				console.log(`[APS Debug] Request options: ${JSON.stringify(requestOptions, null, 2)}`);

				const response = await this.helpers.requestWithAuthentication.call(
					this,
					'autodeskPlatformServicesOAuth2Api',
					requestOptions,
				);

				let body = response as any;
				if (typeof body === 'string') {
					try {
						body = JSON.parse(body);
					} catch {
						// keep as-is if not valid JSON
					}
				}
				const simplify = this.getNodeParameter('simplify', i, true) as boolean;
				const splitItems = this.getNodeParameter('splitItems', i, true) as boolean;
				if (Array.isArray(body?.data)) {
					if (splitItems) {
						for (const element of body.data) {
							const json = simplify ? simplifyEntity(element) : element;
							returnData.push({ json, pairedItem: { item: i } });
						}
					} else {
						// Wrap in object to comply with n8n item shape
						if (simplify) {
							const data = (body.data as any[]).map((el) => simplifyEntity(el));
							returnData.push({ json: { data }, pairedItem: { item: i } });
						} else {
							returnData.push({ json: body, pairedItem: { item: i } });
						}
					}
				} else if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
					const target = body.data;
					const json = simplify ? simplifyEntity(target) : target;
					returnData.push({ json, pairedItem: { item: i } });
				} else {
					// Non-JSON:API or unexpected shape; return as-is
					returnData.push({ json: body, pairedItem: { item: i } });
				}
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
