-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE contract_type        AS ENUM ('full_time', 'part_time', 'visiting', 'adjunct', 'emeritus');
CREATE TYPE degree_type          AS ENUM ('bachelor', 'master', 'phd', 'diploma');
CREATE TYPE exam_status          AS ENUM ('scheduled', 'passed', 'failed', 'absent', 'withdrawn');
CREATE TYPE matriculation_status AS ENUM ('pending', 'active', 'suspended', 'withdrawn', 'graduated');
CREATE TYPE student_status       AS ENUM ('active', 'inactive', 'graduated', 'suspended');
CREATE TYPE teacher_status       AS ENUM ('active', 'inactive', 'on_leave', 'retired');


-- ============================================================
-- STANDALONE TABLES
-- ============================================================

CREATE TABLE file (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bucket_name   VARCHAR(255) NOT NULL,
    object_key    VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type     VARCHAR(100),
    size          BIGINT,
    checksum      VARCHAR(64),
    UNIQUE (bucket_name, object_key)   -- lo stesso oggetto non può esistere due volte
);


CREATE TABLE subject (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);


-- "user" è parola riservata in PostgreSQL
CREATE TABLE app_user (
    id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      VARCHAR(40)  NOT NULL,
    surname   VARCHAR(40)  NOT NULL,
    birthdate DATE         NOT NULL,
    taxcode   VARCHAR(16)  NOT NULL UNIQUE,
    mobile    VARCHAR(20),
    email     VARCHAR(255) NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL,
    propic    INT,                          -- FK a file.id
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);


-- ============================================================
-- TABLES WITH ENUM COLUMNS
-- ============================================================

CREATE TABLE degree (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type        degree_type  NOT NULL,
    department  VARCHAR(100) NOT NULL,
    title       VARCHAR(100) NOT NULL,
    description TEXT,
    duration    SMALLINT     NOT NULL,     -- in anni
    UNIQUE (title, department)             -- stesso corso non può esistere due volte nello stesso dipartimento
);


CREATE TABLE student (
    id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_user INT            NOT NULL UNIQUE, -- un utente ha al massimo un profilo studente
    status  student_status NOT NULL
);


CREATE TABLE teacher (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_user       INT            NOT NULL UNIQUE, -- un utente ha al massimo un profilo docente
    status        teacher_status NOT NULL,
    contract_type contract_type  NOT NULL
);


-- ============================================================
-- RELATIONSHIP / DEPENDENT TABLES
-- ============================================================

CREATE TABLE study_plan (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_degree    INT      NOT NULL,
    id_subject   INT      NOT NULL,
    year         SMALLINT NOT NULL,
    is_mandatory BOOLEAN  NOT NULL DEFAULT FALSE,
    UNIQUE (id_degree, id_subject, year)   -- stessa materia non può comparire due volte nello stesso piano per lo stesso anno
);


CREATE TABLE course (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_subject    INT      NOT NULL,
    id_degree     INT      NOT NULL,
    id_teacher    INT      NOT NULL,
    cfu           SMALLINT NOT NULL,
    start_date    DATE,
    end_date      DATE,
    max_students  INT,
    semester      SMALLINT,
    academic_year SMALLINT,
    UNIQUE (id_subject, id_degree, academic_year, semester)  -- un corso non può essere duplicato per lo stesso anno e semestre
);


CREATE TABLE exam (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_course  INT          NOT NULL,
    id_teacher INT          NOT NULL,
    location   VARCHAR(255),
    exam_date  DATE,
    -- id_subject rimosso: ridondante, già presente in course
    UNIQUE (id_course, exam_date)          -- non possono esistere due appelli dello stesso corso nello stesso giorno
);


CREATE TABLE matriculation (
    id_student         INT                  NOT NULL,
    id_degree          INT                  NOT NULL,
    status             matriculation_status NOT NULL,
    matriculation_code NUMERIC(8)           UNIQUE,
    matriculation_date DATE,
    PRIMARY KEY (id_student, id_degree)
);


CREATE TABLE registration (
    id_course         INT  NOT NULL,
    id_student        INT  NOT NULL,
    registration_date DATE,
    PRIMARY KEY (id_course, id_student)
);


CREATE TABLE archive (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_course    INT       NOT NULL UNIQUE, -- un archivio per corso
    last_updated TIMESTAMP,
    description  TEXT
);


CREATE TABLE courseware (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_archive  INT          NOT NULL,
    id_file     INT          NOT NULL UNIQUE, -- un file non può essere caricato due volte
    uploaded_by INT          NOT NULL,
    uploaded_at TIMESTAMP,
    title       VARCHAR(100),
    description TEXT
);


CREATE TABLE enrollment (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_exam         INT         NOT NULL,
    id_student      INT         NOT NULL,
    status          exam_status NOT NULL DEFAULT 'scheduled',
    grade           SMALLINT,
    enrollment_date DATE        NOT NULL,
    withdrawal_date DATE,
    UNIQUE (id_exam, id_student)           -- uno studente non può iscriversi due volte allo stesso appello
);


-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE app_user      ADD CONSTRAINT fk_user_propic         FOREIGN KEY (propic)      REFERENCES file (id);

ALTER TABLE student       ADD CONSTRAINT fk_student_user        FOREIGN KEY (id_user)     REFERENCES app_user (id);

ALTER TABLE teacher       ADD CONSTRAINT fk_teacher_user        FOREIGN KEY (id_user)     REFERENCES app_user (id);

ALTER TABLE study_plan    ADD CONSTRAINT fk_study_plan_degree   FOREIGN KEY (id_degree)   REFERENCES degree (id);
ALTER TABLE study_plan    ADD CONSTRAINT fk_study_plan_subject  FOREIGN KEY (id_subject)  REFERENCES subject (id);

ALTER TABLE course        ADD CONSTRAINT fk_course_subject      FOREIGN KEY (id_subject)  REFERENCES subject (id);
ALTER TABLE course        ADD CONSTRAINT fk_course_degree       FOREIGN KEY (id_degree)   REFERENCES degree (id);
ALTER TABLE course        ADD CONSTRAINT fk_course_teacher      FOREIGN KEY (id_teacher)  REFERENCES teacher (id);

ALTER TABLE exam          ADD CONSTRAINT fk_exam_course         FOREIGN KEY (id_course)   REFERENCES course (id);
ALTER TABLE exam          ADD CONSTRAINT fk_exam_teacher        FOREIGN KEY (id_teacher)  REFERENCES teacher (id);

ALTER TABLE matriculation ADD CONSTRAINT fk_matric_student      FOREIGN KEY (id_student)  REFERENCES student (id);
ALTER TABLE matriculation ADD CONSTRAINT fk_matric_degree       FOREIGN KEY (id_degree)   REFERENCES degree (id);

ALTER TABLE registration  ADD CONSTRAINT fk_reg_course          FOREIGN KEY (id_course)   REFERENCES course (id);
ALTER TABLE registration  ADD CONSTRAINT fk_reg_student         FOREIGN KEY (id_student)  REFERENCES student (id);

ALTER TABLE archive       ADD CONSTRAINT fk_archive_course      FOREIGN KEY (id_course)   REFERENCES course (id);

ALTER TABLE courseware    ADD CONSTRAINT fk_courseware_archive  FOREIGN KEY (id_archive)  REFERENCES archive (id);
ALTER TABLE courseware    ADD CONSTRAINT fk_courseware_file     FOREIGN KEY (id_file)     REFERENCES file (id);
ALTER TABLE courseware    ADD CONSTRAINT fk_courseware_uploader FOREIGN KEY (uploaded_by) REFERENCES app_user (id);

ALTER TABLE enrollment    ADD CONSTRAINT fk_enrollment_exam     FOREIGN KEY (id_exam)     REFERENCES exam (id);
ALTER TABLE enrollment    ADD CONSTRAINT fk_enrollment_student  FOREIGN KEY (id_student)  REFERENCES student (id);
