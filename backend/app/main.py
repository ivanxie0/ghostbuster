"""FastAPI entrypoint. Run from /backend:  .venv/bin/uvicorn app.main:app --reload --port 8000
Owner: Aryan."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import FAKE_MODE
from app.routes import router

app = FastAPI(title="GhostBuster API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    msg = "; ".join(f"{'.'.join(str(x) for x in e['loc'])}: {e['msg']}" for e in exc.errors())
    return JSONResponse({"error": msg}, status_code=422)


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception):
    return JSONResponse({"error": f"internal error: {exc}"}, status_code=500)


print(f"[ghostbuster] FAKE_MODE={FAKE_MODE}")
