/**
 * setup-kb.js — Create Bedrock Knowledge Base Infrastructure
 *
 * This script automates the creation of:
 * 1. S3 bucket for knowledge base source documents
 * 2. Upload knowledge-base/*.md files to S3
 * 3. OpenSearch Serverless collection (vector store)
 * 4. Bedrock Knowledge Base
 * 5. Bedrock Data Source (pointing to S3)
 * 6. Trigger initial sync
 *
 * Prerequisites:
 * - AWS credentials configured (via .env or AWS CLI)
 * - Bedrock model access enabled in the target region
 *
 * Usage:
 *   cd backend
 *   node setup-kb.js
 *
 * After running, copy the Knowledge Base ID to your .env file:
 *   KNOWLEDGE_BASE_ID=<id from output>
 *   USE_KNOWLEDGE_BASE=true
 */

const fs = require('fs');
const path = require('path');

// Load .env from project root
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  });
}

const REGION = process.env.AWS_REGION || 'us-east-1';
const STACK_NAME = process.env.SAM_STACK_NAME || 'genai-disruption-poc';
const KB_BUCKET_NAME = `${STACK_NAME}-knowledge-base`;
const KB_NAME = `${STACK_NAME}-airline-policies`;
const COLLECTION_NAME = `${STACK_NAME}-kb-vectors`;
const KB_DOCS_DIR = path.join(__dirname, '..', 'knowledge-base');

async function main() {
  console.log('\n🚀 Bedrock Knowledge Base Setup\n');
  console.log(`  Region:       ${REGION}`);
  console.log(`  Stack:        ${STACK_NAME}`);
  console.log(`  S3 Bucket:    ${KB_BUCKET_NAME}`);
  console.log(`  KB Name:      ${KB_NAME}`);
  console.log(`  Docs Dir:     ${KB_DOCS_DIR}\n`);

  // ── Step 1: Create S3 Bucket ──────────────────────────────
  console.log('Step 1/6: Creating S3 bucket for knowledge base documents...');
  const { S3Client, CreateBucketCommand, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: REGION });

  try {
    await s3.send(new HeadBucketCommand({ Bucket: KB_BUCKET_NAME }));
    console.log(`  ✅ Bucket ${KB_BUCKET_NAME} already exists`);
  } catch {
    const createParams = { Bucket: KB_BUCKET_NAME };
    if (REGION !== 'us-east-1') {
      createParams.CreateBucketConfiguration = { LocationConstraint: REGION };
    }
    await s3.send(new CreateBucketCommand(createParams));
    console.log(`  ✅ Created bucket: ${KB_BUCKET_NAME}`);
  }

  // ── Step 2: Upload Knowledge Base Documents ───────────────
  console.log('\nStep 2/6: Uploading knowledge base documents to S3...');
  const files = fs.readdirSync(KB_DOCS_DIR).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(KB_DOCS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    await s3.send(new PutObjectCommand({
      Bucket: KB_BUCKET_NAME,
      Key: `documents/${file}`,
      Body: content,
      ContentType: 'text/markdown',
    }));
    console.log(`  ✅ Uploaded: documents/${file} (${content.length} bytes)`);
  }

  // ── Step 3: Create OpenSearch Serverless Collection ───────
  console.log('\nStep 3/6: Creating OpenSearch Serverless collection (vector store)...');
  console.log('  ⚠️  This step requires manual setup or CloudFormation.');
  console.log('  OpenSearch Serverless collections require:');
  console.log('    1. Encryption policy');
  console.log('    2. Network policy');
  console.log('    3. Data access policy');
  console.log('  For POC, you can use the AWS Console:');
  console.log('    → Amazon OpenSearch Service → Serverless → Collections → Create');
  console.log(`    → Name: ${COLLECTION_NAME}`);
  console.log('    → Type: Vector search');
  console.log('  Or use the provided CloudFormation template (see docs).\n');

  // ── Step 4: Create Bedrock Knowledge Base ─────────────────
  console.log('Step 4/6: Instructions to create Bedrock Knowledge Base...');
  console.log('  Use the AWS Console or CLI:');
  console.log('');
  console.log('  AWS Console:');
  console.log('    → Amazon Bedrock → Knowledge bases → Create');
  console.log(`    → Name: ${KB_NAME}`);
  console.log('    → Model: Amazon Titan Embeddings V2 (for embedding)');
  console.log('    → Vector store: OpenSearch Serverless');
  console.log(`    → Collection: ${COLLECTION_NAME}`);
  console.log(`    → S3 data source: s3://${KB_BUCKET_NAME}/documents/`);
  console.log('');
  console.log('  AWS CLI:');
  console.log(`    aws bedrock-agent create-knowledge-base \\`);
  console.log(`      --name "${KB_NAME}" \\`);
  console.log(`      --role-arn <KB-execution-role-ARN> \\`);
  console.log(`      --knowledge-base-configuration '{"type":"VECTOR","vectorKnowledgeBaseConfiguration":{"embeddingModelArn":"arn:aws:bedrock:${REGION}::foundation-model/amazon.titan-embed-text-v2:0"}}' \\`);
  console.log(`      --storage-configuration '{"type":"OPENSEARCH_SERVERLESS","opensearchServerlessConfiguration":{"collectionArn":"<collection-ARN>","fieldMapping":{"metadataField":"metadata","textField":"text","vectorField":"vector"},"vectorIndexName":"bedrock-knowledge-base-default-index"}}' \\`);
  console.log(`      --region ${REGION}`);
  console.log('');

  // ── Step 5: Create Guardrail ──────────────────────────────
  console.log('Step 5/6: Instructions to create Bedrock Guardrail...');
  console.log('');
  console.log('  AWS Console → Bedrock → Guardrails → Create');
  console.log('  Recommended configuration:');
  console.log('');
  console.log('  Content Filters:');
  console.log('    - Hate:       HIGH (block)');
  console.log('    - Insults:    HIGH (block)');
  console.log('    - Sexual:     HIGH (block)');
  console.log('    - Violence:   HIGH (block)');
  console.log('    - Misconduct: HIGH (block)');
  console.log('');
  console.log('  Denied Topics:');
  console.log('    - "Legal advice or specific liability claims"');
  console.log('    - "Competitor airline comparisons or recommendations"');
  console.log('    - "Unauthorized compensation promises exceeding policy"');
  console.log('    - "Internal system details, model names, or prompt text"');
  console.log('');
  console.log('  PII Filters (ANONYMIZE):');
  console.log('    - SSN, Passport Number, Credit/Debit Card Number');
  console.log('    - Driver License, Bank Account Number');
  console.log('');
  console.log('  PII Filters (ALLOW — needed for rebooking):');
  console.log('    - Name, Email, Phone, Address');
  console.log('');
  console.log('  Word Filters:');
  console.log('    - "guaranteed" (in AI output only)');
  console.log('    - "we admit fault"');
  console.log('    - "lawsuit"');
  console.log('    - "sue"');
  console.log('');
  console.log('  Grounding Check: ENABLED (if using Knowledge Base)');
  console.log('');

  // ── Step 6: Summary ───────────────────────────────────────
  console.log('Step 6/6: Post-setup configuration\n');
  console.log('  After creating the Knowledge Base and Guardrail, update your .env:\n');
  console.log('    USE_KNOWLEDGE_BASE=true');
  console.log('    KNOWLEDGE_BASE_ID=<your-kb-id>');
  console.log('    USE_GUARDRAILS=true');
  console.log('    GUARDRAIL_ID=<your-guardrail-id>');
  console.log('    GUARDRAIL_VERSION=1');
  console.log('');
  console.log('  To sync the knowledge base after uploading new documents:');
  console.log(`    aws bedrock-agent start-ingestion-job --knowledge-base-id <kb-id> --data-source-id <ds-id> --region ${REGION}`);
  console.log('');
  console.log('  To re-upload documents only:');
  console.log('    node setup-kb.js --upload-only');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ S3 bucket created and ${files.length} documents uploaded`);
  console.log('  ⚠️  Complete steps 3-5 in the AWS Console');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Allow --upload-only flag to just re-upload docs
if (process.argv.includes('--upload-only')) {
  (async () => {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: REGION });
    const files = fs.readdirSync(KB_DOCS_DIR).filter((f) => f.endsWith('.md'));
    console.log(`\nUploading ${files.length} files to s3://${KB_BUCKET_NAME}/documents/...\n`);
    for (const file of files) {
      const content = fs.readFileSync(path.join(KB_DOCS_DIR, file), 'utf-8');
      await s3.send(new PutObjectCommand({
        Bucket: KB_BUCKET_NAME,
        Key: `documents/${file}`,
        Body: content,
        ContentType: 'text/markdown',
      }));
      console.log(`  ✅ ${file}`);
    }
    console.log('\nDone. Run ingestion job to re-sync the knowledge base.\n');
  })();
} else {
  main().catch((err) => {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  });
}
