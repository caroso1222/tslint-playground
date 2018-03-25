import * as ts from "typescript";

export default function createCompilerHostForBrowser(
    options: ts.CompilerOptions,
    moduleSearchLocations: string[],
): ts.CompilerHost {
    return {
        getSourceFile,
        getDefaultLibFileName: () => "lib.d.ts",
        writeFile: (fileName, content) =>
            localStorage.setItem("source", content),
        getCurrentDirectory: () => "/",
        getDirectories: path => ["/"],
        getCanonicalFileName: fileName => "TSLintPlaygroundFile.ts",
        getNewLine: () => "\n",
        useCaseSensitiveFileNames: function() {
            return false;
        },
        fileExists,
        readFile,
        resolveModuleNames,
    };

    function fileExists(fileName: string): boolean {
        return localStorage.getItem("source") !== undefined;
    }

    function readFile(fileName: string): string | undefined {
        return localStorage.getItem("source");
    }

    function getSourceFile(
        fileName: string,
        languageVersion: ts.ScriptTarget,
        onError?: (message: string) => void,
    ) {
        const sourceText = localStorage.getItem("source");
        return sourceText !== undefined
            ? ts.createSourceFile(
                  this.getCanonicalFileName(),
                  sourceText,
                  languageVersion,
              )
            : undefined;
    }

    function resolveModuleNames(
        moduleNames: string[],
        containingFile: string,
    ): ts.ResolvedModule[] {
        return [
            {
                resolvedFileName: "./mod.js", /* I'm not sure what's up with this */
            },
        ];
    }
}
