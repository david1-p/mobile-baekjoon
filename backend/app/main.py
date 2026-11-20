"""Read-only metadata adapter. Drafts and BOJ sessions stay on the device."""
import os
import re
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, Field, ValidationError


class JudgeId(BaseModel):
    ojId: str
    problemId: str


class Title(BaseModel):
    language: str
    title: str


class SourceProblem(BaseModel):
    judgeIds: list[JudgeId]
    titles: list[Title]
    level: int


class SolvedPage(BaseModel):
    problems: list[SourceProblem]
    page: int = Field(ge=1)
    pageSize: int = Field(gt=0)
    total: int = Field(ge=0)


class Problem(BaseModel):
    id: int
    title: str
    level: int


class Results(BaseModel):
    items: list[Problem]
    nextPage: int | None


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(base_url="https://solved.ac", timeout=8, trust_env=False) as client:
        app.state.solved = client
        yield


app = FastAPI(title="Pocket Judge", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/problems")
async def problems(request: Request, q: Annotated[str, Query(min_length=1, max_length=100)],
                   page: Annotated[int, Query(ge=1)] = 1) -> Results:
    q = q.strip()
    if not q:
        raise HTTPException(422, "문제 번호 또는 제목을 입력하세요.")
    client_id = os.getenv("SOLVED_CLIENT_ID")
    secret = os.getenv("SOLVED_CLIENT_SECRET")
    if not client_id or not secret:
        raise HTTPException(503, "서버에 solved.ac 앱 키를 설정한 후 검색할 수 있습니다.")
    try:
        response = await request.app.state.solved.get(
            "/api/v4/problems", params={"q": q, "page": page},
            headers={"x-client-id": client_id, "x-client-secret": secret},
        )
    except httpx.TimeoutException:
        raise HTTPException(504, "solved.ac 응답 시간이 초과되었습니다.") from None
    except httpx.RequestError:
        raise HTTPException(502, "solved.ac에 연결할 수 없습니다.") from None
    if response.status_code == 429:
        wait = response.headers.get("Retry-After", "30")
        raise HTTPException(429, "검색 요청이 많습니다. 잠시 후 다시 시도하세요.",
                            headers={"Retry-After": wait})
    if response.status_code in (400, 401, 422):
        try:
            error = response.json()
        except ValueError:
            error = {}
        if response.status_code in (400, 422) or "SIGN_IN_REQUIRED" in str(error):
            raise HTTPException(422, "검색어를 더 짧고 단순하게 입력하세요.")
    if not response.is_success:
        raise HTTPException(502, "solved.ac 요청이 거절되었습니다. 서버의 앱 키와 서비스 상태를 확인하세요.")
    try:
        data = SolvedPage.model_validate(response.json())
    except (ValueError, ValidationError):
        raise HTTPException(502, "solved.ac 응답 형식을 확인할 수 없습니다.") from None

    items = {}
    for problem in data.problems:
        title = next((t.title for t in problem.titles if t.language == "ko"),
                     next((t.title for t in problem.titles), ""))
        for judge in problem.judgeIds:
            if judge.ojId.lower() == "boj" and re.fullmatch(r"[1-9][0-9]{0,8}", judge.problemId):
                number = int(judge.problemId)
                items.setdefault(number, Problem(id=number, title=title or f"BOJ {number}", level=problem.level))
    more = data.page * data.pageSize < data.total
    return Results(items=list(items.values()), nextPage=data.page + 1 if more else None)
