from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\models\Customer.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class Customer:
    id: int | None = None
    email: str | None = None
    accepts_marketing: bool | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    first_name: str | None = None
    last_name: str | None = None
    orders_count: int | None = None
    state: str | None = None
    total_spent: str | None = None
    last_order_id: int | None = None
    note: str | None = None
    verified_email: bool | None = None
    multipass_identifier: str | None = None
    tax_exempt: bool | None = None
    phone: str | None = None
    tags: str | None = None
    last_order_name: str | None = None
    currency: str | None = None
    accepts_marketing_updated_at: datetime | None = None
    marketing_opt_in_level: str | None = None
    tax_exemptions: list[str] | None = None
    admin_graphql_api_id: str | None = None
    default_address: CustomerAddress | None = None
    addresses: list[CustomerAddress] | None = None
    metafields: dict[str, Any] | None = None

    @staticmethod
    def from_map(customer_data: dict[str, Any]) -> Customer:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CustomerAddress:
        id: int | None = None
        customer_id: int | None = None
        first_name: str | None = None
        last_name: str | None = None
        company: str | None = None
        address1: str | None = None
        address2: str | None = None
        city: str | None = None
        province: str | None = None
        country: str | None = None
        zip: str | None = None
        phone: str | None = None
        name: str | None = None
        province_code: str | None = None
        country_code: str | None = None
        country_name: str | None = None
        default_address: bool | None = None
