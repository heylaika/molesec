"""This module covers all logic related to getting an email somewhere.

I explicitly avoided saying "sending" an email somewhere because, in
some cases, we are actually "inserting" an email directly into users
inboxes as if we were just writing data, bypassing most checks and
normal emailing logic. This means that we'll distinguish between:

- sending an email: actually sending an email from one address to
    another, which requires having control/ownership of the sender
    email or spoofing.
- inserting an email: appending an email to a user's inbox, which
    requires having control/ownership of the receiver email. This
    doesn't have to be "full" ownership, and highly depends on the email
    provider of the receiver. Currently we cover google workspaces,
    which works by having the workspace admin hand over partial control
    over their workspace to us.

Given the distinction, it's important for the user of this module to
know:
- if the **sender email** is controlled by us or if they want the email
  to look like it was sent from a specific email address, regardless of
  being in control of that address.
- if the **receiver email** supports inserting. This module provides a
  function to know that. The application works under the assumption that
  all google workspace emails support inserting by assuming that the
  admin has given us partial control over the workspace. See
  supports_insertion for more info.

More details about insertion support by email provider:
- google: requires the google workspace admin to go to the domain
delegation section of the security options and add our GCP GMAIL service
account ID with the https://www.googleapis.com/auth/gmail.insert scope.
See docs/email-whitelisting.md for more info.

The following table helps in deciding what combination of from_email and
to_email to pick when having to plan. Generally speaking, you should
prioritize inserting over sending given that it allows bypassing
security heuristics, and avoid spoofing if possible.

| Sender controlled by us | Receiver supports insertion | Can Spoof | Can send | Can insert | # noqa
|-------------------------|-----------------------------|-----------|----------|------------| # noqa
| No                      | No                          | Yes       | No       | No         | # noqa
| No                      | Yes                         | Yes       | No       | Yes        | # noqa
| Yes                     | No                          | Yes       | Yes      | No         | # noqa
| Yes                     | Yes                         | Yes       | Yes      | Yes        | # noqa


!!TLDR!!
This means, that:
- if one of the targets emails supports insertion, use that as the to_email and
  use whatever you prefer as the from_field, regardless of whether we control
  the from_email or not.
- if that's not the case, you can:
    - use an email from COMMON_GMAIL_EMAIL_ADDRESSES as the from_email
    - use a <anything>@proto-mail.com email address as the from email
    - use any email address as the from_email, the logic will send it
      from proto-mail.com (spoofing).

After that, use the send_or_insert_email function to send or insert an
email.

"""


import base64
import logging
import smtplib
from email.mime.text import MIMEText
from enum import Enum
from typing import Dict, List, Optional

import dns
import dns.resolver
import requests
from cachetools import Cache, cached
from django.conf import settings
from django.core import mail as django_mail
from google.auth import exceptions as google_auth_exceptions
from google.oauth2 import service_account
from googleapiclient.discovery import build as google_service_build
from pydantic import EmailStr

from core import errors as core_errors


def send_or_insert_email(
    from_email: EmailStr,
    from_name: Optional[str],
    from_last_name: Optional[str],
    to_email: EmailStr,
    subject: str,
    body: str,
    is_html: bool,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    """Sends or inserts an email depending on the to_email.

    The user of this function must be aware of the fact/if the to_email
    supports insertion or, if not, if the from_email is controlled by
    us; said properties imply the deliverability of the email, and how
    it's actually delivered. See the module docstring.

    The function will decide whether to send or insert the email based
    on the following:
    - IF the to_email supports insertion, insert the email.
    - ELSE, send the email:
        - IF we control the from_email, send the email from that
            address. Emails which we control are the ones in
            settings.COMMON_GMAIL_EMAIL_ADDRESSES and all addresses
            ending in @proto-mail.com. This means that the caller of
            this function can come up with arbitrary names for proto-
            mail, eg. yolo@proto-mail.com.
        - ELSE: send the email as the desired from_email, but send it
            from proto-mail.com. This mismatch will likely trigger
            security heuristics and show up in the user email GUI, and
            it's the worst case.

    Args:
        from_email: the email address of the sender.
        from_name: the name of the sender. Will be used to enrich the
            metadata of the email when possible. The body will remain
            unaffected.
        from_last_name: the last name of the sender. Will be used to
            enrich the metadata of the email when possible. The body
            will remain unaffected.
        to_email: the email address of the recipient. If insertion is
            supported the email will be inserted, skipping security
            checks, allowing the user of this function to essentially
            put whatever in the from_* fields. See the function
            support_insertion for more details.
        subject: the subject of the email.
        body: the body of the email.
        is_html: whether the body is html or not.
        extra_headers: extra headers to add to the email.
    """

    if extra_headers is not None:
        # Subject, From, Bcc, To, Cc
        forbidden = {"subject", "from", "bcc", "to", "cc"}
        if any(k.lower() in forbidden for k in extra_headers.keys()):
            raise ValueError(f"Cannot set forbidden headers: {forbidden}.")

    # In this case it doesn't matter if we control the from email
    # address, since we are inserting the email in the inbox directly.
    if supports_insertion(to_email):
        logging.info(f"{to_email} supports insertion. Inserting email.")
        _insert_email_to_recipients(
            from_email=from_email,
            from_name=from_name,
            from_last_name=from_last_name,
            recipients=[to_email],
            subject=subject,
            body=body,
            is_html=is_html,
            recipients_see_each_other=False,
            extra_headers=extra_headers,
        )
    else:
        logging.info(
            f"{to_email} doesn't support insertion. Sending email from {from_email}."
        )
        _send_email_to_recipients(
            from_email=from_email,
            recipients=[to_email],
            subject=subject,
            body=body,
            is_html=is_html,
            extra_headers=extra_headers,
        )


def _send_email_to_recipients(
    from_email: EmailStr,
    recipients: List[EmailStr],
    subject: str,
    body: str,
    is_html: bool,
    recipients_see_each_other: bool = False,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    if from_email in settings.COMMON_GMAIL_EMAIL_ADDRESSES:
        _send_smtp_email(
            subject=subject,
            body=body,
            is_html=is_html,
            recipients=recipients,
            from_email=from_email,
            from_email_psw=settings.COMMON_GMAIL_EMAIL_ADDRESS_TO_PSWDS[from_email],
            recipients_see_each_other=recipients_see_each_other,
            extra_headers=extra_headers,
        )
    else:
        if settings.LEGIT_SOUNDING_EMAIL_PROVIDER not in from_email:
            logging.info(
                f"Sending email from {from_email} as "
                f"{settings.LEGIT_SOUNDING_EMAIL_PROVIDER}. Will cause a mismatch "
                "likely to trigger security heuristics."
            )

        if recipients_see_each_other:
            recipients = [recipients]
        for item in recipients:
            _send_email_with_proto_mail(
                subject=subject,
                body=body,
                is_html=is_html,
                recipients=item,
                from_email=from_email,
                extra_headers=extra_headers,
            )


def _send_email_with_proto_mail(
    subject: str,
    body: str,
    is_html: bool,
    recipients: List[str],
    from_email: str,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    logging.info(f"Sending proto-mail email to {recipients} from {from_email}.")
    data = {"from": from_email, "to": recipients, "subject": subject}

    if is_html:
        data["html"] = body
    else:
        data["text"] = body

    if extra_headers is not None:
        for key, value in extra_headers.items():
            data[f"h:{key}"] = value

    resp = requests.post(
        "https://api.eu.mailgun.net/v3/proto-mail.com/messages",
        auth=("api", settings.MAILGUN_API_KEY),
        data=data,
        timeout=10,
    )
    if resp.status_code != 200:
        raise core_errors.EmailSendingError(
            f"Error sending email to {recipients}. Status code: {resp.status_code}."
            f"Response: {resp.text}"
        )


def _send_molesec_email(
    from_email: EmailStr,
    recipients: List[EmailStr],
    subject: str,
    body: str,
    is_html: bool,
    recipients_see_each_other: bool = False,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    """Sends an email from a molesec email address.

    Currently unused, might be used for customer or internal emails.
    Note that it actually uses our sendgrid account, the molesec domain
    still needs to be verified there.
    """

    if is_html:
        message = ""
        html_message = body
    else:
        message = body
        html_message = None

    mail_server_connection = django_mail.get_connection(fail_silently=False)
    if recipients_see_each_other:
        _send_email_with_django(
            mail_server_connection=mail_server_connection,
            subject=subject,
            message=message,
            html_message=html_message,
            recipients=recipients,
            from_email=from_email,
            extra_headers=extra_headers,
        )
    else:
        for recipient in recipients:
            _send_email_with_django(
                mail_server_connection=mail_server_connection,
                subject=subject,
                message=message,
                html_message=html_message,
                recipients=[recipient],
                from_email=from_email,
                extra_headers=extra_headers,
            )


def _send_smtp_email(
    subject: str,
    body: str,
    is_html: bool,
    recipients: List[str],
    from_email: str,
    from_email_psw: str,
    recipients_see_each_other: bool,
    extra_headers: Optional[Dict[str, str]] = None,
):
    logging.info(f"Sending SMTP email to {recipients} from {from_email}.")
    message = MIMEText(body, "html" if is_html else "plain")
    message["Subject"] = subject
    message["From"] = from_email
    if not recipients_see_each_other and len(recipients) > 1:
        message["Bcc"] = ", ".join(recipients)
    else:
        message["To"] = ", ".join(recipients)
        message["Cc"] = ", ".join(recipients)

    if extra_headers is not None:
        for k, v in extra_headers.items():
            message[k] = v

    server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
    server.ehlo()
    server.login(from_email, from_email_psw)
    server.send_message(message)
    server.close()


def _send_email_with_django(
    mail_server_connection,
    subject: str,
    message: str,
    html_message: Optional[str],
    recipients: List[str],
    from_email: str,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    mail = django_mail.EmailMultiAlternatives(
        subject,
        message,
        from_email,
        recipients,
        connection=mail_server_connection,
        headers=extra_headers,
    )
    if html_message is not None:
        mail.attach_alternative(html_message, "text/html")
    return mail.send()


def log_sent_email(recipients: List[str]):
    email_str = "Emails" if len(recipients) > 1 else "Email"
    white_spaces = " " * 7
    recipients_str = (
        "\n" + "\n".join(map(lambda r: white_spaces + r, recipients))
        if len(recipients) > 1
        else recipients[0]
    )

    logging.info(f"{email_str} sent to: {recipients_str}")


def supports_insertion(email: EmailStr) -> bool:
    """Returns whether the email address supports insertion.

    Assumes that any google or m365 workspace email address is an
    address on which we have control over the inbox for insertion
    purposes, e.g.  domain delegation etc. See this module docstring for
    more info.
    """
    return _get_email_workspace(email) == _MailWorkspace.GOOGLE


class _MailWorkspace(str, Enum):
    GOOGLE = "GOOGLE"
    M365 = "M365"


@cached(cache=Cache(maxsize=1e9))
def _get_email_workspace(email: EmailStr) -> Optional[_MailWorkspace]:
    domain = email.split("@")[1]
    try:
        mx_records = dns.resolver.query(domain, "MX")

        for mx in mx_records:
            mx_exchange = str(mx.exchange)
            if "google.com" in mx_exchange:
                # Check SPF record for Google Workspace
                spf_records = dns.resolver.query(domain, "TXT")
                for spf in spf_records:
                    if "v=spf1 include:_spf.google.com ~all" in str(spf):
                        return _MailWorkspace.GOOGLE
            if "protection.outlook.com" in mx_exchange:
                return _MailWorkspace.M365

    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer) as e:
        logging.warning(f"Could not find MX records for domain {domain}: {e}")
    return None


def _insert_email_to_recipients(
    from_email: EmailStr,
    from_name: Optional[str],
    from_last_name: Optional[str],
    recipients: List[str],
    subject: str,
    body: str,
    is_html: bool,
    recipients_see_each_other: bool = False,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    """Insert an email in an inbox which we have control over.

    Currently only supports google workspaces.

    See the module docstring for more info.
    """
    for recipient in recipients:
        cc_list = None
        if recipients_see_each_other:
            cc_list = list(recipients)
            cc_list.remove(recipient)
        _insert_email(
            from_email=from_email,
            from_name=from_name,
            from_last_name=from_last_name,
            to_email=recipient,
            subject=subject,
            body=body,
            is_html=is_html,
            cc_list=cc_list,
            extra_headers=extra_headers,
        )


def _insert_email(
    from_email: EmailStr,
    from_name: Optional[str],
    from_last_name: Optional[str],
    to_email: EmailStr,
    subject: str,
    body: str,
    is_html: bool,
    cc_list: Optional[List[EmailStr]] = None,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    logging.info(f"Inserting email to {to_email} from {from_email}.")
    message = MIMEText(body, "html" if is_html else "plain")
    message["Subject"] = subject

    from_ = []
    if from_name is not None:
        from_.append(from_name)
    if from_last_name is not None:
        from_.append(from_last_name)
    from_.append(f"<{from_email}>")

    message["From"] = " ".join(from_)
    message["To"] = to_email
    if cc_list is not None:
        message["Cc"] = " ".join(cc_list)

    if extra_headers is not None:
        for k, v in extra_headers.items():
            message[k] = v

    message.as_string()
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    credentials = service_account.Credentials.from_service_account_info(
        settings.GCP_GMAIL_SERVICE_KEY,
        scopes=["https://www.googleapis.com/auth/gmail.insert"],
    )
    # "Acts" as the email recipient to insert.
    credentials = credentials.with_subject(to_email)
    service = google_service_build(
        "gmail",
        "v1",
        credentials=credentials,
        # https://stackoverflow.com/questions/40154672/importerror-file-cache-is-unavailable-when-using-python-client-for-google-ser
        cache_discovery=False,
    )
    try:
        response = (
            service.users()
            .messages()
            .insert(
                userId=to_email,
                body={"raw": raw_message, "labelIds": ["INBOX", "UNREAD"]},
            )
            .execute()
        )
    except google_auth_exceptions.GoogleAuthError as e:
        raise core_errors.EmailInsertionAuthError(e) from e

    logging.info(f"Inserted email with id: {response['id']} to {to_email}")


def user_has_enabled_domain_delegation(email: EmailStr) -> bool:
    """Returns whether the user has enabled domain delegation.

    Sends an email to test it. So only call this when the user is
    setting up it's account, use supports_insertion for all other cases.

    """
    try:
        _insert_email(
            from_email="noreply@molesec.com",
            from_name=None,
            from_last_name=None,
            to_email=email,
            subject="Domain delegation test email, ignore.",
            body="This email is sent to verify domain delegation, ignore it.",
            is_html=False,
        )
    except core_errors.EmailInsertionAuthError:
        return False
    return True
