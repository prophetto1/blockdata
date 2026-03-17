from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\factory\CustomValidatorFactoryProvider.java
# WARNING: Unresolved types: Configuration, ConstraintValidatorFactory, Environment, HibernateValidator, MessageInterpolator, ParameterNameProvider, TraversableResolver, ValidatorFactory, ValidatorFactoryProvider

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.property.property_value_extractor import PropertyValueExtractor


@dataclass(slots=True, kw_only=True)
class CustomValidatorFactoryProvider:
    message_interpolator: Optional[MessageInterpolator] = Optional.empty()
    traversable_resolver: Optional[TraversableResolver] = Optional.empty()
    constraint_validator_factory: Optional[ConstraintValidatorFactory] = Optional.empty()
    parameter_name_provider: Optional[ParameterNameProvider] = Optional.empty()
    ignore_xml_configuration: bool = True
    property_value_extractor: PropertyValueExtractor | None = None

    def validator_factory(self, environment: Optional[Environment]) -> ValidatorFactory:
        raise NotImplementedError  # TODO: translate from Java

    def configure_value_extractor(self, validator_configuration: Configuration[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java
