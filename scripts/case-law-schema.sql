-- Case Law Database Schema (Cloud SQL Postgres 16)
-- Source: CourtListener / Free Law Project bulk data
-- Architecture: relational tables for reference data, JSONB for large/semi-structured

CREATE SCHEMA IF NOT EXISTS case_law;

-- ============================================================
-- RELATIONAL TABLES (reference data with proper types and FKs)
-- ============================================================

-- Courts
CREATE TABLE case_law.courts (
    id varchar(15) PRIMARY KEY,
    date_modified timestamptz NOT NULL,
    in_use boolean NOT NULL DEFAULT true,
    has_opinion_scraper boolean NOT NULL DEFAULT false,
    has_oral_argument_scraper boolean NOT NULL DEFAULT false,
    position float NOT NULL DEFAULT 0,
    citation_string varchar(100) NOT NULL DEFAULT '',
    short_name varchar(100) NOT NULL DEFAULT '',
    full_name varchar(200) NOT NULL DEFAULT '',
    url varchar(500) NOT NULL DEFAULT '',
    start_date date,
    end_date date,
    jurisdiction varchar(3) NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    pacer_court_id smallint CHECK (pacer_court_id >= 0),
    fjc_court_id varchar(3) NOT NULL DEFAULT '',
    pacer_has_rss_feed boolean,
    date_last_pacer_contact timestamptz,
    pacer_rss_entry_types text NOT NULL DEFAULT '',
    parent_court_id varchar(15) REFERENCES case_law.courts(id)
);

CREATE INDEX idx_courts_jurisdiction ON case_law.courts(jurisdiction);
CREATE INDEX idx_courts_parent ON case_law.courts(parent_court_id);

-- Court appeals-to (directed graph edge)
CREATE TABLE case_law.court_appeals_to (
    id serial PRIMARY KEY,
    from_court_id varchar(15) NOT NULL REFERENCES case_law.courts(id),
    to_court_id varchar(15) NOT NULL REFERENCES case_law.courts(id)
);

CREATE INDEX idx_court_appeals_from ON case_law.court_appeals_to(from_court_id);
CREATE INDEX idx_court_appeals_to ON case_law.court_appeals_to(to_court_id);

-- Courthouses
CREATE TABLE case_law.courthouses (
    id serial PRIMARY KEY,
    court_seat boolean,
    building_name text NOT NULL DEFAULT '',
    address1 text NOT NULL DEFAULT '',
    address2 text NOT NULL DEFAULT '',
    city text NOT NULL DEFAULT '',
    county text NOT NULL DEFAULT '',
    state varchar(2) NOT NULL DEFAULT '',
    zip_code varchar(10) NOT NULL DEFAULT '',
    country_code text NOT NULL DEFAULT '',
    court_id varchar(15) NOT NULL REFERENCES case_law.courts(id)
);

CREATE INDEX idx_courthouses_court ON case_law.courthouses(court_id);
CREATE INDEX idx_courthouses_state ON case_law.courthouses(state);

-- Races (lookup)
CREATE TABLE case_law.races (
    id serial PRIMARY KEY,
    race varchar(5) NOT NULL
);

-- Schools
CREATE TABLE case_law.schools (
    id serial PRIMARY KEY,
    date_created timestamptz NOT NULL,
    date_modified timestamptz NOT NULL,
    name varchar(120) NOT NULL,
    ein integer,
    is_alias_of_id integer REFERENCES case_law.schools(id)
);

CREATE INDEX idx_schools_name ON case_law.schools(name);

-- People (judges)
CREATE TABLE case_law.people (
    id serial PRIMARY KEY,
    date_created timestamptz NOT NULL,
    date_modified timestamptz NOT NULL,
    fjc_id integer,
    slug varchar(158) NOT NULL DEFAULT '',
    name_first varchar(50) NOT NULL DEFAULT '',
    name_middle varchar(50) NOT NULL DEFAULT '',
    name_last varchar(50) NOT NULL DEFAULT '',
    name_suffix varchar(5) NOT NULL DEFAULT '',
    date_dob date,
    date_granularity_dob varchar(15) NOT NULL DEFAULT '',
    date_dod date,
    date_granularity_dod varchar(15) NOT NULL DEFAULT '',
    dob_city varchar(50) NOT NULL DEFAULT '',
    dob_state varchar(2) NOT NULL DEFAULT '',
    dob_country varchar(50) NOT NULL DEFAULT '',
    dod_city varchar(50) NOT NULL DEFAULT '',
    dod_state varchar(2) NOT NULL DEFAULT '',
    dod_country varchar(50) NOT NULL DEFAULT '',
    gender varchar(2) NOT NULL DEFAULT '',
    religion varchar(30) NOT NULL DEFAULT '',
    has_photo boolean NOT NULL DEFAULT false,
    ftm_total_received float,
    ftm_eid varchar(30),
    date_completed timestamptz,
    is_alias_of_id integer REFERENCES case_law.people(id)
);

CREATE INDEX idx_people_name ON case_law.people(name_last, name_first);
CREATE INDEX idx_people_fjc ON case_law.people(fjc_id);
CREATE INDEX idx_people_slug ON case_law.people(slug);

-- Person-race join
CREATE TABLE case_law.person_races (
    id serial PRIMARY KEY,
    person_id integer NOT NULL REFERENCES case_law.people(id),
    race_id integer NOT NULL REFERENCES case_law.races(id)
);

CREATE INDEX idx_person_races_person ON case_law.person_races(person_id);

-- Positions (judge appointments)
CREATE TABLE case_law.positions (
    id serial PRIMARY KEY,
    position_type varchar(20),
    job_title varchar(100) NOT NULL DEFAULT '',
    organization_name varchar(120),
    date_created timestamptz NOT NULL,
    date_modified timestamptz NOT NULL,
    date_nominated date,
    date_elected date,
    date_recess_appointment date,
    date_referred_to_judicial_committee date,
    date_judicial_committee_action date,
    date_hearing date,
    date_confirmation date,
    date_start date,
    date_granularity_start varchar(15) NOT NULL DEFAULT '',
    date_retirement date,
    date_termination date,
    date_granularity_termination varchar(15) NOT NULL DEFAULT '',
    judicial_committee_action varchar(20) NOT NULL DEFAULT '',
    nomination_process varchar(20) NOT NULL DEFAULT '',
    voice_vote boolean,
    votes_yes integer CHECK (votes_yes >= 0),
    votes_no integer CHECK (votes_no >= 0),
    votes_yes_percent float,
    votes_no_percent float,
    how_selected varchar(20) NOT NULL DEFAULT '',
    termination_reason varchar(25) NOT NULL DEFAULT '',
    vote_type varchar(2) NOT NULL DEFAULT '',
    location_city varchar(50) NOT NULL DEFAULT '',
    location_state varchar(2) NOT NULL DEFAULT '',
    has_inferred_values boolean NOT NULL DEFAULT false,
    sector smallint,
    court_id varchar(15) REFERENCES case_law.courts(id),
    person_id integer REFERENCES case_law.people(id),
    school_id integer REFERENCES case_law.schools(id),
    appointer_id integer REFERENCES case_law.positions(id),
    predecessor_id integer REFERENCES case_law.people(id),
    supervisor_id integer REFERENCES case_law.people(id)
);

CREATE INDEX idx_positions_person ON case_law.positions(person_id);
CREATE INDEX idx_positions_court ON case_law.positions(court_id);
CREATE INDEX idx_positions_dates ON case_law.positions(date_start, date_termination);

-- Educations
CREATE TABLE case_law.educations (
    id serial PRIMARY KEY,
    date_created timestamptz NOT NULL,
    date_modified timestamptz NOT NULL,
    degree_detail varchar(100) NOT NULL DEFAULT '',
    degree_level varchar(4) NOT NULL DEFAULT '',
    degree_year smallint CHECK (degree_year >= 0),
    person_id integer REFERENCES case_law.people(id),
    school_id integer NOT NULL REFERENCES case_law.schools(id)
);

CREATE INDEX idx_educations_person ON case_law.educations(person_id);
CREATE INDEX idx_educations_school ON case_law.educations(school_id);

-- Political affiliations
CREATE TABLE case_law.political_affiliations (
    id serial PRIMARY KEY,
    date_created timestamptz NOT NULL,
    date_modified timestamptz NOT NULL,
    political_party varchar(5) NOT NULL DEFAULT '',
    source varchar(5) NOT NULL DEFAULT '',
    date_start date,
    date_granularity_start varchar(15) NOT NULL DEFAULT '',
    date_end date,
    date_granularity_end varchar(15) NOT NULL DEFAULT '',
    person_id integer REFERENCES case_law.people(id)
);

CREATE INDEX idx_political_affiliations_person ON case_law.political_affiliations(person_id);

-- Retention events
CREATE TABLE case_law.retention_events (
    id serial PRIMARY KEY,
    date_created timestamptz NOT NULL,
    date_modified timestamptz NOT NULL,
    retention_type varchar(10) NOT NULL DEFAULT '',
    date_retention date NOT NULL,
    votes_yes integer CHECK (votes_yes >= 0),
    votes_no integer CHECK (votes_no >= 0),
    votes_yes_percent float,
    votes_no_percent float,
    unopposed boolean,
    won boolean,
    position_id integer REFERENCES case_law.positions(id)
);

CREATE INDEX idx_retention_events_position ON case_law.retention_events(position_id);

-- ============================================================
-- JSONB TABLES (large/semi-structured data)
-- Pattern: id (from source) + data (full row as JSONB) + GIN index
-- ============================================================

CREATE TABLE case_law.opinions (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);
CREATE INDEX idx_opinions_data ON case_law.opinions USING GIN (data);

CREATE TABLE case_law.dockets (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);
CREATE INDEX idx_dockets_data ON case_law.dockets USING GIN (data);
CREATE INDEX idx_dockets_court ON case_law.dockets ((data->>'court_id'));
CREATE INDEX idx_dockets_date_filed ON case_law.dockets ((data->>'date_filed'));

CREATE TABLE case_law.fjc_integrated_database (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);
CREATE INDEX idx_fjc_data ON case_law.fjc_integrated_database USING GIN (data);

CREATE TABLE case_law.oral_arguments (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);
CREATE INDEX idx_oral_arguments_data ON case_law.oral_arguments USING GIN (data);

CREATE TABLE case_law.financial_disclosures (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);
CREATE INDEX idx_financial_disclosures_data ON case_law.financial_disclosures USING GIN (data);

CREATE TABLE case_law.financial_disclosure_investments (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);
CREATE INDEX idx_fd_investments_data ON case_law.financial_disclosure_investments USING GIN (data);

CREATE TABLE case_law.financial_disclosure_agreements (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.financial_disclosure_debts (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.financial_disclosure_gifts (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.financial_disclosure_income (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.financial_disclosure_positions (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.financial_disclosure_reimbursements (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.financial_disclosure_spousal_income (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.originating_court_information (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.opinioncluster_panel (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.opinion_joined_by (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE case_law.cluster_non_participating_judges (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);