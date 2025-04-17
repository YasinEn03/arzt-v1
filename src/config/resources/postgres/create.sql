-- docker compose exec postgres bash
-- psql --dbname=arzt --username=arzt --file=/scripts/create-table-arzt.sql

-- text statt varchar(n):
-- "There is no performance difference among these three types, apart from a few extra CPU cycles
-- to check the length when storing into a length-constrained column"
-- ggf. CHECK(char_length(nachname) <= 255)

-- Indexe mit pgAdmin auflisten: "Query Tool" verwenden mit
--  SELECT   tablename, indexname, indexdef, tablespace
--  FROM     pg_indexes
--  WHERE    schemaname = 'arzt'
--  ORDER BY tablename, indexname;

-- https://www.postgresql.org/docs/devel/app-psql.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-CREATE
-- "user-private schema" (Default-Schema: public)
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION arzt;

ALTER ROLE arzt SET search_path = 'arzt';

-- https://www.postgresql.org/docs/current/sql-createtype.html
-- https://www.postgresql.org/docs/current/datatype-enum.html
CREATE TYPE arztart AS ENUM ('C', 'RAD', 'KAR', 'HNO', 'AUG');

-- https://www.postgresql.org/docs/current/sql-createtable.html
-- https://www.postgresql.org/docs/current/datatype.html
CREATE TABLE IF NOT EXISTS arzt (
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-PRIMARY-KEYS
                  -- impliziter Index fuer Primary Key
                  -- "GENERATED ALWAYS AS IDENTITY" gemaess SQL-Standard
                  -- entspricht SERIAL mit generierter Sequenz arzt_id_seq
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE arztspace,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#id-1.5.4.6.6
    version       integer NOT NULL DEFAULT 0,
                  -- impliziter Index als B-Baum durch UNIQUE
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
    name          text NOT NULL UNIQUE USING INDEX TABLESPACE arztspace,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS
                  -- https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-POSIX-REGEXP
    fachgebiet    text NOT NULL,
    art           arztart,
    telefonnummer text,
    geburtsdatum  date CHECK (geburtsdatum < current_date),
    schlagwoerter text,
    erstellt      timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
) TABLESPACE arztspace;

CREATE TABLE IF NOT EXISTS praxis (
    id          integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE arztspace,
    praxis      text NOT NULL,
    adresse     text,
    telefonnummer text,
    arzt_id     integer NOT NULL UNIQUE USING INDEX TABLESPACE arztspace REFERENCES arzt
) TABLESPACE arztspace;


CREATE TABLE IF NOT EXISTS patienten (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE arztspace,
    name            text NOT NULL,
    geburtsdatum    date CHECK (geburtsdatum < current_date),
    telefonnummer   text,
    adresse         text NOT NULL,
    arzt_id         integer NOT NULL REFERENCES arzt
) TABLESPACE arztspace;
CREATE INDEX IF NOT EXISTS patienten_arzt_id_idx ON patienten(arzt_id) TABLESPACE arztspace;

CREATE TABLE IF NOT EXISTS arzt_file (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE arztspace,
    data            bytea NOT NULL,
    filename        text NOT NULL,
    mimetype        text,
    arzt_id         integer NOT NULL REFERENCES arzt
) TABLESPACE arztspace;
CREATE INDEX IF NOT EXISTS arzt_file_arzt_id_idx ON arzt_file(arzt_id) TABLESPACE arztspace;


