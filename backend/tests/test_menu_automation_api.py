"""
Backend API tests for Menu Automation application.
Tests: /api/, /api/health, /api/datasets/stats, /api/status (POST/GET)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRootEndpoint:
    """Tests for /api/ root endpoint"""
    
    def test_root_returns_message(self):
        """Verify /api/ returns Menu Automation API message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Menu Automation API" in data["message"]
        assert "docs" in data


class TestHealthEndpoint:
    """Tests for /api/health endpoint"""
    
    def test_health_returns_ok(self):
        """Verify /api/health returns status ok with mongo ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "status" in data
        assert "service" in data
        assert "mongo" in data
        assert "timestamp" in data
        
        # Validate values
        assert data["status"] == "ok"
        assert data["mongo"] == "ok"
        assert data["service"] == "menu-automation-backend"


class TestDatasetsStatsEndpoint:
    """Tests for /api/datasets/stats endpoint"""
    
    def test_datasets_stats_returns_correct_data(self):
        """Verify /api/datasets/stats returns exists=true, total_files=33, 7 batches"""
        response = requests.get(f"{BASE_URL}/api/datasets/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "root" in data
        assert "exists" in data
        assert "total_files" in data
        assert "batches" in data
        
        # Validate values
        assert data["exists"] == True
        assert data["total_files"] == 33
        assert len(data["batches"]) == 7
        
        # Validate batch structure
        for batch in data["batches"]:
            assert "name" in batch
            assert "file_count" in batch
            assert "files" in batch
            assert isinstance(batch["files"], list)


class TestStatusEndpoints:
    """Tests for /api/status POST and GET endpoints"""
    
    def test_create_status_check(self):
        """Verify POST /api/status creates a status check"""
        payload = {"client_name": "TEST_pytest_client"}
        response = requests.post(
            f"{BASE_URL}/api/status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert "client_name" in data
        assert "timestamp" in data
        
        # Validate values
        assert data["client_name"] == "TEST_pytest_client"
        assert isinstance(data["id"], str)
        assert len(data["id"]) > 0
    
    def test_get_status_checks(self):
        """Verify GET /api/status returns list of status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        
        # Validate response is a list
        assert isinstance(data, list)
        
        # If there are items, validate structure
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "client_name" in item
            assert "timestamp" in item
    
    def test_create_and_verify_status_persistence(self):
        """Create status check and verify it persists via GET"""
        # Create a unique status check
        import uuid
        unique_name = f"TEST_persistence_{uuid.uuid4().hex[:8]}"
        
        # POST to create
        create_response = requests.post(
            f"{BASE_URL}/api/status",
            json={"client_name": unique_name},
            headers={"Content-Type": "application/json"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        created_id = created["id"]
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/status")
        assert get_response.status_code == 200
        all_checks = get_response.json()
        
        # Find our created item
        found = False
        for check in all_checks:
            if check["id"] == created_id:
                found = True
                assert check["client_name"] == unique_name
                break
        
        assert found, f"Created status check with id {created_id} not found in GET response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
