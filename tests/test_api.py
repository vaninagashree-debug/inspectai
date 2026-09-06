import unittest
from fastapi.testclient import TestClient
import json

import asyncio
from backend.main import app, seed_database
from backend.db.database import engine, Base

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_database()

class TestVisionGuardAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())
        cls.client = TestClient(app)

    def test_health_check_or_auth_routes(self):
        # Test registering a user
        reg_payload = {
            "username": "test_user_inspector",
            "password": "password123",
            "role": "Quality Inspector",
            "full_name": "Test Inspector"
        }
        res_reg = self.client.post("/api/auth/register", json=reg_payload)
        # 200 or 400 (if already exists) are fine for test run resiliency
        self.assertIn(res_reg.status_code, [200, 400])

        # Test login
        login_data = {
            "username": "test_user_inspector",
            "password": "password123"
        }
        res_login = self.client.post("/api/auth/login", data=login_data)
        self.assertEqual(res_login.status_code, 200)
        token_data = res_login.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["role"], "Quality Inspector")
        self.assertEqual(token_data["token_type"], "bearer")
        
        # Save token for subsequent calls
        self.token = token_data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_rules_crud(self):
        # Login as Admin (default seeded)
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        res_login = self.client.post("/api/auth/login", data=login_data)
        self.assertEqual(res_login.status_code, 200)
        admin_token = res_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a Quality Rule
        rule_payload = {
            "name": "Line 2 Crack Check",
            "task_type": "classification",
            "class_name": "crack",
            "operator": ">",
            "threshold": 0.80,
            "severity": "High",
            "is_active": True
        }
        res_rule = self.client.post("/api/rules/quality", json=rule_payload, headers=admin_headers)
        self.assertEqual(res_rule.status_code, 200)
        rule_data = res_rule.json()
        self.assertEqual(rule_data["name"], "Line 2 Crack Check")
        self.assertTrue(rule_data["id"] > 0)
        
        rule_id = rule_data["id"]

        # List Rules
        res_list = self.client.get("/api/rules/quality")
        self.assertEqual(res_list.status_code, 200)
        self.assertTrue(len(res_list.json()) > 0)

        # Update Rule
        rule_payload["threshold"] = 0.85
        res_up = self.client.put(f"/api/rules/quality/{rule_id}", json=rule_payload, headers=admin_headers)
        self.assertEqual(res_up.status_code, 200)
        self.assertEqual(res_up.json()["threshold"], 0.85)

        # Delete Rule
        res_del = self.client.delete(f"/api/rules/quality/{rule_id}", headers=admin_headers)
        self.assertEqual(res_del.status_code, 204)

    def test_system_settings_endpoints(self):
        # Login as Admin
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        res_login = self.client.post("/api/auth/login", data=login_data)
        admin_token = res_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a setting with a unique key
        import uuid
        sett_payload = {
            "key": f"test_setting_{uuid.uuid4().hex[:8]}",
            "value": "123",
            "group": "general"
        }
        res_sett = self.client.post("/api/rules/settings", json=sett_payload, headers=admin_headers)
        self.assertEqual(res_sett.status_code, 200)
        sett_id = res_sett.json()["id"]

        # List settings
        res_list = self.client.get("/api/rules/settings")
        self.assertEqual(res_list.status_code, 200)
        self.assertTrue(len(res_list.json()) > 0)

    def test_analytics_summary(self):
        res = self.client.get("/api/analytics/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_inspected", data)
        self.assertIn("yield_rate", data)
        self.assertIn("defect_distribution", data)

        res_trend = self.client.get("/api/analytics/trends")
        self.assertEqual(res_trend.status_code, 200)
        self.assertTrue(len(res_trend.json()) > 0)

if __name__ == '__main__':
    unittest.main()
