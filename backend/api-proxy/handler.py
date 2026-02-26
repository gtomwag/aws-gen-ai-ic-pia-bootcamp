"""
API Gateway Proxy to AgentCore Runtime
Thin Lambda function that forwards requests to the deployed AgentCore agent
"""
import json
import uuid
import boto3
import os

# AgentCore client
agentcore_client = boto3.client('bedrock-agentcore', region_name='us-east-1')

# Agent ARN (hardcoded for simplicity)
AGENT_ARN = 'arn:aws:bedrock-agentcore:us-east-1:484907484851:runtime/agentcoreCreateManually_Agent-p7W7CaF67Z'


def respond(status_code, body):
    """Build API Gateway response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(body)
    }


def handler(event, context):
    """
    Main Lambda handler - routes requests to AgentCore Runtime
    """
    print(f"Event: {json.dumps(event)}")
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return respond(200, {'message': 'OK'})
    
    # Parse request
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return respond(400, {'error': 'Invalid JSON'})
    
    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')
    
    print(f"Request: {method} {path}")
    print(f"Body: {json.dumps(body)}")
    
    # Route to appropriate handler
    if path in ['/chat', '/chatv2'] and method == 'POST':
        return handle_chat(body)
    elif path in ['/health', '/chatv2/health'] and method == 'GET':
        return respond(200, {'status': 'healthy', 'agent': 'agentcore-runtime'})
    else:
        return respond(404, {'error': f'Not found: {method} {path}'})


def handle_chat(body):
    """
    Handle chat requests by invoking AgentCore Runtime
    """
    try:
        # Extract parameters
        message = body.get('message', '')
        # session_id = body.get('sessionId', str(uuid.uuid4()))
        context = body.get('context', {})
        
        if not message:
            return respond(400, {'error': 'Message is required'})
        
        # Build payload for AgentCore
        payload = {
            'message': message,
            # 'sessionId': session_id,
            'context': context
        }
        
        # print(f"Invoking AgentCore with session: {session_id}")
        
        # Invoke AgentCore Runtime
        response = agentcore_client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_ARN,
            # runtimeSessionId=session_id,
            payload=json.dumps(payload).encode('utf-8'),
            qualifier='DEFAULT'
        )
        
        # Parse response
        content = []
        for chunk in response.get('response', []):
            content.append(chunk.decode('utf-8'))
        
        result = json.loads(''.join(content))
        
        print(f"AgentCore response: {json.dumps(result)}")
        
        # Extract text from response
        response_text = result.get('response', '')
        
        # Handle different response formats
        if isinstance(response_text, dict):
            # Response is a dict with role/content structure
            if 'content' in response_text and isinstance(response_text['content'], list):
                # Extract text from content array
                text_parts = [item.get('text', '') for item in response_text['content'] if 'text' in item]
                response_text = ' '.join(text_parts)
            elif 'text' in response_text:
                response_text = response_text['text']
        
        # Return formatted response matching frontend expectations
        return respond(200, {
            'assistant': response_text,
            # 'sessionId': session_id,
            'timestamp': result.get('timestamp'),
            'source': result.get('source', 'agentcore-runtime'),
            'citations': [],  # TODO: Extract citations if available
            'piiDetected': False  # TODO: Add PII detection
        })
    
    except Exception as e:
        print(f"Error invoking AgentCore: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return respond(500, {
            'error': 'Failed to invoke agent',
            'message': str(e)
        })
