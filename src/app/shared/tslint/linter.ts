/**
 * @license
 * Copyright 2013 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from "typescript";
import {
    convertRuleOptions,
    IConfigurationFile,
} from "./configuration";
import { removeDisabledFailures } from "./enableDisableRules";
import { FatalError, isError, showWarningOnce } from "./error";
import { findFormatter } from "./formatterLoader";
import { ILinterOptions, LintResult } from "./index";
import { IRule, isTypedRule, Replacement, RuleFailure, RuleSeverity } from "./language/rule/rule";
import * as utils from "./language/utils";
import { loadRules } from "./ruleLoader";
import { arrayify, dedent, flatMap, mapDefined } from "./utils";

/**
 * Linter that can lint multiple files in consecutive runs.
 */
export class Linter {
    public static VERSION = "5.9.1";

    private failures: RuleFailure[] = [];
    private fixes: RuleFailure[] = [];

    rules: IRule[] = [];

    /**
     * Returns a list of source file names from a TypeScript program. This includes all referenced
     * files and excludes declaration (".d.ts") files.
     */
    public static getFileNames(program: ts.Program): string[] {
        return mapDefined(
            program.getSourceFiles(),
            (file) =>
                file.fileName.endsWith(".d.ts") || program.isSourceFileFromExternalLibrary(file)
                    ? undefined
                    : file.fileName,
        );
    }

    constructor(private readonly options: ILinterOptions, private program?: ts.Program) {
        if (typeof options !== "object") {
            throw new Error(`Unknown Linter options type: ${typeof options}`);
        }
        if ((options as any).configuration !== undefined) {
            throw new Error("ILinterOptions does not contain the property `configuration` as of version 4. " +
                "Did you mean to pass the `IConfigurationFile` object to lint() ? ");
        }
    }

    public registerRule(rule: IRule) {
      this.rules.push(rule);
    }

    public lint(fileName: string, source: string, configuration: IConfigurationFile): void {
        const sourceFile = this.getSourceFile(fileName, source);
        const isJs = /\.jsx?$/i.test(fileName);
        const enabledRules = this.getEnabledRules(configuration, isJs, this.rules);
        console.log(enabledRules);
        console.log(sourceFile);
        let fileFailures = this.getAllFailures(sourceFile, enabledRules);
        console.log(fileFailures);
        if (fileFailures.length === 0) {
          this.failures = fileFailures;
            // Usual case: no errors.
            return;
        }


        // add rule severity to failures
        const ruleSeverityMap = new Map(enabledRules.map(
            (rule): [string, RuleSeverity] => [rule.getOptions().ruleName, rule.getOptions().ruleSeverity]));

        for (const failure of fileFailures) {
            const severity = ruleSeverityMap.get(failure.getRuleName());
            if (severity === undefined) {
                throw new Error(`Severity for rule '${failure.getRuleName()}' not found`);
            }
            failure.setRuleSeverity(severity);
        }

        // this.failures = this.failures.concat(fileFailures);

        this.failures = fileFailures;
    }

    public getResult(): LintResult {
        const formatterName = this.options.formatter !== undefined ? this.options.formatter : "prose";
        const Formatter = findFormatter(formatterName, this.options.formattersDirectory);
        if (Formatter === undefined) {
            throw new Error(`formatter '${formatterName}' not found`);
        }
        const formatter = new Formatter();

        const output = formatter.format(this.failures, this.fixes);

        const errorCount = this.failures.filter((failure) => failure.getRuleSeverity() === "error").length;
        return {
            errorCount,
            failures: this.failures,
            fixes: this.fixes,
            format: formatterName,
            output,
            warningCount: this.failures.length - errorCount,
        };
    }

    private getAllFailures(sourceFile: ts.SourceFile, enabledRules: IRule[]): RuleFailure[] {
        const failures = flatMap(enabledRules, (rule) => this.applyRule(rule, sourceFile));
        return removeDisabledFailures(sourceFile, failures);
    }

    private applyRule(rule: IRule, sourceFile: ts.SourceFile): RuleFailure[] {
        console.log(rule);
        try {
            if (this.program !== undefined && isTypedRule(rule)) {
                return rule.applyWithProgram(sourceFile, this.program);
            } else {
                return rule.apply(sourceFile);
            }
        } catch (error) {
            if (isError(error) && error.stack !== undefined) {
                showWarningOnce(error.stack);
            } else {
                showWarningOnce(String(error));
            }
            return [];
        }
    }

    private getEnabledRules(configuration: IConfigurationFile, isJs: boolean, lazyRules?: any): IRule[] {
        const ruleOptionsList = convertRuleOptions(isJs ? configuration.jsRules : configuration.rules);
        const rulesDirectories = arrayify(this.options.rulesDirectory)
            .concat(arrayify(configuration.rulesDirectory));
        return loadRules(ruleOptionsList, rulesDirectories, isJs, lazyRules);
    }

    private getSourceFile(fileName: string, source: string) {
        if (this.program !== undefined) {
            const sourceFile = this.program.getSourceFile(fileName);
            if (sourceFile === undefined) {
                const INVALID_SOURCE_ERROR = dedent`
                    Invalid source file: ${fileName}. Ensure that the files supplied to lint have a .ts, .tsx, .d.ts, .js or .jsx extension.
                `;
                throw new FatalError(INVALID_SOURCE_ERROR);
            }
            return sourceFile;
        } else {
            return utils.getSourceFile(fileName, source);
        }
    }
}

function createMultiMap<T, K, V>(inputs: T[], getPair: (input: T) => [K, V] | undefined): Map<K, V[]> {
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
