"""
Pereira's Barber Shop - Web Server
FastAPI application serving the landing page and booking page
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(
    title="Pereira's Barber Shop",
    description="Good Times, Great People, Quality Cut",
    version="1.1.0"
)

static_dir = os.path.join(os.path.dirname(__file__), "static")

app.mount("/assets", StaticFiles(directory=static_dir), name="assets")


@app.get("/")
async def root():
    return FileResponse(os.path.join(static_dir, "index.html"))


@app.get("/agendar.html")
async def agendar():
    return FileResponse(os.path.join(static_dir, "agendar.html"))


@app.get("/style.css")
async def style():
    return FileResponse(os.path.join(static_dir, "style.css"), media_type="text/css")


@app.get("/agendar.css")
async def agendar_css():
    return FileResponse(os.path.join(static_dir, "agendar.css"), media_type="text/css")


@app.get("/agendar.js")
async def agendar_js():
    return FileResponse(os.path.join(static_dir, "agendar.js"), media_type="application/javascript")


@app.get("/logo.png")
async def logo():
    return FileResponse(os.path.join(static_dir, "logo.png"), media_type="image/png")


@app.get("/favicon.svg")
async def favicon():
    return FileResponse(os.path.join(static_dir, "favicon.svg"), media_type="image/svg+xml")


@app.get("/admin.html")
async def admin_page():
    return FileResponse(os.path.join(static_dir, "admin.html"))


@app.get("/admin.css")
async def admin_css():
    return FileResponse(os.path.join(static_dir, "admin.css"), media_type="text/css")


@app.get("/admin.js")
async def admin_js():
    return FileResponse(os.path.join(static_dir, "admin.js"), media_type="application/javascript")


@app.get("/supabase-config.js")
async def supabase_config():
    return FileResponse(os.path.join(static_dir, "supabase-config.js"), media_type="application/javascript")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pereira-barbershop"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
