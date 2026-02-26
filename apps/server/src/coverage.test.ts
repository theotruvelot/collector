import { test } from "bun:test";
import { importAllModules } from "./importAllModules";
import { join } from "path";

test("imports specific modules for coverage (routes, middleware, utils)", async () => {
    const baseDir = import.meta.dir;
    await importAllModules(join(baseDir, "routes"));
    await importAllModules(join(baseDir, "middleware"));
    await importAllModules(join(baseDir, "utils"));
});
