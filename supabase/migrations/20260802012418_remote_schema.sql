


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."movement_cash" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "type" "text" NOT NULL,
    "execution_date" "date" NOT NULL,
    "amount" numeric NOT NULL,
    "transfer_fee" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "movement_cash_type_check" CHECK (("type" = ANY (ARRAY['deposit'::"text", 'withdrawal'::"text"])))
);


ALTER TABLE "public"."movement_cash" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movement_dividends" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "execution_date" "date" NOT NULL,
    "ticker" "text" NOT NULL,
    "gross_amount" numeric NOT NULL,
    "tax" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."movement_dividends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movement_trades" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "type" "text" NOT NULL,
    "execution_date" "date" NOT NULL,
    "ticker" "text" NOT NULL,
    "shares" numeric NOT NULL,
    "execution_price" numeric NOT NULL,
    "fee" numeric NOT NULL,
    "regulatory_fees" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "movement_trades_type_check" CHECK (("type" = ANY (ARRAY['buy'::"text", 'sell'::"text"]))),
    CONSTRAINT "regulatory_fees_belong_to_sells" CHECK (((("type" = 'sell'::"text") AND ("regulatory_fees" IS NOT NULL)) OR (("type" = 'buy'::"text") AND ("regulatory_fees" IS NULL))))
);


ALTER TABLE "public"."movement_trades" OWNER TO "postgres";


ALTER TABLE ONLY "public"."movement_cash"
    ADD CONSTRAINT "movement_cash_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movement_dividends"
    ADD CONSTRAINT "movement_dividends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movement_trades"
    ADD CONSTRAINT "movement_trades_pkey" PRIMARY KEY ("id");



CREATE INDEX "movement_cash_user_id_idx" ON "public"."movement_cash" USING "btree" ("user_id");



CREATE INDEX "movement_dividends_user_id_idx" ON "public"."movement_dividends" USING "btree" ("user_id");



CREATE INDEX "movement_trades_user_id_idx" ON "public"."movement_trades" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."movement_cash" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."movement_dividends" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."movement_trades" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."movement_cash"
    ADD CONSTRAINT "movement_cash_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movement_dividends"
    ADD CONSTRAINT "movement_dividends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movement_trades"
    ADD CONSTRAINT "movement_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Perfil deletes own cash movements" ON "public"."movement_cash" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil deletes own dividends" ON "public"."movement_dividends" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil deletes own trades" ON "public"."movement_trades" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil inserts own cash movements" ON "public"."movement_cash" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil inserts own dividends" ON "public"."movement_dividends" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil inserts own trades" ON "public"."movement_trades" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil reads own cash movements" ON "public"."movement_cash" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil reads own dividends" ON "public"."movement_dividends" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil reads own trades" ON "public"."movement_trades" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil updates own cash movements" ON "public"."movement_cash" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil updates own dividends" ON "public"."movement_dividends" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Perfil updates own trades" ON "public"."movement_trades" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."movement_cash" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movement_dividends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movement_trades" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."movement_cash" TO "anon";
GRANT ALL ON TABLE "public"."movement_cash" TO "authenticated";
GRANT ALL ON TABLE "public"."movement_cash" TO "service_role";



GRANT ALL ON TABLE "public"."movement_dividends" TO "anon";
GRANT ALL ON TABLE "public"."movement_dividends" TO "authenticated";
GRANT ALL ON TABLE "public"."movement_dividends" TO "service_role";



GRANT ALL ON TABLE "public"."movement_trades" TO "anon";
GRANT ALL ON TABLE "public"."movement_trades" TO "authenticated";
GRANT ALL ON TABLE "public"."movement_trades" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































