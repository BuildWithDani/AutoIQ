"""
AI Service for AutoIQ diagnostics using OpenRouter.
"""
import json
import logging
import os
from typing import Optional
import httpx
from models import AIExplainRequest, AIExplainResponse, LikelyCause
from config import (
    get_ai_provider,
    get_ai_model,
    get_openrouter_api_key,
    get_openrouter_base_url,
    is_ai_configured,
)

logger = logging.getLogger(__name__)


def build_system_prompt() -> str:
    """Build the system prompt for the AI."""
    return """You are AutoIQ, an AI car diagnostics assistant.

You explain OBD2 DTC codes, assess severity (1-10), determine if it's safe to drive, identify likely causes with probabilities, and provide rough repair cost ranges.

You speak clearly and simply for normal drivers, not mechanics. Use plain language that anyone can understand.

You NEVER give exact prices, only reasonable ranges based on typical repair costs.

You MUST respond with valid JSON ONLY in the following schema:
{
  "severity": <integer 1-10>,
  "safe_to_drive": <boolean>,
  "safe_to_drive_explanation": "<short explanation string>",
  "likely_causes": [
    {
      "label": "<cause name>",
      "probability": <float 0.0-1.0>,
      "description": "<brief description>"
    }
  ],
  "estimated_cost_range": {
    "low": <number>,
    "high": <number>,
    "currency": "USD"
  },
  "summary": "<friendly explanation in normal language>",
  "recommended_actions": [
    "<step 1>",
    "<step 2>",
    ...
  ]
}

Respond ONLY with the JSON object, no other text."""


def build_user_prompt(request: AIExplainRequest, plan: str) -> str:
    """Build the user prompt with vehicle context."""
    parts = []
    
    # DTC Codes
    codes = request.dtc_codes or request.codes
    if codes:
        parts.append("Diagnostic Trouble Codes (DTCs):")
        for code in codes:
            desc = ""
            if request.dtc_descriptions and code in request.dtc_descriptions:
                desc = f" - {request.dtc_descriptions[code]}"
            elif request.vehicle and isinstance(request.vehicle, dict) and "codes" in request.vehicle:
                # Fallback to old format
                pass
            parts.append(f"  - {code}{desc}")
    
    # Vehicle Info
    vehicle_info = []
    if request.vehicle_vin:
        vehicle_info.append(f"VIN: {request.vehicle_vin}")
    if request.vehicle_make:
        vehicle_info.append(f"Make: {request.vehicle_make}")
    if request.vehicle_model:
        vehicle_info.append(f"Model: {request.vehicle_model}")
    if request.vehicle_year:
        vehicle_info.append(f"Year: {request.vehicle_year}")
    
    # Fallback to old vehicle dict format
    if not vehicle_info and request.vehicle and isinstance(request.vehicle, dict):
        if request.vehicle.get("vin"):
            vehicle_info.append(f"VIN: {request.vehicle['vin']}")
        if request.vehicle.get("make"):
            vehicle_info.append(f"Make: {request.vehicle['make']}")
        if request.vehicle.get("model"):
            vehicle_info.append(f"Model: {request.vehicle['model']}")
        if request.vehicle.get("year"):
            vehicle_info.append(f"Year: {request.vehicle['year']}")
    
    if vehicle_info:
        parts.append("\nVehicle Information:")
        parts.extend(f"  - {info}" for info in vehicle_info)
    
    # Live Data
    live_data = request.live_data_snapshot
    if live_data and isinstance(live_data, dict):
        live_parts = []
        if live_data.get("rpm") and live_data["rpm"] != "N/A":
            live_parts.append(f"RPM: {live_data['rpm']}")
        if live_data.get("speed") and live_data["speed"] != "N/A":
            live_parts.append(f"Speed: {live_data['speed']} mph")
        if live_data.get("coolant_temp") and live_data["coolant_temp"] != "N/A":
            live_parts.append(f"Coolant Temp: {live_data['coolant_temp']}°F")
        if live_data.get("intake_temp") and live_data["intake_temp"] != "N/A":
            live_parts.append(f"Intake Temp: {live_data['intake_temp']}°F")
        if live_data.get("throttle_pos") and live_data["throttle_pos"] != "N/A":
            live_parts.append(f"Throttle Position: {live_data['throttle_pos']}%")
        
        if live_parts:
            parts.append("\nCurrent Live Data:")
            parts.extend(f"  - {data}" for data in live_parts)
    
    # Plan context
    parts.append(f"\nPlan: {plan.upper()}")
    
    return "\n".join(parts)


async def generate_ai_diagnostic(request: AIExplainRequest, plan: str) -> AIExplainResponse:
    """
    Generate AI diagnostic using OpenRouter.
    
    Args:
        request: The diagnostic request with DTC codes and vehicle info
        plan: Current plan (free, plus, pro_plus)
    
    Returns:
        AIExplainResponse with diagnostic analysis
    
    Raises:
        ValueError: If AI is not configured or request is invalid
        httpx.HTTPError: If API call fails
    """
    # AI must be configured - no mock responses
    if not is_ai_configured():
        raise ValueError("AI diagnostics are not configured. Please set OPENROUTER_API_KEY in environment.")
    
    provider = get_ai_provider()
    if provider != "openrouter":
        raise ValueError(f"Unsupported AI provider: {provider}")
    
    api_key = get_openrouter_api_key()
    base_url = get_openrouter_base_url()
    model = get_ai_model()
    
    if not api_key or not model:
        raise ValueError("OpenRouter API key or model not configured")
    
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(request, plan)
    
    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://buildwithdani.com",
        "X-Title": "AutoIQ",
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    
    logger.info(f"Calling OpenRouter API with model: {model}")
    logger.debug(f"User prompt: {user_prompt[:200]}...")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Extract content from OpenAI-style response
            if "choices" not in data or len(data["choices"]) == 0:
                raise ValueError("Invalid response format from OpenRouter API")
            
            content = data["choices"][0]["message"]["content"]
            logger.debug(f"Raw AI response: {content[:500]}...")
            
            # Parse JSON from response
            # Try to extract JSON if wrapped in markdown code blocks
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                content = content[start:end].strip()
            
            # Parse JSON
            try:
                ai_data = json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                logger.error(f"Full response: {content}")
                raise ValueError(f"AI returned invalid JSON: {str(e)}")
            
            # Validate and construct response
            severity = int(ai_data.get("severity", 5))
            safe_to_drive = bool(ai_data.get("safe_to_drive", False))
            safe_to_drive_reason = ai_data.get("safe_to_drive_explanation") or ai_data.get("safe_to_drive_reason") or ""
            summary = ai_data.get("summary", "No summary provided.")
            
            # Parse likely causes
            likely_causes = []
            for cause in ai_data.get("likely_causes", []):
                likely_causes.append(LikelyCause(
                    label=cause.get("label", "Unknown"),
                    probability=float(cause.get("probability", 0.0)),
                    description=cause.get("description", ""),
                ))
            
            # Parse cost range
            cost_range = ai_data.get("estimated_cost_range", {})
            estimated_cost_range = {
                "low": float(cost_range.get("low", 0)),
                "high": float(cost_range.get("high", 0)),
                "currency": cost_range.get("currency", "USD"),
            }
            
            # Parse recommended actions
            recommended_actions = ai_data.get("recommended_actions", [])
            if not isinstance(recommended_actions, list):
                recommended_actions = []
            
            return AIExplainResponse(
                severity=severity,
                safe_to_drive=safe_to_drive,
                safe_to_drive_reason=safe_to_drive_reason,
                summary=summary,
                likely_causes=likely_causes,
                estimated_cost_range=estimated_cost_range,
                recommended_actions=recommended_actions,
                raw_model_output=None,  # Never include raw output in production
            )
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP error calling OpenRouter: {e}")
        raise ValueError(f"Failed to call AI service: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in AI service: {e}")
        raise ValueError(f"AI service error: {str(e)}")

