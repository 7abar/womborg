module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'WombDAO Public API',
    version: '0.2.0',
    description: 'Public, agent-friendly API for the WombDAO ectogenesis research archive. No authentication required for read endpoints.',
    contact: { name: 'WombDAO', url: 'https://github.com/7abar/womborg' },
    license: { name: 'MIT' }
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'datasets', description: 'GEO dataset archive' },
    { name: 'search', description: 'Vector search' },
    { name: 'chat', description: 'Grounded AI agent' },
    { name: 'proposals', description: 'Public ledger' }
  ],
  paths: {
    '/api/datasets': {
      get: {
        tags: ['datasets'],
        summary: 'List all indexed datasets',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'organism', in: 'query', schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'List of datasets', content: { 'application/json': { schema: { $ref: '#/components/schemas/DatasetList' } } } } }
      }
    },
    '/api/datasets/{id}': {
      get: {
        tags: ['datasets'],
        summary: 'Get a single dataset by GEO accession',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'GSE36552' }],
        responses: { '200': { description: 'Dataset record' }, '404': { description: 'Not found' } }
      }
    },
    '/api/search': {
      get: {
        tags: ['search'],
        summary: 'TF-IDF vector search over the dataset archive',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'NANOG blastocyst' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } }
        ],
        responses: { '200': { description: 'Ranked results' } }
      }
    },
    '/api/chat': {
      post: {
        tags: ['chat'],
        summary: 'Grounded chat with the WombDAO research agent',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['messages'],
            properties: {
              messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string', enum: ['user','assistant','system'] }, content: { type: 'string' } } } },
              model: { type: 'string', default: 'meta-llama/llama-3.1-8b-instruct:free' },
              agent_mode: { type: 'boolean', default: false, description: 'Return structured JSON output for agent consumption' }
            }
          } } }
        },
        responses: { '200': { description: 'Reply with citations' } }
      }
    },
    '/api/proposals': {
      get: { tags: ['proposals'], summary: 'List ledger proposals', responses: { '200': { description: 'OK' } } },
      post: {
        tags: ['proposals'],
        summary: 'Submit a new proposal',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title','description'], properties: { title: { type: 'string' }, description: { type: 'string' }, proposer: { type: 'string' } } } } } },
        responses: { '201': { description: 'Created' } }
      }
    },
    '/api/stats': { get: { tags: ['datasets'], summary: 'Platform stats', responses: { '200': { description: 'OK' } } } }
  },
  components: {
    schemas: {
      Dataset: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'GSE36552' },
          title: { type: 'string' },
          organism: { type: 'string' },
          samples: { type: 'integer' },
          type: { type: 'string' },
          year: { type: 'integer' },
          author: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          url: { type: 'string', format: 'uri' }
        }
      },
      DatasetList: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Dataset' } }
        }
      }
    }
  }
};
