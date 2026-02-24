import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

type Operation =
	| 'createJob'
	| 'getManifest'
	| 'deleteManifest'
	| 'getMetadata'
	| 'getMetadataTree'
	| 'getThumbnail';

export class ApsModelDerivative implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Autodesk APS - Model Derivative',
		name: 'apsModelDerivative',
		group: ['transform'],
		version: 1,
		description: 'Convert and extract metadata from Autodesk file formats',
		defaults: {
			name: 'APS Model Derivative',
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
						name: 'Create Translation Job',
						value: 'createJob',
						action: 'Create translation job',
						description: 'Submit a file for translation to another format',
					},
					{
						name: 'Delete Manifest',
						value: 'deleteManifest',
						action: 'Delete manifest',
						description: 'Delete the manifest and all translated output files',
					},
					{
						name: 'Get Manifest',
						value: 'getManifest',
						action: 'Get manifest',
						description: 'Get the manifest of the specified derivative',
					},
					{
						name: 'Get Metadata',
						value: 'getMetadata',
						action: 'Get metadata',
						description: 'Get metadata about the model',
					},
					{
						name: 'Get Metadata Tree',
						value: 'getMetadataTree',
						action: 'Get metadata tree',
						description: 'Get the object tree for the model',
					},
					{
						name: 'Get Thumbnail',
						value: 'getThumbnail',
						action: 'Get thumbnail',
						description: 'Get a thumbnail preview of the model',
					},
				],
				default: 'createJob',
			},

			// Common parameters
			{
				displayName: 'URN',
				name: 'urn',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getManifest',
							'deleteManifest',
							'getMetadata',
							'getMetadataTree',
							'getThumbnail',
							'createJob',
						],
					},
				},
				description: 'The Base64-encoded URN of the source file',
			},

			// Create Job parameters
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{ name: 'DWG', value: 'dwg' },
					{ name: 'FBX', value: 'fbx' },
					{ name: 'IFC', value: 'ifc' },
					{ name: 'IGES', value: 'iges' },
					{ name: 'OBJ', value: 'obj' },
					{ name: 'STEP', value: 'step' },
					{ name: 'STL', value: 'stl' },
					{ name: 'SVF', value: 'svf' },
					{ name: 'SVF2', value: 'svf2' },
					{ name: 'Thumbnail', value: 'thumbnail' },
				],
				default: 'svf',
				required: true,
				displayOptions: { show: { operation: ['createJob'] } },
				description: 'The desired output format',
			},
			{
				displayName: 'Advanced Output Settings',
				name: 'advancedOutputSettings',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['createJob'] } },
				description: 'Whether to specify advanced output options',
			},
			{
				displayName: 'Views',
				name: 'views',
				type: 'multiOptions',
				options: [
					{ name: '2D', value: '2d' },
					{ name: '3D', value: '3d' },
				],
				default: ['2d', '3d'],
				displayOptions: { show: { operation: ['createJob'], advancedOutputSettings: [true] } },
				description: 'View types to generate',
			},
			{
				displayName: 'Force Regenerate',
				name: 'forceRegenerate',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['createJob'] } },
				description: 'Whether to force regeneration of the translation',
			},

			// Get Manifest parameters
			{
				displayName: 'Accept Encoding',
				name: 'acceptEncoding',
				type: 'options',
				options: [
					{ name: 'None', value: '' },
					{ name: 'Gzip', value: 'gzip' },
				],
				default: '',
				displayOptions: { show: { operation: ['getManifest'] } },
				description: 'Specify gzip to receive gzip-encoded response',
			},

			// Get Metadata Tree parameters
			{
				displayName: 'GUID',
				name: 'guid',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['getMetadataTree'] } },
				description: 'Unique model view ID',
			},
			{
				displayName: 'Force Get Tree',
				name: 'forceGetTree',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['getMetadataTree'] } },
				description: 'Whether to force regeneration of tree data',
			},

			// Get Thumbnail parameters
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 400,
				displayOptions: { show: { operation: ['getThumbnail'] } },
				description: 'Width of thumbnail in pixels',
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: 400,
				displayOptions: { show: { operation: ['getThumbnail'] } },
				description: 'Height of thumbnail in pixels',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const BASE_URL = 'https://developer.api.autodesk.com';

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as Operation;
				const urn = this.getNodeParameter('urn', i) as string;

				let requestOptions: any;

				switch (operation) {
					case 'createJob': {
						const outputFormat = this.getNodeParameter('outputFormat', i) as string;
						const forceRegenerate = this.getNodeParameter('forceRegenerate', i, false) as boolean;
						const advancedOutputSettings = this.getNodeParameter(
							'advancedOutputSettings',
							i,
							false,
						) as boolean;

						const body: any = {
							input: {
								urn,
							},
							output: {
								formats: [
									{
										type: outputFormat,
									},
								],
							},
						};

						if (advancedOutputSettings) {
							const views = this.getNodeParameter('views', i, ['2d', '3d']) as string[];
							body.output.formats[0].views = views;
						}

						requestOptions = {
							method: 'POST',
							url: `${BASE_URL}/modelderivative/v2/designdata/job`,
							body,
							json: true,
							headers: {
								'Content-Type': 'application/json',
							},
						};

						if (forceRegenerate) {
							requestOptions.qs = { force: true };
						}
						break;
					}

					case 'getManifest': {
						const acceptEncoding = this.getNodeParameter('acceptEncoding', i, '') as string;
						requestOptions = {
							method: 'GET',
							url: `${BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`,
							json: true,
						};

						if (acceptEncoding) {
							requestOptions.headers = {
								'Accept-Encoding': acceptEncoding,
							};
						}
						break;
					}

					case 'deleteManifest': {
						requestOptions = {
							method: 'DELETE',
							url: `${BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`,
							json: true,
						};
						break;
					}

					case 'getMetadata': {
						requestOptions = {
							method: 'GET',
							url: `${BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata`,
							json: true,
						};
						break;
					}

					case 'getMetadataTree': {
						const guid = this.getNodeParameter('guid', i) as string;
						const forceGetTree = this.getNodeParameter('forceGetTree', i, false) as boolean;
						requestOptions = {
							method: 'GET',
							url: `${BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata/${encodeURIComponent(guid)}`,
							json: true,
						};

						if (forceGetTree) {
							requestOptions.qs = { forceget: true };
						}
						break;
					}

					case 'getThumbnail': {
						const width = this.getNodeParameter('width', i, 400) as number;
						const height = this.getNodeParameter('height', i, 400) as number;
						requestOptions = {
							method: 'GET',
							url: `${BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/thumbnail`,
							qs: { width, height },
							encoding: null,
							json: false,
							headers: {
								Accept: 'image/png, application/json',
							},
						};
						break;
					}
				}

				const response = await this.helpers.requestWithAuthentication.call(
					this,
					'autodeskPlatformServicesOAuth2Api',
					requestOptions,
				);

				// Handle binary thumbnail response
				if (operation === 'getThumbnail' && response && Buffer.isBuffer(response)) {
					returnData.push({
						json: {
							thumbnail: response.toString('base64'),
							contentType: 'image/png',
						},
						pairedItem: { item: i },
						binary: {
							data: await this.helpers.prepareBinaryData(response, 'thumbnail.png', 'image/png'),
						},
					});
				} else {
					let body = response as any;
					if (typeof body === 'string') {
						try {
							body = JSON.parse(body);
						} catch {
							// keep as-is if not valid JSON
						}
					}
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
