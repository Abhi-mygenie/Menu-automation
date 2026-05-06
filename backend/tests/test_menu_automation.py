"""Backend API tests for Menu Automation setup task."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://menu-deploy-docs.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Health endpoint
class TestHealth:
    def test_health_ok(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["mongo"] == "ok"
        assert data["service"] == "menu-automation-backend"
        assert "timestamp" in data

    def test_root_message(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "Menu Automation API" in data.get("message", "")


# Datasets stats endpoint
class TestDatasets:
    def test_datasets_stats(self, api):
        r = api.get(f"{BASE_URL}/api/datasets/stats", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["exists"] is True
        assert data["total_files"] == 33
        assert len(data["batches"]) == 7
        # All batches have positive file_count
        for b in data["batches"]:
            assert b["file_count"] > 0
            assert isinstance(b["files"], list)
            assert len(b["files"]) == b["file_count"]


# Status CRUD
class TestStatus:
    def test_create_and_list_status(self, api):
        # CREATE
        r = api.post(f"{BASE_URL}/api/status", json={"client_name": "TEST_pytest_client"}, timeout=15)
        assert r.status_code == 200
        created = r.json()
        assert created["client_name"] == "TEST_pytest_client"
        assert "id" in created and isinstance(created["id"], str) and len(created["id"]) > 0
        assert "timestamp" in created
        # No Mongo _id leak
        assert "_id" not in created

        # LIST and verify record exists
        r2 = api.get(f"{BASE_URL}/api/status", timeout=15)
        assert r2.status_code == 200
        arr = r2.json()
        assert isinstance(arr, list)
        ids = [x.get("id") for x in arr]
        assert created["id"] in ids
        # No _id leak in list
        for item in arr:
            assert "_id" not in item
