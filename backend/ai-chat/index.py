"""
Business: Proxy requests to external AI model with secure API key handling
Args: event with POST body containing prompt and messages history
Returns: AI model response in JSON format
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any

AI_API_URL = 'https://functions.poehali.dev/7a89db06-7752-4cc5-b58a-9a9235d4033a'
AI_API_KEY = 'madai_nMajoRqgDy5W6VDBlhJLjdLDP210ErVBR8cfBKySgj0'


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        prompt = body_data.get('prompt', '')
        messages = body_data.get('messages', [])
        
        if not prompt:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Prompt is required'}),
                'isBase64Encoded': False
            }
        
        conversation_history = []
        for msg in messages:
            conversation_history.append({
                'role': msg.get('role', 'user'),
                'content': msg.get('content', '')
            })
        
        conversation_history.append({
            'role': 'user',
            'content': prompt
        })
        
        request_payload = json.dumps({
            'messages': conversation_history
        }).encode('utf-8')
        
        print(f'Sending request to {AI_API_URL}')
        print(f'Payload: {request_payload.decode("utf-8")}')
        
        req = urllib.request.Request(
            AI_API_URL,
            data=request_payload,
            headers={
                'Content-Type': 'application/json',
                'X-api-key': AI_API_KEY
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = response.read().decode('utf-8')
            print(f'Response received: {response_data}')
            ai_response = json.loads(response_data)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(ai_response),
            'isBase64Encoded': False
        }
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        print(f'HTTPError {e.code}: {error_body}')
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'AI API error: {e.code}',
                'details': error_body
            }),
            'isBase64Encoded': False
        }
        
    except urllib.error.URLError as e:
        return {
            'statusCode': 503,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Failed to connect to AI service',
                'details': str(e.reason)
            }),
            'isBase64Encoded': False
        }
        
    except json.JSONDecodeError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Invalid JSON in request or response',
                'details': str(e)
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            }),
            'isBase64Encoded': False
        }