const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'disruption-table';
const USE_LOCAL_STORE = (process.env.USE_LOCAL_STORE || 'true').toLowerCase() === 'true';

// ── In-memory store for local development ─────────────────
const memStore = new Map();

function memKey(pk, sk) {
  return `${pk}||${sk}`;
}

// ── DynamoDB client (lazy, only created when needed) ──────
let docClient = null;
function getDdbClient() {
  if (!docClient) {
    const ddbOptions = {};
    if (process.env.DYNAMODB_ENDPOINT) {
      ddbOptions.endpoint = process.env.DYNAMODB_ENDPOINT;
    }
    const client = new DynamoDBClient(ddbOptions);
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

/**
 * Put a raw item into the table
 */
async function putItem(item) {
  if (USE_LOCAL_STORE) {
    memStore.set(memKey(item.pk, item.sk), { ...item });
    return item;
  }
  await getDdbClient().send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
}

/**
 * Get a single item by pk + sk
 */
async function getItem(pk, sk) {
  if (USE_LOCAL_STORE) {
    return memStore.get(memKey(pk, sk)) || null;
  }
  const result = await getDdbClient().send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk } })
  );
  return result.Item || null;
}

/**
 * Query all items under a partition key
 */
async function queryByPk(pk, skPrefix) {
  if (USE_LOCAL_STORE) {
    const results = [];
    for (const [key, item] of memStore) {
      if (item.pk === pk && (!skPrefix || item.sk.startsWith(skPrefix))) {
        results.push(item);
      }
    }
    return results;
  }
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix
      ? 'pk = :pk AND begins_with(sk, :skPrefix)'
      : 'pk = :pk',
    ExpressionAttributeValues: skPrefix
      ? { ':pk': pk, ':skPrefix': skPrefix }
      : { ':pk': pk },
  };
  const result = await getDdbClient().send(new QueryCommand(params));
  return result.Items || [];
}

/**
 * Store a JSON blob as a single DynamoDB item with pk/sk + data
 */
async function upsertJson(pk, sk, json) {
  const item = { pk, sk, ...json, updatedAt: new Date().toISOString() };
  await putItem(item);
  return item;
}

/**
 * Retrieve a JSON item by pk/sk
 */
async function getJson(pk, sk) {
  return getItem(pk, sk);
}

/**
 * Scan for all items whose pk starts with a given prefix (local store only).
 * For DynamoDB, uses a Scan with filter (fine for POC).
 */
async function scanByPkPrefix(pkPrefix) {
  if (USE_LOCAL_STORE) {
    const results = [];
    for (const [key, item] of memStore) {
      if (item.pk.startsWith(pkPrefix)) {
        results.push(item);
      }
    }
    return results;
  }
  // DynamoDB scan with filter (acceptable for POC scale)
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  const result = await getDdbClient().send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(pk, :prefix)',
    ExpressionAttributeValues: { ':prefix': pkPrefix },
  }));
  return result.Items || [];
}

module.exports = { putItem, getItem, queryByPk, upsertJson, getJson, scanByPkPrefix };
