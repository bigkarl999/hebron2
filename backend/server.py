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
from apscheduler.triggers.interval import IntervalTrigger
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
WHATSAPP_WEBHOOK_VERIFY_TOKEN = os.environ.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "")
WHATSAPP_MAX_RETRIES = max(0, int(os.environ.get("WHATSAPP_MAX_RETRIES", "1")))
WHATSAPP_RETRY_DELAY_SECONDS = max(30, int(os.environ.get("WHATSAPP_RETRY_DELAY_SECONDS", "120")))
WHATSAPP_CONFIRMATION_TEMPLATE = os.environ.get(
    "WHATSAPP_CONFIRMATION_TEMPLATE", "upperroom_booking_confirmation1"
)
WHATSAPP_REMINDER_TEMPLATE = os.environ.get(
    "WHATSAPP_REMINDER_TEMPLATE", "upperroom_reminder1"
)
WHATSAPP_PASTOR_TEMPLATE = os.environ.get(
    "WHATSAPP_PASTOR_TEMPLATE", "upperroom_pastor_daily_summary1"
)

# Keep existing Railway variables working if they still contain the original template names.
WHATSAPP_CONFIRMATION_TEMPLATE = {
    "upperroom_booking_confirmation": "upperroom_booking_confirmation1"
}.get(WHATSAPP_CONFIRMATION_TEMPLATE, WHATSAPP_CONFIRMATION_TEMPLATE)
WHATSAPP_REMINDER_TEMPLATE = {
    "upperroom_reminder": "upperroom_reminder1"
}.get(WHATSAPP_REMINDER_TEMPLATE, WHATSAPP_REMINDER_TEMPLATE)
WHATSAPP_PASTOR_TEMPLATE = {
    "upperroom_pastor_daily_summary": "upperroom_pastor_daily_summary1"
}.get(WHATSAPP_PASTOR_TEMPLATE, WHATSAPP_PASTOR_TEMPLATE)

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
    whatsapp_confirmation_delivered_at: Optional[str] = None
    whatsapp_confirmation_read_at: Optional[str] = None
    whatsapp_confirmation_message_id: Optional[str] = None
    whatsapp_confirmation_retry_count: int = 0
    whatsapp_reminder_status: str = "not_requested"
    whatsapp_reminder_sent_at: Optional[str] = None
    whatsapp_reminder_delivered_at: Optional[str] = None
    whatsapp_reminder_read_at: Optional[str] = None
    whatsapp_reminder_message_id: Optional[str] = None
    whatsapp_reminder_retry_count: int = 0
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
        pattern="^(upperroom_booking_confirmation1?|upperroom_reminder1?|upperroom_pastor_daily_summary1?)$",
    )
    date: str
    full_name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(Prayer|Worship)$")
    prayer_leader: Optional[str] = None
    worship_leader: Optional[str] = None


class BookingWhatsAppSendRequest(BaseModel):
    message_type: str = Field(..., pattern="^(confirmation|reminder)$")


class VisitorPing(BaseModel):
    visitor_id: str = Field(..., min_length=8, max_length=128)
    session_id: str = Field(..., min_length=8, max_length=128)
    path: str = Field(default="/", max_length=300)
    event_type: str = Field(default="page_view", pattern="^(page_view|heartbeat)$")
    referrer: Optional[str] = Field(default=None, max_length=500)
    timezone: Optional[str] = Field(default=None, max_length=100)
    language: Optional[str] = Field(default=None, max_length=40)
    screen_width: Optional[int] = Field(default=None, ge=0, le=20000)


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



def get_masked_network(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    if not ip:
        return "unknown"
    if ":" in ip:
        parts = [part for part in ip.split(":") if part]
        return ":".join(parts[:3]) + "::/48" if parts else "ipv6"
    parts = ip.split(".")
    if len(parts) == 4:
        return ".".join(parts[:2]) + ".x.x"
    return "masked"


def get_request_location(request: Request, timezone_name: Optional[str] = None) -> dict:
    # Prefer coarse location headers supplied by a hosting/CDN layer.
    # We intentionally do not call a third-party GeoIP service or store a full IP address.
    country = (
        request.headers.get("cf-ipcountry")
        or request.headers.get("x-vercel-ip-country")
        or request.headers.get("cloudfront-viewer-country")
        or request.headers.get("x-country-code")
    )
    region = (
        request.headers.get("x-vercel-ip-country-region")
        or request.headers.get("x-region")
        or request.headers.get("cf-region")
    )
    city = (
        request.headers.get("x-vercel-ip-city")
        or request.headers.get("x-city")
        or request.headers.get("cf-ipcity")
    )
    return {
        "country": country or "Unknown",
        "region": region or None,
        "city": city or None,
        "timezone": timezone_name or "Unknown",
    }


def classify_device(user_agent: str, screen_width: Optional[int] = None) -> str:
    ua = (user_agent or "").lower()
    if "ipad" in ua or "tablet" in ua:
        return "Tablet"
    if "mobile" in ua or "iphone" in ua or "android" in ua or (screen_width and screen_width < 768):
        return "Mobile"
    return "Desktop"


def classify_browser(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "edg/" in ua:
        return "Edge"
    if "opr/" in ua or "opera" in ua:
        return "Opera"
    if "firefox/" in ua:
        return "Firefox"
    if "chrome/" in ua and "edg/" not in ua:
        return "Chrome"
    if "safari/" in ua and "chrome/" not in ua:
        return "Safari"
    return "Other"


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
        return {"success": False, "skipped": True, "reason": message, "retryable": False}

    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        message = "WhatsApp API credentials are not fully configured."
        if raise_on_error:
            raise RuntimeError(message)
        logger.error(message)
        return {"success": False, "reason": message, "retryable": False}

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
            retryable = resp.status_code == 429 or resp.status_code >= 500
            if raise_on_error:
                raise RuntimeError(message)
            return {
                "success": False,
                "status_code": resp.status_code,
                "reason": body_snippet,
                "retryable": retryable,
            }
        response_data = resp.json() if resp.content else {}
        messages = response_data.get("messages") or []
        message_id = messages[0].get("id") if messages and isinstance(messages[0], dict) else None
        logger.info(
            "WhatsApp template %s accepted by Meta for %s (message_id=%s)",
            template_name,
            normalized_number,
            message_id or "unknown",
        )
        return {
            "success": True,
            "response": response_data,
            "message_id": message_id,
            "retryable": False,
        }
    except requests.RequestException as exc:
        logger.error("WhatsApp network request failed for template %s: %s", template_name, exc)
        if raise_on_error:
            raise
        return {"success": False, "reason": str(exc), "retryable": True}
    except Exception as exc:
        logger.error("Failed to send WhatsApp template %s: %s", template_name, exc)
        if raise_on_error:
            raise
        return {"success": False, "reason": str(exc), "retryable": False}

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


TRANSIENT_WHATSAPP_ERROR_CODES = {
    1, 2, 4, 17, 32, 613, 80007, 130429, 131000, 131016
}

def is_retryable_whatsapp_failure(error_code: Optional[int]) -> bool:
    if error_code in (None, ""):
        return True
    try:
        return int(error_code) in TRANSIENT_WHATSAPP_ERROR_CODES
    except (TypeError, ValueError):
        return False

async def flag_unresolved_whatsapp_failure(outbox: dict, error_text: Optional[str] = None):
    if not outbox or outbox.get("admin_alerted_at"):
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.whatsapp_outbox.update_one(
        {"id": outbox.get("id"), "$or": [{"admin_alerted_at": None}, {"admin_alerted_at": {"$exists": False}}]},
        {"$set": {"admin_alerted_at": now_iso, "updated_at": now_iso}},
    )
    await write_audit_log(
        "whatsapp_unresolved_failure",
        "WhatsApp delivery needs attention",
        f"{outbox.get('message_type', 'Message').title()} for {outbox.get('participant_name') or 'recipient'} could not be delivered automatically.",
        level="error",
        booking_id=outbox.get("booking_id"),
        participant_name=outbox.get("participant_name"),
        details={
            "template": outbox.get("template_name"),
            "message_type": outbox.get("message_type"),
            "retry_count": outbox.get("retry_count", 0),
            "error": (error_text or outbox.get("last_error") or "Unknown delivery failure")[:500],
            "phone": mask_phone(outbox.get("phone_number")),
        },
    )

async def record_whatsapp_outbox(
    result: dict,
    phone_number: str,
    template_name: str,
    body_parameters: List[str],
    message_type: str,
    source: str,
    booking_id: Optional[str] = None,
    participant_name: Optional[str] = None,
    retry_count: int = 0,
    parent_message_id: Optional[str] = None,
) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    message_id = result.get("message_id")
    status = "accepted" if result.get("success") else "failed"
    doc = {
        "id": str(uuid.uuid4()),
        "message_id": message_id,
        "parent_message_id": parent_message_id,
        "booking_id": booking_id,
        "participant_name": participant_name,
        "phone_number": normalize_whatsapp_number(phone_number),
        "template_name": template_name,
        "body_parameters": [str(value) for value in body_parameters],
        "message_type": message_type,
        "source": source,
        "status": status,
        "retry_count": retry_count,
        "retry_scheduled": False,
        "last_error": None if result.get("success") else (result.get("reason") or "WhatsApp send failed")[:1000],
        "created_at": now_iso,
        "updated_at": now_iso,
        "accepted_at": now_iso if result.get("success") else None,
        "sent_at": None,
        "delivered_at": None,
        "read_at": None,
        "failed_at": now_iso if not result.get("success") else None,
        "admin_alerted_at": None,
    }
    await db.whatsapp_outbox.insert_one(doc)
    return doc


async def retry_whatsapp_outbox(outbox_id: str):
    outbox = await db.whatsapp_outbox.find_one({"id": outbox_id}, {"_id": 0})
    if not outbox or outbox.get("status") != "failed" or not outbox.get("retry_scheduled"):
        return
    retry_count = int(outbox.get("retry_count", 0))
    if retry_count >= WHATSAPP_MAX_RETRIES:
        await db.whatsapp_outbox.update_one(
            {"id": outbox_id},
            {"$set": {"retry_scheduled": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        await flag_unresolved_whatsapp_failure(outbox)
        return

    await db.whatsapp_outbox.update_one(
        {"id": outbox_id},
        {"$set": {"retry_scheduled": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    result = await asyncio.to_thread(
        _send_whatsapp_template,
        outbox.get("phone_number", ""),
        outbox.get("template_name", ""),
        outbox.get("body_parameters") or [],
        False,
    )
    new_retry_count = retry_count + 1
    retry_doc = await record_whatsapp_outbox(
        result,
        outbox.get("phone_number", ""),
        outbox.get("template_name", ""),
        outbox.get("body_parameters") or [],
        outbox.get("message_type", "unknown"),
        "automatic_retry",
        booking_id=outbox.get("booking_id"),
        participant_name=outbox.get("participant_name"),
        retry_count=new_retry_count,
        parent_message_id=outbox.get("message_id"),
    )

    booking_id = outbox.get("booking_id")
    message_type = outbox.get("message_type")
    if booking_id and message_type in {"confirmation", "reminder"}:
        prefix = f"whatsapp_{message_type}"
        update = {
            f"{prefix}_status": "accepted" if result.get("success") else "failed",
            f"{prefix}_retry_count": new_retry_count,
            "whatsapp_last_error": None if result.get("success") else (result.get("reason") or "WhatsApp retry failed")[:500],
            "last_updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if retry_doc.get("message_id"):
            update[f"{prefix}_message_id"] = retry_doc["message_id"]
        await db.bookings.update_one({"id": booking_id}, {"$set": update})

    await write_audit_log(
        "whatsapp_retry",
        "WhatsApp automatic retry accepted" if result.get("success") else "WhatsApp automatic retry failed",
        f"{outbox.get('message_type', 'Message')} retry attempt {new_retry_count} of {WHATSAPP_MAX_RETRIES}.",
        level="success" if result.get("success") else "error",
        booking_id=booking_id,
        participant_name=outbox.get("participant_name"),
        details={
            "template": outbox.get("template_name"),
            "message_type": outbox.get("message_type"),
            "retry_count": new_retry_count,
            "meta_message_id": retry_doc.get("message_id"),
            "phone": mask_phone(outbox.get("phone_number")),
        },
    )

    if not result.get("success"):
        if result.get("retryable") and new_retry_count < WHATSAPP_MAX_RETRIES:
            await schedule_outbox_retry(retry_doc)
        else:
            await flag_unresolved_whatsapp_failure(retry_doc, result.get("reason"))


async def schedule_outbox_retry(outbox: dict):
    if int(outbox.get("retry_count", 0)) >= WHATSAPP_MAX_RETRIES:
        return
    retry_after = datetime.now(timezone.utc) + timedelta(seconds=WHATSAPP_RETRY_DELAY_SECONDS)
    await db.whatsapp_outbox.update_one(
        {"id": outbox["id"], "retry_scheduled": {"$ne": True}},
        {
            "$set": {
                "retry_scheduled": True,
                "retry_after": retry_after.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )


async def process_whatsapp_retries():
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        due = await db.whatsapp_outbox.find(
            {
                "status": "failed",
                "retry_scheduled": True,
                "retry_after": {"$lte": now_iso},
            },
            {"_id": 0},
        ).sort("retry_after", 1).to_list(20)
        for outbox in due:
            await retry_whatsapp_outbox(outbox["id"])
            await asyncio.sleep(0.25)
    except Exception as exc:
        logger.error("WhatsApp retry worker failed: %s", exc)
        await write_audit_log(
            "whatsapp_retry_worker",
            "WhatsApp retry worker failed",
            str(exc),
            level="error",
        )


async def send_booking_whatsapp_and_record(booking: dict, message_type: str, source: str = "automatic") -> dict:
    booking_id = booking.get("id")
    if message_type == "confirmation":
        result = await asyncio.to_thread(send_booking_confirmation_whatsapp, booking)
        status_field = "whatsapp_confirmation_status"
        sent_field = "whatsapp_confirmation_sent_at"
        message_id_field = "whatsapp_confirmation_message_id"
        retry_field = "whatsapp_confirmation_retry_count"
        event_type = "whatsapp_confirmation"
        label = "booking confirmation"
        template_name = WHATSAPP_CONFIRMATION_TEMPLATE
    else:
        result = await asyncio.to_thread(send_booking_reminder_whatsapp, booking)
        status_field = "whatsapp_reminder_status"
        sent_field = "whatsapp_reminder_sent_at"
        message_id_field = "whatsapp_reminder_message_id"
        retry_field = "whatsapp_reminder_retry_count"
        event_type = "whatsapp_reminder"
        label = "same-day reminder"
        template_name = WHATSAPP_REMINDER_TEMPLATE

    parameters = [
        booking.get("full_name", ""),
        format_whatsapp_date(booking.get("date", "")),
        booking.get("role", ""),
    ]
    outbox = await record_whatsapp_outbox(
        result,
        booking.get("phone_number", ""),
        template_name,
        parameters,
        message_type,
        source,
        booking_id=booking_id,
        participant_name=booking.get("full_name"),
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    success = bool(result.get("success"))
    update = {
        status_field: "accepted" if success else "failed",
        retry_field: 0,
        "whatsapp_last_error": None if success else (result.get("reason") or "WhatsApp send failed")[:500],
        "last_updated_at": now_iso,
    }
    if success:
        update[sent_field] = now_iso
        if result.get("message_id"):
            update[message_id_field] = result["message_id"]
    if booking_id:
        await db.bookings.update_one({"id": booking_id}, {"$set": update})

    await write_audit_log(
        event_type,
        f"WhatsApp {label} {'accepted by Meta' if success else 'failed'}",
        f"{booking.get('full_name', 'Participant')} — Lead {booking.get('role', '')} on {booking.get('date', '')}",
        level="success" if success else "error",
        booking_id=booking_id,
        participant_name=booking.get("full_name"),
        details={
            "source": source,
            "message_type": message_type,
            "phone": mask_phone(booking.get("phone_number")),
            "status": "accepted" if success else "failed",
            "meta_message_id": result.get("message_id"),
        },
    )
    if not success:
        if result.get("retryable"):
            await schedule_outbox_retry(outbox)
        else:
            await flag_unresolved_whatsapp_failure(outbox, result.get("reason"))
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
            pastor_parameters = [format_whatsapp_date(today_str), prayer_leader, worship_leader]
            pastor_outbox = await record_whatsapp_outbox(
                whatsapp_result,
                PASTOR_WHATSAPP_NUMBER,
                WHATSAPP_PASTOR_TEMPLATE,
                pastor_parameters,
                "pastor_summary",
                "scheduled_7pm",
                participant_name=PASTOR_NAME,
            )
            if not whatsapp_result.get("success") and whatsapp_result.get("retryable"):
                await schedule_outbox_retry(pastor_outbox)
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


@api_router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge", "")
    if (
        WHATSAPP_WEBHOOK_VERIFY_TOKEN
        and mode == "subscribe"
        and token == WHATSAPP_WEBHOOK_VERIFY_TOKEN
    ):
        logger.info("WhatsApp webhook verified successfully")
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="WhatsApp webhook verification failed")


@api_router.post("/whatsapp/webhook")
async def receive_whatsapp_webhook(payload: dict):
    if payload.get("object") != "whatsapp_business_account":
        return {"status": "ignored"}

    processed = 0
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value") or {}
            for item in value.get("statuses", []):
                message_id = item.get("id")
                status = item.get("status")
                if not message_id or status not in {"sent", "delivered", "read", "failed"}:
                    continue

                timestamp = item.get("timestamp")
                event_iso = datetime.now(timezone.utc).isoformat()
                if timestamp:
                    try:
                        event_iso = datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
                    except (TypeError, ValueError, OSError):
                        pass

                errors = item.get("errors") or []
                first_error = errors[0] if errors and isinstance(errors[0], dict) else {}
                error_code = first_error.get("code")
                error_title = first_error.get("title") or first_error.get("message")
                error_details = (first_error.get("error_data") or {}).get("details")
                error_text = " | ".join(
                    str(part) for part in [error_code, error_title, error_details] if part not in (None, "")
                ) or None

                outbox = await db.whatsapp_outbox.find_one({"message_id": message_id}, {"_id": 0})
                update = {
                    "status": status,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "last_error": error_text if status == "failed" else None,
                    "meta_status_payload": {
                        "recipient_id": item.get("recipient_id"),
                        "conversation": item.get("conversation"),
                        "pricing": item.get("pricing"),
                    },
                }
                if status in {"sent", "delivered", "read", "failed"}:
                    update[f"{status}_at"] = event_iso
                await db.whatsapp_outbox.update_one({"message_id": message_id}, {"$set": update})

                if outbox:
                    booking_id = outbox.get("booking_id")
                    message_type = outbox.get("message_type")
                    if booking_id and message_type in {"confirmation", "reminder"}:
                        prefix = f"whatsapp_{message_type}"
                        booking_update = {
                            f"{prefix}_status": status,
                            "last_updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                        if status == "delivered":
                            booking_update[f"{prefix}_delivered_at"] = event_iso
                            booking_update["whatsapp_last_error"] = None
                        elif status == "read":
                            booking_update[f"{prefix}_read_at"] = event_iso
                            booking_update[f"{prefix}_delivered_at"] = event_iso
                            booking_update["whatsapp_last_error"] = None
                        elif status == "failed":
                            booking_update["whatsapp_last_error"] = (error_text or "Meta reported delivery failed")[:500]

                        await db.bookings.update_one(
                            {"id": booking_id, f"{prefix}_message_id": message_id},
                            {"$set": booking_update},
                        )

                    await write_audit_log(
                        "whatsapp_delivery",
                        f"WhatsApp {status}",
                        f"Meta reported {status} for {outbox.get('message_type', 'message')}.",
                        level="error" if status == "failed" else "success",
                        booking_id=outbox.get("booking_id"),
                        participant_name=outbox.get("participant_name"),
                        details={
                            "status": status,
                            "meta_message_id": message_id,
                            "template": outbox.get("template_name"),
                            "message_type": outbox.get("message_type"),
                            "retry_count": outbox.get("retry_count", 0),
                            "error_code": error_code,
                            "error": error_text,
                            "phone": mask_phone(outbox.get("phone_number")),
                        },
                    )

                    if status == "failed":
                        refreshed = await db.whatsapp_outbox.find_one({"id": outbox["id"]}, {"_id": 0})
                        if refreshed:
                            if is_retryable_whatsapp_failure(error_code) and int(outbox.get("retry_count", 0)) < WHATSAPP_MAX_RETRIES:
                                await schedule_outbox_retry(refreshed)
                            else:
                                await flag_unresolved_whatsapp_failure(refreshed, error_text)
                processed += 1

    return {"status": "ok", "processed": processed}


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
        {
            "_id": 0,
            "email": 0,
            "notes": 0,
            "phone_number": 0,
            "whatsapp_opt_in": 0,
            "whatsapp_last_error": 0,
            "whatsapp_confirmation_status": 0,
            "whatsapp_confirmation_sent_at": 0,
            "whatsapp_confirmation_delivered_at": 0,
            "whatsapp_confirmation_read_at": 0,
            "whatsapp_confirmation_message_id": 0,
            "whatsapp_confirmation_retry_count": 0,
            "whatsapp_reminder_status": 0,
            "whatsapp_reminder_sent_at": 0,
            "whatsapp_reminder_delivered_at": 0,
            "whatsapp_reminder_read_at": 0,
            "whatsapp_reminder_message_id": 0,
            "whatsapp_reminder_retry_count": 0,
        },
    ).to_list(1000)
    for booking in bookings:
        booking["display_name"] = format_name_display(booking["full_name"])
        if isinstance(booking.get("created_at"), str):
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
        if isinstance(booking.get("last_updated_at"), str):
            booking["last_updated_at"] = datetime.fromisoformat(booking["last_updated_at"])
    return bookings



@api_router.post("/analytics/visit")
async def track_visitor(ping: VisitorPing, request: Request):
    # Do not count visits to protected admin pages as public-site visitors.
    if ping.path.startswith("/admin"):
        return {"status": "ignored"}

    now_utc = datetime.now(timezone.utc)
    uk_now = now_utc.astimezone(UK_TZ)
    date_uk = uk_now.strftime("%Y-%m-%d")
    user_agent = request.headers.get("user-agent", "")[:300]
    location = get_request_location(request, ping.timezone)
    network = get_masked_network(request)
    device = classify_device(user_agent, ping.screen_width)
    browser = classify_browser(user_agent)

    first_seen_existing = await db.visitor_sessions.find_one(
        {"session_id": ping.session_id}, {"_id": 0, "first_seen": 1}
    )
    session_update = {
        "session_id": ping.session_id,
        "visitor_id": ping.visitor_id,
        "last_seen": now_utc,
        "current_path": ping.path,
        "location": location,
        "network": network,
        "device": device,
        "browser": browser,
        "language": ping.language,
        "user_agent": user_agent,
    }
    await db.visitor_sessions.update_one(
        {"session_id": ping.session_id},
        {
            "$set": session_update,
            "$setOnInsert": {"first_seen": now_utc},
        },
        upsert=True,
    )

    if ping.event_type == "page_view":
        await db.visitor_events.insert_one({
            "id": str(uuid.uuid4()),
            "timestamp": now_utc,
            "date_uk": date_uk,
            "visitor_id": ping.visitor_id,
            "session_id": ping.session_id,
            "path": ping.path,
            "referrer": ping.referrer,
            "location": location,
            "network": network,
            "device": device,
            "browser": browser,
            "language": ping.language,
        })
    return {"status": "ok"}


@api_router.get("/admin/visitors")
async def get_visitor_analytics(
    days: int = Query(30, ge=7, le=365),
    admin: dict = Depends(verify_admin_token),
):
    now_utc = datetime.now(timezone.utc)
    active_cutoff = now_utc - timedelta(seconds=90)
    start_utc = now_utc - timedelta(days=days - 1)
    today_uk = now_utc.astimezone(UK_TZ).strftime("%Y-%m-%d")

    active_visitors = await db.visitor_sessions.distinct(
        "visitor_id", {"last_seen": {"$gte": active_cutoff}}
    )
    today_unique = await db.visitor_events.distinct("visitor_id", {"date_uk": today_uk})
    today_views = await db.visitor_events.count_documents({"date_uk": today_uk})
    today_sessions = await db.visitor_events.distinct("session_id", {"date_uk": today_uk})
    total_views = await db.visitor_events.count_documents({})
    all_unique = await db.visitor_events.distinct("visitor_id", {})
    all_sessions = await db.visitor_events.distinct("session_id", {})

    daily_pipeline = [
        {"$match": {"timestamp": {"$gte": start_utc}}},
        {"$group": {
            "_id": {"date": "$date_uk", "visitor": "$visitor_id"},
            "views": {"$sum": 1},
        }},
        {"$group": {
            "_id": "$_id.date",
            "unique_visitors": {"$sum": 1},
            "page_views": {"$sum": "$views"},
        }},
        {"$sort": {"_id": 1}},
    ]
    daily_raw = await db.visitor_events.aggregate(daily_pipeline).to_list(days + 5)
    daily_map = {item["_id"]: item for item in daily_raw}
    daily = []
    current_day = (now_utc.astimezone(UK_TZ) - timedelta(days=days - 1)).date()
    for offset in range(days):
        day = current_day + timedelta(days=offset)
        key = day.strftime("%Y-%m-%d")
        item = daily_map.get(key, {})
        daily.append({
            "date": key,
            "unique_visitors": int(item.get("unique_visitors", 0)),
            "page_views": int(item.get("page_views", 0)),
        })

    top_pages_pipeline = [
        {"$match": {"timestamp": {"$gte": start_utc}}},
        {"$group": {
            "_id": {"path": "$path", "visitor": "$visitor_id"},
            "views": {"$sum": 1},
        }},
        {"$group": {
            "_id": "$_id.path",
            "page_views": {"$sum": "$views"},
            "unique_visitors": {"$sum": 1},
        }},
        {"$sort": {"page_views": -1}},
        {"$limit": 12},
    ]
    top_pages_raw = await db.visitor_events.aggregate(top_pages_pipeline).to_list(12)

    locations_pipeline = [
        {"$match": {"timestamp": {"$gte": start_utc}}},
        {"$group": {
            "_id": {
                "country": "$location.country",
                "region": "$location.region",
                "city": "$location.city",
                "timezone": "$location.timezone",
                "visitor": "$visitor_id",
            },
            "views": {"$sum": 1},
        }},
        {"$group": {
            "_id": {
                "country": "$_id.country",
                "region": "$_id.region",
                "city": "$_id.city",
                "timezone": "$_id.timezone",
            },
            "unique_visitors": {"$sum": 1},
            "page_views": {"$sum": "$views"},
        }},
        {"$sort": {"unique_visitors": -1, "page_views": -1}},
        {"$limit": 15},
    ]
    locations_raw = await db.visitor_events.aggregate(locations_pipeline).to_list(15)

    devices_pipeline = [
        {"$match": {"timestamp": {"$gte": start_utc}}},
        {"$group": {"_id": "$device", "page_views": {"$sum": 1}}},
        {"$sort": {"page_views": -1}},
    ]
    devices_raw = await db.visitor_events.aggregate(devices_pipeline).to_list(10)
    networks_pipeline = [
        {"$match": {"timestamp": {"$gte": start_utc}}},
        {"$group": {
            "_id": {"network": "$network", "visitor": "$visitor_id"},
            "views": {"$sum": 1},
        }},
        {"$group": {
            "_id": "$_id.network",
            "unique_visitors": {"$sum": 1},
            "page_views": {"$sum": "$views"},
        }},
        {"$sort": {"unique_visitors": -1, "page_views": -1}},
        {"$limit": 12},
    ]
    networks_raw = await db.visitor_events.aggregate(networks_pipeline).to_list(12)


    recent = await db.visitor_sessions.find(
        {},
        {
            "_id": 0,
            "visitor_id": 0,
            "session_id": 0,
            "user_agent": 0,
        },
    ).sort("last_seen", -1).to_list(50)

    return {
        "range_days": days,
        "active_now": len(active_visitors),
        "today_unique": len(today_unique),
        "today_page_views": today_views,
        "today_sessions": len(today_sessions),
        "total_page_views": total_views,
        "total_sessions": len(all_sessions),
        "total_unique_visitors": len(all_unique),
        "daily": daily,
        "top_pages": [
            {
                "path": item["_id"] or "/",
                "page_views": item["page_views"],
                "unique_visitors": item["unique_visitors"],
            }
            for item in top_pages_raw
        ],
        "locations": [
            {
                "country": (item["_id"] or {}).get("country") or "Unknown",
                "region": (item["_id"] or {}).get("region"),
                "city": (item["_id"] or {}).get("city"),
                "timezone": (item["_id"] or {}).get("timezone") or "Unknown",
                "unique_visitors": item["unique_visitors"],
                "page_views": item["page_views"],
            }
            for item in locations_raw
        ],
        "devices": [
            {"device": item["_id"] or "Unknown", "page_views": item["page_views"]}
            for item in devices_raw
        ],
        "networks": [
            {
                "network": item["_id"] or "unknown",
                "unique_visitors": item["unique_visitors"],
                "page_views": item["page_views"],
            }
            for item in networks_raw
        ],
        "recent_visitors": recent,
        "active_window_seconds": 90,
        "privacy_note": "Visitors are counted with an anonymous browser identifier. Full IP addresses are not stored; only a masked network prefix and coarse location headers/timezone are retained.",
    }


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
        booking.setdefault("whatsapp_confirmation_retry_count", 0)
        booking.setdefault("whatsapp_reminder_status", "not_requested")
        booking.setdefault("whatsapp_reminder_retry_count", 0)
    return bookings


@api_router.get("/admin/today")
async def get_admin_today(admin: dict = Depends(verify_admin_token)):
    today_str = datetime.now(UK_TZ).strftime("%Y-%m-%d")
    bookings = await db.bookings.find({"date": today_str, "status": "Booked"}, {"_id": 0}).to_list(10)
    prayer = next((b for b in bookings if b.get("role") == "Prayer"), None)
    worship = next((b for b in bookings if b.get("role") == "Worship"), None)
    unresolved_failures = await db.whatsapp_outbox.count_documents({
        "status": "failed",
        "admin_alerted_at": {"$nin": [None, ""]},
    })
    return {
        "date": today_str,
        "prayer": prayer,
        "worship": worship,
        "meeting_time": "8:00 PM - 9:00 PM UK",
        "reminder_time": "4:00 PM UK",
        "pastor_summary_time": f"{PASTOR_EMAIL_HOUR:02d}:{PASTOR_EMAIL_MINUTE:02d} UK",
        "unresolved_whatsapp_failures": unresolved_failures,
        "slots_filled": sum(1 for item in [prayer, worship] if item),
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
        "webhook_verify_token_configured": bool(WHATSAPP_WEBHOOK_VERIFY_TOKEN),
        "max_retries": WHATSAPP_MAX_RETRIES,
        "retry_delay_seconds": WHATSAPP_RETRY_DELAY_SECONDS,
        "language": WHATSAPP_TEMPLATE_LANGUAGE,
        "api_version": WHATSAPP_API_VERSION,
        "confirmation_template": WHATSAPP_CONFIRMATION_TEMPLATE,
        "reminder_template": WHATSAPP_REMINDER_TEMPLATE,
        "pastor_template": WHATSAPP_PASTOR_TEMPLATE,
        "healthy": WHATSAPP_ENABLED and credentials_configured and templates_configured,
    }


@api_router.get("/admin/whatsapp/messages")
async def get_whatsapp_messages(
    admin: dict = Depends(verify_admin_token),
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=300),
):
    query = {}
    if status and status != "all":
        query["status"] = status
    messages = await db.whatsapp_outbox.find(
        query,
        {"_id": 0, "body_parameters": 0, "meta_status_payload": 0},
    ).sort("created_at", -1).to_list(limit)
    for message in messages:
        message["phone"] = mask_phone(message.pop("phone_number", None))
        message["needs_attention"] = bool(message.get("admin_alerted_at"))
    return {"messages": messages, "count": len(messages)}


@api_router.post("/admin/whatsapp/messages/{outbox_id}/retry")
async def retry_whatsapp_message_now(
    outbox_id: str,
    request: Request,
    admin: dict = Depends(verify_admin_token),
):
    outbox = await db.whatsapp_outbox.find_one({"id": outbox_id}, {"_id": 0})
    if not outbox:
        raise HTTPException(status_code=404, detail="WhatsApp message not found")
    result = await asyncio.to_thread(
        _send_whatsapp_template,
        outbox.get("phone_number", ""),
        outbox.get("template_name", ""),
        outbox.get("body_parameters") or [],
        False,
    )
    retry_count = int(outbox.get("retry_count", 0)) + 1
    retry_doc = await record_whatsapp_outbox(
        result,
        outbox.get("phone_number", ""),
        outbox.get("template_name", ""),
        outbox.get("body_parameters") or [],
        outbox.get("message_type", "unknown"),
        "admin_manual_retry",
        booking_id=outbox.get("booking_id"),
        participant_name=outbox.get("participant_name"),
        retry_count=retry_count,
        parent_message_id=outbox.get("message_id"),
    )
    if outbox.get("booking_id") and outbox.get("message_type") in {"confirmation", "reminder"}:
        prefix = f"whatsapp_{outbox.get('message_type')}"
        booking_update = {
            f"{prefix}_status": "accepted" if result.get("success") else "failed",
            f"{prefix}_retry_count": retry_count,
            "whatsapp_last_error": None if result.get("success") else (result.get("reason") or "Retry failed")[:500],
            "last_updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if retry_doc.get("message_id"):
            booking_update[f"{prefix}_message_id"] = retry_doc["message_id"]
        await db.bookings.update_one({"id": outbox.get("booking_id")}, {"$set": booking_update})
    await write_audit_log(
        "whatsapp_retry",
        "WhatsApp manual retry accepted" if result.get("success") else "WhatsApp manual retry failed",
        f"Admin retried {outbox.get('message_type', 'message')} for {outbox.get('participant_name') or 'recipient'}.",
        level="success" if result.get("success") else "error",
        booking_id=outbox.get("booking_id"),
        participant_name=outbox.get("participant_name"),
        details={"retry_count": retry_count, "phone": mask_phone(outbox.get("phone_number"))},
        request=request,
    )
    if not result.get("success"):
        if result.get("retryable") and retry_count < WHATSAPP_MAX_RETRIES:
            await schedule_outbox_retry(retry_doc)
        else:
            await flag_unresolved_whatsapp_failure(retry_doc, result.get("reason"))
        raise HTTPException(status_code=502, detail=result.get("reason") or "Retry failed")
    return {"message": "WhatsApp retry accepted by Meta", "message_id": result.get("message_id")}


@api_router.get("/admin/system-health")
async def get_system_health(admin: dict = Depends(verify_admin_token)):
    db_ok = True
    try:
        await db.command("ping")
    except Exception:
        db_ok = False

    latest_webhook = await db.whatsapp_outbox.find_one(
        {"status": {"$in": ["sent", "delivered", "read", "failed"]}},
        {"_id": 0, "updated_at": 1, "status": 1},
        sort=[("updated_at", -1)],
    )
    unresolved_count = await db.whatsapp_outbox.count_documents({
        "status": "failed",
        "admin_alerted_at": {"$nin": [None, ""]},
    })
    scheduler_jobs = {job.id: str(job.next_run_time) if job.next_run_time else None for job in scheduler.get_jobs()}
    whatsapp_configured = bool(
        WHATSAPP_ENABLED
        and WHATSAPP_ACCESS_TOKEN
        and WHATSAPP_PHONE_NUMBER_ID
        and WHATSAPP_WEBHOOK_VERIFY_TOKEN
    )
    return {
        "healthy": bool(db_ok and whatsapp_configured and scheduler.running),
        "backend": "online",
        "database": "connected" if db_ok else "error",
        "whatsapp": "configured" if whatsapp_configured else "attention",
        "email": "configured" if bool(RESEND_API_KEY) else "not_configured",
        "scheduler": "running" if scheduler.running else "stopped",
        "scheduler_jobs": scheduler_jobs,
        "last_whatsapp_event_at": latest_webhook.get("updated_at") if latest_webhook else None,
        "last_whatsapp_status": latest_webhook.get("status") if latest_webhook else None,
        "unresolved_whatsapp_failures": unresolved_count,
        "retry_policy": {
            "max_retries": WHATSAPP_MAX_RETRIES,
            "delay_seconds": WHATSAPP_RETRY_DELAY_SECONDS,
            "transient_only": True,
        },
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

    core_changed = any(
        key in update_dict and update_dict.get(key) != existing.get(key)
        for key in ("full_name", "date", "role")
    )
    if core_changed and effective_phone:
        update_dict["whatsapp_confirmation_status"] = "pending"
        update_dict["whatsapp_reminder_status"] = "pending"
        update_dict["whatsapp_last_error"] = None
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
        template_name = {
            "upperroom_booking_confirmation": "upperroom_booking_confirmation1",
            "upperroom_reminder": "upperroom_reminder1",
            "upperroom_pastor_daily_summary": "upperroom_pastor_daily_summary1",
        }.get(request_data.template_name, request_data.template_name)
        if template_name == "upperroom_pastor_daily_summary1":
            if not request_data.prayer_leader or not request_data.worship_leader:
                raise HTTPException(status_code=400, detail="Prayer and Worship leader names are required for the pastor summary.")
            parameters = [formatted_date, request_data.prayer_leader.strip(), request_data.worship_leader.strip()]
            participant_name = None
        else:
            if not request_data.full_name or not request_data.role:
                raise HTTPException(status_code=400, detail="Full name and Lead are required for this template.")
            parameters = [request_data.full_name.strip(), formatted_date, request_data.role]
            participant_name = request_data.full_name.strip()
        result = await asyncio.to_thread(_send_whatsapp_template, normalized_phone, template_name, parameters, True)
        manual_outbox = await record_whatsapp_outbox(
            result,
            normalized_phone,
            template_name,
            parameters,
            "pastor_summary" if template_name == "upperroom_pastor_daily_summary1" else (
                "confirmation" if template_name == "upperroom_booking_confirmation1" else "reminder"
            ),
            "admin_manual",
            participant_name=participant_name,
        )
        if not result.get("success") and result.get("retryable"):
            await schedule_outbox_retry(manual_outbox)
        await write_audit_log(
            "manual_whatsapp",
            "Manual WhatsApp sent",
            f"Template {template_name} sent successfully.",
            level="success",
            participant_name=participant_name,
            details={
            "template": template_name,
            "phone": mask_phone(normalized_phone),
            "date": request_data.date,
            "meta_message_id": result.get("message_id"),
        },
            request=request,
        )
        return {"message": "WhatsApp message sent successfully", "template": template_name, "phone_number": normalized_phone, "result": result}
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
    await db.visitor_events.create_index("timestamp", expireAfterSeconds=31536000)
    await db.visitor_events.create_index([("date_uk", 1), ("visitor_id", 1)])
    await db.visitor_sessions.create_index("last_seen", expireAfterSeconds=7776000)
    await db.visitor_sessions.create_index([("visitor_id", 1), ("last_seen", -1)])
    scheduler.add_job(send_daily_reminders, CronTrigger(hour=16, minute=0, timezone=UK_TZ), id="daily_reminder", replace_existing=True)
    scheduler.add_job(send_pastor_daily_summary, CronTrigger(hour=PASTOR_EMAIL_HOUR, minute=PASTOR_EMAIL_MINUTE, timezone=UK_TZ), id="pastor_summary", replace_existing=True)
    scheduler.add_job(process_whatsapp_retries, IntervalTrigger(minutes=1), id="whatsapp_retry_worker", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started (member reminders + pastor summary + WhatsApp retry worker enabled).")
    logger.info("WhatsApp enabled: %s", WHATSAPP_ENABLED)


@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()
    logger.info("Scheduler and database connection closed")
