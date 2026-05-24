"""
MongoDB connection, 8 collections, indexes, and aggregation pipelines.
Uses Motor (async driver) for non-blocking operations.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


# Configure robust public DNS (Cloudflare & Google) to bypass unreliable local/university network DNS gateways
try:
    import dns.resolver
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
    dns.resolver.default_resolver.nameservers = ['1.1.1.1', '8.8.8.8']
except Exception:
    pass

def convert_srv_to_standard(uri: str) -> str:
    """
    Advanced DB Concept: Programmatically convert a mongodb+srv:// URI
    to a direct shard list mongodb:// URI to completely bypass local network DNS SRV block/timeouts.
    """
    if not uri.startswith("mongodb+srv://"):
        return uri
    try:
        content = uri[len("mongodb+srv://"):]
        parts = content.split("@", 1)
        if len(parts) < 2:
            return uri
        creds = parts[0]
        rest = parts[1]
        
        host_parts = rest.split("/", 1)
        host = host_parts[0]
        options = host_parts[1] if len(host_parts) > 1 else ""
        
        cluster_parts = host.split(".", 1)
        cluster_prefix = cluster_parts[0]
        domain = cluster_parts[1]
        
        # In MongoDB Atlas, the replica set shards often use a system-generated identifier (e.g. ac-brwlbt8)
        # instead of the user's custom cluster prefix (resumeai). Let's map it safely.
        if cluster_prefix == "resumeai":
            cluster_prefix = "ac-brwlbt8"
        
        shards = [
            f"{cluster_prefix}-shard-00-00.{domain}:27017",
            f"{cluster_prefix}-shard-00-01.{domain}:27017",
            f"{cluster_prefix}-shard-00-02.{domain}:27017"
        ]
        new_hosts = ",".join(shards)
        
        new_uri = f"mongodb://{creds}@{new_hosts}/"
        if options:
            if "?" in options:
                opts = options.split("?", 1)[1]
                new_uri += f"?{opts}"
                if "ssl=" not in opts.lower() and "tls=" not in opts.lower():
                    new_uri += "&ssl=true"
                if "authsource=" not in opts.lower():
                    new_uri += "&authSource=admin"
            else:
                new_uri += options + "?ssl=true&authSource=admin"
        else:
            new_uri += "?ssl=true&authSource=admin"
            
        return new_uri
    except Exception:
        return uri

async def connect_db():
    global client, db
    # Try the original SRV URI first (works on proper cloud servers like Render).
    # Only fall back to the direct-shard workaround if SRV DNS fails
    # (e.g., on university/corporate networks that block SRV lookups).
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        await client.admin.command("ping")
        print("[OK] Connected via SRV URI")
    except Exception as e:
        print(f"[WARN] SRV connection failed ({e}), trying direct shard fallback...")
        direct_uri = convert_srv_to_standard(settings.MONGODB_URI)
        client = AsyncIOMotorClient(direct_uri, serverSelectionTimeoutMS=10000)
        await client.admin.command("ping")
        print("[OK] Connected via direct shard fallback")
    db = client[settings.DATABASE_NAME]

    # ── Indexes (Advanced DB Optimization) ──
    # Note: Index creation is idempotent, but we only create essential ones
    # to prevent MongoDB Atlas connection pool pausing on startup.
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index([("name", "text"), ("username", "text"), ("headline", "text")], name="user_text_search")
    
    await db.posts.create_index([("created_at", -1)])
    await db.posts.create_index([("author_id", 1), ("created_at", -1)])
    
    await db.resumes.create_index("user_id")
    await db.resumes.create_index([("skills", 1)])
    
    await db.job_postings.create_index([("created_at", -1)])
    await db.job_postings.create_index("company_id")
    # Try explicitly dropping the conflicting job index
    try:
        await db.job_postings.drop_index("title_text_requirements_text")
    except Exception:
        pass
        
    await db.job_postings.create_index([("title", "text"), ("company_name", "text"), ("description", "text")], name="job_text_search")
    
    await db.match_reports.create_index([("user_id", 1), ("job_id", 1)])
    await db.match_reports.create_index([("match_score", -1)])
    await db.comments.create_index([("post_id", 1), ("created_at", -1)])
    await db.activity_logs.create_index([("created_at", -1)])
    print(f"[OK] Connected to MongoDB: {settings.DATABASE_NAME}")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db


# ─── Collection Accessors ───────────────────────────
def users_col():        return db["users"]
def posts_col():        return db["posts"]
def resumes_col():      return db["resumes"]
def job_postings_col(): return db["job_postings"]
def match_reports_col():return db["match_reports"]
def comments_col():     return db["comments"]
def companies_col():    return db["companies"]
def activity_logs_col():return db["activity_logs"]
def applications_col(): return db["job_applications"]


# ─── Advanced Aggregation Pipelines ─────────────────

async def pipeline_trending_skills(limit=10):
    """
    Aggregation: Find the most frequently listed skills across all resumes.
    Uses $unwind to deconstruct the skills array, then $group to count.
    """
    pipeline = [
        {"$unwind": "$skills"},
        {"$group": {"_id": {"$toLower": "$skills"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
        {"$project": {"skill": "$_id", "count": 1, "_id": 0}},
    ]
    return await resumes_col().aggregate(pipeline).to_list(length=limit)


async def pipeline_top_missing_skills(limit=10):
    """
    Aggregation: Most frequently missing skills from match reports.
    Uses $unwind + $group to find common skill gaps.
    """
    pipeline = [
        {"$unwind": "$missing_skills"},
        {"$group": {"_id": "$missing_skills.skill", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
        {"$project": {"skill": "$_id", "count": 1, "_id": 0}},
    ]
    return await match_reports_col().aggregate(pipeline).to_list(length=limit)


async def pipeline_job_applicants_ranked(job_id: str):
    """
    Aggregation: Rank applicants for a job by AI match score.
    Uses $lookup to JOIN match_reports with users collection.
    """
    from bson import ObjectId
    pipeline = [
        {"$match": {"job_id": job_id}},
        {"$sort": {"match_score": -1}},
        # $lookup: JOIN with users collection
        {"$lookup": {
            "from": "users",
            "let": {"uid": {"$toObjectId": "$user_id"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$uid"]}}},
                {"$project": {"password": 0}},
            ],
            "as": "user_info",
        }},
        {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
        # $facet: Return both the ranked list and summary stats
        {"$facet": {
            "applicants": [
                {"$project": {
                    "user_id": 1, "match_score": 1, "matched_skills": 1,
                    "missing_skills": 1, "user_info.name": 1, "user_info.avatar": 1,
                }},
            ],
            "stats": [
                {"$group": {
                    "_id": None,
                    "avg_score": {"$avg": "$match_score"},
                    "max_score": {"$max": "$match_score"},
                    "total_applicants": {"$sum": 1},
                }},
            ],
        }},
    ]
    result = await match_reports_col().aggregate(pipeline).to_list(length=1)
    return result[0] if result else {"applicants": [], "stats": []}


async def pipeline_user_feed(user_id: str, skip=0, limit=20):
    """
    Aggregation: Build a smart feed with tiered prioritization.
    Priority: Network+Recent > Global+Recent > Network+Old > Global+Old
    """
    from bson import ObjectId
    from datetime import datetime, timedelta

    # Get user's following list + self
    user = await users_col().find_one({"_id": ObjectId(user_id)})
    following = user.get("following", []) if user else []
    # Normalize all IDs to strings for consistent comparison
    priority_ids = [str(fid) for fid in following] + [str(user_id)]

    # Threshold for "recent" posts (48 hours)
    recent_threshold = datetime.utcnow() - timedelta(hours=48)

    pipeline = [
        # Normalize author_id to string for consistent matching
        {"$addFields": {
            "author_id_str": {"$toString": "$author_id"},
        }},

        # JOIN author info — try converting author_id to ObjectId for lookup
        {"$lookup": {
            "from": "users",
            "let": {"aid": "$author_id_str"},
            "pipeline": [
                {"$addFields": {"_id_str": {"$toString": "$_id"}}},
                {"$match": {"$expr": {"$eq": ["$_id_str", "$$aid"]}}},
                {"$project": {"name": 1, "avatar": 1, "role": 1, "headline": 1, "username": 1}},
            ],
            "as": "author",
        }},
        {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}},

        # COUNT comments
        {"$lookup": {
            "from": "comments",
            "let": {"pid": {"$toString": "$_id"}},
            "pipeline": [{"$match": {"$expr": {"$eq": ["$post_id", "$$pid"]}}}],
            "as": "comments_list",
        }},

        {"$addFields": {
            "comment_count": {"$size": "$comments_list"},
            "is_network": {"$in": ["$author_id_str", priority_ids]},
            "is_recent": {"$gte": ["$created_at", recent_threshold]}
        }},

        # Scoring: Network+Recent(3) > Global+Recent(2) > Network+Old(1) > Global+Old(0)
        {"$addFields": {
            "score": {
                "$add": [
                    {"$cond": [{"$and": ["$is_network", "$is_recent"]}, 3, 0]},
                    {"$cond": [{"$and": [{"$not": "$is_network"}, "$is_recent"]}, 2, 0]},
                    {"$cond": [{"$and": ["$is_network", {"$not": "$is_recent"}]}, 1, 0]}
                ]
            }
        }},

        {"$sort": {"score": -1, "created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$project": {"comments_list": 0, "is_network": 0, "is_recent": 0, "author_id_str": 0}}
    ]
    results = await posts_col().aggregate(pipeline).to_list(length=limit)
    for r in results:
        r["_id"] = str(r["_id"])
        if "author" in r and isinstance(r["author"], dict) and "_id" in r["author"]:
            r["author"]["_id"] = str(r["author"]["_id"])
    return results


async def pipeline_feed_jobs(limit=5):
    """
    Get recent job postings to mix into the feed.
    Uses $lookup to join company info.
    """
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "let": {"cid": "$company_id"},
            "pipeline": [
                {"$addFields": {"_id_str": {"$toString": "$_id"}}},
                {"$match": {"$expr": {"$eq": ["$_id_str", "$$cid"]}}},
                {"$project": {"name": 1, "avatar": 1}},
            ],
            "as": "company",
        }},
        {"$unwind": {"path": "$company", "preserveNullAndEmptyArrays": True}},
    ]
    results = await job_postings_col().aggregate(pipeline).to_list(length=limit)
    for r in results:
        r["_id"] = str(r["_id"])
        r["_type"] = "job"  # Mark as job for frontend
        if "company" in r and isinstance(r["company"], dict) and "_id" in r["company"]:
            r["company"]["_id"] = str(r["company"]["_id"])
    return results


async def pipeline_platform_stats():
    """
    Aggregation: Platform-wide statistics using $facet for multiple stats in one query.
    """
    pipeline = [
        {"$facet": {
            "total_users": [{"$count": "count"}],
            "role_breakdown": [{"$group": {"_id": "$role", "count": {"$sum": 1}}}],
        }}
    ]
    result = await users_col().aggregate(pipeline).to_list(length=1)
    stats = result[0] if result else {}

    # Additional counts
    stats["total_posts"] = await posts_col().count_documents({})
    stats["total_jobs"] = await job_postings_col().count_documents({})
    stats["total_analyses"] = await match_reports_col().count_documents({})
    return stats
