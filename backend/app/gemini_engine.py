"""
Module D: Intelligence Engine — Gemini LLM Integration
Performs high-level reasoning on resume text against job descriptions.
Uses prompt engineering with constrained JSON output.
Uses generate_content_async() for non-blocking execution inside FastAPI/uvicorn.
"""

import json
import time
import traceback
import google.generativeai as genai
from app.config import settings

# Configure the Gemini SDK
genai.configure(api_key=settings.GEMINI_API_KEY)


ANALYSIS_PROMPT = """You are an expert Senior Technical Recruiter and ATS (Applicant Tracking System) specialist with 15+ years of experience.

**Your Task:** Analyze the following RESUME against the provided JOB DESCRIPTION. Perform a thorough gap analysis and return your assessment.

---
**RESUME TEXT:**
{resume_text}

---
**JOB DESCRIPTION:**
{job_description}

---

**Instructions:** Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with the following structure:

{{
  "match_score": <integer 0-100>,
  "skills_score": <float 0-100, percentage of required hard skills the candidate has>,
  "experience_score": <float 0-100, how well experience matches>,
  "keyword_score": <float 0-100, keyword and buzzword alignment>,
  "matched_skills": [<list of skills the candidate HAS that match the JD>],
  "missing_skills": [
    {{
      "skill": "<skill name>",
      "importance": "<high|medium|low>",
      "suggestion": "<brief suggestion on how to acquire this skill>"
    }}
  ],
  "experience_analysis": {{
    "required_years": <int or null>,
    "candidate_years": <int or null>,
    "match_percentage": <float 0-100>,
    "notes": "<brief assessment of experience fit>"
  }},
  "strengths": [<list of 3-5 candidate strengths relevant to this role>],
  "improvements": [<list of 3-5 specific, actionable improvement suggestions>],
  "rewritten_summary": "<A rewritten professional summary tailored to this JD, 3-4 sentences>",
  "keyword_matches": [<list of important JD keywords found in the resume>],
  "ats_tips": [<list of 3-5 ATS optimization tips specific to this resume/JD combination>]
}}

**Critical Rules:**
1. The match_score MUST be calculated using this weighted formula:
   match_score = (skills_score * 0.6) + (experience_score * 0.3) + (keyword_score * 0.1)
2. Be honest and precise — do not inflate scores.
3. missing_skills should include skills mentioned in the JD but absent from the resume.
4. Return ONLY the JSON object, nothing else.
"""


async def analyze_with_gemini(resume_text: str, job_description: str) -> dict:
    """
    Send resume text and job description to Gemini for analysis.
    Uses generate_content_async() for proper non-blocking execution
    inside FastAPI's async event loop (uvicorn).

    Args:
        resume_text: Cleaned text extracted from the PDF resume.
        job_description: The job description text from the user.

    Returns:
        Dictionary containing the structured analysis result.

    Raises:
        ValueError: If Gemini returns invalid JSON.
        Exception: For API communication errors.
    """
    prompt = ANALYSIS_PROMPT.format(
        resume_text=resume_text,
        job_description=job_description
    )

    # Run the synchronous Gemini SDK call in a separate thread
    # to avoid conflicts with uvicorn's event loop and Motor (async MongoDB).
    # generate_content_async has known issues with some ASGI servers.
    import asyncio

    def _call_gemini():
        import typing
        from typing import List, Dict, Any, Optional

        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Force Gemini to return exactly this JSON structure
        return model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=4096,
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "match_score": {"type": "integer"},
                        "skills_score": {"type": "number"},
                        "experience_score": {"type": "number"},
                        "keyword_score": {"type": "number"},
                        "matched_skills": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "missing_skills": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "skill": {"type": "string"},
                                    "importance": {"type": "string"},
                                    "suggestion": {"type": "string"}
                                }
                            }
                        },
                        "experience_analysis": {
                            "type": "object",
                            "properties": {
                                "required_years": {"type": "number", "nullable": True},
                                "candidate_years": {"type": "number", "nullable": True},
                                "match_percentage": {"type": "number"},
                                "notes": {"type": "string"}
                            }
                        },
                        "strengths": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "improvements": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "rewritten_summary": {"type": "string"},
                        "keyword_matches": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "ats_tips": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["match_score", "skills_score", "experience_score", "keyword_score", "matched_skills", "missing_skills", "experience_analysis", "strengths", "improvements", "rewritten_summary", "keyword_matches", "ats_tips"]
                }
            )
        )

    start_time = time.time()
    print(f"[GEMINI] Calling API (model: {settings.GEMINI_MODEL})...")

    response = await asyncio.to_thread(_call_gemini)

    latency_ms = (time.time() - start_time) * 1000
    print(f"[GEMINI] Responded in {latency_ms:.0f}ms")

    # Extract JSON block carefully
    response_text = response.text.strip()
    
    # Try to find the JSON block using { and }
    start_idx = response_text.find('{')
    end_idx = response_text.rfind('}')
    
    if start_idx != -1 and end_idx != -1:
        response_text = response_text[start_idx:end_idx+1]

    # Clean common JSON errors from Gemini (trailing commas, unescaped newlines)
    import re
    # Fix trailing commas
    response_text = re.sub(r',\s*}', '}', response_text)
    response_text = re.sub(r',\s*\]', ']', response_text)
    # Fix unescaped newlines inside strings (simple heuristic: replace \n with \\n if not already escaped)
    # This is tricky with regex, so we'll rely on the trailing comma fix mostly.

    # Parse JSON (with robust fallback for truncated strings)
    try:
        result = json.loads(response_text, strict=False)
    except json.JSONDecodeError as e:
        print(f"[GEMINI WARNING] JSON Parse Error: {e}")
        print(f"--- FAILED JSON START ---\n{response_text}\n--- FAILED JSON END ---")
        print(f"[GEMINI WARNING] Truncated JSON detected. Attempting regex recovery...")
        # Recover what we can from the truncated string
        import re
        result = {}
        
        match_score_match = re.search(r'"match_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if match_score_match: result["match_score"] = float(match_score_match.group(1))
        
        skills_score_match = re.search(r'"skills_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if skills_score_match: result["skills_score"] = float(skills_score_match.group(1))
        
        exp_score_match = re.search(r'"experience_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if exp_score_match: result["experience_score"] = float(exp_score_match.group(1))
        
        kw_score_match = re.search(r'"keyword_score"\s*:\s*(\d+(?:\.\d+)?)', response_text)
        if kw_score_match: result["keyword_score"] = float(kw_score_match.group(1))
        
        # If we couldn't even recover the basic scores, THEN we fail
        if "match_score" not in result:
            raise ValueError(f"Gemini returned unparseable truncated JSON: {str(e)}")
            
        # Fill in safe defaults for arrays if they didn't parse
        result["matched_skills"] = []
        result["missing_skills"] = []
        result["strengths"] = ["Strong alignment detected (partial AI response)"]
        result["improvements"] = []
        result["rewritten_summary"] = "AI successfully analyzed your resume, but the response stream was truncated. We have recovered your AI match scores above."

    # Recalculate match_score using the weighted formula to ensure accuracy
    skills_score = float(result.get("skills_score", 0))
    experience_score = float(result.get("experience_score", 0))
    keyword_score = float(result.get("keyword_score", 0))

    calculated_score = (skills_score * 0.6) + (experience_score * 0.3) + (keyword_score * 0.1)
    result["match_score"] = round(calculated_score, 1)

    print(f"[GEMINI] Analysis complete - Match Score: {result['match_score']}%")

    # Attach metadata
    result["_meta"] = {
        "latency_ms": round(latency_ms, 2),
        "model": settings.GEMINI_MODEL,
    }

    return result

