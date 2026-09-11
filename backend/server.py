from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Response, Request
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
import re
import xlsxwriter
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET") or os.urandom(32).hex()
JWT_ALGORITHM = "HS256"
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get(
    "RESEND_FROM",
    "Hebron Schedule <noreply@upperroom.hebronpentecostalassembly.org>",
)

WHATSAPP_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_BUSINESS_ACCOUNT_ID = os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
WHATSAPP_ENABLED = os.environ.get("WHATSAPP_ENABLED", "false").strip().lower() in {
    "1", "true", "yes", "on"
}
WHATSAPP_API_VERSION = os.environ.get("WHATSAPP_API_VERSION", "v26.0")
WHATSAPP_TEMPLATE_LANGUAGE = os.environ.get("WHATSAPP_TEMPLATE_LANGUAGE", "en")
WHATSAPP_CONFIRMATION_TEMPLATE = os.environ.get(
    "WHATSAPP_CONFIRMATION_TEMPLATE", "upperroom_booking_confirmation"
)
WHATSAPP_REMINDER_TEMPLATE = os.environ.get(
    "WHATSAPP_REMINDER_TEMPLATE", "upperroom_reminder"
)
WHATSAPP_PASTOR_TEMPLATE = os.environ.get(
    "WHATSAPP_PASTOR_TEMPLATE", "upperroom_pastor_daily_summary"
)

PASTOR_EMAIL = os.environ.get("PASTOR_EMAIL", "")
PASTOR_NAME = os.environ.get("PASTOR_NAME", "James")
PASTOR_WHATSAPP_NUMBER = os.environ.get("PASTOR_WHATSAPP_NUMBER", "")
PASTOR_EMAIL_HOUR = int(os.environ.get("PASTOR_EMAIL_HOUR", "19"))
PASTOR_EMAIL_MINUTE = int(os.environ.get("PASTOR_EMAIL_MINUTE", "0"))

UK_TZ = pytz.timezone("Europe/London")
scheduler = AsyncIOScheduler(timezone=UK_TZ)

app = FastAPI(title="Hebron Pentecostal Assembly - Scheduling API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class BookingCreate(BaseModel):
    full_name: str = Field(..., min_length=2)
    role: str = Field(..., pattern="^(Prayer|Worship)$")
    date: str
    notes: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    whatsapp_opt_in: bool = False


class BookingUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    whatsapp_opt_in: Optional[bool] = None


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
    phone_number: Optional[str] = None
    whatsapp_opt_in: bool = False
    whatsapp_confirmation_status: str = "not_requested"
    whatsapp_confirmation_sent_at: Optional[str] = None
    whatsapp_reminder_status: str = "not_requested"
    whatsapp_reminder_sent_at: Optional[str] = None
    whatsapp_last_error: Optional[str] = None
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


class ManualWhatsAppRequest(BaseModel):
    phone_number: str = Field(..., min_length=6)
    template_name: str = Field(
        ...,
        pattern="^(upperroom_booking_confirmation|upperroom_reminder|upperroom_pastor_daily_summary)$",
    )
    date: str
    full_name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(Prayer|Worship)$")
    prayer_leader: Optional[str] = None
    worship_leader: Optional[str] = None


class BookingWhatsAppSendRequest(BaseModel):
    message_type: str = Field(..., pattern="^(confirmation|reminder)$")


def format_name_display(full_name: str) -> str:
    parts = full_name.strip().split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1][0]}."
    return parts[0] if parts else "Anonymous"


def validate_booking_date(date_str: str) -> bool:
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        today = datetime.now()
        one_month_later = today + timedelta(days=31)
        if date_obj.weekday() > 3:
            return False
        if date_obj.date() < today.date():
            return False
        if date_obj.date() > one_month_later.date():
            return False
        return True
    except ValueError:
        return False


def format_whatsapp_date(date_str: str) -> str:
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("Invalid date format. Expected YYYY-MM-DD.") from exc
    return f"{date_obj.strftime('%A')}, {date_obj.day} {date_obj.strftime('%B')}"


def normalize_whatsapp_number(phone_number: Optional[str]) -> Optional[str]:
    if phone_number is None:
        return None
    raw = phone_number.strip()
    if not raw:
        return ""
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("0"):
        digits = "44" + digits[1:]
    if not 10 <= len(digits) <= 15:
        raise ValueError("Please enter a valid WhatsApp number, for example 07xxx xxxxxx or +44...")
    return digits


def mask_phone(phone_number: Optional[str]) -> Optional[str]:
    if not phone_number:
        return None
    digits = re.sub(r"\D", "", phone_number)
    if len(digits) <= 6:
        return "••••" + digits[-2:]
    return f"+{digits[:2]} •••• ••{digits[-3:]}"


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    if not ip or ip == "unknown":
        return "unknown"
    if ":" in ip:
        parts = ip.split(":")
        return ":".join(parts[:4]) + "::/64"
    parts = ip.split(".")
    if len(parts) == 4:
        return ".".join(parts[:3]) + ".0/24"
    return "masked"


async def write_audit_log(
    event_type: str,
    title: str,
    description: str,
    level: str = "info",
    booking_id: Optional[str] = None,
    participant_name: Optional[str] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None,
):
    doc = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "level": level,
        "title": title,
        "description": description,
        "booking_id": booking_id,
        "participant_name": participant_name,
        "details": details or {},
        "client_ip": get_client_ip(request) if request else None,
        "user_agent": (request.headers.get("user-agent", "")[:180] if request else None),
    }
    try:
        await db.audit_logs.insert_one(doc)
    except Exception as exc:
        logger.error("Failed to write audit log: %s", exc)


def _send_whatsapp_template(
    to_number: str,
    template_name: str,
    body_parameters: List[str],
    raise_on_error: bool = False,
) -> dict:
    if not WHATSAPP_ENABLED:
        message = "WhatsApp sending is disabled by WHATSAPP_ENABLED."
        if raise_on_error:
            raise RuntimeError(message)
        logger.info(message)
        return {"success": False, "skipped": True, "reason": message}

    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        message = "WhatsApp API credentials are not fully configured."
        if raise_on_error:
            raise RuntimeError(message)
        logger.error(message)
        return {"success": False, "reason": message}

    try:
        normalized_number = normalize_whatsapp_number(to_number)
        if not normalized_number:
            raise ValueError("WhatsApp number is missing.")
        url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_number,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": WHATSAPP_TEMPLATE_LANGUAGE},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": str(value)} for value in body_parameters
                        ],
                    }
                ],
            },
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        if resp.status_code < 200 or resp.status_code >= 300:
            body_snippet = (resp.text or "")[:1000]
            message = f"WhatsApp send failed. Status={resp.status_code}. Response={body_snippet}"
            logger.error(message)
            if raise_on_error:
                raise RuntimeError(message)
            return {"success": False, "status_code": resp.status_code, "reason": body_snippet}
        response_data = resp.json() if resp.content else {}
        logger.info("WhatsApp template %s sent to %s", template_name, normalized_number)
        return {"success": True, "response": response_data}
    except Exception as exc:
        logger.error("Failed to send WhatsApp template %s: %s", template_name, exc)
        if raise_on_error:
            raise
        return {"success": False, "reason": str(exc)}


def send_booking_confirmation_whatsapp(booking: dict) -> dict:
    return _send_whatsapp_template(
        booking.get("phone_number", ""),
        WHATSAPP_CONFIRMATION_TEMPLATE,
        [booking.get("full_name", ""), format_whatsapp_date(booking.get("date", "")), booking.get("role", "")],
    )


def send_booking_reminder_whatsapp(booking: dict) -> dict:
    return _send_whatsapp_template(
        booking.get("phone_number", ""),
        WHATSAPP_REMINDER_TEMPLATE,
        [booking.get("full_name", ""), format_whatsapp_date(booking.get("date", "")), booking.get("role", "")],
    )


def send_pastor_summary_whatsapp(phone_number: str, today_str: str, prayer_leader: str, worship_leader: str) -> dict:
    return _send_whatsapp_template(
        phone_number,
        WHATSAPP_PASTOR_TEMPLATE,
        [format_whatsapp_date(today_str), prayer_leader, worship_leader],
    )


def _send_email_via_resend(to_email: str, subject: str, html: str) -> None:
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
        payload = {"from": RESEND_FROM, "to": [to_email], "subject": subject, "html": html}
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        if resp.status_code < 200 or resp.status_code >= 300:
            body_snippet = (resp.text or "")[:500]
            logger.error(f"Failed to send email via Resend. Status={resp.status_code}. Body={body_snippet}")
            resp.raise_for_status()
        logger.info(f"Email sent via Resend to {to_email}")
    except requests.HTTPError as e:
        logger.error(f"Failed to send email via Resend (HTTPError): {e}")
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {e}")


def send_confirmation_email(booking: dict):
    if not booking.get("email"):
        return
    subject = "Booking Confirmed - Hebron Pentecostal Assembly"
    html = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff5eb;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #ea580c; margin-bottom: 20px;">Booking Confirmed!</h1>
    <p>Dear {booking['full_name']},</p><p>Your slot has been successfully booked for the online meeting.</p>
    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Role:</strong> Lead {booking['role']}</p><p><strong>Date:</strong> {booking['date']}</p><p><strong>Time:</strong> 8:00 PM - 9:00 PM (UK Time)</p></div>
    <p>Thank you for your participation.</p><div style="text-align: center; margin: 25px 0;"><a href="https://us02web.zoom.us/j/9033071964" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Join Zoom Meeting</a></div>
    </div></body></html>
    """
    _send_email_via_resend(booking["email"], subject, html)


def send_reminder_email(booking: dict):
    if not booking.get("email"):
        return
    subject = "Reminder: Your slot is in 4 hours - Hebron Pentecostal Assembly"
    html = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff5eb;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #ea580c; margin-bottom: 20px;">Reminder: Meeting in 4 Hours!</h1><p>Dear {booking['full_name']},</p>
    <p>This is a friendly reminder that you are scheduled to participate in today's online meeting.</p>
    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;"><p><strong>Role:</strong> Lead {booking['role']}</p><p><strong>Date:</strong> Today ({booking['date']})</p><p><strong>Time:</strong> 8:00 PM - 9:00 PM (UK Time)</p></div>
    <div style="text-align: center; margin: 25px 0;"><a href="https://us02web.zoom.us/j/9033071964" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Join Zoom Meeting</a></div>
    </div></body></html>
    """
    _send_email_via_resend(booking["email"], subject, html)


def send_pastor_leading_email(pastor_email: str, pastor_name: str, today_str: str, prayer_leader: str, worship_leader: str):
    if not pastor_email:
        return
    subject = "Today's Upper Room Leading"
    html = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff5eb;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #ea580c; margin-bottom: 20px;">Today's Upper Room Leading</h1><p style="margin-top: 0;">Good Evening {pastor_name},</p>
    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;"><p><strong>Date:</strong> {today_str}</p><p><strong>Time:</strong> 8:00 PM - 9:00 PM (UK Time)</p><p><strong>Prayer:</strong> {prayer_leader}</p><p><strong>Worship:</strong> {worship_leader}</p></div>
    </div></body></html>
    """
    _send_email_via_resend(pastor_email, subject, html)


async def send_booking_whatsapp_and_record(booking: dict, message_type: str, source: str = "automatic") -> dict:
    booking_id = booking.get("id")
    if message_type == "confirmation":
        result = await asyncio.to_thread(send_booking_confirmation_whatsapp, booking)
        status_field = "whatsapp_confirmation_status"
        sent_field = "whatsapp_confirmation_sent_at"
        event_type = "whatsapp_confirmation"
        label = "booking confirmation"
    else:
        result = await asyncio.to_thread(send_booking_reminder_whatsapp, booking)
        status_field = "whatsapp_reminder_status"
        sent_field = "whatsapp_reminder_sent_at"
        event_type = "whatsapp_reminder"
        label = "same-day reminder"

    now_iso = datetime.now(timezone.utc).isoformat()
    success = bool(result.get("success"))
    update = {
        status_field: "sent" if success else "failed",
        "whatsapp_last_error": None if success else (result.get("reason") or "WhatsApp send failed")[:500],
        "last_updated_at": now_iso,
    }
    if success:
        update[sent_field] = now_iso
    if booking_id:
        await db.bookings.update_one({"id": booking_id}, {"$set": update})
    await write_audit_log(
        event_type,
        f"WhatsApp {label} {'sent' if success else 'failed'}",
        f"{booking.get('full_name', 'Participant')} — Lead {booking.get('role', '')} on {booking.get('date', '')}",
        level="success" if success else "error",
        booking_id=booking_id,
        participant_name=booking.get("full_name"),
        details={
            "source": source,
            "message_type": message_type,
            "phone": mask_phone(booking.get("phone_number")),
            "status": "sent" if success else "failed",
        },
    )
    return result


async def send_daily_reminders():
    try:
        uk_now = datetime.now(UK_TZ)
        today_str = uk_now.strftime("%Y-%m-%d")
        bookings = await db.bookings.find({"date": today_str, "status": "Booked"}, {"_id": 0}).to_list(100)
        email_count = 0
        whatsapp_count = 0
        for booking in bookings:
            if booking.get("email"):
                await asyncio.to_thread(send_reminder_email, booking)
                email_count += 1
            if booking.get("whatsapp_opt_in") and booking.get("phone_number"):
                await send_booking_whatsapp_and_record(booking, "reminder", "scheduled_4pm")
                whatsapp_count += 1
            await asyncio.sleep(0.25)
        await write_audit_log(
            "scheduler_reminders",
            "4 PM reminder run completed",
            f"Processed {len(bookings)} booking(s): {whatsapp_count} WhatsApp and {email_count} email attempt(s).",
            details={"booking_count": len(bookings), "whatsapp_attempts": whatsapp_count, "email_attempts": email_count},
        )
    except Exception as e:
        logger.error(f"Error in send_daily_reminders: {e}")
        await write_audit_log("scheduler_reminders", "4 PM reminder run failed", str(e), level="error")


async def send_pastor_daily_summary():
    try:
        uk_now = datetime.now(UK_TZ)
        if uk_now.weekday() > 3:
            return
        today_str = uk_now.strftime("%Y-%m-%d")
        todays_bookings = await db.bookings.find({"date": today_str, "status": "Booked"}, {"_id": 0}).to_list(50)
        prayer_leader = "Not booked"
        worship_leader = "Not booked"
        for b in todays_bookings:
            if b.get("role") == "Prayer":
                prayer_leader = b.get("full_name", "Unknown")
            elif b.get("role") == "Worship":
                worship_leader = b.get("full_name", "Unknown")
        if PASTOR_EMAIL:
            await asyncio.to_thread(send_pastor_leading_email, PASTOR_EMAIL, PASTOR_NAME, today_str, prayer_leader, worship_leader)
        whatsapp_result = None
        if PASTOR_WHATSAPP_NUMBER:
            whatsapp_result = await asyncio.to_thread(send_pastor_summary_whatsapp, PASTOR_WHATSAPP_NUMBER, today_str, prayer_leader, worship_leader)
        await write_audit_log(
            "pastor_summary",
            "Pastor daily summary processed",
            f"Prayer: {prayer_leader} · Worship: {worship_leader}",
            level="success" if not whatsapp_result or whatsapp_result.get("success") else "error",
            details={"date": today_str, "prayer": prayer_leader, "worship": worship_leader, "whatsapp_sent": bool(whatsapp_result and whatsapp_result.get("success"))},
        )
    except Exception as e:
        logger.error(f"Error in send_pastor_daily_summary: {e}")
        await write_audit_log("pastor_summary", "Pastor daily summary failed", str(e), level="error")


async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
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


@api_router.get("/")
async def root():
    return {"message": "Hebron Pentecostal Assembly - Scheduling API"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, request: Request):
    if not validate_booking_date(booking_data.date):
        raise HTTPException(status_code=400, detail="Invalid date. Please select Monday-Thursday within the next month.")
    try:
        normalized_phone = normalize_whatsapp_number(booking_data.phone_number)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if booking_data.whatsapp_opt_in and not normalized_phone:
        raise HTTPException(status_code=400, detail="Please enter a WhatsApp number to enable WhatsApp notifications.")

    existing = await db.bookings.find_one({"date": booking_data.date, "role": booking_data.role, "status": "Booked"}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="This slot is already taken. Please choose another date.")

    user_booking = await db.bookings.find_one(
        {"date": booking_data.date, "full_name": {"$regex": f"^{re.escape(booking_data.full_name)}$", "$options": "i"}, "status": "Booked"},
        {"_id": 0},
    )
    if user_booking:
        raise HTTPException(status_code=409, detail="You already have a booking on this date. Please choose another date.")

    booking_values = booking_data.model_dump()
    booking_values["phone_number"] = normalized_phone or None
    if normalized_phone:
        booking_values["whatsapp_opt_in"] = True
        booking_values["whatsapp_confirmation_status"] = "pending"
        booking_values["whatsapp_reminder_status"] = "pending"
    booking = Booking(**booking_values)
    doc = booking.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["last_updated_at"] = doc["last_updated_at"].isoformat()

    result = await db.bookings.update_one(
        {"date": booking_data.date, "role": booking_data.role, "status": "Booked"},
        {"$setOnInsert": doc},
        upsert=True,
    )
    if result.matched_count > 0:
        raise HTTPException(status_code=409, detail="This slot is already taken. Please choose another date.")

    await write_audit_log(
        "booking_created",
        "Booking created",
        f"{booking.full_name} booked Lead {booking.role} for {booking.date}.",
        level="success",
        booking_id=booking.id,
        participant_name=booking.full_name,
        details={"role": booking.role, "date": booking.date, "whatsapp": mask_phone(booking.phone_number), "email_provided": bool(booking.email)},
        request=request,
    )

    if booking_data.email:
        asyncio.create_task(asyncio.to_thread(send_confirmation_email, doc))
    if booking.whatsapp_opt_in and booking.phone_number:
        asyncio.create_task(send_booking_whatsapp_and_record(doc, "confirmation", "booking_created"))
    return booking


@api_router.get("/bookings/availability")
async def get_availability(start_date: str = Query(...), end_date: str = Query(...)):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    bookings = await db.bookings.find({"date": {"$gte": start_date, "$lte": end_date}, "status": "Booked"}, {"_id": 0}).to_list(1000)
    availability = {}
    current = start
    while current <= end:
        if current.weekday() <= 3:
            date_str = current.strftime("%Y-%m-%d")
            availability[date_str] = {"date": date_str, "prayer_available": True, "prayer_booked_by": None, "worship_available": True, "worship_booked_by": None}
        current += timedelta(days=1)
    for booking in bookings:
        date_str = booking["date"]
        if date_str in availability:
            if booking["role"] == "Prayer":
                availability[date_str]["prayer_available"] = False
                availability[date_str]["prayer_booked_by"] = format_name_display(booking["full_name"])
            elif booking["role"] == "Worship":
                availability[date_str]["worship_available"] = False
                availability[date_str]["worship_booked_by"] = format_name_display(booking["full_name"])
    return list(availability.values())


@api_router.get("/bookings/public")
async def get_public_bookings():
    bookings = await db.bookings.find(
        {"status": "Booked"},
        {"_id": 0, "email": 0, "notes": 0, "phone_number": 0, "whatsapp_opt_in": 0, "whatsapp_last_error": 0},
    ).to_list(1000)
    for booking in bookings:
        booking["display_name"] = format_name_display(booking["full_name"])
        if isinstance(booking.get("created_at"), str):
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
        if isinstance(booking.get("last_updated_at"), str):
            booking["last_updated_at"] = datetime.fromisoformat(booking["last_updated_at"])
    return bookings


@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin, request: Request):
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Admin login is not configured")
    if credentials.username == ADMIN_USERNAME and credentials.password == ADMIN_PASSWORD:
        token = jwt.encode(
            {"username": credentials.username, "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        await write_audit_log("admin_login", "Admin signed in", "A successful admin login was recorded.", request=request)
        return {"token": token, "username": credentials.username}
    await write_audit_log("admin_login_failed", "Failed admin login", "An invalid admin login attempt was recorded.", level="warning", request=request)
    raise HTTPException(status_code=401, detail="Invalid credentials")


@api_router.get("/admin/bookings", response_model=List[Booking])
async def get_admin_bookings(
    admin: dict = Depends(verify_admin_token),
    date_filter: Optional[str] = None,
    role_filter: Optional[str] = None,
    name_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
):
    query = {}
    if date_filter:
        query["date"] = date_filter
    if role_filter:
        query["role"] = role_filter
    if name_filter:
        query["full_name"] = {"$regex": re.escape(name_filter), "$options": "i"}
    if status_filter:
        query["status"] = status_filter
    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    for booking in bookings:
        if isinstance(booking.get("created_at"), str):
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
        if isinstance(booking.get("last_updated_at"), str):
            booking["last_updated_at"] = datetime.fromisoformat(booking["last_updated_at"])
        booking.setdefault("phone_number", None)
        booking.setdefault("whatsapp_opt_in", False)
        booking.setdefault("whatsapp_confirmation_status", "not_requested")
        booking.setdefault("whatsapp_reminder_status", "not_requested")
    return bookings


@api_router.get("/admin/today")
async def get_admin_today(admin: dict = Depends(verify_admin_token)):
    today_str = datetime.now(UK_TZ).strftime("%Y-%m-%d")
    bookings = await db.bookings.find({"date": today_str, "status": "Booked"}, {"_id": 0}).to_list(10)
    prayer = next((b for b in bookings if b.get("role") == "Prayer"), None)
    worship = next((b for b in bookings if b.get("role") == "Worship"), None)
    return {
        "date": today_str,
        "prayer": prayer,
        "worship": worship,
        "meeting_time": "8:00 PM - 9:00 PM UK",
        "reminder_time": "4:00 PM UK",
        "pastor_summary_time": f"{PASTOR_EMAIL_HOUR:02d}:{PASTOR_EMAIL_MINUTE:02d} UK",
    }


@api_router.get("/admin/whatsapp/status")
async def get_whatsapp_status(admin: dict = Depends(verify_admin_token)):
    credentials_configured = bool(WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID)
    templates_configured = bool(WHATSAPP_CONFIRMATION_TEMPLATE and WHATSAPP_REMINDER_TEMPLATE and WHATSAPP_PASTOR_TEMPLATE)
    return {
        "enabled": WHATSAPP_ENABLED,
        "credentials_configured": credentials_configured,
        "pastor_number_configured": bool(PASTOR_WHATSAPP_NUMBER),
        "templates_configured": templates_configured,
        "language": WHATSAPP_TEMPLATE_LANGUAGE,
        "api_version": WHATSAPP_API_VERSION,
        "confirmation_template": WHATSAPP_CONFIRMATION_TEMPLATE,
        "reminder_template": WHATSAPP_REMINDER_TEMPLATE,
        "pastor_template": WHATSAPP_PASTOR_TEMPLATE,
        "healthy": WHATSAPP_ENABLED and credentials_configured and templates_configured,
    }


@api_router.get("/admin/logs")
async def get_admin_logs(
    admin: dict = Depends(verify_admin_token),
    event_type: Optional[str] = None,
    level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=300),
):
    query = {}
    if event_type and event_type != "all":
        query["event_type"] = event_type
    if level and level != "all":
        query["level"] = level
    if search:
        escaped = re.escape(search)
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}},
            {"participant_name": {"$regex": escaped, "$options": "i"}},
        ]
    logs = await db.audit_logs.find(query, {"_id": 0, "user_agent": 0}).sort("timestamp", -1).to_list(limit)
    return {"logs": logs, "count": len(logs)}


@api_router.put("/admin/bookings/{booking_id}")
async def update_booking(booking_id: str, update_data: BookingUpdate, request: Request, admin: dict = Depends(verify_admin_token)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    existing = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Booking not found")
    if "phone_number" in update_dict:
        try:
            update_dict["phone_number"] = normalize_whatsapp_number(update_dict["phone_number"])
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        update_dict["whatsapp_opt_in"] = bool(update_dict["phone_number"])
        if update_dict["phone_number"] and update_dict["phone_number"] != existing.get("phone_number"):
            update_dict["whatsapp_confirmation_status"] = "pending"
            update_dict["whatsapp_reminder_status"] = "pending"
    effective_phone = update_dict.get("phone_number", existing.get("phone_number"))
    effective_opt_in = update_dict.get("whatsapp_opt_in", existing.get("whatsapp_opt_in", False))
    if effective_opt_in and not effective_phone:
        raise HTTPException(status_code=400, detail="A WhatsApp number is required when WhatsApp notifications are enabled.")
    if "date" in update_dict or "role" in update_dict:
        check_date = update_dict.get("date", existing["date"])
        check_role = update_dict.get("role", existing["role"])
        conflict = await db.bookings.find_one(
            {"date": check_date, "role": check_role, "status": "Booked", "id": {"$ne": booking_id}},
            {"_id": 0},
        )
        if conflict:
            raise HTTPException(status_code=409, detail="This slot is already taken by another booking.")
    update_dict["edited_by_admin"] = True
    update_dict["last_updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one({"id": booking_id}, {"$set": update_dict})
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    await write_audit_log(
        "booking_updated",
        "Booking updated",
        f"{updated.get('full_name')} — Lead {updated.get('role')} on {updated.get('date')}.",
        booking_id=booking_id,
        participant_name=updated.get("full_name"),
        details={"changed_fields": list(update_dict.keys())},
        request=request,
    )
    return updated


@api_router.delete("/admin/bookings/{booking_id}")
async def delete_booking(booking_id: str, request: Request, admin: dict = Depends(verify_admin_token)):
    existing = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.delete_one({"id": booking_id})
    await write_audit_log(
        "booking_deleted",
        "Booking deleted",
        f"{existing.get('full_name')} — Lead {existing.get('role')} on {existing.get('date')}.",
        level="warning",
        booking_id=booking_id,
        participant_name=existing.get("full_name"),
        request=request,
    )
    return {"message": "Booking deleted successfully"}


@api_router.post("/admin/bookings/{booking_id}/unlock")
async def unlock_slot(booking_id: str, request: Request, admin: dict = Depends(verify_admin_token)):
    existing = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "Cancelled", "edited_by_admin": True, "last_updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await write_audit_log(
        "booking_cancelled",
        "Booking cancelled / slot unlocked",
        f"{existing.get('full_name')} — Lead {existing.get('role')} on {existing.get('date')}.",
        level="warning",
        booking_id=booking_id,
        participant_name=existing.get("full_name"),
        request=request,
    )
    return {"message": "Slot unlocked successfully"}


@api_router.post("/admin/bookings/{booking_id}/whatsapp/send")
async def send_booking_whatsapp_now(
    booking_id: str,
    send_request: BookingWhatsAppSendRequest,
    request: Request,
    admin: dict = Depends(verify_admin_token),
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking.get("phone_number"):
        raise HTTPException(status_code=400, detail="This booking does not have a WhatsApp number.")
    result = await send_booking_whatsapp_and_record(booking, send_request.message_type, "admin_send_now")
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("reason") or "Meta could not send the WhatsApp message.")
    await write_audit_log(
        "admin_send_now",
        "Admin sent WhatsApp now",
        f"{send_request.message_type.title()} sent to {booking.get('full_name')}.",
        level="success",
        booking_id=booking_id,
        participant_name=booking.get("full_name"),
        details={"message_type": send_request.message_type, "phone": mask_phone(booking.get("phone_number"))},
        request=request,
    )
    return {"message": f"WhatsApp {send_request.message_type} sent successfully"}


@api_router.post("/admin/whatsapp/send-template")
async def admin_send_whatsapp_template(request_data: ManualWhatsAppRequest, request: Request, admin: dict = Depends(verify_admin_token)):
    if not WHATSAPP_ENABLED:
        raise HTTPException(status_code=503, detail="WhatsApp sending is currently disabled.")
    try:
        formatted_date = format_whatsapp_date(request_data.date)
        normalized_phone = normalize_whatsapp_number(request_data.phone_number)
        if request_data.template_name == "upperroom_pastor_daily_summary":
            if not request_data.prayer_leader or not request_data.worship_leader:
                raise HTTPException(status_code=400, detail="Prayer and Worship leader names are required for the pastor summary.")
            parameters = [formatted_date, request_data.prayer_leader.strip(), request_data.worship_leader.strip()]
            participant_name = None
        else:
            if not request_data.full_name or not request_data.role:
                raise HTTPException(status_code=400, detail="Full name and Lead are required for this template.")
            parameters = [request_data.full_name.strip(), formatted_date, request_data.role]
            participant_name = request_data.full_name.strip()
        result = await asyncio.to_thread(_send_whatsapp_template, normalized_phone, request_data.template_name, parameters, True)
        await write_audit_log(
            "manual_whatsapp",
            "Manual WhatsApp sent",
            f"Template {request_data.template_name} sent successfully.",
            level="success",
            participant_name=participant_name,
            details={"template": request_data.template_name, "phone": mask_phone(normalized_phone), "date": request_data.date},
            request=request,
        )
        return {"message": "WhatsApp message sent successfully", "template": request_data.template_name, "phone_number": normalized_phone, "result": result}
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Manual WhatsApp send failed: %s", exc)
        await write_audit_log("manual_whatsapp", "Manual WhatsApp failed", str(exc), level="error", request=request)
        raise HTTPException(status_code=502, detail="Meta could not send the WhatsApp message. Check the Admin Logs page for details.") from exc


@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(verify_admin_token), month: Optional[int] = None, year: Optional[int] = None):
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year
    start_date = f"{target_year}-{target_month:02d}-01"
    end_date = f"{target_year + 1}-01-01" if target_month == 12 else f"{target_year}-{target_month + 1:02d}-01"
    pipeline = [
        {"$match": {"date": {"$gte": start_date, "$lt": end_date}, "status": "Booked"}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}},
    ]
    role_stats = await db.bookings.aggregate(pipeline).to_list(100)
    participant_pipeline = [
        {"$match": {"date": {"$gte": start_date, "$lt": end_date}, "status": "Booked"}},
        {"$group": {"_id": "$full_name", "total_bookings": {"$sum": 1}, "prayer_count": {"$sum": {"$cond": [{"$eq": ["$role", "Prayer"]}, 1, 0]}}, "worship_count": {"$sum": {"$cond": [{"$eq": ["$role", "Worship"]}, 1, 0]}}}},
        {"$sort": {"total_bookings": -1}},
    ]
    participants = await db.bookings.aggregate(participant_pipeline).to_list(100)
    prayer_total = next((s["count"] for s in role_stats if s["_id"] == "Prayer"), 0)
    worship_total = next((s["count"] for s in role_stats if s["_id"] == "Worship"), 0)
    return {"month": target_month, "year": target_year, "prayer_slots": prayer_total, "worship_slots": worship_total, "total_bookings": prayer_total + worship_total, "participants": [{"name": p["_id"], "total_bookings": p["total_bookings"], "prayer_count": p["prayer_count"], "worship_count": p["worship_count"]} for p in participants]}


@api_router.get("/admin/participant-history")
async def get_participant_history(name: str, admin: dict = Depends(verify_admin_token)):
    bookings = await db.bookings.find({"full_name": {"$regex": re.escape(name), "$options": "i"}, "status": "Booked"}, {"_id": 0}).sort("date", -1).to_list(1000)
    prayer_count = sum(1 for b in bookings if b["role"] == "Prayer")
    worship_count = sum(1 for b in bookings if b["role"] == "Worship")
    return {"name": name, "total_services": len(bookings), "prayer_count": prayer_count, "worship_count": worship_count, "history": bookings}


@api_router.get("/admin/reports/monthly")
async def get_monthly_report(month: int, year: int, admin: dict = Depends(verify_admin_token)):
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"
    bookings = await db.bookings.find({"date": {"$gte": start_date, "$lt": end_date}, "status": "Booked"}, {"_id": 0}).to_list(1000)
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
    top_participants = sorted([{"name": k, "count": v} for k, v in participant_counts.items()], key=lambda x: x["count"], reverse=True)[:10]
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    prev_start = f"{prev_year}-{prev_month:02d}-01"
    prev_bookings = await db.bookings.find({"date": {"$gte": prev_start, "$lt": start_date}, "status": "Booked"}, {"_id": 0}).to_list(1000)
    prev_participants = set(b["full_name"] for b in prev_bookings)
    current_participants = set(b["full_name"] for b in bookings)
    inactive = list(prev_participants - current_participants)
    return {"month": month, "year": year, "total_available_slots": total_available_slots, "total_prayer_bookings": prayer_count, "total_worship_bookings": worship_count, "total_bookings": len(bookings), "participation_rate": round(participation_rate, 1), "top_participants": top_participants, "inactive_members": inactive[:10]}


@api_router.get("/admin/export/csv")
async def export_bookings_csv(admin: dict = Depends(verify_admin_token), month: Optional[int] = None, year: Optional[int] = None):
    query = {"status": "Booked"}
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}
    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    output = io.StringIO()
    output.write("ID,Full Name,Role,Date,Time,Status,WhatsApp Number,Confirmation Status,Reminder Status,Notes,Created At\n")
    for b in bookings:
        output.write(f"{b.get('id','')},{b.get('full_name','')},{b.get('role','')},{b.get('date','')},8:00 PM - 9:00 PM,{b.get('status','')},{b.get('phone_number','') or ''},{b.get('whatsapp_confirmation_status','')},{b.get('whatsapp_reminder_status','')},{b.get('notes','') or ''},{b.get('created_at','')}\n")
    output.seek(0)
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=bookings_{datetime.now().strftime('%Y%m%d')}.csv"})


@api_router.get("/admin/export/excel")
async def export_bookings_excel(admin: dict = Depends(verify_admin_token), month: Optional[int] = None, year: Optional[int] = None):
    query = {"status": "Booked"}
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}
    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Bookings")
    headers = ["ID", "Full Name", "Role", "Date", "Time", "Status", "WhatsApp Number", "Confirmation Status", "Reminder Status", "Notes", "Created At"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)
    for row, b in enumerate(bookings, start=1):
        values = [b.get("id", ""), b.get("full_name", ""), b.get("role", ""), b.get("date", ""), "8:00 PM - 9:00 PM", b.get("status", ""), b.get("phone_number", "") or "", b.get("whatsapp_confirmation_status", ""), b.get("whatsapp_reminder_status", ""), b.get("notes", "") or "", str(b.get("created_at", ""))]
        for col, value in enumerate(values):
            worksheet.write(row, col, value)
    workbook.close(); output.seek(0)
    return Response(content=output.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=bookings_{datetime.now().strftime('%Y%m%d')}.xlsx"})


@api_router.post("/admin/send-reminders")
async def trigger_reminders(admin: dict = Depends(verify_admin_token)):
    await send_daily_reminders()
    return {"message": "Today's reminder run completed"}


@api_router.post("/admin/send-pastor-summary")
async def trigger_pastor_summary(admin: dict = Depends(verify_admin_token)):
    await send_pastor_daily_summary()
    return {"message": "Pastor summary run completed"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_scheduler():
    if not os.environ.get("JWT_SECRET"):
        logger.warning("JWT_SECRET is not set; a temporary secret was generated for this process.")
    if not ADMIN_PASSWORD:
        logger.warning("ADMIN_PASSWORD is not set; admin login is disabled until it is configured.")
    scheduler.add_job(send_daily_reminders, CronTrigger(hour=16, minute=0, timezone=UK_TZ), id="daily_reminder", replace_existing=True)
    scheduler.add_job(send_pastor_daily_summary, CronTrigger(hour=PASTOR_EMAIL_HOUR, minute=PASTOR_EMAIL_MINUTE, timezone=UK_TZ), id="pastor_summary", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started (member reminders + pastor summary enabled).")
    logger.info("WhatsApp enabled: %s", WHATSAPP_ENABLED)


@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()
    logger.info("Scheduler and database connection closed")
