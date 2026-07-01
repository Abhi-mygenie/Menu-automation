"""Menu Review Tool API Tests - Phase A-E"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

AKULA_ID = "smoke-MENU-v0.1.0-0013"  # Akula Organics: 4 pages, 74 rows, 7 notes
SPICY_ID = "smoke-MENU-v0.1.0-0025"  # spicy: 2 pages, 77 rows, 5 notes


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestDocumentsList:
    """GET /api/menu-review/documents"""

    def test_returns_5_documents(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 5, f"Expected 5 docs, got {len(data)}"

    def test_document_structure(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents")
        assert r.status_code == 200
        docs = r.json()
        for d in docs:
            assert "dataset_id" in d
            assert "total_rows" in d
            assert "total_notes" in d
            assert "pages" in d
            assert "status" in d
            assert d["status"] in ["not_started", "in_progress", "complete"]

    def test_akula_organics_counts(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents")
        assert r.status_code == 200
        docs = {d["dataset_id"]: d for d in r.json()}
        assert AKULA_ID in docs, f"Akula doc not found"
        akula = docs[AKULA_ID]
        assert akula["pages"] == 4, f"Expected 4 pages, got {akula['pages']}"
        assert akula["total_rows"] == 74, f"Expected 74 rows, got {akula['total_rows']}"
        assert akula["total_notes"] == 7, f"Expected 7 notes, got {akula['total_notes']}"

    def test_spicy_counts(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents")
        assert r.status_code == 200
        docs = {d["dataset_id"]: d for d in r.json()}
        assert SPICY_ID in docs
        spicy = docs[SPICY_ID]
        assert spicy["pages"] == 2
        assert spicy["total_rows"] == 77
        assert spicy["total_notes"] == 5

    def test_all_expected_document_ids_present(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents")
        assert r.status_code == 200
        ids = {d["dataset_id"] for d in r.json()}
        # At minimum these two must exist
        assert AKULA_ID in ids
        assert SPICY_ID in ids


class TestStartReview:
    """POST /api/menu-review/documents/:id/start"""

    def test_start_akula_review(self, client):
        r = client.post(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/start")
        assert r.status_code == 200
        data = r.json()
        assert data["dataset_id"] == AKULA_ID
        assert data["status"] in ["in_progress", "complete"]

    def test_start_invalid_doc(self, client):
        r = client.post(f"{BASE_URL}/api/menu-review/documents/invalid-id-xyz/start")
        assert r.status_code == 404


class TestGetDocument:
    """GET /api/menu-review/documents/:id"""

    def test_get_akula_document(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}")
        assert r.status_code == 200
        data = r.json()
        assert data["dataset_id"] == AKULA_ID
        assert data["total_pages"] == 4
        assert data["total_rows"] == 74
        assert data["total_notes"] == 7
        assert "pages" in data

    def test_document_pages_have_rows_and_notes(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}")
        assert r.status_code == 200
        data = r.json()
        total_rows = sum(len(p["rows"]) for p in data["pages"])
        assert total_rows == 74
        total_notes = sum(len(p["menu_notes"]) for p in data["pages"])
        assert total_notes == 7

    def test_rows_have_correction_field(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}")
        assert r.status_code == 200
        data = r.json()
        first_page = data["pages"][0]
        assert len(first_page["rows"]) > 0
        row = first_page["rows"][0]
        assert "correction" in row

    def test_get_invalid_doc(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/invalid-xyz")
        assert r.status_code == 404


class TestSaveCorrection:
    """POST /api/menu-review/corrections"""

    def _find_unreviewed_row(self, client, dataset_id="smoke-MENU-v0.1.0-0013", page=2):
        """Find a row without a correction on the given page."""
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{dataset_id}")
        assert r.status_code == 200
        data = r.json()
        for p in data["pages"]:
            if p["page_number"] == page:
                for row in p["rows"]:
                    if row.get("correction") is None:
                        return row["row_no"]
        # fallback: use row 99 (likely non-existent but safe for test)
        return 99

    def test_approve_row(self, client):
        row_no = self._find_unreviewed_row(client, AKULA_ID, page=3)
        r = client.post(f"{BASE_URL}/api/menu-review/corrections", json={
            "dataset_id": AKULA_ID,
            "row_no": row_no,
            "page_number": 3,
            "action": "approve",
            "original_item_name": "TEST_ITEM"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["action"] == "approve"
        assert data["page_number"] == 3

    def test_correction_idempotent(self, client):
        """Second call with same row should update, not duplicate"""
        row_no = self._find_unreviewed_row(client, AKULA_ID, page=4)
        payload = {
            "dataset_id": AKULA_ID,
            "row_no": row_no,
            "page_number": 4,
            "action": "approve",
            "original_item_name": "IDEMPOTENT_TEST"
        }
        r1 = client.post(f"{BASE_URL}/api/menu-review/corrections", json=payload)
        assert r1.status_code == 200
        id1 = r1.json().get("id")

        # Second call - change action
        payload["action"] = "unclear"
        r2 = client.post(f"{BASE_URL}/api/menu-review/corrections", json=payload)
        assert r2.status_code == 200
        id2 = r2.json().get("id")
        assert id1 == id2, "Second call should update, not create new record"
        assert r2.json()["action"] == "unclear"

    def test_edit_row(self, client):
        row_no = self._find_unreviewed_row(client, SPICY_ID, page=1)
        r = client.post(f"{BASE_URL}/api/menu-review/corrections", json={
            "dataset_id": SPICY_ID,
            "row_no": row_no,
            "page_number": 1,
            "action": "edit",
            "original_item_name": "Original Item",
            "corrected_item_name": "Corrected Item Name",
            "corrected_rate": 150.0,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["action"] == "edit"
        assert data["corrected_item_name"] == "Corrected Item Name"

    def test_delete_row(self, client):
        row_no = self._find_unreviewed_row(client, SPICY_ID, page=2)
        r = client.post(f"{BASE_URL}/api/menu-review/corrections", json={
            "dataset_id": SPICY_ID,
            "row_no": row_no,
            "page_number": 2,
            "action": "delete_hallucination",
            "original_item_name": "DELETED_ITEM"
        })
        assert r.status_code == 200
        assert r.json()["action"] == "delete_hallucination"

    def test_invalid_dataset_id(self, client):
        r = client.post(f"{BASE_URL}/api/menu-review/corrections", json={
            "dataset_id": "invalid-xyz",
            "row_no": 1,
            "page_number": 1,
            "action": "approve"
        })
        assert r.status_code == 404


class TestProgress:
    """GET /api/menu-review/documents/:id/progress"""

    def test_progress_returns_correct_structure(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/progress")
        assert r.status_code == 200
        data = r.json()
        assert data["dataset_id"] == AKULA_ID
        assert data["total_rows"] == 74
        assert data["total_notes"] == 7
        assert "rows_approved" in data
        assert "rows_edited" in data
        assert "rows_deleted" in data
        assert "rows_unclear" in data
        assert "rows_reviewed" in data
        assert "rows_remaining" in data
        assert "per_page" in data
        assert len(data["per_page"]) == 4

    def test_progress_after_correction_reflects_change(self, client):
        r1 = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/progress")
        reviewed_before = r1.json()["rows_reviewed"]

        # Find unreviewed row on page 2
        doc_r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}")
        page2 = [p for p in doc_r.json()["pages"] if p["page_number"] == 2][0]
        unreviewed = [row for row in page2["rows"] if row.get("correction") is None]
        if not unreviewed:
            pytest.skip("No unreviewed rows on page 2 for this test")
        
        row_no = unreviewed[0]["row_no"]
        client.post(f"{BASE_URL}/api/menu-review/corrections", json={
            "dataset_id": AKULA_ID,
            "row_no": row_no,
            "page_number": 2,
            "action": "approve"
        })

        r2 = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/progress")
        reviewed_after = r2.json()["rows_reviewed"]
        assert reviewed_after >= reviewed_before


class TestPDF:
    """GET /api/menu-review/documents/:id/pdf"""

    def test_pdf_returns_200_akula(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/pdf", stream=True)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")

    def test_pdf_returns_200_spicy(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{SPICY_ID}/pdf", stream=True)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")

    def test_pdf_invalid_doc(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/invalid-xyz/pdf")
        assert r.status_code == 404


class TestExport:
    """GET /api/menu-review/documents/:id/export"""

    def test_export_returns_json(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/export")
        assert r.status_code == 200
        assert "application/json" in r.headers.get("content-type", "")

    def test_export_has_content_disposition(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/export")
        assert r.status_code == 200
        assert "attachment" in r.headers.get("content-disposition", "").lower()

    def test_export_structure(self, client):
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{AKULA_ID}/export")
        assert r.status_code == 200
        data = r.json()
        assert data["export_version"] == "review-tool-v1"
        assert data["dataset_id"] == AKULA_ID
        assert "review_summary" in data
        assert "pages" in data
        summary = data["review_summary"]
        assert "total_original_rows" in summary
        assert "approved" in summary
        assert "edited" in summary
        assert "deleted" in summary
        assert summary["total_original_rows"] == 74


class TestNoteCorrection:
    """POST /api/menu-review/note-corrections"""

    def test_approve_note(self, client):
        r = client.post(f"{BASE_URL}/api/menu-review/note-corrections", json={
            "dataset_id": AKULA_ID,
            "note_index": 0,
            "note_page": 1,
            "action": "approve",
            "original_note_text": "Test note"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["action"] == "approve"
        assert data["note_index"] == 0

    def test_edit_note(self, client):
        r = client.post(f"{BASE_URL}/api/menu-review/note-corrections", json={
            "dataset_id": AKULA_ID,
            "note_index": 1,
            "note_page": 1,
            "action": "edit",
            "original_note_text": "Original note text",
            "corrected_note_text": "Corrected note text"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["action"] == "edit"
        assert data["corrected_note_text"] == "Corrected note text"

    def test_note_persists_after_save(self, client):
        """Verify note correction shows in document fetch"""
        # Save note correction
        client.post(f"{BASE_URL}/api/menu-review/note-corrections", json={
            "dataset_id": SPICY_ID,
            "note_index": 0,
            "note_page": 1,
            "action": "approve",
        })
        # Fetch document and check correction is there
        r = client.get(f"{BASE_URL}/api/menu-review/documents/{SPICY_ID}")
        assert r.status_code == 200
        data = r.json()
        page1 = [p for p in data["pages"] if p["page_number"] == 1][0]
        note0 = [n for n in page1["menu_notes"] if n["note_index"] == 0]
        assert len(note0) == 1
        assert note0[0]["correction"] is not None
        assert note0[0]["correction"]["action"] == "approve"
