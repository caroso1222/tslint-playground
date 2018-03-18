import * as ts from "typescript";
import { removeDisabledFailures } from "./utils/removeDisabledFailures";
import {
    IRule,
    isTypedRule,
    Replacement,
    RuleFailure,
    RuleSeverity,
    ILinterOptions,
    LintResult,
} from "tslint";
import { arrayify, dedent, flatMap } from "./utils/all";
import createCompilerHostForBrowser from "./CompilerHostBrowser";
import NoConsoleRule from "./rules/noConsoleRule";

export const FILE_NAME = "TSLintPlayground.ts";

const configuration = {
    lintOptions: {
        typeCheck: false,
    },
    extends: "tslint:all",
    rules: {
        "no-console": true,
    },
};
export interface IOptions {
    ruleArguments: any[];
    ruleSeverity: RuleSeverity;
    ruleName: string;
}
export interface IConfigurationFile {
    /**
     * The severity that is applied to rules in _this_ config with `severity === "default"`.
     * Not inherited.
     */
    defaultSeverity?: RuleSeverity;

    /**
     * An array of config files whose rules are inherited by this config file.
     */
    extends: string[];

    /**
     * Rules that are used to lint to JavaScript files.
     */
    jsRules: Map<string, Partial<IOptions>>;

    /**
     * A subset of the CLI options.
     */
    linterOptions?: Partial<{
        exclude: string[];
    }>;

    /**
     * Directories containing custom rules. Resolved using node module semantics.
     */
    rulesDirectory: string[];

    /**
     * Rules that are used to lint TypeScript files.
     */
    rules: Map<string, Partial<IOptions>>;
}

export const DEFAULT_CONFIG: IConfigurationFile = {
    defaultSeverity: "error",
    extends: ["tslint:recommended"],
    jsRules: new Map<string, Partial<IOptions>>(),
    rules: new Map<string, Partial<IOptions>>(),
    rulesDirectory: [],
};

/**
 * Linter that can lint multiple files in consecutive runs.
 */
export default class Linter {
    public static VERSION = "5.8.0";

    private failures: RuleFailure[] = [];
    private fixes: RuleFailure[] = [];

    /**
     * Creates a TypeScript program object from a tsconfig.json file path and optional project directory.
     */
    public static createProgram(): ts.Program {
        const options: ts.CompilerOptions = {
            module: ts.ModuleKind.AMD,
            target: ts.ScriptTarget.ES5,
        };
        const sourceFiles = [localStorage.getItem("source")];
        const host = createCompilerHostForBrowser(options, ["./"]);

        return ts.createProgram(sourceFiles, options, host);
    }

    /**
     * Returns a list of source file names from a TypeScript program. This includes all referenced
     * files and excludes declaration (".d.ts") files.
     */
    public static getFileNames(program: ts.Program): string[] {
        return [FILE_NAME];
    }

    constructor(
        private readonly options: ILinterOptions,
        private program?: ts.Program,
    ) {
        if (typeof options !== "object") {
            throw new Error(`Unknown Linter options type: ${typeof options}`);
        }
        if ((options as any).configuration !== undefined) {
            throw new Error(
                "ILinterOptions does not contain the property `configuration` as of version 4. " +
                    "Did you mean to pass the `IConfigurationFile` object to lint() ? ",
            );
        }
        this.program = Linter.createProgram();
    }

    public lint(
        fileName: string,
        source: string,
        configuration: IConfigurationFile = DEFAULT_CONFIG,
    ): void {
        const sourceFile = this.getSourceFile(fileName, source);
        const isJs = /\.jsx?$/i.test(fileName);
        const enabledRules = this.getEnabledRules(configuration, isJs);

        let fileFailures = this.getAllFailures(sourceFile, enabledRules);
        if (fileFailures.length === 0) {
            // Usual case: no errors.
            return;
        }

        if (this.options.fix && fileFailures.some(f => f.hasFix())) {
            fileFailures = this.applyAllFixes(
                enabledRules,
                fileFailures,
                sourceFile,
                fileName,
            );
        }

        // add rule severity to failures
        const ruleSeverityMap = new Map(
            enabledRules.map((rule): [string, RuleSeverity] => [
                rule.getOptions().ruleName,
                rule.getOptions().ruleSeverity,
            ]),
        );

        for (const failure of fileFailures) {
            const severity = ruleSeverityMap.get(failure.getRuleName());
            if (severity === undefined) {
                throw new Error(
                    `Severity for rule '${failure.getRuleName()}' not found`,
                );
            }
            failure.setRuleSeverity(severity);
        }

        this.failures = this.failures.concat(fileFailures);
    }

    public getResult(): LintResult {
        const output = this.failures.toString();

        const errorCount = this.failures.filter(
            failure => failure.getRuleSeverity() === "error",
        ).length;
        return {
            errorCount,
            failures: this.failures,
            fixes: this.fixes,
            format: "NA",
            output,
            warningCount: this.failures.length - errorCount,
        };
    }

    private getAllFailures(
        sourceFile: ts.SourceFile,
        enabledRules: IRule[],
    ): RuleFailure[] {
        const failures = flatMap(enabledRules, rule =>
            this.applyRule(rule, sourceFile),
        );
        return removeDisabledFailures(sourceFile, failures);
    }

    private applyAllFixes(
        enabledRules: IRule[],
        fileFailures: RuleFailure[],
        sourceFile: ts.SourceFile,
        sourceFileName: string,
    ): RuleFailure[] {
        // When fixing, we need to be careful as a fix in one rule may affect other rules.
        // So fix each rule separately.
        let source: string = sourceFile.text;

        for (const rule of enabledRules) {
            const hasFixes = fileFailures.some(
                f =>
                    f.hasFix() &&
                    f.getRuleName() === rule.getOptions().ruleName,
            );
            if (hasFixes) {
                // Get new failures in case the file changed.
                const updatedFailures = removeDisabledFailures(
                    sourceFile,
                    this.applyRule(rule, sourceFile),
                );
                const fixableFailures = updatedFailures.filter(f => f.hasFix());
                this.fixes = this.fixes.concat(fixableFailures);
                source = this.applyFixes(
                    sourceFileName,
                    source,
                    fixableFailures,
                );
                sourceFile = this.getSourceFile(sourceFileName, source);
            }
        }

        // If there were fixes, get the *new* list of failures.
        return this.getAllFailures(sourceFile, enabledRules);
    }

    // Only "protected" because a test directly accesses it.
    // tslint:disable-next-line member-ordering
    protected applyFixes(
        sourceFilePath: string,
        source: string,
        fixableFailures: RuleFailure[],
    ): string {
        return source;
    }

    private updateProgram(sourceFilePath: string) {
        if (
            this.program !== undefined &&
            this.program.getSourceFile(sourceFilePath) !== undefined
        ) {
            const options = this.program.getCompilerOptions();
            this.program = ts.createProgram(
                this.program.getRootFileNames(),
                options,
                ts.createCompilerHost(options, true),
                this.program,
            );
        }
    }

    private applyRule(rule: IRule, sourceFile: ts.SourceFile): RuleFailure[] {
        try {
            if (this.program !== undefined && isTypedRule(rule)) {
                return rule.applyWithProgram(sourceFile, this.program);
            } else {
                return rule.apply(sourceFile);
            }
        } catch (error) {
            console.error(error);
        }
    }

    private getEnabledRules(
        configuration: IConfigurationFile = DEFAULT_CONFIG,
        isJs: boolean,
    ): IRule[] {
        return [
            new NoConsoleRule({
                ruleArguments: [],
                ruleName: "no-console",
                ruleSeverity: "error",
                disabledIntervals: [],
            }),
        ];
    }

    private getSourceFile(fileName: string, source: string) {
        return Linter.createProgram().getSourceFile("TSLintPlayground.ts");
    }
}

// tslint:disable-next-line:no-namespace
namespace Linter {

}

function createMultiMap<T, K, V>(
    inputs: T[],
    getPair: (input: T) => [K, V] | undefined,
): Map<K, V[]> {
    const map = new Map<K, V[]>();
    for (const input of inputs) {
        const pair = getPair(input);
        if (pair !== undefined) {
            const [k, v] = pair;
            const vs = map.get(k);
            if (vs !== undefined) {
                vs.push(v);
            } else {
                map.set(k, [v]);
            }
        }
    }
    return map;
}

export function convertRuleOptions(
    ruleConfiguration: Map<string, Partial<IOptions>>,
): IOptions[] {
    return [
        {
            ruleArguments: undefined,
            ruleName: "no-console",
            ruleSeverity: "error",
        },
    ];
}
