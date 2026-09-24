-- Первая миграция: компании, пользователи, отзывы и заявки на обжалование.

CREATE TABLE companies (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(80)  NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    legal_name      VARCHAR(300) NOT NULL,
    inn             VARCHAR(20),
    country         VARCHAR(80)  NOT NULL,
    city            VARCHAR(120) NOT NULL,
    legal_address   VARCHAR(400),
    actual_address  VARCHAR(400),
    phone           VARCHAR(40),
    email           VARCHAR(120),
    website         VARCHAR(200),
    industry        VARCHAR(160),
    employees_count INTEGER,
    founded_year    INTEGER,
    description     TEXT,
    -- Сводные оценки хранятся прямо в компании и пересчитываются при изменении отзывов,
    -- так фильтрация в поиске не требует тяжёлых агрегатов на каждый запрос.
    avg_overall     DOUBLE PRECISION,
    avg_climate     DOUBLE PRECISION,
    avg_management  DOUBLE PRECISION,
    avg_team        DOUBLE PRECISION,
    avg_office      DOUBLE PRECISION,
    avg_clients     DOUBLE PRECISION,
    avg_growth      DOUBLE PRECISION,
    reviews_count   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_companies_country_city ON companies (country, city);
CREATE INDEX idx_companies_avg_overall ON companies (avg_overall);

CREATE TABLE users (
    id                      BIGSERIAL PRIMARY KEY,
    email                   VARCHAR(160) NOT NULL UNIQUE,
    password_hash           VARCHAR(100),
    display_name            VARCHAR(120) NOT NULL,
    job_title               VARCHAR(120),
    city                    VARCHAR(120),
    role                    VARCHAR(20)  NOT NULL,
    auth_provider           VARCHAR(20)  NOT NULL,
    company_id              BIGINT REFERENCES companies (id),
    representative_verified BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP    NOT NULL
);

CREATE TABLE reviews (
    id                BIGSERIAL PRIMARY KEY,
    company_id        BIGINT       NOT NULL REFERENCES companies (id),
    author_id         BIGINT       NOT NULL REFERENCES users (id),
    employment_status VARCHAR(20)  NOT NULL,
    position          VARCHAR(160) NOT NULL,
    overall_rating    INTEGER      NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    climate           INTEGER      NOT NULL CHECK (climate BETWEEN 1 AND 5),
    management        INTEGER      NOT NULL CHECK (management BETWEEN 1 AND 5),
    team              INTEGER      NOT NULL CHECK (team BETWEEN 1 AND 5),
    office            INTEGER      NOT NULL CHECK (office BETWEEN 1 AND 5),
    clients           INTEGER      NOT NULL CHECK (clients BETWEEN 1 AND 5),
    growth            INTEGER      NOT NULL CHECK (growth BETWEEN 1 AND 5),
    text              TEXT         NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    created_at        TIMESTAMP    NOT NULL
);

CREATE INDEX idx_reviews_company_created ON reviews (company_id, created_at DESC);
CREATE INDEX idx_reviews_author ON reviews (author_id);

CREATE TABLE appeals (
    id                 BIGSERIAL PRIMARY KEY,
    review_id          BIGINT      NOT NULL REFERENCES reviews (id),
    representative_id  BIGINT      NOT NULL REFERENCES users (id),
    reason             TEXT        NOT NULL,
    status             VARCHAR(20) NOT NULL,
    moderator_id       BIGINT REFERENCES users (id),
    moderator_comment  TEXT,
    created_at         TIMESTAMP   NOT NULL,
    resolved_at        TIMESTAMP
);

CREATE INDEX idx_appeals_status ON appeals (status);
CREATE INDEX idx_appeals_review ON appeals (review_id);
