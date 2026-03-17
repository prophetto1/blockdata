from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-email\src\main\java\io\kestra\plugin\email\MailService.java
# WARNING: Unresolved types: Address, IOException, MessagingException, MimeMessage, MimeMultipart, Properties, Store, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.amqp.models.message import Message
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MailService:

    @staticmethod
    def get_protocol_name(protocol: str, ssl: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def connect_to_store(store: Store, host: str, port: int, username: str, password: str, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_default_port(protocol: Protocol, ssl: bool) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_email_data(message: MimeMessage) -> EmailData:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_address_string(addresses: list[Address]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_address_list(addresses: list[Address]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_text_content(message: Message) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_text_from_multipart(multipart: MimeMultipart) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_attachments(message: Message) -> list[AttachmentInfo]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_attachments_from_multipart(multipart: MimeMultipart, attachments: list[AttachmentInfo]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fetch_new_emails(run_context: RunContext, protocol: str, host: str, port: int, username: str, password: str, folder: str, ssl: bool, trust_all_certificates: bool, last_check_time: datetime) -> list[EmailData]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def process_messages(store: Store, folder: str, last_check_time: datetime, run_context: RunContext) -> list[EmailData]:
        raise NotImplementedError  # TODO: translate from Java

    class Protocol(str, Enum):
        IMAP = "IMAP"
        POP3 = "POP3"

    @dataclass(slots=True)
    class Output:
        latest_email: EmailData | None = None
        total: int | None = None
        emails: list[EmailData] | None = None

    @dataclass(slots=True)
    class EmailData:
        subject: str | None = None
        from: str | None = None
        to: list[str] | None = None
        cc: list[str] | None = None
        bcc: list[str] | None = None
        date: datetime | None = None
        body: str | None = None
        message_id: str | None = None
        attachments: list[AttachmentInfo] | None = None

    @dataclass(slots=True)
    class AttachmentInfo:
        filename: str | None = None
        content_type: str | None = None
        size: int | None = None

    @dataclass(slots=True)
    class MailConfiguration:
        protocol: str | None = None
        host: str | None = None
        port: int | None = None
        username: str | None = None
        password: str | None = None
        folder: str | None = None
        ssl: bool | None = None
        trust_all_certificates: bool | None = None
        interval: timedelta | None = None
