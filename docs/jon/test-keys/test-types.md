1. Input/Output Contract Tracing
What: Capture a Kestra task's actual input payload and output payload from a real execution, then replay the same input through BlockData and diff the outputs.

How:

Run a Kestra flow with each MongoDB task (find, aggregate, insert, update, delete, load, bulk)
Capture the RunContext variables, rendered properties, and the task's Output object
Feed the same params + variables into BlockData's execute_task()
Diff the output fields (rows, counts, URIs, metrics)
What it catches: Silent type coercion differences (e.g., Decimal128 → float vs Decimal), missing fields in output, different default values.

2. BulkWriteResult Parity
What: For the same set of bulk operations against the same dataset, compare the BulkWriteResult counts between Kestra's collection.bulkWrite() and BlockData's collection.bulk_write().

How:

Seed a MongoDB collection with known state
Run the same NDJSON bulk file through both runtimes
Compare: inserted_count, matched_count, modified_count, deleted_count
Include edge cases: upserts that create vs match, updates that match but don't modify, deletes on missing docs
What it catches: The exact gap you just fixed — but also subtler issues like ordered=True vs ordered=False behavior on partial failures (Kestra uses ordered by default too, so this should match now).

3. BSON Roundtrip Fidelity
What: Compare MongoDbService.toDocument() → MongoDB → MongoDbService.map() roundtrip between Java and Python for every BSON type.

How:

Create a document with every BSON type: ObjectId, Decimal128, Int64, Binary, Timestamp, Date, RegExp, MinKey/MaxKey, Code, DBRef, nested documents, arrays
Insert via Kestra, read via BlockData (and vice versa)
Compare the Python dict representation against the Java map representation
What it catches: The silent passthrough issue I flagged — Kestra throws IllegalArgumentException on unsupported types, Python passes them through. Also catches bson.json_util vs Jackson serialization differences (e.g., $date extended JSON format).

4. Template Rendering Parity
What: Kestra uses Pebble templates; BlockData uses Jinja2-style {{ expression }} with dot-notation resolution. These are not the same language.

How:

Collect actual Pebble expressions from real Kestra flows (filters, pipeline stages, connection URIs)
Run them through both renderers with identical variable contexts
Diff the rendered output
What it catches: Pebble has filters (| upper), conditional expressions, and method calls that Jinja2 handles differently. Your _resolve_expression() does dot-notation only — any flow using Pebble-specific syntax will silently produce wrong output.

5. Aggregate Pipeline Rendering Trace
What: The aggregate pipeline goes through rendering before execution. Compare the actual BSON pipeline sent to MongoDB in both runtimes.

How:

Enable MongoDB profiling (db.setProfilingLevel(2)) or use $currentOp
Run the same aggregation through Kestra and BlockData
Pull the executed command from system.profile
Diff the pipeline stages, allowDiskUse, maxTimeMS, cursor.batchSize
What it catches: The dead max_time_ms/batch_size fields — you'll see Kestra's profiled command includes maxTimeMS: 60000 and cursor: {batchSize: 1000} while BlockData's does not. Also catches pipeline rendering differences.

6. Storage Format Equivalence
What: Kestra stores results as Amazon Ion (binary); BlockData stores as JSONL. When a downstream task reads from {{ outputs.find.uri }}, the deserialized records must be equivalent.

How:

Run Find with store=true in both runtimes against the same collection
Read the stored file from each
Parse and compare record-by-record
What it catches: Ion preserves types that JSON doesn't (e.g., Decimal vs float, Timestamp precision, Binary encoding). A downstream Load task reading BlockData's JSONL may see different types than the same task reading Kestra's Ion.

7. Error Surface Tracing
What: Compare what happens when things go wrong — same bad input, both runtimes.

Scenarios:

Invalid connection URI → both should fail before query
Non-existent collection → both should return empty or error (depends on operation)
Malformed filter JSON → both should throw at render/parse time
Bulk with one bad operation in the middle (ordered=true) → both should fail at the same operation index and report partial counts
Timeout exceeded → Kestra uses maxTimeMS server-side; BlockData uses ThreadPoolExecutor client-side — different failure mode entirely
What it catches: Different exception types, different partial-completion states, different metric values on failure.

8. Metric Recording Parity
What: Compare runContext.metric() calls — same names, same values, same types.

How:

After each task execution, dump all recorded metrics from both runtimes
Diff metric names and values
What it catches: Kestra records metrics as typed Counter/Timer objects with tags. BlockData records them as dict[str, Any]. Name mismatches or missing metrics mean observability gaps in production.

9. Connection Lifecycle Tracing
What: Trace when MongoClient is created and closed in both runtimes.

How:

Wrap/instrument MongoClient creation and close()
Run a sequence of tasks (find → update → find) and compare the lifecycle
What it catches: Kestra's Java MongoClients.create() returns a pooled client. Python's MongoClient also pools by default, but BlockData creates a new client per task execution (with closing(self.connection.client(...))). If two tasks share a connection in Kestra but not in BlockData, you'll see different pooling behavior under load.

10. Trigger Evaluation Trace
What: Given the same collection state and poll interval, compare what Kestra's trigger runtime produces vs BlockData's evaluate().

How:

Seed collection with N documents matching the trigger filter
Call evaluate() in BlockData, call the trigger evaluation in Kestra
Compare the payload structure: { trigger: { rows, size, uri } }
What it catches: Kestra's trigger wraps the output in TriggerOutput<Find.Output> and feeds it to TriggerService.generateExecution(). BlockData returns a raw dict. The shape may differ enough that downstream consumers break.

Priority Order
Priority	Test	Why
1	BSON Roundtrip (#3)	Type fidelity is the foundation — everything else is wrong if types diverge
2	Input/Output Contract (#1)	Directly proves "same input → same output"
3	BulkWriteResult Parity (#2)	You just changed this code; verify it
4	Aggregate Pipeline Trace (#5)	Dead fields are a live bug
5	Error Surface (#7)	Partial failure behavior is where bulk_write matters most
6	Storage Format (#6)	Blocks downstream task chaining
7	Template Rendering (#4)	Pebble ≠ Jinja2 is a time bomb
8	Metrics (#8)	Operational parity
9	Connection Lifecycle (#9)	Performance, not correctness
10	Trigger (#10)	Lowest fidelity, lowest priority until trigger runtime exists
The first five are the ones that will actually catch bugs before production. The rest are about operational and behavioral parity.

