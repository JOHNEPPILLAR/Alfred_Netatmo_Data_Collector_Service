
CREATE TABLE netatmo (
  time            TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  sender          TEXT              NOT NULL,
  address         TEXT              NOT NULL,
  location        TEXT              NULL,
  battery         INT               NULL,
  temperature     DOUBLE PRECISION  NULL,
  humidity        DOUBLE PRECISION  NULL,
  pressure        DOUBLE PRECISION  NULL,
  co2             DOUBLE PRECISION  NULL
)

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

SELECT create_hypertable('netatmo', 'time');
