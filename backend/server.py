from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
def clean_mongo(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc
import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- Setup ----------
JWT_ALGORITHM = "HS256"

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="POS Pro API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=60 * 60 * 12, path="/"
    )


def clear_auth_cookie(response: Response):
    response.delete_cookie("access_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_manager(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Manager access required")
    return user


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["manager", "worker"] = "worker"


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class ProductIn(BaseModel):
    name: str
    barcode: Optional[str] = None
    sku: Optional[str] = None
    category: str = "General"
    price: float
    cost: float = 0
    stock: int = 0


class ProductOut(ProductIn):
    id: str
    created_at: str


class CartItem(BaseModel):
    product_id: str
    quantity: int
    price: float  # snapshot of unit price at sale


class SaleIn(BaseModel):
    items: List[CartItem]
    payment_method: Literal["cash", "card", "other"] = "cash"
    discount: float = 0


class PurchaseLine(BaseModel):
    product_id: Optional[str] = None
    barcode: Optional[str] = None
    name: str
    quantity: int
    unit_cost: float


class PurchaseIn(BaseModel):
    supplier: str = ""
    notes: str = ""
    items: List[PurchaseLine]


class ExpenseIn(BaseModel):
    category: str
    amount: float
    note: str = ""
    spent_at: Optional[str] = None  # ISO date
class OrderItem(BaseModel):
    name: str
    quantity: int

class RestaurantOrder(BaseModel):
    table_id: int
    items: List[OrderItem]
    status: str = "NEW"    



# ---------- Auth Endpoints ----------
@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"],
            "name": user["name"], "role": user["role"],
        },
    }


@api.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


# ---------- Users (Manager) ----------
@api.get("/users", response_model=List[UserOut])
async def list_users(_: dict = Depends(require_manager)):
    rows = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return [UserOut(**r) for r in rows]


@api.post("/users", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, _: dict = Depends(require_manager)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name,
        "role": body.role,
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    user.pop("password_hash", None)
    return UserOut(**user)
    #restaurant orders check
@api.post("/restaurant/orders")
async def create_restaurant_order(
    body: RestaurantOrder,
    _: dict = Depends(get_current_user)
):
    try:
        doc = body.model_dump()

        print("STEP 1:", doc)

        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = now_iso()

        print("STEP 2:", doc)

        result = await db.restaurant_orders.insert_one(doc)

        print("STEP 3 inserted:", result.inserted_id)

        return {
            "success": True,
            "id": doc["id"]
        }

    except Exception as e:
        print("ORDER ERROR:", repr(e))
        raise

# Get all restaurant orders
@api.get("/restaurant/orders")
async def get_restaurant_orders(
    _: dict = Depends(get_current_user)
):
    rows = await db.restaurant_orders.find().sort(
        "created_at",
        -1
    ).to_list(100)

    return [clean_mongo(r) for r in rows]


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(require_manager)):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.users.delete_one({"id": user_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}

# ---------- Products ----------
#----- New Code for Low Stock --------------- 17/05/2026
@api.get("/products/low-stock")
async def low_stock_products(_: dict = Depends(get_current_user)):
    rows = await db.products.find({}, {"_id": 0}).to_list(1000)

    low = []

    for p in rows:
        stock = p.get("stock", 0)

        if stock <= 5:
            low.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "sku": p.get("sku", "N/A"),
                "stock": stock,
            })

    return low
@api.get("/reports/top-products")
async def top_products(_: dict = Depends(get_current_user)):
    rows = await db.products.find({}, {"_id": 0}).to_list(1000)

    ranked = sorted(
        rows,
        key=lambda x: x.get("sold", 0),
        reverse=True
    )

    return [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "qty_sold": p.get("sold", 0),
            "revenue": p.get("price", 0) * p.get("sold", 0),
        }
        for p in ranked[:5]
    ]
@api.get("/products", response_model=List[ProductOut])
async def list_products(q: Optional[str] = None, _: dict = Depends(get_current_user)):
    filt = {}
    if q:
        filt = {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"barcode": q},
            {"sku": {"$regex": q, "$options": "i"}},
        ]}
    rows = await db.products.find(filt, {"_id": 0}).sort("name", 1).to_list(1000)
    return [ProductOut(**r) for r in rows]


@api.get("/products/by-barcode/{code}", response_model=ProductOut)
async def get_by_barcode(code: str, _: dict = Depends(get_current_user)):
    row = await db.products.find_one({"barcode": code}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut(**row)


@api.post("/products", response_model=ProductOut, status_code=201)
async def create_product(body: ProductIn, _: dict = Depends(require_manager)):
    if body.barcode and await db.products.find_one({"barcode": body.barcode}):
        raise HTTPException(status_code=400, detail="Barcode already exists")
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return ProductOut(**doc)


@api.put("/products/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, body: ProductIn, _: dict = Depends(require_manager)):
    update = body.model_dump()
    res = await db.products.update_one({"id": product_id}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Product not found")
    row = await db.products.find_one({"id": product_id}, {"_id": 0})
    return ProductOut(**row)
@api.put("/restaurant/orders/{order_id}/complete")
async def complete_order(
    order_id: str,
    _: dict = Depends(get_current_user)
):
    await db.restaurant_orders.update_one(
        {"id": order_id},
        {"$set": {"status": "completed"}}
    )

    return {"success": True}

@api.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_manager)):
    res = await db.products.delete_one({"id": product_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---------- Sales ----------
@api.post("/sales", status_code=201)
async def create_sale(body: SaleIn, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail="Empty cart")

    enriched_items = []
    subtotal = 0.0
    cogs = 0.0  # cost of goods sold

    for it in body.items:
        prod = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not prod:
            raise HTTPException(status_code=400, detail=f"Product not found: {it.product_id}")
        if prod.get("stock", 0) < it.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod['name']}")
        line_total = round(it.price * it.quantity, 2)
        subtotal += line_total
        cogs += round(prod.get("cost", 0) * it.quantity, 2)
        enriched_items.append({
            "product_id": it.product_id,
            "name": prod["name"],
            "quantity": it.quantity,
            "price": it.price,
            "cost": prod.get("cost", 0),
            "line_total": line_total,
        })

    total = round(subtotal - body.discount, 2)
    sale_id = str(uuid.uuid4())
    sale_doc = {
        "id": sale_id,
        "items": enriched_items,
        "subtotal": round(subtotal, 2),
        "discount": body.discount,
        "total": total,
        "cogs": round(cogs, 2),
        "profit": round(total - cogs, 2),
        "payment_method": body.payment_method,
        "cashier_id": user["id"],
        "cashier_name": user["name"],
        "created_at": now_iso(),
    }
    await db.sales.insert_one(sale_doc)

    # decrement stock
    for it in body.items:
        await db.products.update_one({"id": it.product_id}, {"$inc": {"stock": -it.quantity}})

    # notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "type": "sale",
        "title": "New Sale",
        "message": f"{user['name']} • {len(enriched_items)} item(s) • ${total:.2f}",
        "amount": total,
        "ref_id": sale_id,
        "read": False,
        "created_at": now_iso(),
    })

    sale_doc.pop("_id", None)
    return sale_doc


@api.get("/sales")
async def list_sales(limit: int = 100, _: dict = Depends(get_current_user)):
    rows = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return rows


@api.get("/sales/{sale_id}")
async def get_sale(sale_id: str, _: dict = Depends(get_current_user)):
    row = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Sale not found")
    return row


# ---------- Purchases ----------
@api.post("/purchases", status_code=201)
async def create_purchase(body: PurchaseIn, user: dict = Depends(require_manager)):
    if not body.items:
        raise HTTPException(status_code=400, detail="No items")

    total_cost = 0.0
    enriched = []
    for line in body.items:
        prod = None
        if line.product_id:
            prod = await db.products.find_one({"id": line.product_id}, {"_id": 0})
        elif line.barcode:
            prod = await db.products.find_one({"barcode": line.barcode}, {"_id": 0})

        if not prod:
            # create new product
            prod = {
                "id": str(uuid.uuid4()),
                "name": line.name,
                "barcode": line.barcode,
                "sku": None,
                "category": "General",
                "price": round(line.unit_cost * 1.3, 2),  # default markup
                "cost": line.unit_cost,
                "stock": 0,
                "created_at": now_iso(),
            }
            await db.products.insert_one(prod)

        line_total = round(line.unit_cost * line.quantity, 2)
        total_cost += line_total
        enriched.append({
            "product_id": prod["id"],
            "name": prod["name"],
            "barcode": prod.get("barcode"),
            "quantity": line.quantity,
            "unit_cost": line.unit_cost,
            "line_total": line_total,
        })
        await db.products.update_one(
            {"id": prod["id"]},
            {"$inc": {"stock": line.quantity}, "$set": {"cost": line.unit_cost}},
        )

    purchase = {
        "id": str(uuid.uuid4()),
        "supplier": body.supplier,
        "notes": body.notes,
        "items": enriched,
        "total_cost": round(total_cost, 2),
        "created_by": user["id"],
        "created_at": now_iso(),
    }
    await db.purchases.insert_one(purchase)
    purchase.pop("_id", None)
    return purchase


@api.get("/purchases")
async def list_purchases(_: dict = Depends(require_manager)):
    rows = await db.purchases.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


# ---------- Expenses ----------
@api.post("/expenses", status_code=201)
async def create_expense(body: ExpenseIn, user: dict = Depends(require_manager)):
    doc = {
        "id": str(uuid.uuid4()),
        "category": body.category,
        "amount": body.amount,
        "note": body.note,
        "spent_at": body.spent_at or now_iso(),
        "created_by": user["id"],
        "created_at": now_iso(),
    }
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/expenses")
async def list_expenses(_: dict = Depends(require_manager)):
    rows = await db.expenses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, _: dict = Depends(require_manager)):
    res = await db.expenses.delete_one({"id": expense_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ---------- Notifications ----------
@api.get("/notifications")
async def list_notifications(limit: int = 50, _: dict = Depends(get_current_user)):
    rows = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return rows


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, _: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(_: dict = Depends(get_current_user)):
    await db.notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- Reports ----------
def _parse_iso(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


@api.get("/reports/summary")
async def report_summary(period: Literal["day", "month"] = "day", _: dict = Depends(require_manager)):
    now = datetime.now(timezone.utc)
    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    start_iso = start.isoformat()

    sales = await db.sales.find({"created_at": {"$gte": start_iso}}, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find({"created_at": {"$gte": start_iso}}, {"_id": 0}).to_list(5000)
    purchases = await db.purchases.find({"created_at": {"$gte": start_iso}}, {"_id": 0}).to_list(5000)

    revenue = sum(s.get("total", 0) for s in sales)
    cogs = sum(s.get("cogs", 0) for s in sales)
    gross_profit = revenue - cogs
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    purchases_total = sum(p.get("total_cost", 0) for p in purchases)
    net_profit = gross_profit - total_expenses

    return {
        "period": period,
        "start": start_iso,
        "now": now.isoformat(),
        "sales_count": len(sales),
        "revenue": round(revenue, 2),
        "cogs": round(cogs, 2),
        "gross_profit": round(gross_profit, 2),
        "expenses": round(total_expenses, 2),
        "purchases": round(purchases_total, 2),
        "net_profit": round(net_profit, 2),
    }


@api.get("/reports/timeseries")
async def report_timeseries(days: int = 14, _: dict = Depends(require_manager)):
    """Returns daily revenue/profit/expenses for last N days."""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    sales = await db.sales.find({"created_at": {"$gte": start.isoformat()}}, {"_id": 0}).to_list(20000)
    expenses = await db.expenses.find({"created_at": {"$gte": start.isoformat()}}, {"_id": 0}).to_list(20000)

    buckets = {}
    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        buckets[d] = {"date": d, "revenue": 0.0, "profit": 0.0, "expenses": 0.0}

    for s in sales:
        d = _parse_iso(s["created_at"]).date().isoformat()
        if d in buckets:
            buckets[d]["revenue"] += s.get("total", 0)
            buckets[d]["profit"] += s.get("profit", 0)

    for e in expenses:
        d = _parse_iso(e["created_at"]).date().isoformat()
        if d in buckets:
            buckets[d]["expenses"] += e.get("amount", 0)

    series = list(buckets.values())
    for row in series:
        row["revenue"] = round(row["revenue"], 2)
        row["profit"] = round(row["profit"], 2)
        row["expenses"] = round(row["expenses"], 2)
        row["net"] = round(row["profit"] - row["expenses"], 2)
    return series


@api.get("/reports/daily-report")
async def daily_report(_: dict = Depends(require_manager)):
    """Detailed daily sales report (for email or manager review)."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    sales = await db.sales.find({"created_at": {"$gte": start.isoformat()}}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    expenses = await db.expenses.find({"created_at": {"$gte": start.isoformat()}}, {"_id": 0}).to_list(5000)

    # top products by quantity
    counts = {}
    for s in sales:
        for it in s.get("items", []):
            k = it["name"]
            counts.setdefault(k, {"name": k, "quantity": 0, "revenue": 0.0})
            counts[k]["quantity"] += it["quantity"]
            counts[k]["revenue"] += it["line_total"]
    top = sorted(counts.values(), key=lambda x: x["revenue"], reverse=True)[:5]

    revenue = sum(s.get("total", 0) for s in sales)
    cogs = sum(s.get("cogs", 0) for s in sales)
    exp_total = sum(e.get("amount", 0) for e in expenses)

    return {
        "date": start.date().isoformat(),
        "revenue": round(revenue, 2),
        "cogs": round(cogs, 2),
        "gross_profit": round(revenue - cogs, 2),
        "expenses": round(exp_total, 2),
        "net_profit": round(revenue - cogs - exp_total, 2),
        "sales_count": len(sales),
        "top_products": top,
        "recent_sales": sales[:10],
        "expenses_breakdown": expenses,
    }


# ---------- Settings ----------
@api.get("/settings")
async def get_settings(_: dict = Depends(get_current_user)):
    return {
        "currency": os.environ.get("CURRENCY", "AUD"),
        "currency_symbol": os.environ.get("CURRENCY_SYMBOL", "$"),
        "store_name": os.environ.get("STORE_NAME", "My Store"),
    }


# ---------- Startup ----------
async def seed_admin():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("barcode")

    admin_email = os.environ.get("ADMIN_EMAIL", "manager@store.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "manager123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "name": "Store Manager",
            "role": "manager",
            "created_at": now_iso(),
        })
    else:
        if not verify_password(admin_pw, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    worker_email = os.environ.get("WORKER_EMAIL", "worker@store.com").lower()
    worker_pw = os.environ.get("WORKER_PASSWORD", "worker123")
    w = await db.users.find_one({"email": worker_email})
    if not w:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": worker_email,
            "password_hash": hash_password(worker_pw),
            "name": "Cashier",
            "role": "worker",
            "created_at": now_iso(),
        })

    # Seed some sample products if collection empty
    if await db.products.count_documents({}) == 0:
        samples = [
            {"name": "Flat White Coffee", "barcode": "9300000000017", "category": "Beverages", "price": 5.5, "cost": 1.8, "stock": 80},
            {"name": "Sourdough Loaf", "barcode": "9300000000024", "category": "Bakery", "price": 7.9, "cost": 3.1, "stock": 24},
            {"name": "Tim Tam 200g", "barcode": "9300000000031", "category": "Snacks", "price": 4.2, "cost": 2.0, "stock": 60},
            {"name": "Milk 2L Full Cream", "barcode": "9300000000048", "category": "Dairy", "price": 4.0, "cost": 2.4, "stock": 40},
            {"name": "Vegemite 220g", "barcode": "9300000000055", "category": "Pantry", "price": 8.5, "cost": 4.0, "stock": 30},
            {"name": "Bananas 1kg", "barcode": "9300000000062", "category": "Produce", "price": 3.9, "cost": 1.5, "stock": 50},
            {"name": "Eggs 12pk Free Range", "barcode": "9300000000079", "category": "Dairy", "price": 9.5, "cost": 4.5, "stock": 25},
            {"name": "Iced Latte", "barcode": "9300000000086", "category": "Beverages", "price": 6.5, "cost": 2.0, "stock": 45},
        ]
        for s in samples:
            s["id"] = str(uuid.uuid4())
            s["sku"] = None
            s["created_at"] = now_iso()
        await db.products.insert_many(samples)


@app.on_event("startup")
async def on_startup():
    await seed_admin()
    logger.info("Startup complete; admin + sample data seeded.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

frontend_origin = os.environ.get('FRONTEND_URL')
allow_origins = [frontend_origin] if frontend_origin else os.environ.get('CORS_ORIGINS', '*').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://smart-pos-teal.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
