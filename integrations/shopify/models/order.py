from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.shopify.models.customer import Customer


@dataclass(slots=True, kw_only=True)
class Order:
    id: int | None = None
    admin_graphql_api_id: str | None = None
    app_id: int | None = None
    browser_ip: str | None = None
    buyer_accepts_marketing: bool | None = None
    cancel_reason: str | None = None
    cancelled_at: datetime | None = None
    cart_token: str | None = None
    checkout_id: int | None = None
    checkout_token: str | None = None
    closed_at: datetime | None = None
    confirmed: bool | None = None
    contact_email: str | None = None
    created_at: datetime | None = None
    currency: str | None = None
    current_subtotal_price: str | None = None
    current_subtotal_price_set: PriceSet | None = None
    current_total_discounts: str | None = None
    current_total_discounts_set: PriceSet | None = None
    current_total_duties_set: PriceSet | None = None
    current_total_price: str | None = None
    current_total_price_set: PriceSet | None = None
    current_total_tax: str | None = None
    current_total_tax_set: PriceSet | None = None
    customer_locale: str | None = None
    device_id: str | None = None
    discount_codes: list[DiscountCode] | None = None
    email: str | None = None
    estimated_taxes: bool | None = None
    financial_status: str | None = None
    fulfillment_status: str | None = None
    gateway: str | None = None
    landing_site: str | None = None
    landing_site_ref: str | None = None
    location_id: int | None = None
    name: str | None = None
    note: str | None = None
    note_attributes: list[NoteAttribute] | None = None
    number: int | None = None
    order_number: int | None = None
    order_status_url: str | None = None
    original_total_duties_set: PriceSet | None = None
    payment_gateway_names: list[String] | None = None
    phone: str | None = None
    presentment_currency: str | None = None
    processed_at: datetime | None = None
    processing_method: str | None = None
    reference: str | None = None
    referring_site: str | None = None
    source_identifier: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    subtotal_price: str | None = None
    subtotal_price_set: PriceSet | None = None
    tags: str | None = None
    tax_lines: list[TaxLine] | None = None
    taxes_included: bool | None = None
    test: bool | None = None
    token: str | None = None
    total_discounts: str | None = None
    total_discounts_set: PriceSet | None = None
    total_line_items_price: str | None = None
    total_line_items_price_set: PriceSet | None = None
    total_outstanding: str | None = None
    total_price: str | None = None
    total_price_set: PriceSet | None = None
    total_price_usd: str | None = None
    total_shipping_price_set: PriceSet | None = None
    total_tax: str | None = None
    total_tax_set: PriceSet | None = None
    total_tip_received: str | None = None
    total_weight: int | None = None
    updated_at: datetime | None = None
    user_id: int | None = None
    billing_address: Address | None = None
    customer: Customer | None = None
    discount_applications: list[DiscountApplication] | None = None
    fulfillments: list[Fulfillment] | None = None
    line_items: list[LineItem] | None = None
    payment_terms: PaymentTerms | None = None
    refunds: list[Refund] | None = None
    shipping_address: Address | None = None
    shipping_lines: list[ShippingLine] | None = None

    @dataclass(slots=True)
    class PriceSet:
        shop_money: Money | None = None
        presentment_money: Money | None = None

    @dataclass(slots=True)
    class Money:
        amount: str | None = None
        currency_code: str | None = None

    @dataclass(slots=True)
    class DiscountCode:
        code: str | None = None
        amount: str | None = None
        type: str | None = None

    @dataclass(slots=True)
    class NoteAttribute:
        name: str | None = None
        value: str | None = None

    @dataclass(slots=True)
    class TaxLine:
        price: str | None = None
        rate: float | None = None
        title: str | None = None
        price_set: PriceSet | None = None
        channel_liable: bool | None = None

    @dataclass(slots=True)
    class Address:
        first_name: str | None = None
        address1: str | None = None
        phone: str | None = None
        city: str | None = None
        zip: str | None = None
        province: str | None = None
        country: str | None = None
        last_name: str | None = None
        address2: str | None = None
        company: str | None = None
        latitude: float | None = None
        longitude: float | None = None
        name: str | None = None
        country_code: str | None = None
        province_code: str | None = None

    @dataclass(slots=True)
    class DiscountApplication:
        target_type: str | None = None
        type: str | None = None
        value: str | None = None
        value_type: str | None = None
        allocation_method: str | None = None
        target_selection: str | None = None
        title: str | None = None
        description: str | None = None

    @dataclass(slots=True)
    class Fulfillment:
        id: int | None = None
        order_id: int | None = None
        status: str | None = None
        created_at: datetime | None = None
        service: str | None = None
        updated_at: datetime | None = None
        tracking_company: str | None = None
        tracking_number: str | None = None
        tracking_numbers: list[String] | None = None
        tracking_url: str | None = None
        tracking_urls: list[String] | None = None
        receipt: Receipt | None = None
        line_items: list[LineItem] | None = None

    @dataclass(slots=True)
    class Receipt:
        testcase: bool | None = None
        authorization: str | None = None

    @dataclass(slots=True)
    class LineItem:
        id: int | None = None
        admin_graphql_api_id: str | None = None
        fulfillable_quantity: int | None = None
        fulfillment_service: str | None = None
        fulfillment_status: str | None = None
        gift_card: bool | None = None
        grams: int | None = None
        name: str | None = None
        price: str | None = None
        price_set: PriceSet | None = None
        product_exists: bool | None = None
        product_id: int | None = None
        properties: dict[String, Object] | None = None
        quantity: int | None = None
        requires_shipping: bool | None = None
        sku: str | None = None
        taxable: bool | None = None
        title: str | None = None
        total_discount: str | None = None
        total_discount_set: PriceSet | None = None
        variant_id: int | None = None
        variant_inventory_management: str | None = None
        variant_title: str | None = None
        vendor: str | None = None
        tax_lines: list[TaxLine] | None = None
        duties: list[Map[String, Object]] | None = None
        discount_allocations: list[DiscountAllocation] | None = None

    @dataclass(slots=True)
    class DiscountAllocation:
        amount: str | None = None
        amount_set: PriceSet | None = None
        discount_application_index: int | None = None

    @dataclass(slots=True)
    class PaymentTerms:
        amount: int | None = None
        currency: str | None = None
        payment_terms_name: str | None = None
        payment_terms_type: str | None = None
        due_in_days: int | None = None
        payment_schedules: list[PaymentSchedule] | None = None

    @dataclass(slots=True)
    class PaymentSchedule:
        amount: int | None = None
        currency: str | None = None
        issued_at: datetime | None = None
        due_at: datetime | None = None
        completed_at: datetime | None = None
        expected_payment_method: str | None = None

    @dataclass(slots=True)
    class Refund:
        id: int | None = None
        admin_graphql_api_id: str | None = None
        created_at: datetime | None = None
        note: str | None = None
        order_id: int | None = None
        processed_at: datetime | None = None
        restock: bool | None = None
        total_duties_set: PriceSet | None = None
        user_id: int | None = None
        order_adjustments: list[OrderAdjustment] | None = None
        transactions: list[Transaction] | None = None
        refund_line_items: list[RefundLineItem] | None = None
        duties: list[Map[String, Object]] | None = None

    @dataclass(slots=True)
    class OrderAdjustment:
        id: int | None = None
        order_id: int | None = None
        refund_id: int | None = None
        amount: str | None = None
        tax_amount: str | None = None
        kind: str | None = None
        reason: str | None = None
        amount_set: PriceSet | None = None
        tax_amount_set: PriceSet | None = None

    @dataclass(slots=True)
    class Transaction:
        id: int | None = None
        admin_graphql_api_id: str | None = None
        amount: str | None = None
        authorization: str | None = None
        created_at: datetime | None = None
        currency: str | None = None
        device_id: str | None = None
        error_code: str | None = None
        gateway: str | None = None
        kind: str | None = None
        location_id: int | None = None
        message: str | None = None
        order_id: int | None = None
        parent_id: int | None = None
        processed_at: datetime | None = None
        receipt: Receipt | None = None
        source_name: str | None = None
        status: str | None = None
        test: bool | None = None
        user_id: int | None = None
        currency_exchange_adjustment: CurrencyExchangeAdjustment | None = None

    @dataclass(slots=True)
    class CurrencyExchangeAdjustment:
        adjustment: str | None = None
        original_amount: str | None = None
        final_amount: str | None = None
        currency: str | None = None

    @dataclass(slots=True)
    class RefundLineItem:
        id: int | None = None
        line_item_id: int | None = None
        location_id: int | None = None
        quantity: int | None = None
        restock_type: str | None = None
        subtotal: str | None = None
        subtotal_set: PriceSet | None = None
        total_tax: str | None = None
        total_tax_set: PriceSet | None = None
        line_item: LineItem | None = None

    @dataclass(slots=True)
    class ShippingLine:
        id: int | None = None
        carrier_identifier: str | None = None
        code: str | None = None
        delivery_category: str | None = None
        discounted_price: str | None = None
        discounted_price_set: PriceSet | None = None
        phone: str | None = None
        price: str | None = None
        price_set: PriceSet | None = None
        requested_fulfillment_service_id: str | None = None
        source: str | None = None
        title: str | None = None
        tax_lines: list[TaxLine] | None = None
        discount_allocations: list[DiscountAllocation] | None = None


@dataclass(slots=True, kw_only=True)
class PriceSet:
    shop_money: Money | None = None
    presentment_money: Money | None = None


@dataclass(slots=True, kw_only=True)
class Money:
    amount: str | None = None
    currency_code: str | None = None


@dataclass(slots=True, kw_only=True)
class DiscountCode:
    code: str | None = None
    amount: str | None = None
    type: str | None = None


@dataclass(slots=True, kw_only=True)
class NoteAttribute:
    name: str | None = None
    value: str | None = None


@dataclass(slots=True, kw_only=True)
class TaxLine:
    price: str | None = None
    rate: float | None = None
    title: str | None = None
    price_set: PriceSet | None = None
    channel_liable: bool | None = None


@dataclass(slots=True, kw_only=True)
class Address:
    first_name: str | None = None
    address1: str | None = None
    phone: str | None = None
    city: str | None = None
    zip: str | None = None
    province: str | None = None
    country: str | None = None
    last_name: str | None = None
    address2: str | None = None
    company: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    name: str | None = None
    country_code: str | None = None
    province_code: str | None = None


@dataclass(slots=True, kw_only=True)
class DiscountApplication:
    target_type: str | None = None
    type: str | None = None
    value: str | None = None
    value_type: str | None = None
    allocation_method: str | None = None
    target_selection: str | None = None
    title: str | None = None
    description: str | None = None


@dataclass(slots=True, kw_only=True)
class Fulfillment:
    id: int | None = None
    order_id: int | None = None
    status: str | None = None
    created_at: datetime | None = None
    service: str | None = None
    updated_at: datetime | None = None
    tracking_company: str | None = None
    tracking_number: str | None = None
    tracking_numbers: list[String] | None = None
    tracking_url: str | None = None
    tracking_urls: list[String] | None = None
    receipt: Receipt | None = None
    line_items: list[LineItem] | None = None


@dataclass(slots=True, kw_only=True)
class Receipt:
    testcase: bool | None = None
    authorization: str | None = None


@dataclass(slots=True, kw_only=True)
class LineItem:
    id: int | None = None
    admin_graphql_api_id: str | None = None
    fulfillable_quantity: int | None = None
    fulfillment_service: str | None = None
    fulfillment_status: str | None = None
    gift_card: bool | None = None
    grams: int | None = None
    name: str | None = None
    price: str | None = None
    price_set: PriceSet | None = None
    product_exists: bool | None = None
    product_id: int | None = None
    properties: dict[String, Object] | None = None
    quantity: int | None = None
    requires_shipping: bool | None = None
    sku: str | None = None
    taxable: bool | None = None
    title: str | None = None
    total_discount: str | None = None
    total_discount_set: PriceSet | None = None
    variant_id: int | None = None
    variant_inventory_management: str | None = None
    variant_title: str | None = None
    vendor: str | None = None
    tax_lines: list[TaxLine] | None = None
    duties: list[Map[String, Object]] | None = None
    discount_allocations: list[DiscountAllocation] | None = None


@dataclass(slots=True, kw_only=True)
class DiscountAllocation:
    amount: str | None = None
    amount_set: PriceSet | None = None
    discount_application_index: int | None = None


@dataclass(slots=True, kw_only=True)
class PaymentTerms:
    amount: int | None = None
    currency: str | None = None
    payment_terms_name: str | None = None
    payment_terms_type: str | None = None
    due_in_days: int | None = None
    payment_schedules: list[PaymentSchedule] | None = None


@dataclass(slots=True, kw_only=True)
class PaymentSchedule:
    amount: int | None = None
    currency: str | None = None
    issued_at: datetime | None = None
    due_at: datetime | None = None
    completed_at: datetime | None = None
    expected_payment_method: str | None = None


@dataclass(slots=True, kw_only=True)
class Refund:
    id: int | None = None
    admin_graphql_api_id: str | None = None
    created_at: datetime | None = None
    note: str | None = None
    order_id: int | None = None
    processed_at: datetime | None = None
    restock: bool | None = None
    total_duties_set: PriceSet | None = None
    user_id: int | None = None
    order_adjustments: list[OrderAdjustment] | None = None
    transactions: list[Transaction] | None = None
    refund_line_items: list[RefundLineItem] | None = None
    duties: list[Map[String, Object]] | None = None


@dataclass(slots=True, kw_only=True)
class OrderAdjustment:
    id: int | None = None
    order_id: int | None = None
    refund_id: int | None = None
    amount: str | None = None
    tax_amount: str | None = None
    kind: str | None = None
    reason: str | None = None
    amount_set: PriceSet | None = None
    tax_amount_set: PriceSet | None = None


@dataclass(slots=True, kw_only=True)
class Transaction:
    id: int | None = None
    admin_graphql_api_id: str | None = None
    amount: str | None = None
    authorization: str | None = None
    created_at: datetime | None = None
    currency: str | None = None
    device_id: str | None = None
    error_code: str | None = None
    gateway: str | None = None
    kind: str | None = None
    location_id: int | None = None
    message: str | None = None
    order_id: int | None = None
    parent_id: int | None = None
    processed_at: datetime | None = None
    receipt: Receipt | None = None
    source_name: str | None = None
    status: str | None = None
    test: bool | None = None
    user_id: int | None = None
    currency_exchange_adjustment: CurrencyExchangeAdjustment | None = None


@dataclass(slots=True, kw_only=True)
class CurrencyExchangeAdjustment:
    adjustment: str | None = None
    original_amount: str | None = None
    final_amount: str | None = None
    currency: str | None = None


@dataclass(slots=True, kw_only=True)
class RefundLineItem:
    id: int | None = None
    line_item_id: int | None = None
    location_id: int | None = None
    quantity: int | None = None
    restock_type: str | None = None
    subtotal: str | None = None
    subtotal_set: PriceSet | None = None
    total_tax: str | None = None
    total_tax_set: PriceSet | None = None
    line_item: LineItem | None = None


@dataclass(slots=True, kw_only=True)
class ShippingLine:
    id: int | None = None
    carrier_identifier: str | None = None
    code: str | None = None
    delivery_category: str | None = None
    discounted_price: str | None = None
    discounted_price_set: PriceSet | None = None
    phone: str | None = None
    price: str | None = None
    price_set: PriceSet | None = None
    requested_fulfillment_service_id: str | None = None
    source: str | None = None
    title: str | None = None
    tax_lines: list[TaxLine] | None = None
    discount_allocations: list[DiscountAllocation] | None = None
