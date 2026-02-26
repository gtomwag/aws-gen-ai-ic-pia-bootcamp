"""
AgentCore Runtime Handler
Implements inline tools for flight disruption management
"""
import json
import random
import datetime
from lib.bedrock import query_knowledge_base
from lib.comprehend import analyze_sentiment
from lib.translate import translate_text
from lib.passengers import generate_flight_options
from lib.util import generate_pnr
from config import USE_BEDROCK, USE_KNOWLEDGE_BASE, KNOWLEDGE_BASE_ID, USE_COMPREHEND, USE_TRANSLATE


def generate_rebooking_options(passenger_id: str, origin: str, destination: str, tier: str, constraints: list = None) -> dict:
    """
    Generate rebooking flight options for a disrupted passenger
    """
    print(f"[TOOL] generate_rebooking_options called: {passenger_id}, {origin}->{destination}, tier={tier}")
    
    # Generate 4-6 flight options
    num_options = random.randint(4, 6)
    options = generate_flight_options(origin, destination, tier, num_options, constraints or [])
    
    return {
        "success": True,
        "passenger_id": passenger_id,
        "options": options,
        "count": len(options)
    }


def query_policy(query: str) -> dict:
    """
    Query the airline policy knowledge base
    """
    print(f"[TOOL] query_policy called: {query}")
    
    if USE_KNOWLEDGE_BASE and USE_BEDROCK:
        try:
            result = query_knowledge_base(query, KNOWLEDGE_BASE_ID)
            return {
                "success": True,
                "query": query,
                "answer": result.get("answer", ""),
                "citations": result.get("citations", [])
            }
        except Exception as e:
            print(f"[ERROR] Knowledge base query failed: {e}")
            return {
                "success": False,
                "query": query,
                "answer": "I'm having trouble accessing the policy database right now. Please try again or contact an agent.",
                "error": str(e)
            }
    else:
        # Fallback response
        return {
            "success": True,
            "query": query,
            "answer": "Knowledge base is not enabled. Please contact an agent for policy information.",
            "fallback": True
        }


def analyze_passenger_sentiment(text: str) -> dict:
    """
    Analyze sentiment of passenger message
    """
    print(f"[TOOL] analyze_passenger_sentiment called: {text[:50]}...")
    
    if USE_COMPREHEND:
        try:
            result = analyze_sentiment(text)
            return {
                "success": True,
                "sentiment": result.get("sentiment", "NEUTRAL"),
                "scores": result.get("scores", {}),
                "text": text
            }
        except Exception as e:
            print(f"[ERROR] Sentiment analysis failed: {e}")
            return {
                "success": False,
                "sentiment": "NEUTRAL",
                "error": str(e)
            }
    else:
        # Fallback
        return {
            "success": True,
            "sentiment": "NEUTRAL",
            "scores": {"neutral": 1.0},
            "fallback": True
        }


def translate_message(text: str, target_language: str, source_language: str = "auto") -> dict:
    """
    Translate a message
    """
    print(f"[TOOL] translate_message called: {source_language}->{target_language}")
    
    if USE_TRANSLATE:
        try:
            result = translate_text(text, source_language, target_language)
            return {
                "success": True,
                "original": text,
                "translated": result.get("translated_text", text),
                "source_language": result.get("source_language", source_language),
                "target_language": target_language
            }
        except Exception as e:
            print(f"[ERROR] Translation failed: {e}")
            return {
                "success": False,
                "original": text,
                "translated": text,
                "error": str(e)
            }
    else:
        # Fallback - no translation
        return {
            "success": True,
            "original": text,
            "translated": text,
            "fallback": True
        }


def confirm_booking(passenger_id: str, option_id: str) -> dict:
    """
    Confirm a rebooking selection
    """
    print(f"[TOOL] confirm_booking called: {passenger_id}, option={option_id}")
    
    pnr = generate_pnr()
    
    return {
        "success": True,
        "passenger_id": passenger_id,
        "option_id": option_id,
        "pnr": pnr,
        "status": "CONFIRMED",
        "confirmed_at": datetime.datetime.utcnow().isoformat()
    }


def create_escalation(passenger_id: str, reason: str, priority: str = "NORMAL") -> dict:
    """
    Create an escalation ticket
    """
    print(f"[TOOL] create_escalation called: {passenger_id}, priority={priority}")
    
    escalation_id = f"ESC-{random.randint(10000, 99999)}"
    
    return {
        "success": True,
        "escalation_id": escalation_id,
        "passenger_id": passenger_id,
        "reason": reason,
        "priority": priority,
        "status": "PENDING",
        "created_at": datetime.datetime.utcnow().isoformat()
    }


# Tool registry for AgentCore
TOOLS = {
    "generate_rebooking_options": generate_rebooking_options,
    "query_policy": query_policy,
    "analyze_passenger_sentiment": analyze_passenger_sentiment,
    "translate_message": translate_message,
    "confirm_booking": confirm_booking,
    "create_escalation": create_escalation,
}


def handler(event, context):
    """
    Main handler for AgentCore Runtime
    """
    print(f"[HANDLER] Event: {json.dumps(event)}")
    
    # Parse the event
    tool_name = event.get("toolName")
    tool_input = event.get("toolInput", {})
    
    if not tool_name:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "toolName is required"})
        }
    
    # Get the tool function
    tool_func = TOOLS.get(tool_name)
    
    if not tool_func:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": f"Tool not found: {tool_name}"})
        }
    
    # Execute the tool
    try:
        result = tool_func(**tool_input)
        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }
    except Exception as e:
        print(f"[ERROR] Tool execution failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": f"Tool execution failed: {str(e)}"
            })
        }
