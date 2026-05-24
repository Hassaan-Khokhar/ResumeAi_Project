"""
Trained Match Scorer — Loads the trained Random Forest model and predicts
resume-job compatibility scores. This does the SAME job as the Gemini AI engine
but using a trained supervised ML model.
"""

import os, re
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_model = None
_model_path = os.path.join(os.path.dirname(__file__), "..", "models", "match_scorer.pkl")

SKILL_TAXONOMY = {
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "php",
    "swift", "kotlin", "dart", "react", "angular", "vue", "next.js", "html", "css", "sass",
    "tailwind", "bootstrap", "node.js", "express", "django", "flask", "fastapi", "spring boot",
    ".net", "sql", "nosql", "mongodb", "postgresql", "mysql", "redis", "firebase", "oracle",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd", "linux",
    "machine learning", "deep learning", "tensorflow", "pytorch", "pandas", "numpy",
    "scikit-learn", "nlp", "flutter", "react native", "android", "ios", "git", "agile",
    "scrum", "rest api", "graphql", "microservices", "figma", "photoshop", "selenium",
    "pytest", "jira", "project management", "data analysis", "data visualization",
    "autocad", "solidworks", "matlab", "recruitment", "payroll", "compliance",
    "salesforce", "crm", "negotiation", "sap", "erp", "etl", "hadoop", "spark",
    "blockchain", "solidity", "smart contracts", "penetration testing", "firewall", "siem",
}


def _extract_skills(text):
    text_lower = text.lower()
    return [s for s in SKILL_TAXONOMY if s in text_lower]


def _load_model():
    global _model
    if _model is None:
        abs_path = os.path.abspath(_model_path)
        if os.path.exists(abs_path):
            _model = joblib.load(abs_path)
            print(f"[OK] Trained match scorer loaded from {abs_path}")
        else:
            print(f"[WARN] Match scorer not found at {abs_path}. Run train_model.py first.")
    return _model


def predict_match_score(resume_text: str, job_description: str) -> dict:
    """
    Predict resume-job compatibility using the trained ML model.
    Returns a dict with match_score, skills_score, keyword_score, matched/missing skills.
    """
    model = _load_model()
    if model is None:
        return None

    # Extract features (same as training)
    vec = TfidfVectorizer(stop_words='english', max_features=3000, ngram_range=(1, 2))
    try:
        tfidf = vec.fit_transform([resume_text, job_description])
        cos_sim = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except:
        cos_sim = 0.0

    r_skills = set(_extract_skills(resume_text))
    j_skills = set(_extract_skills(job_description))
    matched = sorted(r_skills & j_skills)
    missing = sorted(j_skills - r_skills)
    skill_pct = (len(matched) / len(j_skills) * 100) if j_skills else 0

    words = re.findall(r'\w+', job_description.lower())
    important = [w for w in set(words) if len(w) > 3]
    found = sum(1 for w in important if w in resume_text.lower())
    kw_density = (found / len(important) * 100) if important else 0

    features = np.array([[cos_sim, skill_pct, len(matched), len(missing), kw_density, len(r_skills), len(j_skills)]])

    # Predict
    predicted_score = float(model.predict(features)[0])
    predicted_score = max(0, min(100, round(predicted_score, 1)))

    return {
        "ml_match_score": predicted_score,
        "cosine_similarity": round(cos_sim * 100, 2),
        "skill_match_percentage": round(skill_pct, 1),
        "matched_skills": matched,
        "missing_skills": [{"skill": s, "importance": "high", "suggestion": f"Add '{s}' to your resume"} for s in missing[:10]],
        "keyword_density": round(kw_density, 1),
        "model": "random_forest_trained",
    }
