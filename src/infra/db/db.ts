import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as tables from "@/infra/db/tables";

export type { Db };

/** Drizzle database handle. Passed explicitly to every repository function. */
type Db = LibSQLDatabase<typeof tables>;
