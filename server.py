"""
Pereira's Barber Shop - Web Server
FastAPI application serving the landing page
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(
    title="Pereira's Barber Shop",
    description="Good Times, Great People, Quality Cut",
    version="1.0.0"
)

# Mount static files directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    """Serve the main landing page"""
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pereira-barbershop"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
