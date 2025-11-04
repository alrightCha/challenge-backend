--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 17.0

-- Started on 2025-11-04 10:35:42 CET

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3446 (class 1262 OID 5)
-- Name: postgres; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE postgres WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE postgres OWNER TO postgres;

\connect postgres

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3447 (class 0 OID 0)
-- Dependencies: 3446
-- Name: DATABASE postgres; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON DATABASE postgres IS 'default administrative connection database';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 16538)
-- Name: bear; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bear (
    id integer NOT NULL,
    name character varying NOT NULL,
    size integer NOT NULL
);


ALTER TABLE public.bear OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16547)
-- Name: bear_colors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bear_colors (
    id integer NOT NULL,
    color_id integer NOT NULL,
    bear_id integer NOT NULL
);


ALTER TABLE public.bear_colors OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16546)
-- Name: bear_colors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bear_colors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bear_colors_id_seq OWNER TO postgres;

--
-- TOC entry 3448 (class 0 OID 0)
-- Dependencies: 219
-- Name: bear_colors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bear_colors_id_seq OWNED BY public.bear_colors.id;


--
-- TOC entry 217 (class 1259 OID 16537)
-- Name: bear_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bear_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bear_id_seq OWNER TO postgres;

--
-- TOC entry 3449 (class 0 OID 0)
-- Dependencies: 217
-- Name: bear_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bear_id_seq OWNED BY public.bear.id;


--
-- TOC entry 222 (class 1259 OID 16554)
-- Name: colors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.colors (
    id integer NOT NULL,
    name character varying NOT NULL,
    hex character varying
);


ALTER TABLE public.colors OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16553)
-- Name: colors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.colors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.colors_id_seq OWNER TO postgres;

--
-- TOC entry 3450 (class 0 OID 0)
-- Dependencies: 221
-- Name: colors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.colors_id_seq OWNED BY public.colors.id;


--
-- TOC entry 216 (class 1259 OID 16432)
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16431)
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- TOC entry 3451 (class 0 OID 0)
-- Dependencies: 215
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- TOC entry 3279 (class 2604 OID 16541)
-- Name: bear id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bear ALTER COLUMN id SET DEFAULT nextval('public.bear_id_seq'::regclass);


--
-- TOC entry 3280 (class 2604 OID 16550)
-- Name: bear_colors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bear_colors ALTER COLUMN id SET DEFAULT nextval('public.bear_colors_id_seq'::regclass);


--
-- TOC entry 3281 (class 2604 OID 16557)
-- Name: colors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors ALTER COLUMN id SET DEFAULT nextval('public.colors_id_seq'::regclass);


--
-- TOC entry 3278 (class 2604 OID 16435)
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- TOC entry 3436 (class 0 OID 16538)
-- Dependencies: 218
-- Data for Name: bear; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.bear VALUES (4, 'Kodiak', 360);
INSERT INTO public.bear VALUES (6, 'Sloth', 100);
INSERT INTO public.bear VALUES (7, 'Spectacled', 130);
INSERT INTO public.bear VALUES (9, 'Panda', 160);
INSERT INTO public.bear VALUES (19, 'grizzly', 200);
INSERT INTO public.bear VALUES (20, 'polar bear', 200);


--
-- TOC entry 3438 (class 0 OID 16547)
-- Dependencies: 220
-- Data for Name: bear_colors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.bear_colors VALUES (17, 19, 8);
INSERT INTO public.bear_colors VALUES (18, 19, 6);
INSERT INTO public.bear_colors VALUES (19, 20, 19);
INSERT INTO public.bear_colors VALUES (20, 21, 20);
INSERT INTO public.bear_colors VALUES (21, 20, 20);


--
-- TOC entry 3440 (class 0 OID 16554)
-- Dependencies: 222
-- Data for Name: colors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.colors VALUES (19, 'brown', '#86500C');
INSERT INTO public.colors VALUES (20, 'black', '#000000');
INSERT INTO public.colors VALUES (21, 'white', '#FFFFFF');


--
-- TOC entry 3434 (class 0 OID 16432)
-- Dependencies: 216
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.migrations VALUES (1, 1720703879258, 'Bear1720703879258');


--
-- TOC entry 3452 (class 0 OID 0)
-- Dependencies: 219
-- Name: bear_colors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bear_colors_id_seq', 21, true);


--
-- TOC entry 3453 (class 0 OID 0)
-- Dependencies: 217
-- Name: bear_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bear_id_seq', 20, true);


--
-- TOC entry 3454 (class 0 OID 0)
-- Dependencies: 221
-- Name: colors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.colors_id_seq', 21, true);


--
-- TOC entry 3455 (class 0 OID 0)
-- Dependencies: 215
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 1, true);


--
-- TOC entry 3283 (class 2606 OID 16439)
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- TOC entry 3285 (class 2606 OID 16545)
-- Name: bear PK_cd1fb70b1a6d730ad8276551e36; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bear
    ADD CONSTRAINT "PK_cd1fb70b1a6d730ad8276551e36" PRIMARY KEY (id);


--
-- TOC entry 3287 (class 2606 OID 16552)
-- Name: bear_colors PK_cd1fb70b1a6d730ad8276551e37; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bear_colors
    ADD CONSTRAINT "PK_cd1fb70b1a6d730ad8276551e37" PRIMARY KEY (id);


--
-- TOC entry 3289 (class 2606 OID 16561)
-- Name: colors PK_cd1fb70b1a6d730ad8276551e38; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT "PK_cd1fb70b1a6d730ad8276551e38" PRIMARY KEY (id);


-- Completed on 2025-11-04 10:35:42 CET

--
-- PostgreSQL database dump complete
--

