from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import io
import xlsxwriter
from fastapi.responses import StreamingResponse
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# JWT Settings
JWT_SECRET = os.environ.get("JWT_SECRET", "hebron-secret-key-2024")
JWT_ALGORITHM = "HS256"

# Resend Settings
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get(
    "RESEND_FROM",
    "Hebron Schedule <noreply@upperroom.hebronpentecostalassembly.org>",
)

# Pastor (James) lead-summary email settings (Railway env vars)
PASTOR_EMAIL = os.environ.get("PASTOR_EMAIL", "")  # e.g. james@example.com
PASTOR_NAME = os.environ.get("PASTOR_NAME", "James")  # default "James"

# Time for pastor summary email (default 19:00 = 7 PM UK time)
PASTOR_EMAIL_HOUR = int(os.environ.get("PASTOR_EMAIL_HOUR", "19"))
PASTOR_EMAIL_MINUTE = int(os.environ.get("PASTOR_EMAIL_MINUTE", "0"))

# UK Timezone
UK_TZ = pytz.timezone("Europe/London")

# Scheduler for reminder emails
scheduler = AsyncIOScheduler(timezone=UK_TZ)

# Create the main app
app = FastAPI(title="Hebron Pentecostal Assembly - Scheduling API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============


class BookingCreate(BaseModel):
    full_name: str = Field(..., min_length=2)
    role: str = Field(..., pattern="^(Prayer|Worship)$")
    date: str  # Format: YYYY-MM-DD
    notes: Optional[str] = None
    email: Optional[EmailStr] = None


class BookingUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    email: Optional[EmailStr] = None


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    full_name: str
    role: str
    date: str
    time_start: str = "20:00"
    time_end: str = "21:00"
    status: str = "Booked"
    notes: Optional[str] = None
    email: Optional[EmailStr] = None
    edited_by_admin: bool = False
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdminLogin(BaseModel):
    username: str
    password: str


class SlotAvailability(BaseModel):
    date: str
    prayer_available: bool
    prayer_booked_by: Optional[str] = None
    worship_available: bool
    worship_booked_by: Optional[str] = None


# ============== HELPER FUNCTIONS ==============


def format_name_display(full_name: str) -> str:
    """Format name as 'FirstName L.' for privacy"""
    parts = full_name.strip().split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1][0]}."
    return parts[0] if parts else "Anonymous"


def validate_booking_date(date_str: str) -> bool:
    """Check if date is Monday-Thursday and within 1 month"""
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        today = datetime.now()
        one_month_later = today + timedelta(days=31)

        # Check if day is Monday (0) to Thursday (3)
        if date_obj.weekday() > 3:
            return False

        # Check if date is in the future but within 1 month
        if date_obj.date() < today.date():
            return False
        if date_obj.date() > one_month_later.date():
            return False

        return True
    except ValueError:
        return False


def _send_email_via_resend(to_email: str, subject: str, html: str) -> None:
    """
    Send an email using Resend.
    """
    if not to_email:
        return

    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY is not set. Cannot send email.")
        return

    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "hebron-schedule/1.0 (+https://upperroom.hebronpentecostalassembly.org)",
        }
        payload = {
            "from": RESEND_FROM,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }

        resp = requests.post(url, headers=headers, json=payload, timeout=20)

        if resp.status_code < 200 or resp.status_code >= 300:
            body_snippet = (resp.text or "")[:500]
            logger.error(
                f"Failed to send email via Resend. Status={resp.status_code}. Body={body_snippet}"
            )
            resp.raise_for_status()

        logger.info(f"Email sent via Resend to {to_email}")

    except requests.HTTPError as e:
        logger.error(f"Failed to send email via Resend (HTTPError): {e}")
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {e}")


def send_confirmation_email(booking: dict):
    """Send email confirmation via Resend (same template as before)"""
    if not booking.get("email"):
        return

    subject = "Booking Confirmed - Hebron Pentecostal Assembly"
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff5eb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #ea580c; margin-bottom: 20px;">Booking Confirmed!</h1>
            <p>Dear {booking['full_name']},</p>
            <p>Your slot has been successfully booked for the online meeting.</p>
            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Role:</strong> Lead {booking['role']}</p>
                <p><strong>Date:</strong> {booking['date']}</p>
                <p><strong>Time:</strong> 8:00 PM - 9:00 PM (UK Time)</p>
            </div>
            <p>Thank you for your participation.</p>
            <div style="text-align: center; margin: 25px 0;">
                <a href="https://us02web.zoom.us/j/9033071964"
                   style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Join Zoom Meeting
                </a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                If you need to make changes, please contact the admin.
            </p>
        </div>
    </body>
    </html>
    """
    _send_email_via_resend(booking["email"], subject, html)


def send_reminder_email(booking: dict):
    """Send reminder email 4 hours before meeting (same template as before)"""
    if not booking.get("email"):
        return

    subject = "Reminder: Your slot is in 4 hours - Hebron Pentecostal Assembly"
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff5eb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #ea580c; margin-bottom: 20px;">Reminder: Meeting in 4 Hours!</h1>
            <p>Dear {booking['full_name']},</p>
            <p>This is a friendly reminder that you are scheduled to participate in today's online meeting.</p>
            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Role:</strong> Lead {booking['role']}</p>
                <p><strong>Date:</strong> Today ({booking['date']})</p>
                <p><strong>Time:</strong> 8:00 PM - 9:00 PM (UK Time)</p>
            </div>
            <p style="color: #ea580c; font-weight: bold;">Please be ready to join 5-10 minutes early.</p>
            <p>Thank you for your participation.</p>
            <div style="text-align: center; margin: 25px 0;">
                <a href="https://us02web.zoom.us/j/9033071964"
                   style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Join Zoom Meeting
                </a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                If you cannot attend, please contact the admin as soon as possible.
            </p>
        </div>
    </body>
    </html>
    """
    _send_email_via_resend(booking["email"], subject, html)


def send_pastor_leading_email(pastor_email: str, pastor_name: str, today_str: str, prayer_leader: str, worship_leader: str):
    """
    Send a 7PM (configurable) summary to Pastor James:
    - only on Mon-Thu
    - who is leading Prayer and Worship today
    """
    if not pastor_email:
        logger.error("PASTOR_EMAIL is not set. Cannot send pastor summary email.")
        return

    subject = "Today's Upper Room Leading"
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff5eb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #ea580c; margin-bottom: 20px;">Today's Upper Room Leading</h1>
            <p style="margin-top: 0;">Good Evening {pastor_name},</p>
            <p>Here are the leaders scheduled for tonight's Upper Room meeting.</p>

            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date:</strong> {today_str}</p>
                <p><strong>Time:</strong> 8:00 PM - 9:00 PM (UK Time)</p>
            </div>

            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Prayer:</strong> {prayer_leader}</p>
                <p style="margin: 0;"><strong>Worship:</strong> {worship_leader}</p>
            </div>

            <div style="text-align: center; margin: 25px 0;">
                <a href="https://us02web.zoom.us/j/9033071964"
                   style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Join Zoom Meeting
                </a>
            </div>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This message is sent automatically by Hebron Schedule.
            </p>
        </div>
    </body>
    </html>
    """
    _send_email_via_resend(pastor_email, subject, html)


async def send_daily_reminders():
    """Send reminder emails to all participants scheduled for today at 4 PM UK time"""
    try:
        uk_now = datetime.now(UK_TZ)
        today_str = uk_now.strftime("%Y-%m-%d")

        logger.info(f"Running reminder job for {today_str}")

        bookings = await db.bookings.find(
            {
                "date": today_str,
                "status": "Booked",
                "email": {"$ne": None, "$exists": True},
            },
            {"_id": 0},
        ).to_list(100)

        logger.info(f"Found {len(bookings)} bookings with emails for today")

        for booking in bookings:
            if booking.get("email"):
                await asyncio.to_thread(send_reminder_email, booking)
                await asyncio.sleep(1)

        logger.info(f"Completed sending {len(bookings)} reminder emails")
    except Exception as e:
        logger.error(f"Error in send_daily_reminders: {e}")


async def send_pastor_daily_summary():
    """
    Send a message to the pastor at configured time (default 7 PM UK),
    only Monday-Thursday, with who is leading Prayer and Worship today.
    """
    try:
        uk_now = datetime.now(UK_TZ)

        # Only Mon-Thu (0-3)
        if uk_now.weekday() > 3:
            logger.info("Pastor summary skipped (not Mon-Thu).")
            return

        today_str = uk_now.strftime("%Y-%m-%d")
        logger.info(f"Running pastor summary job for {today_str}")

        # Get bookings for today
        todays_bookings = await db.bookings.find(
            {"date": today_str, "status": "Booked"},
            {"_id": 0},
        ).to_list(50)

        prayer_leader = "Not booked"
        worship_leader = "Not booked"

        for b in todays_bookings:
            if b.get("role") == "Prayer":
                prayer_leader = b.get("full_name", "Unknown")
            elif b.get("role") == "Worship":
                worship_leader = b.get("full_name", "Unknown")

        # Send email (in thread so it doesn't block event loop)
        await asyncio.to_thread(
            send_pastor_leading_email,
            PASTOR_EMAIL,
            PASTOR_NAME,
            today_str,
            prayer_leader,
            worship_leader,
        )

        logger.info("Pastor summary email sent (or attempted).")
    except Exception as e:
        logger.error(f"Error in send_pastor_daily_summary: {e}")


async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token for admin routes"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== PUBLIC ROUTES ==============


@api_router.get("/")
async def root():
    return {"message": "Hebron Pentecostal Assembly - Scheduling API"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
    """Create a new booking with slot locking"""

    if not validate_booking_date(booking_data.date):
        raise HTTPException(
            status_code=400,
            detail="Invalid date. Please select Monday-Thursday within the next month.",
        )

    existing = await db.bookings.find_one(
        {"date": booking_data.date, "role": booking_data.role, "status": "Booked"},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="This slot is already taken. Please choose another date.",
        )

    user_booking = await db.bookings.find_one(
        {
            "date": booking_data.date,
            "full_name": {"$regex": f"^{booking_data.full_name}$", "$options": "i"},
            "status": "Booked",
        },
        {"_id": 0},
    )
    if user_booking:
        raise HTTPException(
            status_code=409,
            detail="You already have a booking on this date. Please choose another date.",
        )

    booking = Booking(**booking_data.model_dump())
    doc = booking.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["last_updated_at"] = doc["last_updated_at"].isoformat()

    result = await db.bookings.update_one(
        {"date": booking_data.date, "role": booking_data.role, "status": "Booked"},
        {"$setOnInsert": doc},
        upsert=True,
    )

    if result.matched_count > 0:
        raise HTTPException(
            status_code=409,
            detail="This slot is already taken. Please choose another date.",
        )

    if booking_data.email:
        asyncio.create_task(asyncio.to_thread(send_confirmation_email, doc))

    return booking


@api_router.get("/bookings/availability")
async def get_availability(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
):
    """Get slot availability for a date range"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    bookings = await db.bookings.find(
        {"date": {"$gte": start_date, "$lte": end_date}, "status": "Booked"},
        {"_id": 0},
    ).to_list(1000)

    availability = {}
    current = start
    while current <= end:
        if current.weekday() <= 3:
            date_str = current.strftime("%Y-%m-%d")
            availability[date_str] = {
                "date": date_str,
                "prayer_available": True,
                "prayer_booked_by": None,
                "worship_available": True,
                "worship_booked_by": None,
            }
        current += timedelta(days=1)

    for booking in bookings:
        date_str = booking["date"]
        if date_str in availability:
            if booking["role"] == "Prayer":
                availability[date_str]["prayer_available"] = False
                availability[date_str]["prayer_booked_by"] = format_name_display(
                    booking["full_name"]
                )
            elif booking["role"] == "Worship":
                availability[date_str]["worship_available"] = False
                availability[date_str]["worship_booked_by"] = format_name_display(
                    booking["full_name"]
                )

    return list(availability.values())


@api_router.get("/bookings/public")
async def get_public_bookings():
    """Get all bookings for public calendar view"""
    bookings = await db.bookings.find(
        {"status": "Booked"},
        {"_id": 0, "email": 0, "notes": 0},
    ).to_list(1000)

    for booking in bookings:
        booking["display_name"] = format_name_display(booking["full_name"])
        if isinstance(booking.get("created_at"), str):
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
        if isinstance(booking.get("last_updated_at"), str):
            booking["last_updated_at"] = datetime.fromisoformat(
                booking["last_updated_at"]
            )

    return bookings


# ============== ADMIN ROUTES ==============


@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login"""
    if credentials.username == "admin" and credentials.password == "hebronadmin123":
        token = jwt.encode(
            {
                "username": credentials.username,
                "role": "admin",
                "exp": datetime.now(timezone.utc) + timedelta(hours=24),
            },
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        return {"token": token, "username": credentials.username}

    raise HTTPException(status_code=401, detail="Invalid credentials")


@api_router.get("/admin/bookings", response_model=List[Booking])
async def get_admin_bookings(
    admin: dict = Depends(verify_admin_token),
    date_filter: Optional[str] = None,
    role_filter: Optional[str] = None,
    name_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
):
    """Get all bookings with filters (admin only)"""
    query = {}

    if date_filter:
        query["date"] = date_filter
    if role_filter:
        query["role"] = role_filter
    if name_filter:
        query["full_name"] = {"$regex": name_filter, "$options": "i"}
    if status_filter:
        query["status"] = status_filter

    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", -1).to_list(1000)

    for booking in bookings:
        if isinstance(booking.get("created_at"), str):
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
        if isinstance(booking.get("last_updated_at"), str):
            booking["last_updated_at"] = datetime.fromisoformat(
                booking["last_updated_at"]
            )

    return bookings


@api_router.put("/admin/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    update_data: BookingUpdate,
    admin: dict = Depends(verify_admin_token),
):
    """Update a booking (admin only)"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}

    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "date" in update_dict or "role" in update_dict:
        existing = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Booking not found")

        check_date = update_dict.get("date", existing["date"])
        check_role = update_dict.get("role", existing["role"])

        conflict = await db.bookings.find_one(
            {
                "date": check_date,
                "role": check_role,
                "status": "Booked",
                "id": {"$ne": booking_id},
            },
            {"_id": 0},
        )

        if conflict:
            raise HTTPException(
                status_code=409,
                detail="This slot is already taken by another booking.",
            )

    update_dict["edited_by_admin"] = True
    update_dict["last_updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.bookings.update_one({"id": booking_id}, {"$set": update_dict})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated


@api_router.delete("/admin/bookings/{booking_id}")
async def delete_booking(booking_id: str, admin: dict = Depends(verify_admin_token)):
    """Delete a booking (admin only)"""
    result = await db.bookings.delete_one({"id": booking_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {"message": "Booking deleted successfully"}


@api_router.post("/admin/bookings/{booking_id}/unlock")
async def unlock_slot(booking_id: str, admin: dict = Depends(verify_admin_token)):
    """Unlock a slot by cancelling the booking"""
    result = await db.bookings.update_one(
        {"id": booking_id},
        {
            "$set": {
                "status": "Cancelled",
                "edited_by_admin": True,
                "last_updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {"message": "Slot unlocked successfully"}


# ============== ANALYTICS ROUTES ==============


@api_router.get("/admin/analytics")
async def get_analytics(
    admin: dict = Depends(verify_admin_token),
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    """Get ministry role tracking analytics"""
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    start_date = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        end_date = f"{target_year + 1}-01-01"
    else:
        end_date = f"{target_year}-{target_month + 1:02d}-01"

    pipeline = [
        {"$match": {"date": {"$gte": start_date, "$lt": end_date}, "status": "Booked"}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}},
    ]

    role_stats = await db.bookings.aggregate(pipeline).to_list(100)

    participant_pipeline = [
        {"$match": {"date": {"$gte": start_date, "$lt": end_date}, "status": "Booked"}},
        {
            "$group": {
                "_id": "$full_name",
                "total_bookings": {"$sum": 1},
                "prayer_count": {"$sum": {"$cond": [{"$eq": ["$role", "Prayer"]}, 1, 0]}},
                "worship_count": {"$sum": {"$cond": [{"$eq": ["$role", "Worship"]}, 1, 0]}},
            }
        },
        {"$sort": {"total_bookings": -1}},
    ]

    participants = await db.bookings.aggregate(participant_pipeline).to_list(100)

    prayer_total = next((s["count"] for s in role_stats if s["_id"] == "Prayer"), 0)
    worship_total = next((s["count"] for s in role_stats if s["_id"] == "Worship"), 0)

    return {
        "month": target_month,
        "year": target_year,
        "prayer_slots": prayer_total,
        "worship_slots": worship_total,
        "total_bookings": prayer_total + worship_total,
        "participants": [
            {
                "name": p["_id"],
                "total_bookings": p["total_bookings"],
                "prayer_count": p["prayer_count"],
                "worship_count": p["worship_count"],
            }
            for p in participants
        ],
    }


@api_router.get("/admin/participant-history")
async def get_participant_history(name: str, admin: dict = Depends(verify_admin_token)):
    """Get serving history for a specific participant"""
    bookings = await db.bookings.find(
        {"full_name": {"$regex": name, "$options": "i"}, "status": "Booked"},
        {"_id": 0},
    ).sort("date", -1).to_list(1000)

    prayer_count = sum(1 for b in bookings if b["role"] == "Prayer")
    worship_count = sum(1 for b in bookings if b["role"] == "Worship")

    return {
        "name": name,
        "total_services": len(bookings),
        "prayer_count": prayer_count,
        "worship_count": worship_count,
        "history": bookings,
    }


# ============== REPORTS ROUTES ==============


@api_router.get("/admin/reports/monthly")
async def get_monthly_report(month: int, year: int, admin: dict = Depends(verify_admin_token)):
    """Generate monthly report"""
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"

    bookings = await db.bookings.find(
        {"date": {"$gte": start_date, "$lt": end_date}, "status": "Booked"},
        {"_id": 0},
    ).to_list(1000)

    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    available_days = 0
    current = start
    while current < end:
        if current.weekday() <= 3:
            available_days += 1
        current += timedelta(days=1)

    total_available_slots = available_days * 2

    prayer_count = sum(1 for b in bookings if b["role"] == "Prayer")
    worship_count = sum(1 for b in bookings if b["role"] == "Worship")

    participation_rate = (len(bookings) / total_available_slots * 100) if total_available_slots > 0 else 0

    participant_counts = {}
    for b in bookings:
        name = b["full_name"]
        participant_counts[name] = participant_counts.get(name, 0) + 1

    top_participants = sorted(
        [{"name": k, "count": v} for k, v in participant_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    prev_start = f"{prev_year}-{prev_month:02d}-01"

    prev_bookings = await db.bookings.find(
        {"date": {"$gte": prev_start, "$lt": start_date}, "status": "Booked"},
        {"_id": 0},
    ).to_list(1000)

    prev_participants = set(b["full_name"] for b in prev_bookings)
    current_participants = set(b["full_name"] for b in bookings)
    inactive = list(prev_participants - current_participants)

    return {
        "month": month,
        "year": year,
        "total_available_slots": total_available_slots,
        "total_prayer_bookings": prayer_count,
        "total_worship_bookings": worship_count,
        "total_bookings": len(bookings),
        "participation_rate": round(participation_rate, 1),
        "top_participants": top_participants,
        "inactive_members": inactive[:10],
    }


# ============== EXPORT ROUTES ==============


@api_router.get("/admin/export/csv")
async def export_bookings_csv(
    admin: dict = Depends(verify_admin_token),
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    """Export bookings as CSV"""
    query = {"status": "Booked"}

    if month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}

    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", 1).to_list(10000)

    output = io.StringIO()
    output.write("ID,Full Name,Role,Date,Time,Status,Notes,Created At\n")

    for b in bookings:
        output.write(
            f"{b.get('id','')},{b.get('full_name','')},{b.get('role','')},{b.get('date','')},8:00 PM - 9:00 PM,{b.get('status','')},{b.get('notes','') or ''},{b.get('created_at','')}\n"
        )

    output.seek(0)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bookings_{datetime.now().strftime('%Y%m%d')}.csv"},
    )


@api_router.get("/admin/export/excel")
async def export_bookings_excel(
    admin: dict = Depends(verify_admin_token),
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    """Export bookings as Excel"""
    query = {"status": "Booked"}

    if month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}

    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", 1).to_list(10000)

    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Bookings")

    headers = ["ID", "Full Name", "Role", "Date", "Time", "Status", "Notes", "Created At"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)

    for row, b in enumerate(bookings, start=1):
        worksheet.write(row, 0, b.get("id", ""))
        worksheet.write(row, 1, b.get("full_name", ""))
        worksheet.write(row, 2, b.get("role", ""))
        worksheet.write(row, 3, b.get("date", ""))
        worksheet.write(row, 4, "8:00 PM - 9:00 PM")
        worksheet.write(row, 5, b.get("status", ""))
        worksheet.write(row, 6, b.get("notes", "") or "")
        worksheet.write(row, 7, str(b.get("created_at", "")))

    workbook.close()
    output.seek(0)

    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=bookings_{datetime.now().strftime('%Y%m%d')}.xlsx"},
    )


# Admin endpoint to manually trigger reminders (for testing)
@api_router.post("/admin/send-reminders")
async def trigger_reminders(admin: dict = Depends(verify_admin_token)):
    """Manually trigger reminder emails for today's bookings (admin only)"""
    await send_daily_reminders()
    return {"message": "Reminder emails sent for today's bookings"}


# Admin endpoint to manually trigger pastor summary (for testing)
@api_router.post("/admin/send-pastor-summary")
async def trigger_pastor_summary(admin: dict = Depends(verify_admin_token)):
    """Manually trigger pastor summary email (admin only)"""
    await send_pastor_daily_summary()
    return {"message": "Pastor summary email sent (or attempted)."}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== SCHEDULER SETUP ==============


@app.on_event("startup")
async def startup_scheduler():
    """Start the scheduler on app startup"""

    # Member reminder at 4:00 PM UK time (4 hours before 8 PM meeting)
    scheduler.add_job(
        send_daily_reminders,
        CronTrigger(hour=16, minute=0, timezone=UK_TZ),
        id="daily_reminder",
        replace_existing=True,
    )

    # Pastor summary at configurable time (default 19:00 UK time)
    scheduler.add_job(
        send_pastor_daily_summary,
        CronTrigger(hour=PASTOR_EMAIL_HOUR, minute=PASTOR_EMAIL_MINUTE, timezone=UK_TZ),
        id="pastor_summary",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started (member reminders + pastor summary enabled).")
    logger.info("Member reminder: 4:00 PM UK time.")
    logger.info(f"Pastor summary: {PASTOR_EMAIL_HOUR:02d}:{PASTOR_EMAIL_MINUTE:02d} UK time.")


@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()
    logger.info("Scheduler and database connection closed")
