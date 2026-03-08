CREATE TABLE public.concurrency_limit (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    running integer GENERATED ALWAYS AS (((value ->> 'running'::text))::integer) STORED NOT NULL
);

CREATE TABLE public.dashboards (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    deleted boolean GENERATED ALWAYS AS (((value ->> 'deleted'::text))::boolean) STORED NOT NULL,
    id character varying(100) GENERATED ALWAYS AS ((value ->> 'id'::text)) STORED NOT NULL,
    title character varying(250) GENERATED ALWAYS AS ((value ->> 'title'::text)) STORED NOT NULL,
    description text GENERATED ALWAYS AS ((value ->> 'description'::text)) STORED,
    fulltext tsvector GENERATED ALWAYS AS (public.fulltext_index((((value ->> 'title'::text))::character varying)::text)) STORED,
    source_code text NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.execution_queued (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'date'::text))) STORED NOT NULL
);

CREATE TABLE public.executions (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    deleted boolean GENERATED ALWAYS AS (((value ->> 'deleted'::text))::boolean) STORED NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    state_current public.state_type GENERATED ALWAYS AS (public.state_fromtext((value #>> '{state,current}'::text[]))) STORED NOT NULL,
    state_duration bigint GENERATED ALWAYS AS (EXTRACT(milliseconds FROM public.parse_iso8601_duration((value #>> '{state,duration}'::text[])))) STORED,
    start_date timestamp without time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value #>> '{state,startDate}'::text[]))) STORED NOT NULL,
    end_date timestamp without time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value #>> '{state,endDate}'::text[]))) STORED,
    fulltext tsvector GENERATED ALWAYS AS (((public.fulltext_index((((value ->> 'namespace'::text))::character varying)::text) || public.fulltext_index((((value ->> 'flowId'::text))::character varying)::text)) || public.fulltext_index((((value ->> 'id'::text))::character varying)::text))) STORED,
    id character varying(150) GENERATED ALWAYS AS ((value ->> 'id'::text)) STORED NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    trigger_execution_id character varying(150) GENERATED ALWAYS AS ((value #>> '{trigger,variables,executionId}'::text[])) STORED,
    kind character varying(32) GENERATED ALWAYS AS ((value ->> 'kind'::text)) STORED
);

CREATE TABLE public.executordelayed (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'date'::text))) STORED NOT NULL
);

CREATE TABLE public.executorstate (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL
);

CREATE TABLE public.flow_topologies (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    source_namespace character varying(150) GENERATED ALWAYS AS ((value #>> '{source,namespace}'::text[])) STORED NOT NULL,
    source_id character varying(150) GENERATED ALWAYS AS ((value #>> '{source,id}'::text[])) STORED NOT NULL,
    relation character varying(100) GENERATED ALWAYS AS ((value ->> 'relation'::text)) STORED NOT NULL,
    destination_namespace character varying(150) GENERATED ALWAYS AS ((value #>> '{destination,namespace}'::text[])) STORED NOT NULL,
    destination_id character varying(150) GENERATED ALWAYS AS ((value #>> '{destination,id}'::text[])) STORED NOT NULL,
    source_tenant_id character varying(250) GENERATED ALWAYS AS ((value #>> '{source,tenantId}'::text[])) STORED,
    destination_tenant_id character varying(250) GENERATED ALWAYS AS ((value #>> '{destination,tenantId}'::text[])) STORED
);

CREATE TABLE public.flows (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    deleted boolean GENERATED ALWAYS AS (((value ->> 'deleted'::text))::boolean) STORED NOT NULL,
    id character varying(100) GENERATED ALWAYS AS ((value ->> 'id'::text)) STORED NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    revision integer GENERATED ALWAYS AS (((value ->> 'revision'::text))::integer) STORED NOT NULL,
    fulltext tsvector GENERATED ALWAYS AS ((public.fulltext_index((((value ->> 'namespace'::text))::character varying)::text) || public.fulltext_index((((value ->> 'id'::text))::character varying)::text))) STORED,
    source_code text NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    updated character varying(250) GENERATED ALWAYS AS ((value ->> 'updated'::text)) STORED
);

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);

CREATE TABLE public.kv_metadata (
    key character varying(768) NOT NULL,
    value jsonb NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    name character varying(350) GENERATED ALWAYS AS ((value ->> 'name'::text)) STORED NOT NULL,
    description text GENERATED ALWAYS AS ((value ->> 'description'::text)) STORED,
    version integer GENERATED ALWAYS AS (((value ->> 'version'::text))::integer) STORED NOT NULL,
    last boolean GENERATED ALWAYS AS (((value ->> 'last'::text))::boolean) STORED NOT NULL,
    expiration_date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'expirationDate'::text))) STORED,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted boolean GENERATED ALWAYS AS (((value ->> 'deleted'::text))::boolean) STORED NOT NULL,
    fulltext tsvector GENERATED ALWAYS AS (public.fulltext_index((((value ->> 'name'::text))::character varying)::text)) STORED,
    created timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime(COALESCE((value ->> 'created'::text), (value ->> 'updated'::text)))) STORED NOT NULL
);

CREATE TABLE public.logs (
    key character varying(30) NOT NULL,
    value jsonb NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    task_id character varying(150) GENERATED ALWAYS AS ((value ->> 'taskId'::text)) STORED,
    execution_id character varying(150) GENERATED ALWAYS AS ((value ->> 'executionId'::text)) STORED,
    taskrun_id character varying(150) GENERATED ALWAYS AS ((value ->> 'taskRunId'::text)) STORED,
    attempt_number integer GENERATED ALWAYS AS (((value ->> 'attemptNumber'::text))::integer) STORED,
    trigger_id character varying(150) GENERATED ALWAYS AS ((value ->> 'triggerId'::text)) STORED,
    level public.log_level GENERATED ALWAYS AS (public.loglevel_fromtext((value ->> 'level'::text))) STORED NOT NULL,
    "timestamp" timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'timestamp'::text))) STORED NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    fulltext tsvector GENERATED ALWAYS AS ((((((((public.fulltext_index((((value ->> 'namespace'::text))::character varying)::text) || public.fulltext_index((((value ->> 'flowId'::text))::character varying)::text)) || public.fulltext_index((COALESCE(((value ->> 'taskId'::text))::character varying, ''::character varying))::text)) || public.fulltext_index((COALESCE(((value ->> 'executionId'::text))::character varying, ''::character varying))::text)) || public.fulltext_index((COALESCE(((value ->> 'taskRunId'::text))::character varying, ''::character varying))::text)) || public.fulltext_index((COALESCE(((value ->> 'triggerId'::text))::character varying, ''::character varying))::text)) || public.fulltext_index((COALESCE(((value ->> 'message'::text))::character varying, ''::character varying))::text)) || public.fulltext_index((COALESCE(((value ->> 'thread'::text))::character varying, ''::character varying))::text))) STORED,
    execution_kind character varying(32) GENERATED ALWAYS AS ((value ->> 'executionKind'::text)) STORED
);

CREATE TABLE public.metrics (
    key character varying(30) NOT NULL,
    value jsonb NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    task_id character varying(150) GENERATED ALWAYS AS ((value ->> 'taskId'::text)) STORED NOT NULL,
    execution_id character varying(150) GENERATED ALWAYS AS ((value ->> 'executionId'::text)) STORED NOT NULL,
    taskrun_id character varying(150) GENERATED ALWAYS AS ((value ->> 'taskRunId'::text)) STORED NOT NULL,
    metric_name character varying(150) GENERATED ALWAYS AS ((value ->> 'name'::text)) STORED NOT NULL,
    "timestamp" timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'timestamp'::text))) STORED NOT NULL,
    metric_value double precision GENERATED ALWAYS AS (((value ->> 'value'::text))::double precision) STORED NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    execution_kind character varying(32) GENERATED ALWAYS AS ((value ->> 'executionKind'::text)) STORED
);

CREATE TABLE public.multipleconditions (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    condition_id character varying(150) GENERATED ALWAYS AS ((value ->> 'conditionId'::text)) STORED NOT NULL,
    start_date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'start'::text))) STORED NOT NULL,
    end_date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'end'::text))) STORED NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED
);

CREATE TABLE public.namespace_file_metadata (
    key character varying(768) NOT NULL,
    value jsonb NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    path character varying(350) GENERATED ALWAYS AS ((value ->> 'path'::text)) STORED NOT NULL,
    parent_path character varying(350) GENERATED ALWAYS AS ((value ->> 'parentPath'::text)) STORED,
    version integer GENERATED ALWAYS AS (((value ->> 'version'::text))::integer) STORED NOT NULL,
    last boolean GENERATED ALWAYS AS (((value ->> 'last'::text))::boolean) STORED NOT NULL,
    size bigint GENERATED ALWAYS AS (((value ->> 'size'::text))::bigint) STORED NOT NULL,
    created timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'created'::text))) STORED NOT NULL,
    updated timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'updated'::text))) STORED NOT NULL,
    deleted boolean GENERATED ALWAYS AS (((value ->> 'deleted'::text))::boolean) STORED NOT NULL,
    fulltext tsvector GENERATED ALWAYS AS (public.fulltext_index((((value ->> 'path'::text))::character varying)::text)) STORED
);

CREATE TABLE public.queues (
    "offset" bigint NOT NULL,
    type public.queue_type NOT NULL,
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    updated timestamp with time zone,
    consumer_indexer boolean DEFAULT false,
    consumer_executor boolean DEFAULT false,
    consumer_worker boolean DEFAULT false,
    consumer_scheduler boolean DEFAULT false,
    consumer_flow_topology boolean DEFAULT false,
    consumer_group character varying(250)
);

CREATE TABLE public.service_instance (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    service_id character varying(36) GENERATED ALWAYS AS ((value ->> 'id'::text)) STORED NOT NULL,
    service_type character varying(36) GENERATED ALWAYS AS ((value ->> 'type'::text)) STORED NOT NULL,
    state character varying(36) GENERATED ALWAYS AS ((value ->> 'state'::text)) STORED NOT NULL,
    created_at timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'createdAt'::text))) STORED NOT NULL,
    updated_at timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'updatedAt'::text))) STORED NOT NULL
);

CREATE TABLE public.settings (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL
);

CREATE TABLE public.sla_monitor (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    execution_id character varying(150) GENERATED ALWAYS AS ((value ->> 'executionId'::text)) STORED NOT NULL,
    sla_id character varying(150) GENERATED ALWAYS AS ((value ->> 'slaId'::text)) STORED NOT NULL,
    deadline timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'deadline'::text))) STORED NOT NULL
);

CREATE TABLE public.templates (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    deleted boolean GENERATED ALWAYS AS (((value ->> 'deleted'::text))::boolean) STORED NOT NULL,
    id character varying(100) GENERATED ALWAYS AS ((value ->> 'id'::text)) STORED NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    fulltext tsvector GENERATED ALWAYS AS (public.fulltext_index(((public.fulltext_replace((((value ->> 'namespace'::text))::character varying)::text, ' '::text) || ' '::text) || public.fulltext_replace((((value ->> 'id'::text))::character varying)::text, ' '::text)))) STORED,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED
);

CREATE TABLE public.triggers (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    trigger_id character varying(150) GENERATED ALWAYS AS ((value ->> 'triggerId'::text)) STORED NOT NULL,
    execution_id character varying(150) GENERATED ALWAYS AS ((value ->> 'executionId'::text)) STORED,
    fulltext tsvector GENERATED ALWAYS AS ((((public.fulltext_index((((value ->> 'namespace'::text))::character varying)::text) || public.fulltext_index((((value ->> 'flowId'::text))::character varying)::text)) || public.fulltext_index((((value ->> 'triggerId'::text))::character varying)::text)) || public.fulltext_index((COALESCE(((value ->> 'executionId'::text))::character varying, ''::character varying))::text))) STORED,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    next_execution_date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'nextExecutionDate'::text))) STORED,
    worker_id character varying(250) GENERATED ALWAYS AS ((value ->> 'workerId'::text)) STORED,
    disabled boolean GENERATED ALWAYS AS (((value ->> 'disabled'::text))::boolean) STORED NOT NULL
);

CREATE TABLE public.worker_job_running (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    worker_uuid character varying(36) GENERATED ALWAYS AS (((value -> 'workerInstance'::text) ->> 'workerUuid'::text)) STORED NOT NULL
);

