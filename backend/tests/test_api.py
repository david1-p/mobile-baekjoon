import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.main import app


class SearchTests(unittest.TestCase):
    def setUp(self):
        self.client = self.enterContext(TestClient(app))
        self.enterContext(patch.dict(os.environ, {"SOLVED_CLIENT_ID": "test", "SOLVED_CLIENT_SECRET": "test-secret"}))

    def upstream(self, handler):
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://solved.ac")
        self.client.portal.call(client.__aenter__)
        self.addCleanup(self.client.portal.call, client.aclose)
        app.state.solved = client

    def search(self, q="합"):
        return self.client.get("/api/problems", params={"q": q})

    def test_health(self):
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})

    def test_missing_keys(self):
        with patch.dict(os.environ, {"SOLVED_CLIENT_SECRET": ""}):
            self.assertEqual(self.search().status_code, 503)

    def test_contract_and_native_ids(self):
        def handler(req):
            self.assertEqual(req.url.path, "/api/v4/problems")
            self.assertEqual(dict(req.url.params), {"q": "합", "page": "1"})
            self.assertEqual(req.headers["x-client-secret"], "test-secret")
            return httpx.Response(200, json={"page": 1, "pageSize": 1, "total": 2, "problems": [{
                "problemId": 999, "level": 2, "titles": [{"language": "en", "title": "Example"},
                                                       {"language": "ko", "title": "예시 문제"}],
                "judgeIds": [{"ojId": j, "problemId": n} for j, n in [
                    ("boj", "1010"), ("boj", "1010"), ("doj", "3"), ("boj", "11?x"), ("boj", "1020")]]
            }]})
        self.upstream(handler)
        result = self.search().json()
        self.assertEqual(result, {"items": [{"id": n, "level": 2, "title": "예시 문제"} for n in [1010, 1020]], "nextPage": 2})

    def test_empty_page_keeps_next(self):
        self.upstream(lambda r: httpx.Response(200, json={"page": 1, "pageSize": 10, "total": 20, "problems": []}))
        self.assertEqual(self.search().json(), {"items": [], "nextPage": 2})

    def test_last_page(self):
        self.upstream(lambda r: httpx.Response(200, json={"page": 1, "pageSize": 10, "total": 0, "problems": []}))
        self.assertIsNone(self.search().json()["nextPage"])

    def test_rate_limit(self):
        self.upstream(lambda r: httpx.Response(429, headers={"Retry-After": "42"}))
        res = self.search()
        self.assertEqual((res.status_code, res.headers["retry-after"]), (429, "42"))

    def test_invalid_upstream(self):
        self.upstream(lambda r: httpx.Response(200, text="maintenance"))
        self.assertEqual(self.search().status_code, 502)

    def test_query_limit(self):
        self.upstream(lambda r: httpx.Response(401, json={"code": "SIGN_IN_REQUIRED"}))
        self.assertEqual(self.search().status_code, 422)

    def test_rejected_credentials(self):
        self.upstream(lambda r: httpx.Response(401, text="bad key"))
        self.assertEqual(self.search().status_code, 502)

    def test_timeout(self):
        def timeout(req):
            raise httpx.ReadTimeout("timeout")
        self.upstream(timeout)
        self.assertEqual(self.search().status_code, 504)

    def test_validation(self):
        for q in ["", "   ", "x"*101]:
            self.assertEqual(self.search(q).status_code, 422)
        self.assertEqual(self.client.get("/api/problems?q=x&page=0").status_code, 422)
