import { Glob } from "bun";

const DEFAULT_EXCLUDE = [".test.ts", ".d.ts"];

export async function importAllModules(
    dir: string,
    exclude: string[] = [],
): Promise<void> {
    const allExclude = [...DEFAULT_EXCLUDE, ...exclude];
    const glob = new Glob("**/*.ts");

    const files = [...glob.scanSync(dir)].filter(
        (f) => !allExclude.some((pattern) => f.endsWith(pattern)),
    );

    await Promise.all(
        files.map((relPath) => import(new URL(relPath, `file://${dir}/`).href)),
    );
}
