--
-- PostgreSQL database dump
--

\restrict FapupaKBz3Lb0uWlOQhgLOe2RhvphQnvC77Yn7yRHKHQGv8A0T5rL3Graxdwsw5

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: log_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.log_level AS ENUM (
    'ERROR',
    'WARN',
    'INFO',
    'DEBUG',
    'TRACE'
);


--
-- Name: queue_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_type AS ENUM (
    'io.kestra.core.models.executions.Execution',
    'io.kestra.core.models.flows.FlowInterface',
    'io.kestra.core.models.templates.Template',
    'io.kestra.core.models.executions.ExecutionKilled',
    'io.kestra.core.runners.WorkerJob',
    'io.kestra.core.runners.WorkerTaskResult',
    'io.kestra.core.runners.WorkerInstance',
    'io.kestra.core.runners.WorkerTaskRunning',
    'io.kestra.core.models.executions.LogEntry',
    'io.kestra.core.models.triggers.Trigger',
    'io.kestra.core.models.executions.MetricEntry',
    'io.kestra.core.runners.WorkerTriggerResult',
    'io.kestra.core.runners.SubflowExecutionResult',
    'io.kestra.core.server.ClusterEvent',
    'io.kestra.core.runners.SubflowExecutionEnd',
    'io.kestra.core.runners.MultipleConditionEvent',
    'io.kestra.ee.assets.AssetLineageEvent',
    'io.kestra.ee.assets.AssetUpsertCommand',
    'io.kestra.ee.assets.AssetStateEvent'
);


--
-- Name: state_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.state_type AS ENUM (
    'CREATED',
    'RUNNING',
    'PAUSED',
    'RESTARTED',
    'KILLING',
    'SUCCESS',
    'WARNING',
    'FAILED',
    'KILLED',
    'CANCELLED',
    'QUEUED',
    'RETRYING',
    'RETRIED',
    'SKIPPED',
    'BREAKPOINT',
    'SUBMITTED',
    'RESUBMITTED'
);


--
-- Name: fulltext_replace(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fulltext_replace(text, text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    RETURN TRIM(BOTH $2 FROM array_to_string(ARRAY(SELECT DISTINCT a.a FROM unnest(regexp_split_to_array(COALESCE($1, ''::text), '[^a-zA-Z\d]'::text)) a(a) WHERE (a.a <> ''::text)), $2));


--
-- Name: fulltext_index(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fulltext_index(text) RETURNS tsvector
    LANGUAGE sql IMMUTABLE STRICT
    RETURN (to_tsvector('simple'::regconfig, public.fulltext_replace($1, ' '::text)) || to_tsvector('simple'::regconfig, $1));


--
-- Name: fulltext_search(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fulltext_search(text) RETURNS tsquery
    LANGUAGE sql IMMUTABLE STRICT
    RETURN CASE WHEN (public.fulltext_replace($1, ''::text) = ''::text) THEN to_tsquery(''::text) ELSE to_tsquery('simple'::regconfig, (public.fulltext_replace($1, ':* & '::text) || ':*'::text)) END;


--
-- Name: loglevel_fromtext(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loglevel_fromtext(text) RETURNS public.log_level
    LANGUAGE sql IMMUTABLE
    RETURN ($1)::public.log_level;


--
-- Name: parse_iso8601_datetime(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.parse_iso8601_datetime(text) RETURNS timestamp with time zone
    LANGUAGE sql IMMUTABLE
    RETURN ($1)::timestamp with time zone;


--
-- Name: parse_iso8601_duration(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.parse_iso8601_duration(text) RETURNS interval
    LANGUAGE sql IMMUTABLE
    RETURN ($1)::interval;


--
-- Name: parse_iso8601_timestamp(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.parse_iso8601_timestamp(text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    RETURN EXTRACT(epoch FROM (($1)::timestamp with time zone AT TIME ZONE 'utc'::text));


--
-- Name: state_fromtext(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.state_fromtext(text) RETURNS public.state_type
    LANGUAGE sql IMMUTABLE
    RETURN ($1)::public.state_type;


--
-- Name: update_updated_datetime(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_datetime() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: concurrency_limit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concurrency_limit (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    running integer GENERATED ALWAYS AS (((value ->> 'running'::text))::integer) STORED NOT NULL
);


--
-- Name: dashboards; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: execution_queued; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.execution_queued (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    flow_id character varying(150) GENERATED ALWAYS AS ((value ->> 'flowId'::text)) STORED NOT NULL,
    date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'date'::text))) STORED NOT NULL
);


--
-- Name: executions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: executordelayed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.executordelayed (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    date timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'date'::text))) STORED NOT NULL
);


--
-- Name: executorstate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.executorstate (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: flow_topologies; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: flows; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: kv_metadata; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: logs; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: metrics; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: multipleconditions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: namespace_file_metadata; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: queues; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: queues_offset_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queues_offset_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queues_offset_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queues_offset_seq OWNED BY public.queues."offset";


--
-- Name: service_instance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_instance (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    service_id character varying(36) GENERATED ALWAYS AS ((value ->> 'id'::text)) STORED NOT NULL,
    service_type character varying(36) GENERATED ALWAYS AS ((value ->> 'type'::text)) STORED NOT NULL,
    state character varying(36) GENERATED ALWAYS AS ((value ->> 'state'::text)) STORED NOT NULL,
    created_at timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'createdAt'::text))) STORED NOT NULL,
    updated_at timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'updatedAt'::text))) STORED NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: sla_monitor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sla_monitor (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    execution_id character varying(150) GENERATED ALWAYS AS ((value ->> 'executionId'::text)) STORED NOT NULL,
    sla_id character varying(150) GENERATED ALWAYS AS ((value ->> 'slaId'::text)) STORED NOT NULL,
    deadline timestamp with time zone GENERATED ALWAYS AS (public.parse_iso8601_datetime((value ->> 'deadline'::text))) STORED NOT NULL
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    deleted boolean GENERATED ALWAYS AS (((value ->> 'deleted'::text))::boolean) STORED NOT NULL,
    id character varying(100) GENERATED ALWAYS AS ((value ->> 'id'::text)) STORED NOT NULL,
    namespace character varying(150) GENERATED ALWAYS AS ((value ->> 'namespace'::text)) STORED NOT NULL,
    fulltext tsvector GENERATED ALWAYS AS (public.fulltext_index(((public.fulltext_replace((((value ->> 'namespace'::text))::character varying)::text, ' '::text) || ' '::text) || public.fulltext_replace((((value ->> 'id'::text))::character varying)::text, ' '::text)))) STORED,
    tenant_id character varying(250) GENERATED ALWAYS AS ((value ->> 'tenantId'::text)) STORED
);


--
-- Name: triggers; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: worker_job_running; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_job_running (
    key character varying(250) NOT NULL,
    value jsonb NOT NULL,
    worker_uuid character varying(36) GENERATED ALWAYS AS (((value -> 'workerInstance'::text) ->> 'workerUuid'::text)) STORED NOT NULL
);


--
-- Name: queues offset; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queues ALTER COLUMN "offset" SET DEFAULT nextval('public.queues_offset_seq'::regclass);


--
-- Name: concurrency_limit concurrency_limit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concurrency_limit
    ADD CONSTRAINT concurrency_limit_pkey PRIMARY KEY (key);


--
-- Name: dashboards dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_pkey PRIMARY KEY (key);


--
-- Name: execution_queued execution_queued_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_queued
    ADD CONSTRAINT execution_queued_pkey PRIMARY KEY (key);


--
-- Name: executions executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executions
    ADD CONSTRAINT executions_pkey PRIMARY KEY (key);


--
-- Name: executordelayed executordelayed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executordelayed
    ADD CONSTRAINT executordelayed_pkey PRIMARY KEY (key);


--
-- Name: executorstate executorstate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.executorstate
    ADD CONSTRAINT executorstate_pkey PRIMARY KEY (key);


--
-- Name: flow_topologies flow_topologies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_topologies
    ADD CONSTRAINT flow_topologies_pkey PRIMARY KEY (key);


--
-- Name: flows flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flows
    ADD CONSTRAINT flows_pkey PRIMARY KEY (key);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: kv_metadata kv_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kv_metadata
    ADD CONSTRAINT kv_metadata_pkey PRIMARY KEY (key);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (key);


--
-- Name: metrics metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metrics
    ADD CONSTRAINT metrics_pkey PRIMARY KEY (key);


--
-- Name: multipleconditions multipleconditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multipleconditions
    ADD CONSTRAINT multipleconditions_pkey PRIMARY KEY (key);


--
-- Name: namespace_file_metadata namespace_file_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.namespace_file_metadata
    ADD CONSTRAINT namespace_file_metadata_pkey PRIMARY KEY (key);


--
-- Name: service_instance service_instance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_instance
    ADD CONSTRAINT service_instance_pkey PRIMARY KEY (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: sla_monitor sla_monitor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_monitor
    ADD CONSTRAINT sla_monitor_pkey PRIMARY KEY (key);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (key);


--
-- Name: triggers triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triggers
    ADD CONSTRAINT triggers_pkey PRIMARY KEY (key);


--
-- Name: worker_job_running worker_job_running_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_job_running
    ADD CONSTRAINT worker_job_running_pkey PRIMARY KEY (key);


--
-- Name: concurrency_limit__flow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concurrency_limit__flow ON public.concurrency_limit USING btree (tenant_id, namespace, flow_id);


--
-- Name: dashboards_fulltext; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dashboards_fulltext ON public.dashboards USING gin (fulltext);


--
-- Name: dashboards_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dashboards_id ON public.dashboards USING btree (id, deleted, tenant_id);


--
-- Name: dashboards_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dashboards_tenant ON public.dashboards USING btree (deleted, tenant_id);


--
-- Name: execution_queued__flow_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX execution_queued__flow_date ON public.execution_queued USING btree (tenant_id, namespace, flow_id, date);


--
-- Name: executions_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_end_date ON public.executions USING btree (deleted, tenant_id, end_date);


--
-- Name: executions_flow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_flow_id ON public.executions USING btree (deleted, tenant_id, flow_id);


--
-- Name: executions_fulltext; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_fulltext ON public.executions USING gin (fulltext);


--
-- Name: executions_labels; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_labels ON public.executions USING gin (((value -> 'labels'::text)));


--
-- Name: executions_namespace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_namespace ON public.executions USING btree (deleted, tenant_id, namespace);


--
-- Name: executions_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_start_date ON public.executions USING btree (deleted, tenant_id, start_date);


--
-- Name: executions_state_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_state_current ON public.executions USING btree (deleted, tenant_id, state_current);


--
-- Name: executions_state_duration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_state_duration ON public.executions USING btree (deleted, tenant_id, state_duration);


--
-- Name: executions_trigger_execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executions_trigger_execution_id ON public.executions USING btree (deleted, tenant_id, trigger_execution_id);


--
-- Name: executordelayed_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX executordelayed_date ON public.executordelayed USING btree (date);


--
-- Name: flow_topologies_destination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flow_topologies_destination ON public.flow_topologies USING btree (destination_tenant_id, destination_namespace, destination_id);


--
-- Name: flow_topologies_destination__source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flow_topologies_destination__source ON public.flow_topologies USING btree (destination_tenant_id, destination_namespace, destination_id, source_tenant_id, source_namespace, source_id);


--
-- Name: flows_fulltext; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flows_fulltext ON public.flows USING gin (fulltext);


--
-- Name: flows_labels; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flows_labels ON public.flows USING gin (((value -> 'labels'::text)));


--
-- Name: flows_namespace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flows_namespace ON public.flows USING btree (deleted, tenant_id, namespace);


--
-- Name: flows_namespace__id__revision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flows_namespace__id__revision ON public.flows USING btree (deleted, tenant_id, namespace, id, revision);


--
-- Name: flows_source_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flows_source_code ON public.flows USING gin (public.fulltext_index(source_code));


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: ix_last_deleted_tenant_name_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_name_version ON public.kv_metadata USING btree (last, deleted, tenant_id, name, version);


--
-- Name: ix_last_deleted_tenant_namespace_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_namespace_name ON public.kv_metadata USING btree (last, deleted, tenant_id, namespace, name);


--
-- Name: ix_last_deleted_tenant_namespace_name_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_namespace_name_version ON public.kv_metadata USING btree (last, deleted, tenant_id, namespace, name, version);


--
-- Name: ix_last_deleted_tenant_namespace_parent_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_namespace_parent_path ON public.namespace_file_metadata USING btree (last, deleted, tenant_id, namespace, parent_path);


--
-- Name: ix_last_deleted_tenant_namespace_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_namespace_path ON public.namespace_file_metadata USING btree (last, deleted, tenant_id, namespace, path);


--
-- Name: ix_last_deleted_tenant_namespace_path_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_namespace_path_version ON public.namespace_file_metadata USING btree (last, deleted, tenant_id, namespace, path, version);


--
-- Name: ix_last_deleted_tenant_namespace_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_namespace_version ON public.kv_metadata USING btree (last, deleted, tenant_id, namespace, version);


--
-- Name: ix_last_deleted_tenant_path_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_last_deleted_tenant_path_version ON public.namespace_file_metadata USING btree (last, deleted, tenant_id, path, version);


--
-- Name: ix_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_service_id ON public.service_instance USING btree (service_id);


--
-- Name: ix_service_instance_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_service_instance_state ON public.service_instance USING btree (state);


--
-- Name: ix_service_instance_type_created_at_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_service_instance_type_created_at_updated_at ON public.service_instance USING btree (service_type, created_at, updated_at);


--
-- Name: logs_execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_execution_id ON public.logs USING btree (execution_id);


--
-- Name: logs_execution_id__task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_execution_id__task_id ON public.logs USING btree (execution_id, task_id);


--
-- Name: logs_execution_id__taskrun_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_execution_id__taskrun_id ON public.logs USING btree (execution_id, taskrun_id);


--
-- Name: logs_tenant_namespace_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_tenant_namespace_timestamp ON public.logs USING btree (tenant_id, namespace, "timestamp", level);


--
-- Name: logs_tenant_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_tenant_timestamp ON public.logs USING btree (tenant_id, "timestamp", level);


--
-- Name: logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_timestamp ON public.logs USING btree ("timestamp");


--
-- Name: metrics_execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX metrics_execution_id ON public.metrics USING btree (execution_id);


--
-- Name: metrics_flow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX metrics_flow_id ON public.metrics USING btree (tenant_id, namespace, flow_id);


--
-- Name: metrics_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX metrics_timestamp ON public.metrics USING btree (tenant_id, "timestamp");


--
-- Name: multipleconditions_namespace__flow_id__condition_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX multipleconditions_namespace__flow_id__condition_id ON public.multipleconditions USING btree (tenant_id, namespace, flow_id, condition_id);


--
-- Name: multipleconditions_start_date__end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX multipleconditions_start_date__end_date ON public.multipleconditions USING btree (tenant_id, start_date, end_date);


--
-- Name: queues_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_offset ON public.queues USING hash ("offset");


--
-- Name: queues_type__consumer_executor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_type__consumer_executor ON public.queues USING btree (type, consumer_executor, "offset") WHERE (consumer_executor = false);


--
-- Name: queues_type__consumer_flow_topology; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_type__consumer_flow_topology ON public.queues USING btree (type, consumer_flow_topology, "offset") WHERE (consumer_flow_topology = false);


--
-- Name: queues_type__consumer_indexer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_type__consumer_indexer ON public.queues USING btree (type, consumer_indexer, "offset") WHERE (consumer_indexer = false);


--
-- Name: queues_type__consumer_scheduler; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_type__consumer_scheduler ON public.queues USING btree (type, consumer_scheduler, "offset") WHERE (consumer_scheduler = false);


--
-- Name: queues_type__consumer_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_type__consumer_worker ON public.queues USING btree (type, consumer_worker, "offset") WHERE (consumer_worker = false);


--
-- Name: queues_type__key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_type__key ON public.queues USING btree (type, key);


--
-- Name: queues_type__offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_type__offset ON public.queues USING btree (type, "offset");


--
-- Name: queues_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX queues_updated ON public.queues USING btree (updated);


--
-- Name: sla_monitor__deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sla_monitor__deadline ON public.sla_monitor USING btree (deadline);


--
-- Name: sla_monitor__execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sla_monitor__execution_id ON public.sla_monitor USING btree (execution_id);


--
-- Name: templates_fulltext; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX templates_fulltext ON public.templates USING gin (fulltext);


--
-- Name: templates_namespace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX templates_namespace ON public.templates USING btree (deleted, tenant_id, namespace);


--
-- Name: templates_namespace__id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX templates_namespace__id ON public.templates USING btree (deleted, tenant_id, namespace, id);


--
-- Name: triggers__tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX triggers__tenant ON public.triggers USING btree (tenant_id);


--
-- Name: triggers_execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX triggers_execution_id ON public.triggers USING btree (execution_id);


--
-- Name: triggers_next_execution_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX triggers_next_execution_date ON public.triggers USING btree (next_execution_date);


--
-- Name: worker_job_running_worker_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX worker_job_running_worker_uuid ON public.worker_job_running USING btree (worker_uuid);


--
-- Name: dashboards dashboard_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dashboard_updated BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_datetime();


--
-- Name: kv_metadata kv_metadata_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER kv_metadata_updated BEFORE UPDATE ON public.kv_metadata FOR EACH ROW EXECUTE FUNCTION public.update_updated_datetime();


--
-- Name: namespace_file_metadata namespace_file_metadata_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER namespace_file_metadata_updated BEFORE UPDATE ON public.namespace_file_metadata FOR EACH ROW EXECUTE FUNCTION public.update_updated_datetime();


--
-- Name: queues queues_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER queues_updated BEFORE UPDATE ON public.queues FOR EACH ROW EXECUTE FUNCTION public.update_updated_datetime();


--
-- PostgreSQL database dump complete
--

\unrestrict FapupaKBz3Lb0uWlOQhgLOe2RhvphQnvC77Yn7yRHKHQGv8A0T5rL3Graxdwsw5

