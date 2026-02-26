"""
Configuration for AgentCore agent
HARDCODED values since environment variables weren't loading properly
"""

# Bedrock configuration
USE_BEDROCK = True
BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0'
BEDROCK_REGION = 'us-east-1'

# Knowledge Base configuration
USE_KNOWLEDGE_BASE = True
KNOWLEDGE_BASE_ID = 'QHCE1VIKMX'

# Comprehend configuration
USE_COMPREHEND = True

# Translate configuration
USE_TRANSLATE = False

# Region
AWS_REGION = 'us-east-1'

print(f"[CONFIG] Loaded configuration:")
print(f"  USE_BEDROCK: {USE_BEDROCK}")
print(f"  USE_KNOWLEDGE_BASE: {USE_KNOWLEDGE_BASE}")
print(f"  KNOWLEDGE_BASE_ID: {KNOWLEDGE_BASE_ID}")
print(f"  USE_COMPREHEND: {USE_COMPREHEND}")
print(f"  USE_TRANSLATE: {USE_TRANSLATE}")
print(f"  AWS_REGION: {AWS_REGION}")
