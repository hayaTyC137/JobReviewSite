-- Вторая миграция: ролевая модель (администратор, блокировки), вход через соцсети,
-- модерация компаний, кабинет сотрудника (трудовая история, оценки работодателей, дисциплина),
-- жалобы, заявки на смену данных профиля, обращения в поддержку, настройки и справочник городов.
-- Синтаксис совместим и с PostgreSQL, и с H2 в режиме PostgreSQL (интеграционные тесты).

-- ---------- Пользователи ----------
ALTER TABLE users ADD COLUMN full_name VARCHAR(160);
ALTER TABLE users ADD COLUMN country VARCHAR(80);
ALTER TABLE users ADD COLUMN bio VARCHAR(600);
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(300);
ALTER TABLE users ADD COLUMN blocked BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN blocked_reason VARCHAR(400);
-- Аккаунты из соцсетей создаются с false: пользователь должен дозаполнить профиль
ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;

CREATE INDEX idx_users_role ON users (role);

-- Внешние аккаунты (Google, GitHub, ...): один пользователь может войти несколькими способами
CREATE TABLE user_identities (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id),
    provider   VARCHAR(20)  NOT NULL,
    subject    VARCHAR(200) NOT NULL,
    created_at TIMESTAMP    NOT NULL,
    CONSTRAINT uq_user_identity UNIQUE (provider, subject)
);

-- ---------- Компании: заявка в реестр и оформление профиля ----------
-- Уже существующие компании считаются проверенными
ALTER TABLE companies ADD COLUMN status VARCHAR(20) DEFAULT 'APPROVED' NOT NULL;
ALTER TABLE companies ADD COLUMN logo_url VARCHAR(300);
ALTER TABLE companies ADD COLUMN banner_url VARCHAR(300);
ALTER TABLE companies ADD COLUMN created_by BIGINT;
ALTER TABLE companies ADD COLUMN created_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN moderation_comment VARCHAR(1000);
ALTER TABLE companies ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE companies ADD CONSTRAINT fk_companies_created_by FOREIGN KEY (created_by) REFERENCES users (id);

CREATE INDEX idx_companies_status ON companies (status);
CREATE INDEX idx_reviews_created ON reviews (created_at);
CREATE INDEX idx_users_created ON users (created_at);

-- ---------- Справочник городов для фильтров и форм ----------
CREATE TABLE cities (
    id         BIGSERIAL PRIMARY KEY,
    country    VARCHAR(80)  NOT NULL,
    name       VARCHAR(120) NOT NULL,
    sort_order INTEGER      NOT NULL,
    CONSTRAINT uq_city UNIQUE (country, name)
);

INSERT INTO cities (country, name, sort_order) VALUES
    ('Россия', 'Москва', 1), ('Россия', 'Санкт-Петербург', 2), ('Россия', 'Казань', 3),
    ('Россия', 'Екатеринбург', 4), ('Россия', 'Новосибирск', 5), ('Россия', 'Нижний Новгород', 6),
    ('Беларусь', 'Минск', 1), ('Беларусь', 'Гродно', 2), ('Беларусь', 'Брест', 3),
    ('Казахстан', 'Алматы', 1), ('Казахстан', 'Астана', 2), ('Казахстан', 'Шымкент', 3),
    ('Молдова', 'Кишинёв', 1), ('Молдова', 'Бельцы', 2), ('Молдова', 'Тирасполь', 3),
    ('Молдова', 'Бендеры', 4), ('Молдова', 'Кагул', 5), ('Молдова', 'Унгены', 6),
    ('Молдова', 'Сороки', 7), ('Молдова', 'Оргеев', 8), ('Молдова', 'Комрат', 9),
    ('Молдова', 'Стрэшень', 10), ('Молдова', 'Хынчешть', 11), ('Молдова', 'Единец', 12);

-- ---------- Кабинет сотрудника ----------
-- Трудовая история: запись заводит подтверждённый представитель работодателя
CREATE TABLE employment_records (
    id               BIGSERIAL PRIMARY KEY,
    employee_id      BIGINT       NOT NULL REFERENCES users (id),
    company_id       BIGINT       NOT NULL REFERENCES companies (id),
    position         VARCHAR(160) NOT NULL,
    start_date       DATE         NOT NULL,
    end_date         DATE,
    dismissal_reason VARCHAR(30),
    dismissal_note   VARCHAR(1000),
    recorded_by      BIGINT       NOT NULL REFERENCES users (id),
    created_at       TIMESTAMP    NOT NULL,
    CONSTRAINT chk_employment_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_employment_employee ON employment_records (employee_id);
CREATE INDEX idx_employment_company ON employment_records (company_id);

-- Оценка сотрудника работодателем: одна на запись о работе, шкала 1–5
CREATE TABLE employee_evaluations (
    id            BIGSERIAL PRIMARY KEY,
    employment_id BIGINT      NOT NULL REFERENCES employment_records (id),
    author_id     BIGINT      NOT NULL REFERENCES users (id),
    toxicity      INTEGER     NOT NULL CHECK (toxicity BETWEEN 1 AND 5),
    composure     INTEGER     NOT NULL CHECK (composure BETWEEN 1 AND 5),
    productivity  INTEGER     NOT NULL CHECK (productivity BETWEEN 1 AND 5),
    teamwork      INTEGER     NOT NULL CHECK (teamwork BETWEEN 1 AND 5),
    reliability   INTEGER     NOT NULL CHECK (reliability BETWEEN 1 AND 5),
    communication INTEGER     NOT NULL CHECK (communication BETWEEN 1 AND 5),
    comment       TEXT,
    status        VARCHAR(20) NOT NULL,
    created_at    TIMESTAMP   NOT NULL,
    updated_at    TIMESTAMP   NOT NULL,
    CONSTRAINT uq_evaluation_employment UNIQUE (employment_id)
);

-- Дисциплинарная история: замечания работодателя и удовлетворённые жалобы.
-- Публично видны только подтверждённые модератором записи
CREATE TABLE disciplinary_records (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT       NOT NULL REFERENCES users (id),
    company_id        BIGINT REFERENCES companies (id),
    reported_by       BIGINT REFERENCES users (id),
    source            VARCHAR(20)  NOT NULL,
    severity          VARCHAR(20)  NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT         NOT NULL,
    occurred_on       DATE         NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    moderator_id      BIGINT REFERENCES users (id),
    moderator_comment VARCHAR(1000),
    created_at        TIMESTAMP    NOT NULL,
    resolved_at       TIMESTAMP
);

CREATE INDEX idx_discipline_employee ON disciplinary_records (employee_id);
CREATE INDEX idx_discipline_status ON disciplinary_records (status);

-- ---------- Жалобы на отзывы, оценки, пользователей и компании ----------
CREATE TABLE complaints (
    id           BIGSERIAL PRIMARY KEY,
    author_id    BIGINT      NOT NULL REFERENCES users (id),
    target_type  VARCHAR(20) NOT NULL,
    target_id    BIGINT      NOT NULL,
    reason       VARCHAR(30) NOT NULL,
    details      TEXT        NOT NULL,
    status       VARCHAR(20) NOT NULL,
    resolution   VARCHAR(1000),
    moderator_id BIGINT REFERENCES users (id),
    created_at   TIMESTAMP   NOT NULL,
    resolved_at  TIMESTAMP
);

CREATE INDEX idx_complaints_status ON complaints (status);
CREATE INDEX idx_complaints_target ON complaints (target_type, target_id);

-- ---------- Смена критичных данных профиля через модератора ----------
CREATE TABLE profile_change_requests (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES users (id),
    field             VARCHAR(30)  NOT NULL,
    old_value         VARCHAR(300),
    new_value         VARCHAR(300) NOT NULL,
    reason            VARCHAR(500),
    status            VARCHAR(20)  NOT NULL,
    moderator_id      BIGINT REFERENCES users (id),
    moderator_comment VARCHAR(1000),
    created_at        TIMESTAMP    NOT NULL,
    resolved_at       TIMESTAMP
);

CREATE INDEX idx_profile_changes_status ON profile_change_requests (status);

-- ---------- Обращения в поддержку («Связаться с нами») ----------
CREATE TABLE support_tickets (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users (id),
    name       VARCHAR(120) NOT NULL,
    email      VARCHAR(160) NOT NULL,
    topic      VARCHAR(20)  NOT NULL,
    subject    VARCHAR(200) NOT NULL,
    message    TEXT         NOT NULL,
    status     VARCHAR(20)  NOT NULL,
    response   TEXT,
    handled_by BIGINT REFERENCES users (id),
    created_at TIMESTAMP    NOT NULL,
    updated_at TIMESTAMP    NOT NULL
);

CREATE INDEX idx_tickets_status ON support_tickets (status);
CREATE INDEX idx_tickets_user ON support_tickets (user_id);

-- ---------- Системные настройки платформы ----------
CREATE TABLE platform_settings (
    setting_key   VARCHAR(60)   PRIMARY KEY,
    setting_value VARCHAR(1000) NOT NULL,
    updated_at    TIMESTAMP     NOT NULL,
    updated_by    BIGINT REFERENCES users (id)
);
