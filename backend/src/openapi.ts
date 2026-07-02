// OpenAPI 3.1 document for the AnyRamp backend. Served at /openapi.json and
// rendered by Swagger UI at the root path.

const orderSchema = {
  type: 'object',
  properties: {
    orderId: { type: 'string', example: 'ZKP-1782946317542' },
    amountIdr: { type: 'integer', example: 120000 },
    usdcAmount: { type: 'string', description: 'i128 stroop-precision', example: '100000000' },
    sellerAddress: { type: 'string', example: 'GAW24ZON...KKQC' },
    buyerAddress: { type: 'string', nullable: true },
    qrString: { type: 'string', nullable: true },
    totalPayment: { type: 'integer', nullable: true },
    expiredAt: { type: 'string', nullable: true },
    status: {
      type: 'string',
      enum: ['created', 'paid_detected', 'proving', 'proved', 'fulfilled', 'expired'],
    },
    proof: { type: 'object', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Pakasir order_id',
} as const;

const jsonBody = (schema: object) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const jsonResp = (description: string, schema: object) => ({
  description,
  content: { 'application/json': { schema } },
});

export const openApiDoc = {
  openapi: '3.1.0',
  info: {
    title: 'AnyRamp API',
    version: '1.0.0',
    description:
      'Fiat (IDR) → USDC on-ramp on Stellar with Reclaim zkTLS proofs.\n\n' +
      '**Flow:** `POST /orders` (issue QRIS) → seller `POST /orders/{id}/lock` (lock USDC on-chain) → ' +
      'buyer pays QRIS (`/simulate` in sandbox) → `POST /orders/{id}/prove` (zkTLS proof) → ' +
      '`POST /orders/{id}/settle` (Freighter) or `/settle/auto` (server) → USDC released.\n\n' +
      'Webhook is a hint only; the zkTLS proof over Pakasir `transactiondetail` is the source of truth.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'local' }],
  tags: [
    { name: 'health' },
    { name: 'orders' },
    { name: 'settlement', description: 'On-chain (Soroban) settlement' },
    { name: 'webhook' },
  ],
  components: {
    schemas: {
      Order: orderSchema,
      Error: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['health'], summary: 'Liveness', responses: { 200: jsonResp('ok', { type: 'object' }) } },
    },
    '/health/db': {
      get: { tags: ['health'], summary: 'DB ping', responses: { 200: jsonResp('db up', { type: 'object' }) } },
    },
    '/orders': {
      post: {
        tags: ['orders'],
        summary: 'Create order + issue QRIS',
        requestBody: jsonBody({
          type: 'object',
          required: ['orderId', 'amountIdr', 'usdcAmount', 'sellerAddress'],
          properties: {
            orderId: { type: 'string', example: 'ZKP-1001' },
            amountIdr: { type: 'integer', example: 120000 },
            usdcAmount: { type: 'string', example: '100000000' },
            sellerAddress: { type: 'string', example: 'G...' },
            buyerAddress: { type: 'string' },
          },
        }),
        responses: {
          201: jsonResp('created', { $ref: '#/components/schemas/Order' }),
          400: jsonResp('validation error', { $ref: '#/components/schemas/Error' }),
          409: jsonResp('already exists', { $ref: '#/components/schemas/Error' }),
        },
      },
      get: {
        tags: ['orders'],
        summary: 'List orders',
        responses: { 200: jsonResp('orders', { type: 'array', items: { $ref: '#/components/schemas/Order' } }) },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['orders'],
        summary: 'Get order',
        parameters: [idParam],
        responses: {
          200: jsonResp('order', { $ref: '#/components/schemas/Order' }),
          404: jsonResp('not found', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/orders/{id}/detail': {
      get: {
        tags: ['orders'],
        summary: 'Live Pakasir transactiondetail cross-check',
        parameters: [idParam],
        responses: { 200: jsonResp('transaction', { type: 'object' }) },
      },
    },
    '/orders/{id}/simulate': {
      post: {
        tags: ['orders'],
        summary: 'Simulate sandbox payment (dev)',
        parameters: [idParam],
        responses: { 200: jsonResp('simulated', { type: 'object' }) },
      },
    },
    '/orders/{id}/prove': {
      post: {
        tags: ['settlement'],
        summary: 'Start zkTLS proof (async, ~1-3 min) — poll GET /orders/{id} until proved',
        parameters: [idParam],
        responses: {
          202: jsonResp('proving started', { type: 'object' }),
          404: jsonResp('not found', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/orders/{id}/proof-args': {
      get: {
        tags: ['settlement'],
        summary: 'Contract args (hex) for a proved order',
        parameters: [idParam],
        responses: {
          200: jsonResp('contract args', { type: 'object' }),
          409: jsonResp('no proof yet', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/orders/{id}/lock': {
      post: {
        tags: ['settlement'],
        summary: 'Seller locks USDC on-chain (create_order)',
        parameters: [idParam],
        responses: { 200: jsonResp('tx hash', { type: 'object' }) },
      },
    },
    '/orders/{id}/settle': {
      post: {
        tags: ['settlement'],
        summary: 'Build unsigned fulfill tx for Freighter (trustless)',
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['buyerAddress'],
          properties: { buyerAddress: { type: 'string', example: 'G...' } },
        }),
        responses: {
          200: jsonResp('prepared xdr', { type: 'object' }),
          409: jsonResp('no proof yet', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/orders/{id}/settle/auto': {
      post: {
        tags: ['settlement'],
        summary: 'Server auto-submits fulfill (demo, buyer == submitter)',
        parameters: [idParam],
        responses: { 200: jsonResp('tx hash + order', { type: 'object' }) },
      },
    },
    '/orders/{id}/submit': {
      post: {
        tags: ['settlement'],
        summary: 'Relay a Freighter-signed fulfill tx',
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['signedXdr'],
          properties: { signedXdr: { type: 'string' } },
        }),
        responses: { 200: jsonResp('tx hash + order', { type: 'object' }) },
      },
    },
    '/webhook/pakasir': {
      post: {
        tags: ['webhook'],
        summary: 'Pakasir payment webhook (hint only)',
        requestBody: jsonBody({ type: 'object' }),
        responses: { 200: jsonResp('received', { type: 'object' }) },
      },
    },
  },
} as const;
