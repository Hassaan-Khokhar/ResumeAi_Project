"""Render entry point — reads PORT from environment to avoid shell expansion issues."""
import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    print(f"[START] Launching on port {port}", flush=True)
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
