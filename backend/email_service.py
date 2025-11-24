import os
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

router = APIRouter()


class EmailSubmission(BaseModel):
    name: str
    email: EmailStr
    state: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    location_type: Optional[str] = None


def _send_email_sync(payload: EmailSubmission) -> None:
    """Blocking email send using Gmail SMTP. Intended to run in a background task."""
    gmail_user = os.getenv("GMAIL_USER")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_password:
        logger.error("GMAIL_USER or GMAIL_APP_PASSWORD environment variables are not set")
        raise RuntimeError("Email service is not configured correctly.")

    msg = EmailMessage()
    msg["Subject"] = "Water Cleanup Submission"
    msg["From"] = gmail_user
    msg["To"] = payload.email

    body_lines = [
        f"Hi {payload.name},",
        "",
        "Your water cleanup request has been submitted successfully. Thank you!",
        "",
    ]

    # Optionally include location details in the email body for reference
    details = []
    if payload.state:
        details.append(f"State: {payload.state}")
    if payload.city:
        details.append(f"City: {payload.city}")
    if payload.address:
        details.append(f"Address: {payload.address}")
    if payload.location_type:
        details.append(f"Location type: {payload.location_type}")

    if details:
        body_lines.append("Submitted details:")
        body_lines.extend(details)

    msg.set_content("\n".join(body_lines))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.send_message(msg)
        logger.info("Confirmation email sent to %s", payload.email)
    except Exception as exc:  # pragma: no cover - logging
        logger.exception("Failed to send confirmation email: %s", exc)
        raise


@router.post("/submit-email")
async def submit_email(payload: EmailSubmission, background_tasks: BackgroundTasks) -> dict:
    """Accept submission data and send confirmation email asynchronously."""

    # Schedule email sending as a background task so the request returns quickly
    background_tasks.add_task(_send_email_sync, payload)

    return {"message": f"Thank you {payload.name}, confirmation email sent!"}
