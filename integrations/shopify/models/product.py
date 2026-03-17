from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class Product:
    id: int | None = None
    title: str | None = None
    body_html: str | None = None
    vendor: str | None = None
    product_type: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_at: datetime | None = None
    published_scope: str | None = None
    tags: str | None = None
    status: str | None = None
    admin_graphql_api_id: str | None = None
    variants: list[ProductVariant] | None = None
    options: list[ProductOption] | None = None
    images: list[ProductImage] | None = None
    handle: str | None = None
    template_suffix: str | None = None
    metafields: dict[String, Object] | None = None

    @dataclass(slots=True)
    class ProductVariant:
        id: int | None = None
        product_id: int | None = None
        title: str | None = None
        price: str | None = None
        sku: str | None = None
        position: str | None = None
        inventory_policy: str | None = None
        compare_at_price: str | None = None
        fulfillment_service: str | None = None
        inventory_management: str | None = None
        option1: str | None = None
        option2: str | None = None
        option3: str | None = None
        created_at: datetime | None = None
        updated_at: datetime | None = None
        taxable: bool | None = None
        barcode: str | None = None
        grams: float | None = None
        image_id: int | None = None
        weight: float | None = None
        weight_unit: str | None = None
        inventory_item_id: int | None = None
        inventory_quantity: int | None = None
        old_inventory_quantity: int | None = None
        requires_shipping: bool | None = None
        admin_graphql_api_id: str | None = None

    @dataclass(slots=True)
    class ProductOption:
        id: int | None = None
        product_id: int | None = None
        name: str | None = None
        position: int | None = None
        values: list[String] | None = None

    @dataclass(slots=True)
    class ProductImage:
        id: int | None = None
        product_id: int | None = None
        position: int | None = None
        created_at: datetime | None = None
        updated_at: datetime | None = None
        alt: str | None = None
        width: int | None = None
        height: int | None = None
        src: str | None = None
        variant_ids: list[Long] | None = None
        admin_graphql_api_id: str | None = None


@dataclass(slots=True, kw_only=True)
class ProductVariant:
    id: int | None = None
    product_id: int | None = None
    title: str | None = None
    price: str | None = None
    sku: str | None = None
    position: str | None = None
    inventory_policy: str | None = None
    compare_at_price: str | None = None
    fulfillment_service: str | None = None
    inventory_management: str | None = None
    option1: str | None = None
    option2: str | None = None
    option3: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    taxable: bool | None = None
    barcode: str | None = None
    grams: float | None = None
    image_id: int | None = None
    weight: float | None = None
    weight_unit: str | None = None
    inventory_item_id: int | None = None
    inventory_quantity: int | None = None
    old_inventory_quantity: int | None = None
    requires_shipping: bool | None = None
    admin_graphql_api_id: str | None = None


@dataclass(slots=True, kw_only=True)
class ProductOption:
    id: int | None = None
    product_id: int | None = None
    name: str | None = None
    position: int | None = None
    values: list[String] | None = None


@dataclass(slots=True, kw_only=True)
class ProductImage:
    id: int | None = None
    product_id: int | None = None
    position: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    alt: str | None = None
    width: int | None = None
    height: int | None = None
    src: str | None = None
    variant_ids: list[Long] | None = None
    admin_graphql_api_id: str | None = None
