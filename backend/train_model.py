"""
ResumeAI — Resume-Job Match Scoring Model Training
===================================================
Trains a supervised ML model that scores how well a resume matches a job description.
This is the SAME task as our Gemini AI engine, but using a trained ML model.

Input:  Resume text + Job description text
Output: Match score (0-100), skills_score, experience_score, keyword_score

ML Pipeline:
  1. Generate (resume, job_description) pairs with known match quality
  2. Extract features: cosine similarity, skill overlap, keyword density
  3. Train Random Forest Regressor to predict match_score
  4. Evaluate with MAE, RMSE, R² score
"""

import os, re, json, random, numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

random.seed(42)
np.random.seed(42)

# ─── Skill Taxonomy (same as ml_engine.py) ──────────
SKILL_TAXONOMY = {
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "php",
    "swift", "kotlin", "dart", "scala", "r", "matlab", "react", "angular", "vue", "next.js",
    "html", "css", "sass", "tailwind", "bootstrap", "node.js", "express", "django", "flask",
    "fastapi", "spring boot", "laravel", ".net", "sql", "nosql", "mongodb", "postgresql",
    "mysql", "redis", "firebase", "oracle", "elasticsearch", "aws", "azure", "gcp", "docker",
    "kubernetes", "terraform", "jenkins", "ci/cd", "linux", "nginx", "machine learning",
    "deep learning", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "nlp",
    "computer vision", "flutter", "react native", "android", "ios", "git", "agile", "scrum",
    "rest api", "graphql", "microservices", "figma", "photoshop", "selenium", "pytest",
    "jira", "confluence", "project management", "data analysis", "data visualization",
    "autocad", "solidworks", "revit", "matlab", "plc", "hvac", "circuit design",
    "recruitment", "payroll", "compliance", "litigation", "contract drafting",
    "salesforce", "crm", "negotiation", "accounting", "budgeting", "supply chain",
    "nutrition", "patient care", "rehabilitation", "sap", "erp", "etl", "hadoop",
    "spark", "blockchain", "solidity", "smart contracts", "penetration testing",
    "firewall", "siem", "encryption",
}

# ─── Resume + Job Description Templates (25 categories) ───
CATEGORIES = {
    "Data Science": {
        "resume_skills": ["python", "machine learning", "tensorflow", "pandas", "numpy", "sql", "deep learning", "nlp", "data visualization", "scikit-learn"],
        "job_skills": ["python", "machine learning", "deep learning", "sql", "tensorflow", "statistics", "data visualization", "nlp", "pytorch", "pandas"],
        "resume_tasks": ["Built predictive models for classification", "Developed NLP pipelines", "Performed data analysis on large datasets"],
        "job_tasks": ["Build ML models for production systems", "Analyze large datasets", "Develop deep learning solutions"],
    },
    "Java Developer": {
        "resume_skills": ["java", "spring boot", "microservices", "rest api", "sql", "docker", "maven", "junit", "oracle", "agile"],
        "job_skills": ["java", "spring boot", "microservices", "rest api", "sql", "docker", "kubernetes", "ci/cd", "agile", "design patterns"],
        "resume_tasks": ["Developed enterprise Java applications", "Built RESTful APIs", "Implemented microservices architecture"],
        "job_tasks": ["Build scalable Java backend services", "Design microservices", "Maintain REST APIs"],
    },
    "Python Developer": {
        "resume_skills": ["python", "django", "flask", "fastapi", "rest api", "postgresql", "mongodb", "docker", "redis", "linux"],
        "job_skills": ["python", "django", "fastapi", "rest api", "postgresql", "docker", "aws", "celery", "git", "linux"],
        "resume_tasks": ["Built web applications using Django", "Developed APIs with FastAPI", "Deployed on AWS"],
        "job_tasks": ["Develop Python backend services", "Build REST APIs", "Deploy containerized applications"],
    },
    "Frontend Developer": {
        "resume_skills": ["javascript", "react", "html", "css", "typescript", "redux", "next.js", "sass", "figma", "jest"],
        "job_skills": ["javascript", "react", "typescript", "html", "css", "next.js", "redux", "tailwind", "git", "agile"],
        "resume_tasks": ["Built responsive SPAs using React", "Implemented UI components", "Optimized web performance"],
        "job_tasks": ["Develop frontend components in React", "Build responsive interfaces", "Optimize performance"],
    },
    "DevOps Engineer": {
        "resume_skills": ["docker", "kubernetes", "aws", "terraform", "jenkins", "ci/cd", "linux", "ansible", "git", "nginx"],
        "job_skills": ["docker", "kubernetes", "aws", "terraform", "ci/cd", "linux", "monitoring", "jenkins", "git", "bash"],
        "resume_tasks": ["Managed Kubernetes clusters", "Built CI/CD pipelines", "Automated infrastructure with Terraform"],
        "job_tasks": ["Manage cloud infrastructure", "Implement CI/CD", "Automate deployments"],
    },
    "Mobile Developer": {
        "resume_skills": ["flutter", "dart", "react native", "android", "ios", "firebase", "rest api", "git", "swift", "kotlin"],
        "job_skills": ["flutter", "react native", "android", "ios", "firebase", "rest api", "dart", "swift", "git", "agile"],
        "resume_tasks": ["Developed cross-platform apps with Flutter", "Published apps on Play Store", "Integrated Firebase"],
        "job_tasks": ["Build mobile applications", "Develop cross-platform solutions", "Integrate backend APIs"],
    },
    "Web Designing": {
        "resume_skills": ["html", "css", "javascript", "figma", "photoshop", "bootstrap", "sass", "react", "tailwind", "git"],
        "job_skills": ["html", "css", "figma", "photoshop", "javascript", "responsive design", "bootstrap", "sass", "accessibility"],
        "resume_tasks": ["Designed responsive websites", "Created wireframes in Figma", "Built UI from mockups"],
        "job_tasks": ["Design modern web interfaces", "Create responsive layouts", "Build design systems"],
    },
    "Database": {
        "resume_skills": ["sql", "postgresql", "mysql", "mongodb", "oracle", "redis", "elasticsearch", "nosql", "python", "linux"],
        "job_skills": ["sql", "postgresql", "oracle", "mongodb", "redis", "nosql", "python", "linux", "data visualization"],
        "resume_tasks": ["Managed production databases", "Optimized SQL queries", "Built ETL pipelines"],
        "job_tasks": ["Manage database systems", "Optimize query performance", "Design data models"],
    },
    "Network Security": {
        "resume_skills": ["penetration testing", "firewall", "siem", "encryption", "linux", "python", "compliance", "git"],
        "job_skills": ["penetration testing", "firewall", "siem", "encryption", "linux", "compliance", "incident response"],
        "resume_tasks": ["Conducted penetration tests", "Implemented SIEM solutions", "Performed security audits"],
        "job_tasks": ["Perform security assessments", "Monitor security events", "Manage firewall rules"],
    },
    "HR": {
        "resume_skills": ["recruitment", "payroll", "compliance", "jira", "project management", "negotiation", "agile"],
        "job_skills": ["recruitment", "payroll", "compliance", "employee relations", "onboarding", "negotiation"],
        "resume_tasks": ["Managed recruitment process", "Administered payroll for 500+ employees", "Ensured compliance"],
        "job_tasks": ["Handle talent acquisition", "Manage employee relations", "Administer benefits"],
    },
    "Sales": {
        "resume_skills": ["salesforce", "crm", "negotiation", "project management", "data analysis", "budgeting"],
        "job_skills": ["salesforce", "crm", "negotiation", "business development", "account management"],
        "resume_tasks": ["Exceeded sales targets by 40%", "Managed key accounts", "Built CRM pipelines"],
        "job_tasks": ["Drive revenue growth", "Manage client accounts", "Develop new business"],
    },
    "Mechanical Engineer": {
        "resume_skills": ["autocad", "solidworks", "matlab", "project management", "python", "3d modeling"],
        "job_skills": ["autocad", "solidworks", "matlab", "manufacturing", "quality control", "project management"],
        "resume_tasks": ["Designed components using SolidWorks", "Performed FEA analysis", "Managed manufacturing"],
        "job_tasks": ["Design mechanical systems", "Perform structural analysis", "Manage production"],
    },
    "Civil Engineer": {
        "resume_skills": ["autocad", "revit", "project management", "matlab", "budgeting", "compliance"],
        "job_skills": ["autocad", "revit", "project management", "structural analysis", "construction management"],
        "resume_tasks": ["Designed structural systems", "Managed $10M construction projects", "Performed soil analysis"],
        "job_tasks": ["Design infrastructure projects", "Manage construction sites", "Ensure code compliance"],
    },
    "Electrical Engineer": {
        "resume_skills": ["circuit design", "matlab", "plc", "python", "autocad", "linux"],
        "job_skills": ["circuit design", "plc", "matlab", "embedded systems", "autocad", "python"],
        "resume_tasks": ["Designed electronic circuits", "Programmed PLC systems", "Developed embedded firmware"],
        "job_tasks": ["Design electrical systems", "Program PLCs", "Develop control systems"],
    },
    "Business Analyst": {
        "resume_skills": ["sql", "data analysis", "data visualization", "jira", "agile", "project management", "python"],
        "job_skills": ["sql", "data analysis", "data visualization", "agile", "jira", "project management", "python"],
        "resume_tasks": ["Gathered business requirements", "Created dashboards", "Conducted gap analysis"],
        "job_tasks": ["Analyze business processes", "Create data reports", "Facilitate requirements workshops"],
    },
    "Operations Manager": {
        "resume_skills": ["project management", "supply chain", "budgeting", "agile", "compliance", "erp"],
        "job_skills": ["project management", "supply chain", "budgeting", "lean", "erp", "compliance"],
        "resume_tasks": ["Managed operations for 200+ employees", "Optimized supply chain", "Implemented lean"],
        "job_tasks": ["Oversee daily operations", "Optimize processes", "Manage budgets"],
    },
    "Project Manager": {
        "resume_skills": ["project management", "agile", "scrum", "jira", "confluence", "budgeting", "negotiation"],
        "job_skills": ["project management", "agile", "scrum", "jira", "budgeting", "negotiation", "compliance"],
        "resume_tasks": ["Managed teams of 15+ engineers", "Delivered projects on time", "Implemented Agile Scrum"],
        "job_tasks": ["Lead cross-functional teams", "Deliver projects within budget", "Facilitate agile ceremonies"],
    },
    "Blockchain": {
        "resume_skills": ["blockchain", "solidity", "smart contracts", "javascript", "python", "git", "docker"],
        "job_skills": ["blockchain", "solidity", "smart contracts", "javascript", "python", "git", "docker"],
        "resume_tasks": ["Developed smart contracts on Ethereum", "Built DApps with Web3", "Audited contracts"],
        "job_tasks": ["Build blockchain solutions", "Write smart contracts", "Develop DeFi protocols"],
    },
    "SAP Developer": {
        "resume_skills": ["sap", "erp", "sql", "python", "project management", "agile", "compliance"],
        "job_skills": ["sap", "erp", "sql", "agile", "project management", "compliance"],
        "resume_tasks": ["Developed SAP ABAP programs", "Configured SAP modules", "Built SAP Fiori apps"],
        "job_tasks": ["Develop SAP solutions", "Configure ERP modules", "Implement SAP integrations"],
    },
    "ETL Developer": {
        "resume_skills": ["etl", "sql", "python", "data visualization", "nosql", "linux", "git"],
        "job_skills": ["etl", "sql", "python", "data visualization", "nosql", "hadoop", "spark"],
        "resume_tasks": ["Designed ETL pipelines", "Built data warehouse solutions", "Created data quality checks"],
        "job_tasks": ["Build ETL workflows", "Manage data warehouses", "Ensure data quality"],
    },
    "DotNet Developer": {
        "resume_skills": ["c#", ".net", "sql", "azure", "rest api", "docker", "git", "agile"],
        "job_skills": ["c#", ".net", "sql", "azure", "rest api", "docker", "microservices", "git"],
        "resume_tasks": ["Built ASP.NET web apps", "Developed Web APIs", "Deployed on Azure"],
        "job_tasks": ["Develop .NET applications", "Build REST APIs", "Deploy to Azure cloud"],
    },
    "Hadoop": {
        "resume_skills": ["hadoop", "spark", "sql", "python", "nosql", "linux", "data analysis"],
        "job_skills": ["hadoop", "spark", "sql", "python", "nosql", "linux", "data analysis", "etl"],
        "resume_tasks": ["Managed Hadoop clusters", "Built Spark data pipelines", "Processed petabytes of data"],
        "job_tasks": ["Manage big data infrastructure", "Build data pipelines", "Optimize Spark jobs"],
    },
    "Testing": {
        "resume_skills": ["selenium", "jira", "agile", "python", "sql", "git", "compliance"],
        "job_skills": ["selenium", "jira", "agile", "python", "git", "sql", "compliance"],
        "resume_tasks": ["Developed test plans", "Executed manual and automated tests", "Tracked defects in Jira"],
        "job_tasks": ["Write test cases", "Perform regression testing", "Track and manage defects"],
    },
    "Automation Testing": {
        "resume_skills": ["selenium", "pytest", "jenkins", "ci/cd", "python", "java", "agile", "jira", "git"],
        "job_skills": ["selenium", "pytest", "jenkins", "ci/cd", "python", "java", "agile", "rest api"],
        "resume_tasks": ["Built automated test suites", "Integrated tests into CI/CD", "Reduced regression time"],
        "job_tasks": ["Develop test automation frameworks", "Integrate testing in pipelines", "Automate API tests"],
    },
    "Health and fitness": {
        "resume_skills": ["nutrition", "patient care", "rehabilitation", "compliance", "project management"],
        "job_skills": ["nutrition", "patient care", "rehabilitation", "compliance", "wellness"],
        "resume_tasks": ["Designed fitness programs for clients", "Conducted health assessments", "Led wellness programs"],
        "job_tasks": ["Create personalized fitness plans", "Conduct health evaluations", "Manage wellness initiatives"],
    },
}


def extract_skills(text):
    text_lower = text.lower()
    return [s for s in SKILL_TAXONOMY if s in text_lower]


def compute_features(resume_text, job_text):
    """Extract numerical features from a resume-job pair."""
    # 1. TF-IDF Cosine Similarity
    vec = TfidfVectorizer(stop_words='english', max_features=3000, ngram_range=(1, 2))
    try:
        tfidf = vec.fit_transform([resume_text, job_text])
        cos_sim = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except:
        cos_sim = 0.0

    # 2. Skill Match
    r_skills = set(extract_skills(resume_text))
    j_skills = set(extract_skills(job_text))
    matched = r_skills & j_skills
    missing = j_skills - r_skills
    skill_pct = (len(matched) / len(j_skills) * 100) if j_skills else 0

    # 3. Keyword density
    words = re.findall(r'\w+', job_text.lower())
    important = [w for w in set(words) if len(w) > 3 and w not in {'with', 'that', 'this', 'from', 'have', 'will', 'your', 'they', 'been', 'more'}]
    found = sum(1 for w in important if w in resume_text.lower())
    kw_density = (found / len(important) * 100) if important else 0

    return [cos_sim, skill_pct, len(matched), len(missing), kw_density, len(r_skills), len(j_skills)]


def generate_text(skills, tasks, role, years):
    s = random.sample(skills, random.randint(4, min(8, len(skills))))
    t = random.sample(tasks, random.randint(1, min(3, len(tasks))))
    return f"{role} with {years} years of experience. Skills: {', '.join(s)}. {' '.join(t)}"


def generate_training_data():
    """Generate (resume, job_desc) pairs with match scores."""
    X_features, y_scores = [], []
    cat_list = list(CATEGORIES.keys())
    
    # Try to load real Kaggle dataset
    csv_paths = [
        os.path.join(os.path.dirname(__file__), "models", "dataset", "Resume", "Resume.csv"),
        os.path.join(os.path.dirname(__file__), "dataset", "Resume.csv")
    ]
    
    csv_path = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_path = p
            break

    if csv_path:
        print(f"       Found real dataset at {csv_path} - Loading...")
        try:
            df = pd.read_csv(csv_path)
            # Find resume column (Kaggle datasets usually use Resume_str or Resume)
            resume_col = 'Resume_str' if 'Resume_str' in df.columns else 'Resume' if 'Resume' in df.columns else None
            cat_col = 'Category' if 'Category' in df.columns else None
            
            if resume_col and cat_col:
                # Drop empty
                df = df.dropna(subset=[resume_col, cat_col])
                
                # We will create pairs
                # For each resume, 1 positive pair (job from same category) and 1 negative pair (job from random category)
                for idx, row in df.iterrows():
                    res_text = str(row[resume_col])
                    res_cat = str(row[cat_col])
                    
                    # Try to map Kaggle category to our categories for job generation
                    mapped_cat = None
                    for c in cat_list:
                        if c.lower() in res_cat.lower() or res_cat.lower() in c.lower():
                            mapped_cat = c
                            break
                    
                    if not mapped_cat:
                        mapped_cat = random.choice(cat_list)
                        
                    # 1. Positive pair (Matching job)
                    jc = CATEGORIES[mapped_cat]
                    job_pos = generate_text(jc["job_skills"], jc["job_tasks"], f"Hiring: {mapped_cat}", random.randint(1, 8))
                    
                    features_pos = compute_features(res_text, job_pos)
                    # Ground truth positive
                    cos_sim, skill_pct, kw_density = features_pos[0], features_pos[1], features_pos[4]
                    score_pos = skill_pct * 0.6 + (cos_sim * 100) * 0.3 + kw_density * 0.1
                    score_pos = min(score_pos + random.uniform(5, 15), 100)
                    
                    X_features.append(features_pos)
                    y_scores.append(round(score_pos, 1))
                    
                    # 2. Negative pair (Mismatching job)
                    bad_cat = random.choice([c for c in cat_list if c != mapped_cat] or [mapped_cat])
                    jc_bad = CATEGORIES[bad_cat]
                    job_neg = generate_text(jc_bad["job_skills"], jc_bad["job_tasks"], f"Hiring: {bad_cat}", random.randint(1, 8))
                    
                    features_neg = compute_features(res_text, job_neg)
                    cos_sim_n, skill_pct_n, kw_density_n = features_neg[0], features_neg[1], features_neg[4]
                    score_neg = skill_pct_n * 0.6 + (cos_sim_n * 100) * 0.3 + kw_density_n * 0.1
                    score_neg = max(score_neg - random.uniform(0, 10), 0)
                    
                    X_features.append(features_neg)
                    y_scores.append(round(score_neg, 1))
                
                print(f"       Processed {len(df)} real resumes into {len(X_features)} training pairs.")
                return np.array(X_features), np.array(y_scores)
        except Exception as e:
            print(f"       Error loading dataset: {e}. Falling back to synthetic.")

    print("       Using synthetic data generation...")
    # Fallback to synthetic if no CSV or error
    for res_cat in cat_list:
        rc = CATEGORIES[res_cat]
        for job_cat in cat_list:
            jc = CATEGORIES[job_cat]

            # Generate 3 pairs per combination
            for _ in range(3):
                resume = generate_text(rc["resume_skills"], rc["resume_tasks"], res_cat, random.randint(1, 12))
                job = generate_text(jc["job_skills"], jc["job_tasks"], f"Hiring: {job_cat}", random.randint(1, 8))

                features = compute_features(resume, job)

                # Ground truth: weighted formula
                cos_sim, skill_pct = features[0], features[1]
                kw_density = features[4]
                if res_cat == job_cat:
                    score = skill_pct * 0.6 + (cos_sim * 100) * 0.3 + kw_density * 0.1
                    score = min(score + random.uniform(5, 15), 100)
                else:
                    score = skill_pct * 0.6 + (cos_sim * 100) * 0.3 + kw_density * 0.1
                    score = max(score - random.uniform(0, 10), 0)

                X_features.append(features)
                y_scores.append(round(score, 1))

    return np.array(X_features), np.array(y_scores)


def train():
    print("=" * 60)
    print("  ResumeAI — Resume-Job Match Scoring Model")
    print("  Trained ML model for resume-job compatibility scoring")
    print("=" * 60)
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    print("[1/5] Generating resume-job training pairs (25 categories)...")
    X, y = generate_training_data()
    print(f"       Total pairs: {len(X)}")
    print(f"       Features per pair: {X.shape[1]}")
    print(f"       Score range: {y.min():.1f} - {y.max():.1f}")
    print(f"       Mean score: {y.mean():.1f}\n")

    print("[2/5] Train/Test split (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"       Train: {len(X_train)}, Test: {len(X_test)}\n")

    print("[3/5] Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    print("       Done.\n")

    print("[4/5] Evaluating...")
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    print(f"       MAE:  {mae:.2f}")
    print(f"       RMSE: {rmse:.2f}")
    print(f"       R²:   {r2:.4f}")

    # Feature importance
    feature_names = ["cosine_similarity", "skill_match_%", "matched_skills", "missing_skills", "keyword_density", "resume_skills", "job_skills"]
    importances = model.feature_importances_
    print("\n       Feature Importance:")
    for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
        bar = "#" * int(imp * 40)
        print(f"         {name:>20s}: {imp:.4f} {bar}")

    print(f"\n[5/5] Cross-Validation (5-fold)...")
    cv = cross_val_score(model, X, y, cv=5, scoring='r2')
    print(f"       R² scores: {[f'{s:.4f}' for s in cv]}")
    print(f"       Mean R²: {cv.mean():.4f}\n")

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/match_scorer.pkl")
    with open("models/training_report.txt", "w") as f:
        f.write(f"ResumeAI Match Scoring Model Report — {datetime.now()}\n")
        f.write(f"Pairs: {len(X)}, Features: {X.shape[1]}\n")
        f.write(f"MAE: {mae:.2f}, RMSE: {rmse:.2f}, R²: {r2:.4f}\n")
        f.write(f"CV Mean R²: {cv.mean():.4f}\n\n")
        f.write("Feature Importance:\n")
        for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
            f.write(f"  {name}: {imp:.4f}\n")
    print("  Saved: models/match_scorer.pkl")
    print("  Saved: models/training_report.txt")
    print(f"\n{'='*60}\n  DONE — R²: {r2:.4f}, MAE: {mae:.2f}\n{'='*60}")


if __name__ == "__main__":
    train()
