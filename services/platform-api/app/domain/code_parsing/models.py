from pydantic import BaseModel


class ParseResult(BaseModel):
    ast_json: bytes
    symbols_json: bytes
    source_type: str
    language: str
    node_count: int
