"""
Bedrock utilities for knowledge base queries
"""
import boto3
import json
from config import AWS_REGION, KNOWLEDGE_BASE_ID

bedrock_agent_runtime = boto3.client('bedrock-agent-runtime', region_name=AWS_REGION)


def query_knowledge_base(query: str, kb_id: str = None) -> dict:
    """
    Query the Bedrock Knowledge Base
    """
    kb_id = kb_id or KNOWLEDGE_BASE_ID
    
    print(f"[BEDROCK] Querying knowledge base {kb_id}: {query}")
    
    try:
        response = bedrock_agent_runtime.retrieve_and_generate(
            input={'text': query},
            retrieveAndGenerateConfiguration={
                'type': 'KNOWLEDGE_BASE',
                'knowledgeBaseConfiguration': {
                    'knowledgeBaseId': kb_id,
                    'modelArn': f'arn:aws:bedrock:{AWS_REGION}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0'
                }
            }
        )
        
        # Extract answer and citations
        output = response.get('output', {})
        answer = output.get('text', '')
        
        citations = []
        for citation in response.get('citations', []):
            for ref in citation.get('retrievedReferences', []):
                citations.append({
                    'text': ref.get('content', {}).get('text', ''),
                    'location': ref.get('location', {})
                })
        
        print(f"[BEDROCK] Knowledge base response: {answer[:100]}...")
        
        return {
            'answer': answer,
            'citations': citations
        }
    
    except Exception as e:
        print(f"[BEDROCK ERROR] {e}")
        raise
