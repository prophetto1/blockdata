"""MongoDB plugin — direct translation of Kestra's plugin-mongodb Java files.

Imports traced from Java source → Python equivalent in this package:

  Java import                              → Python import
  ─────────────────────────────────────    ──────────────────────────────
  io.kestra.core.models.tasks.RunnableTask → models.BasePlugin
  io.kestra.core.models.tasks.Task         → models.BasePlugin
  io.kestra.core.models.tasks.Output       → models.PluginOutput
  io.kestra.core.runners.RunContext         → models.ExecutionContext
  io.kestra.core.serializers.FileSerde      → serialization.encode_jsonl/decode_jsonl
  io.kestra.core.serializers.JacksonMapper  → json (stdlib)
  io.kestra.core.models.property.Property   → context.render()
  com.mongodb.client.MongoClient            → pymongo.MongoClient
  com.mongodb.client.MongoClients           → pymongo.MongoClient
  com.mongodb.client.MongoCollection        → client[db][col]
  com.mongodb.client.MongoDatabase          → client[db]
  org.bson.BsonDocument                     → dict (pymongo native)
  org.bson.conversions.Bson                 → dict (pymongo native)
  org.bson.types.ObjectId                   → bson.ObjectId
  com.mongodb.client.model.InsertOneModel   → pymongo.InsertOne
  com.mongodb.client.model.ReplaceOneModel  → pymongo.ReplaceOne
  com.mongodb.client.model.UpdateOneModel   → pymongo.UpdateOne
  com.mongodb.client.model.UpdateManyModel  → pymongo.UpdateMany
  com.mongodb.client.model.DeleteOneModel   → pymongo.DeleteOne
  com.mongodb.client.model.DeleteManyModel  → pymongo.DeleteMany
  reactor.core.publisher.Flux               → list iteration (no reactive needed)
  lombok.*                                  → (not needed)
  jakarta.validation.*                      → (runtime checks)
  io.swagger.v3.oas.annotations.*           → (not needed)
"""
from __future__ import annotations

import json
from typing import Any

import pymongo
from bson import ObjectId
from pymongo import (
    DeleteMany,
    DeleteOne,
    InsertOne as PyMongoInsertOne,
    ReplaceOne,
    UpdateMany,
    UpdateOne,
)

from .models import BasePlugin, ExecutionContext, PluginOutput, failed, success
from .serialization import decode_jsonl, encode_jsonl
from .connection import resolve_connection_sync


# ---------------------------------------------------------------------------
# MongoDbConnection.java → _connect()
# AbstractTask.java      → _get_collection()
# MongoDbService.java    → _render_document(), _stringify_object_ids()
# ---------------------------------------------------------------------------

def _connect(params: dict[str, Any], context: ExecutionContext) -> pymongo.MongoClient:
    """MongoDbConnection.java:29-31

    Java: MongoClients.create(runContext.render(uri).as(String.class).orElseThrow())
    """
    if "connection_id" in params:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        uri = creds.get("uri", creds.get("connection_string", ""))
    elif isinstance(params.get("connection"), dict):
        uri = context.render(params["connection"].get("uri", ""))
    else:
        uri = context.render(params.get("uri", ""))
    if not uri:
        raise ValueError("MongoDB URI required (provide connection_id, connection.uri, or uri)")
    return pymongo.MongoClient(uri)


def _get_collection(client: pymongo.MongoClient, params: dict[str, Any], context: ExecutionContext):
    """AbstractTask.java:45-55

    Java: client.getDatabase(render(database)).getCollection(render(collection), cls)
    """
    db_name = context.render(params.get("database", ""))
    col_name = context.render(params.get("collection", ""))
    if not db_name or not col_name:
        raise ValueError("database and collection are required")
    return client[db_name][col_name]


def _render_document(params: dict[str, Any], key: str, context: ExecutionContext) -> dict:
    """MongoDbService.java:19-29

    Java: BsonDocument.parse(runContext.render((String) value))
          BsonDocument.parse(JacksonMapper.ofJson().writeValueAsString(runContext.render(map)))
    Python: json.loads(context.render(str)) or render dict values
    """
    value = params.get(key)
    if value is None:
        return {}
    if isinstance(value, str):
        return json.loads(context.render(value))
    if isinstance(value, dict):
        rendered = {}
        for k, v in value.items():
            rendered[k] = context.render(v) if isinstance(v, str) else v
        return rendered
    raise ValueError(f"Invalid {key} type: {type(value)}")


def _stringify_object_ids(doc: dict) -> None:
    """MongoDbService.java:31-93

    Java: recursive switch on BsonType → primitive conversion
    Python: only ObjectId and bytes need conversion; everything else is native
    """
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, bytes):
            doc[key] = value.hex()
        elif isinstance(value, dict):
            _stringify_object_ids(value)
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, ObjectId):
                    value[i] = str(item)
                elif isinstance(item, bytes):
                    value[i] = item.hex()
                elif isinstance(item, dict):
                    _stringify_object_ids(item)


# ---------------------------------------------------------------------------
# Find.java:92 → MongoDBFindPlugin
# ---------------------------------------------------------------------------

class MongoDBFindPlugin(BasePlugin):
    task_types = ["io.kestra.plugin.mongodb.Find", "blockdata.mongodb.find"]

    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        logger = context.logger
        store = params.get("store", False)

        with _connect(params, context) as client:
            collection = _get_collection(client, params, context)
            cursor = collection.find(_render_document(params, "filter", context))

            if params.get("projection"):
                cursor = cursor.projection(_render_document(params, "projection", context))
            if params.get("sort"):
                cursor = cursor.sort(list(_render_document(params, "sort", context).items()))
            if params.get("limit"):
                cursor = cursor.limit(int(context.render(str(params["limit"]))))
            if params.get("skip"):
                cursor = cursor.skip(int(context.render(str(params["skip"]))))

            rows = []
            for doc in cursor:
                _stringify_object_ids(doc)
                rows.append(doc)
            size = len(rows)

            if store:
                path = f"pipeline/mongodb/{context.execution_id}/find-result.jsonl"
                uri = await context.upload_file("artifacts", path, encode_jsonl(rows))
                logger.info("Stored %d documents to %s", size, uri)
                return success(data={"uri": uri, "size": size})
            else:
                logger.info("Fetched %d documents", size)
                return success(data={"rows": rows, "size": size})

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        uri = creds.get("uri", creds.get("connection_string", ""))
        if not uri:
            return failed("No MongoDB URI in credentials")
        try:
            c = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
            info = c.server_info()
            c.close()
            return success(data={"valid": True, "version": info.get("version")})
        except Exception as e:
            return failed(f"MongoDB connection failed: {e}")


# ---------------------------------------------------------------------------
# Aggregate.java:120 → MongoDBaggregatePlugin
# ---------------------------------------------------------------------------

class MongoDBaggregatePlugin(BasePlugin):
    task_types = ["io.kestra.plugin.mongodb.Aggregate", "blockdata.mongodb.aggregate"]

    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        logger = context.logger
        store = params.get("store", "FETCH").upper()

        with _connect(params, context) as client:
            collection = _get_collection(client, params, context)

            pipeline = []
            for stage in params.get("pipeline", []):
                if isinstance(stage, str):
                    pipeline.append(json.loads(context.render(stage)))
                elif isinstance(stage, dict):
                    pipeline.append(stage)

            kwargs: dict[str, Any] = {}
            if params.get("allowDiskUse", True):
                kwargs["allowDiskUse"] = True
            if params.get("maxTimeMs"):
                kwargs["maxTimeMS"] = int(params["maxTimeMs"])
            if params.get("batchSize"):
                kwargs["batchSize"] = int(params["batchSize"])

            rows = []
            for doc in collection.aggregate(pipeline, **kwargs):
                _stringify_object_ids(doc)
                rows.append(doc)
            size = len(rows)

            if store == "STORE":
                path = f"pipeline/mongodb/{context.execution_id}/aggregate-result.jsonl"
                uri = await context.upload_file("artifacts", path, encode_jsonl(rows))
                logger.info("Stored %d aggregation results to %s", size, uri)
                return success(data={"uri": uri, "size": size})
            else:
                logger.info("Fetched %d aggregation results", size)
                return success(data={"rows": rows, "size": size})


# ---------------------------------------------------------------------------
# InsertOne.java:82 → MongoDBInsertOnePlugin
# ---------------------------------------------------------------------------

class MongoDBInsertOnePlugin(BasePlugin):
    task_types = ["io.kestra.plugin.mongodb.InsertOne", "blockdata.mongodb.insert_one"]

    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        with _connect(params, context) as client:
            collection = _get_collection(client, params, context)
            document = _render_document(params, "document", context)
            result = collection.insert_one(document)
            context.logger.info("Inserted doc: %s", document)
            return success(data={
                "insertedId": str(result.inserted_id) if result.inserted_id else None,
                "wasAcknowledged": result.acknowledged,
            })


# ---------------------------------------------------------------------------
# Delete.java:63 → MongoDBDeletePlugin
# ---------------------------------------------------------------------------

class MongoDBDeletePlugin(BasePlugin):
    task_types = ["io.kestra.plugin.mongodb.Delete", "blockdata.mongodb.delete"]

    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        operation = params.get("operation", "DELETE_ONE").upper()
        with _connect(params, context) as client:
            collection = _get_collection(client, params, context)
            query_filter = _render_document(params, "filter", context)
            if operation == "DELETE_ONE":
                result = collection.delete_one(query_filter)
            else:
                result = collection.delete_many(query_filter)
            return success(data={
                "wasAcknowledged": result.acknowledged,
                "deletedCount": result.deleted_count,
            })


# ---------------------------------------------------------------------------
# Update.java:90 → MongoDBUpdatePlugin
# ---------------------------------------------------------------------------

class MongoDBUpdatePlugin(BasePlugin):
    task_types = ["io.kestra.plugin.mongodb.Update", "blockdata.mongodb.update"]

    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        operation = params.get("operation", "UPDATE_ONE").upper()
        with _connect(params, context) as client:
            collection = _get_collection(client, params, context)
            document = _render_document(params, "document", context)
            query_filter = _render_document(params, "filter", context)

            if operation == "REPLACE_ONE":
                result = collection.replace_one(query_filter, document)
            elif operation == "UPDATE_MANY":
                result = collection.update_many(query_filter, document)
            else:
                result = collection.update_one(query_filter, document)

            return success(data={
                "upsertedId": str(result.upserted_id) if result.upserted_id else None,
                "wasAcknowledged": result.acknowledged,
                "matchedCount": result.matched_count,
                "modifiedCount": result.modified_count,
            })


# ---------------------------------------------------------------------------
# Load.java:75 + AbstractLoad.java:34 → MongoDBLoadPlugin
# ---------------------------------------------------------------------------

class MongoDBLoadPlugin(BasePlugin):
    task_types = ["io.kestra.plugin.mongodb.Load", "blockdata.mongodb.load"]

    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        logger = context.logger
        chunk_size = int(params.get("chunk", 1000))
        id_key = params.get("idKey")
        remove_id_key = params.get("removeIdKey", True)

        from_uri = context.render(params.get("from", ""))
        if not from_uri:
            return failed("'from' URI required")

        data = await context.download_file(from_uri)
        documents = decode_jsonl(data)
        if not documents:
            return failed("No documents in source file")

        with _connect(params, context) as client:
            collection = _get_collection(client, params, context)

            for doc in documents:
                if id_key and id_key in doc:
                    doc["_id"] = ObjectId(str(doc[id_key]))
                    if remove_id_key:
                        del doc[id_key]

            total = len(documents)
            inserted_count = 0
            for i in range(0, total, chunk_size):
                batch = documents[i : i + chunk_size]
                result = collection.insert_many(batch, ordered=False)
                inserted_count += len(result.inserted_ids)

            logger.info("Loaded %d records into MongoDB", total)
            return success(data={
                "size": total,
                "insertedCount": inserted_count,
                "matchedCount": 0,
                "modifiedCount": 0,
                "deletedCount": 0,
            })


# ---------------------------------------------------------------------------
# Bulk.java:80 + AbstractLoad.java:34 → MongoDBBulkPlugin
# ---------------------------------------------------------------------------

class MongoDBBulkPlugin(BasePlugin):
    task_types = ["io.kestra.plugin.mongodb.Bulk", "blockdata.mongodb.bulk"]

    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        logger = context.logger
        chunk_size = int(params.get("chunk", 1000))

        from_uri = context.render(params.get("from", ""))
        if not from_uri:
            return failed("'from' URI required")

        data = await context.download_file(from_uri)
        operations = decode_jsonl(data)
        if not operations:
            return failed("No operations in source file")

        with _connect(params, context) as client:
            collection = _get_collection(client, params, context)

            write_models = []
            for op in operations:
                if not isinstance(op, dict) or len(op) != 1:
                    raise ValueError(f"Invalid bulk operation: {op}")
                op_type, payload = next(iter(op.items()))

                if op_type == "insertOne":
                    write_models.append(PyMongoInsertOne(payload))
                elif op_type == "replaceOne":
                    opts = {}
                    if payload.get("upsert"):
                        opts["upsert"] = True
                    write_models.append(ReplaceOne(payload["filter"], payload["replacement"], **opts))
                elif op_type == "updateOne":
                    opts = {}
                    if payload.get("upsert"):
                        opts["upsert"] = True
                    if payload.get("arrayFilters"):
                        opts["array_filters"] = payload["arrayFilters"]
                    write_models.append(UpdateOne(payload["filter"], payload["update"], **opts))
                elif op_type == "updateMany":
                    opts = {}
                    if payload.get("upsert"):
                        opts["upsert"] = True
                    if payload.get("arrayFilters"):
                        opts["array_filters"] = payload["arrayFilters"]
                    write_models.append(UpdateMany(payload["filter"], payload["update"], **opts))
                elif op_type == "deleteOne":
                    write_models.append(DeleteOne(payload.get("filter", payload)))
                elif op_type == "deleteMany":
                    write_models.append(DeleteMany(payload.get("filter", payload)))
                else:
                    raise ValueError(f"Unknown bulk operation: {op_type}")

            total = len(write_models)
            inserted_count = matched_count = modified_count = deleted_count = 0

            for i in range(0, total, chunk_size):
                batch = write_models[i : i + chunk_size]
                result = collection.bulk_write(batch, ordered=False)
                inserted_count += result.inserted_count
                matched_count += result.matched_count
                modified_count += result.modified_count
                deleted_count += result.deleted_count

            logger.info("Bulk: %d operations", total)
            return success(data={
                "size": total,
                "insertedCount": inserted_count,
                "matchedCount": matched_count,
                "modifiedCount": modified_count,
                "deletedCount": deleted_count,
            })
