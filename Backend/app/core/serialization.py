from typing import Any, ClassVar, cast

from pydantic import BaseModel, ConfigDict, SerializerFunctionWrapHandler, model_serializer
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Wire model base: snake_case Python attributes, camelCase JSON both ways."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")

    # Field names (python, not alias) to drop from output when their value is None.
    # Every other None field is serialized as `null` — API-CONTRACT.md distinguishes
    # "absent" from "present and null" per field, so this must be opted into explicitly.
    omit_if_none: ClassVar[frozenset[str]] = frozenset()

    @model_serializer(mode="wrap")
    def _drop_omitted(self, handler: SerializerFunctionWrapHandler) -> dict[str, Any]:
        data = cast(dict[str, Any], handler(self))
        if not self.omit_if_none:
            return data
        drop_keys = {
            key
            for name in self.omit_if_none
            for key in (name, self.__class__.model_fields[name].alias)
        }
        return {k: v for k, v in data.items() if not (v is None and k in drop_keys)}
