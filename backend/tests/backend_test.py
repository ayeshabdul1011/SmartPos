"""Backend API tests for POS Pro covering auth, products, sales, purchases,
expenses, notifications, reports and users.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

MANAGER = {"email": "manager@store.com", "password": "manager123"}
WORKER = {"email": "worker@store.com", "password": "worker123"}


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def manager_token():
    r = requests.post(f"{API}/auth/login", json=MANAGER, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def worker_token():
    r = requests.post(f"{API}/auth/login", json=WORKER, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_manager(self):
        r = requests.post(f"{API}/auth/login", json=MANAGER, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and data["user"]["role"] == "manager"
        assert data["user"]["email"] == MANAGER["email"]

    def test_login_worker(self):
        r = requests.post(f"{API}/auth/login", json=WORKER, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "worker"

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": MANAGER["email"], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_auth_me(self, manager_token):
        r = requests.get(f"{API}/auth/me", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "manager"

    def test_auth_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Products ----------
class TestProducts:
    def test_list_products_seeded(self, manager_token):
        r = requests.get(f"{API}/products", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) >= 8
        names = {p["name"] for p in prods}
        assert "Flat White Coffee" in names

    def test_get_by_barcode(self, manager_token):
        r = requests.get(f"{API}/products/by-barcode/9300000000017", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "Flat White Coffee"

    def test_get_by_barcode_404(self, manager_token):
        r = requests.get(f"{API}/products/by-barcode/0000000000000", headers=H(manager_token), timeout=15)
        assert r.status_code == 404

    def test_create_product_as_manager(self, manager_token):
        body = {"name": "TEST_Widget", "barcode": "TEST_BC_1", "category": "Test", "price": 10.0, "cost": 4.0, "stock": 20}
        r = requests.post(f"{API}/products", json=body, headers=H(manager_token), timeout=15)
        assert r.status_code == 201, r.text
        pid = r.json()["id"]
        # Verify via list
        r2 = requests.get(f"{API}/products?q=TEST_Widget", headers=H(manager_token), timeout=15)
        assert any(p["id"] == pid for p in r2.json())
        # cleanup
        requests.delete(f"{API}/products/{pid}", headers=H(manager_token), timeout=15)

    def test_worker_cannot_create_product(self, worker_token):
        body = {"name": "TEST_NoPerm", "price": 1.0}
        r = requests.post(f"{API}/products", json=body, headers=H(worker_token), timeout=15)
        assert r.status_code == 403


# ---------- Sales ----------
class TestSales:
    def test_create_sale_decrements_stock_and_creates_notif(self, worker_token, manager_token):
        # get a product
        prods = requests.get(f"{API}/products", headers=H(worker_token), timeout=15).json()
        prod = next(p for p in prods if p["stock"] >= 2)
        initial = prod["stock"]
        body = {"items": [{"product_id": prod["id"], "quantity": 2, "price": prod["price"]}], "payment_method": "cash"}
        r = requests.post(f"{API}/sales", json=body, headers=H(worker_token), timeout=15)
        assert r.status_code == 201, r.text
        sale = r.json()
        assert sale["total"] == round(prod["price"] * 2, 2)
        assert "profit" in sale and "cogs" in sale
        # verify stock decremented
        p2 = requests.get(f"{API}/products?q={prod['name']}", headers=H(worker_token), timeout=15).json()
        new_stock = next(x["stock"] for x in p2 if x["id"] == prod["id"])
        assert new_stock == initial - 2
        # notification
        notifs = requests.get(f"{API}/notifications", headers=H(manager_token), timeout=15).json()
        assert any(n.get("ref_id") == sale["id"] for n in notifs)

    def test_sale_insufficient_stock(self, worker_token):
        prods = requests.get(f"{API}/products", headers=H(worker_token), timeout=15).json()
        prod = prods[0]
        body = {"items": [{"product_id": prod["id"], "quantity": prod["stock"] + 9999, "price": prod["price"]}]}
        r = requests.post(f"{API}/sales", json=body, headers=H(worker_token), timeout=15)
        assert r.status_code == 400


# ---------- Purchases ----------
class TestPurchases:
    def test_manager_create_purchase_increments_stock(self, manager_token):
        prods = requests.get(f"{API}/products", headers=H(manager_token), timeout=15).json()
        prod = prods[0]
        initial = prod["stock"]
        body = {"supplier": "TEST_Sup", "items": [{"product_id": prod["id"], "name": prod["name"], "quantity": 5, "unit_cost": prod.get("cost", 1.0)}]}
        r = requests.post(f"{API}/purchases", json=body, headers=H(manager_token), timeout=15)
        assert r.status_code == 201, r.text
        p2 = requests.get(f"{API}/products?q={prod['name']}", headers=H(manager_token), timeout=15).json()
        new_stock = next(x["stock"] for x in p2 if x["id"] == prod["id"])
        assert new_stock == initial + 5

    def test_worker_cannot_purchase(self, worker_token):
        body = {"items": [{"name": "X", "quantity": 1, "unit_cost": 1.0}]}
        r = requests.post(f"{API}/purchases", json=body, headers=H(worker_token), timeout=15)
        assert r.status_code == 403


# ---------- Expenses ----------
class TestExpenses:
    def test_manager_creates_expense(self, manager_token):
        body = {"category": "TEST_Rent", "amount": 100.0, "note": "TEST"}
        r = requests.post(f"{API}/expenses", json=body, headers=H(manager_token), timeout=15)
        assert r.status_code == 201
        eid = r.json()["id"]
        lst = requests.get(f"{API}/expenses", headers=H(manager_token), timeout=15).json()
        assert any(e["id"] == eid for e in lst)
        requests.delete(f"{API}/expenses/{eid}", headers=H(manager_token), timeout=15)

    def test_worker_cannot_expense(self, worker_token):
        r = requests.post(f"{API}/expenses", json={"category": "X", "amount": 1.0}, headers=H(worker_token), timeout=15)
        assert r.status_code == 403


# ---------- Notifications ----------
class TestNotifications:
    def test_list_notifications(self, manager_token):
        r = requests.get(f"{API}/notifications", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_mark_all_read(self, manager_token):
        r = requests.post(f"{API}/notifications/read-all", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        notifs = requests.get(f"{API}/notifications", headers=H(manager_token), timeout=15).json()
        assert all(n["read"] for n in notifs)


# ---------- Reports ----------
class TestReports:
    def test_summary_day(self, manager_token):
        r = requests.get(f"{API}/reports/summary?period=day", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("revenue", "cogs", "gross_profit", "expenses", "net_profit"):
            assert k in d

    def test_summary_month(self, manager_token):
        r = requests.get(f"{API}/reports/summary?period=month", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["period"] == "month"

    def test_timeseries_14(self, manager_token):
        r = requests.get(f"{API}/reports/timeseries?days=14", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 14

    def test_daily_report(self, manager_token):
        r = requests.get(f"{API}/reports/daily-report", headers=H(manager_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "top_products" in d and "recent_sales" in d

    def test_worker_cannot_access_reports(self, worker_token):
        r = requests.get(f"{API}/reports/summary?period=day", headers=H(worker_token), timeout=15)
        assert r.status_code == 403


# ---------- Users ----------
class TestUsers:
    def test_worker_cannot_list_users(self, worker_token):
        r = requests.get(f"{API}/users", headers=H(worker_token), timeout=15)
        assert r.status_code == 403

    def test_manager_creates_user(self, manager_token):
        import uuid
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        body = {"email": email, "password": "pass1234", "name": "TEST_User", "role": "worker"}
        r = requests.post(f"{API}/users", json=body, headers=H(manager_token), timeout=15)
        assert r.status_code == 201, r.text
        uid = r.json()["id"]
        assert r.json()["role"] == "worker"
        # cleanup
        requests.delete(f"{API}/users/{uid}", headers=H(manager_token), timeout=15)
