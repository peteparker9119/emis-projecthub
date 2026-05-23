"""
Mention parsing and notification utilities.

When a comment contains @Name the system:
  1. Looks up the user by name (case-insensitive, partial match)
  2. Creates an in-app Notification for that user
  3. Sends an email to their registered email address (if email is configured)
"""

import re
import threading

from django.conf import settings
from django.core.mail import send_mail

from users.models import User
from .models import Notification


# ---------------------------------------------------------------------------
# Mention parsing
# ---------------------------------------------------------------------------

MENTION_RE = re.compile(r'@([\w][\w ]{0,48}?)(?=\s|$|[^a-zA-Z ])')


def extract_mentions(text: str) -> list[str]:
    """Return list of raw strings after @ symbols."""
    return MENTION_RE.findall(text)


def resolve_mentions(text: str, exclude_user=None) -> list[User]:
    """
    Parse @Name mentions in text and return matched User objects.
    Skips the commenter themselves (exclude_user).
    """
    raw_names = extract_mentions(text)
    if not raw_names:
        return []

    found = []
    seen_ids = set()

    for name_fragment in raw_names:
        name_fragment = name_fragment.strip()
        # Match by full name (icontains) — first match wins
        user = User.objects.filter(
            name__icontains=name_fragment,
            is_active=True
        ).exclude(
            id=exclude_user.id if exclude_user else None
        ).first()

        if user and user.id not in seen_ids:
            found.append(user)
            seen_ids.add(user.id)

    return found


# ---------------------------------------------------------------------------
# Email sender (runs in a background thread so the response isn't delayed)
# ---------------------------------------------------------------------------

def _send_email_async(subject, message, html_message, recipient_list):
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=True,
        )
    except Exception:
        pass  # Never crash the main request over email


def send_mention_email(mentioned_user: User, sender: User, comment_text: str, context_label: str, context_url: str = ''):
    """Send an HTML email to a mentioned user."""
    if not getattr(settings, 'EMAIL_ENABLED', False):
        return
    if not mentioned_user.email:
        return

    subject = f'[EMIS ProjectHub] {sender.name} mentioned you in {context_label}'

    # Highlight the mention in the email body
    highlighted = comment_text.replace(
        f'@{mentioned_user.name}',
        f'<strong style="color:#1a56db">@{mentioned_user.name}</strong>'
    )

    html_message = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0e3a9c,#1a56db);padding:24px 28px;color:white;">
        <div style="font-size:13px;opacity:.8;margin-bottom:4px;">EMIS ProjectHub · TN Education Management</div>
        <div style="font-size:20px;font-weight:700;">You were mentioned 👋</div>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px;color:#374151;font-size:14px;">
          <strong>{sender.name}</strong> mentioned you in <strong>{context_label}</strong>:
        </p>
        <div style="background:white;border-left:4px solid #1a56db;border-radius:8px;padding:16px 20px;color:#374151;font-size:14px;line-height:1.6;margin-bottom:20px;">
          {highlighted}
        </div>
        {'<a href="' + context_url + '" style="display:inline-block;background:#1a56db;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">View in ProjectHub →</a>' if context_url else ''}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;">
        EMIS ProjectHub · Tamil Nadu Education Management Information System
      </div>
    </div>
    """

    plain_message = f'{sender.name} mentioned you in {context_label}:\n\n{comment_text}'

    t = threading.Thread(
        target=_send_email_async,
        args=(subject, plain_message, html_message, [mentioned_user.email]),
        daemon=True,
    )
    t.start()


# ---------------------------------------------------------------------------
# Main entry point: call this after saving a comment
# ---------------------------------------------------------------------------

def notify_mentions(
    text: str,
    sender: User,
    item_type: str,           # 'requirement' | 'task' | 'bug' | 'general'
    item_id,
    context_label: str,       # e.g. "Requirement REQ-001"
    context_url: str = '',
):
    """
    Parse @mentions in `text`, create in-app Notification for each mentioned
    user, and send them an email.
    """
    mentioned = resolve_mentions(text, exclude_user=sender)

    for user in mentioned:
        # In-app notification
        Notification.objects.create(
            recipient=user,
            sender=sender,
            title=f'{sender.name} mentioned you',
            message=f'In {context_label}: {text[:120]}{"…" if len(text) > 120 else ""}',
            item_type=item_type,
            item_id=str(item_id),
        )

        # Email
        send_mention_email(
            mentioned_user=user,
            sender=sender,
            comment_text=text,
            context_label=context_label,
            context_url=context_url,
        )


# ---------------------------------------------------------------------------
# Assignee-change notification
# ---------------------------------------------------------------------------

def notify_assignee_change(item_type: str, item_id, item_title: str, assigned_to: User, assigned_by: User):
    """Create in-app notification + send email when an item is assigned."""
    if assigned_to.id == assigned_by.id:
        return  # Don't notify if you assigned to yourself

    label_map = {'requirement': '📋 Requirement', 'task': '✅ Task', 'bug': '🐛 Bug'}
    label = label_map.get(item_type, 'Item')

    Notification.objects.create(
        recipient=assigned_to,
        sender=assigned_by,
        title=f'You were assigned a {item_type}',
        message=f'{assigned_by.name} assigned you: {item_title}',
        item_type=item_type,
        item_id=str(item_id),
    )

    if not getattr(settings, 'EMAIL_ENABLED', False) or not assigned_to.email:
        return

    subject = f'[EMIS ProjectHub] {assigned_by.name} assigned you a {item_type}'
    html_message = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0e3a9c,#1a56db);padding:24px 28px;color:white;">
        <div style="font-size:13px;opacity:.8;margin-bottom:4px;">EMIS ProjectHub · TN Education Management</div>
        <div style="font-size:20px;font-weight:700;">{label} Assigned to You</div>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 12px;color:#374151;font-size:14px;">
          <strong>{assigned_by.name}</strong> assigned the following {item_type} to you:
        </p>
        <div style="background:white;border-left:4px solid #0d9488;border-radius:8px;padding:14px 18px;color:#111827;font-size:15px;font-weight:600;margin-bottom:20px;">
          {item_title}
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0;">Log in to EMIS ProjectHub to view and update this item.</p>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;">
        EMIS ProjectHub · Tamil Nadu Education Management Information System
      </div>
    </div>
    """
    plain = f'{assigned_by.name} assigned you: {item_title}'
    t = threading.Thread(
        target=_send_email_async,
        args=(subject, plain, html_message, [assigned_to.email]),
        daemon=True,
    )
    t.start()
