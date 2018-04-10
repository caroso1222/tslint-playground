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


import { FatalError, showWarningOnce } from "./error";

import { IOptions, RuleSeverity } from "./language/rule/rule";
import { _arr, arrayify, hasOwnProperty, stripComments } from "./utils";

export interface IConfigurationFile {
    /**
     * @deprecated property is never set
     *
     * The severity that is applied to rules in this config file as well as rules
     * in any inherited config files which have their severity set to "default".
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

export interface IConfigurationLoadResult {
    path?: string;
    results?: IConfigurationFile;
}

// Note: eslint prefers yaml over json, while tslint prefers json over yaml
// for backward-compatibility.
export const JSON_CONFIG_FILENAME = "tslint.json";
/** @deprecated use `JSON_CONFIG_FILENAME` or `CONFIG_FILENAMES` instead. */
export const CONFIG_FILENAME = JSON_CONFIG_FILENAME;
export const CONFIG_FILENAMES = [JSON_CONFIG_FILENAME, "tslint.yaml", "tslint.yml"];

export const DEFAULT_CONFIG: IConfigurationFile = {
    defaultSeverity: "error",
    extends: ["tslint:recommended"],
    jsRules: new Map<string, Partial<IOptions>>(),
    rules: new Map<string, Partial<IOptions>>(),
    rulesDirectory: [],
};

export const EMPTY_CONFIG: IConfigurationFile = {
    defaultSeverity: "error",
    extends: [],
    jsRules: new Map<string, Partial<IOptions>>(),
    rules: new Map<string, Partial<IOptions>>(),
    rulesDirectory: [],
};

const BUILT_IN_CONFIG = /^tslint:(.*)$/;

export function extendConfigurationFile(targetConfig: IConfigurationFile,
                                        nextConfigSource: IConfigurationFile): IConfigurationFile {

    function combineProperties<T>(targetProperty: T | undefined, nextProperty: T | undefined): T {
        const combinedProperty: { [key: string]: any } = {};
        add(targetProperty);
        // next config source overwrites the target config object
        add(nextProperty);
        return combinedProperty as T;

        function add(property: T | undefined): void {
            if (property !== undefined) {
                for (const name in property) {
                    if (hasOwnProperty(property, name)) {
                        combinedProperty[name] = property[name];
                    }
                }
            }
        }
    }

    function combineMaps(target: Map<string, Partial<IOptions>>, next: Map<string, Partial<IOptions>>) {
        const combined = new Map<string, Partial<IOptions>>();
        target.forEach((options, ruleName) => {
            combined.set(ruleName, options);
        });
        next.forEach((options, ruleName) => {
            const combinedRule = combined.get(ruleName);
            if (combinedRule !== undefined) {
                combined.set(ruleName, combineProperties(combinedRule, options));
            } else {
                combined.set(ruleName, options);
            }
        });
        return combined;
    }

    const combinedRulesDirs = targetConfig.rulesDirectory.concat(nextConfigSource.rulesDirectory);
    const dedupedRulesDirs = Array.from(new Set(combinedRulesDirs));

    return {
        extends: [],
        jsRules: combineMaps(targetConfig.jsRules, nextConfigSource.jsRules),
        linterOptions: combineProperties(targetConfig.linterOptions, nextConfigSource.linterOptions),
        rules: combineMaps(targetConfig.rules, nextConfigSource.rules),
        rulesDirectory: dedupedRulesDirs,
    };
}

// check if directory should be used as path or if it should be resolved like a module
// matches if directory starts with '/', './', '../', 'node_modules/' or equals '.' or '..'
export function useAsPath(directory: string) {
    return /^(?:\.?\.?(?:\/|$)|node_modules\/)/.test(directory);
}


/**
 * Parses the options of a single rule and upgrades legacy settings such as `true`, `[true, "option"]`
 *
 * @param ruleConfigValue The raw option setting of a rule
 */
function parseRuleOptions(ruleConfigValue: RawRuleConfig, rawDefaultRuleSeverity: string | undefined): Partial<IOptions> {
    let ruleArguments: any[] | undefined;
    let defaultRuleSeverity: RuleSeverity = "error";
    ruleConfigValue = ruleConfigValue!;

    if (rawDefaultRuleSeverity !== undefined) {
        switch (rawDefaultRuleSeverity.toLowerCase()) {
            case "warn":
            case "warning":
                defaultRuleSeverity = "warning";
                break;
            case "off":
            case "none":
                defaultRuleSeverity = "off";
                break;
            default:
                defaultRuleSeverity = "error";
        }
    }

    let ruleSeverity = defaultRuleSeverity;

    if (ruleConfigValue === undefined) {
        ruleArguments = [];
        ruleSeverity = "off";
    } else if (Array.isArray(ruleConfigValue)) {
        if (ruleConfigValue.length > 0) {
            // old style: array
            ruleArguments = ruleConfigValue.slice(1);
            ruleSeverity = ruleConfigValue[0] === true ? defaultRuleSeverity : "off";
        }
    } else if (typeof ruleConfigValue === "boolean") {
        // old style: boolean
        ruleArguments = [];
        ruleSeverity = ruleConfigValue ? defaultRuleSeverity : "off";
    } else if (typeof ruleConfigValue === "object") {
        if (ruleConfigValue.severity !== undefined) {
            switch (ruleConfigValue.severity.toLowerCase()) {
                case "default":
                    ruleSeverity = defaultRuleSeverity;
                    break;
                case "error":
                    ruleSeverity = "error";
                    break;
                case "warn":
                case "warning":
                    ruleSeverity = "warning";
                    break;
                case "off":
                case "none":
                    ruleSeverity = "off";
                    break;
                default:
                    console.warn(`Invalid severity level: ${ruleConfigValue.severity}`);
                    ruleSeverity = defaultRuleSeverity;
            }
        }
        if (ruleConfigValue.options !== undefined) {
            ruleArguments = arrayify(ruleConfigValue.options);
        }
    }

    return {
        ruleArguments,
        ruleSeverity,
    };
}

export interface RawConfigFile {
    extends?: string | string[];
    linterOptions?: IConfigurationFile["linterOptions"];
    rulesDirectory?: string | string[];
    defaultSeverity?: string;
    rules?: RawRulesConfig;
    jsRules?: RawRulesConfig;
}
export interface RawRulesConfig {
    [key: string]: RawRuleConfig;
}
export type RawRuleConfig = null | undefined | boolean | any[] | {
    severity?: RuleSeverity | "warn" | "none" | "default";
    options?: any;
};

/**
 * Parses a config file and normalizes legacy config settings.
 * If `configFileDir` and `readConfig` are provided, this function will load all base configs and reduce them to the final configuration.
 *
 * @param configFile The raw object read from the JSON of a config file
 * @param configFileDir The directory of the config file
 * @param readConfig Will be used to load all base configurations while parsing. The function is called with the resolved path.
 */
export function parseConfigFile(
    configFile: RawConfigFile,
    configFileDir?: string,
    readConfig?: (path: string) => RawConfigFile,
): IConfigurationFile {
    let defaultSeverity = configFile.defaultSeverity;
    if (readConfig === undefined || configFileDir === undefined) {
        return parse(configFile, configFileDir);
    }

    return loadExtendsRecursive(configFile, configFileDir)
        .map(({dir, config}) => parse(config, dir))
        .reduce(extendConfigurationFile, EMPTY_CONFIG);

    /** Read files in order, depth first, and assign `defaultSeverity` (last config in extends wins). */
    function loadExtendsRecursive(raw: RawConfigFile, dir: string) {
        const configs: Array<{dir: string; config: RawConfigFile}> = [];
        for (const relativePath of arrayify(raw.extends)) {
            // const resolvedPath = resolveConfigurationPath(relativePath, dir);
            // const extendedRaw = readConfig!(resolvedPath);
            // configs.push(...loadExtendsRecursive(extendedRaw, path.dirname(resolvedPath)));
        }
        if (raw.defaultSeverity !== undefined) {
            defaultSeverity = raw.defaultSeverity;
        }
        configs.push({dir, config: raw});
        return configs;
    }

    function parse(config: RawConfigFile, dir?: string): IConfigurationFile {
        return {
            extends: _arr(config.extends),
            jsRules: parseRules(config.jsRules),
            linterOptions: parseLinterOptions(config.linterOptions, dir),
            rules: parseRules(config.rules),
            rulesDirectory: [],
        };
    }

    function parseRules(config: RawRulesConfig | undefined): Map<string, Partial<IOptions>> {
        const map = new Map<string, Partial<IOptions>>();
        if (config !== undefined) {
            for (const ruleName in config) {
                if (hasOwnProperty(config, ruleName)) {
                    map.set(ruleName, parseRuleOptions(config[ruleName], defaultSeverity));
                }
            }
        }
        return map;
    }

    function parseLinterOptions(raw: RawConfigFile["linterOptions"], dir?: string): IConfigurationFile["linterOptions"] {
        if (raw === undefined || raw.exclude === undefined) {
            return {};
        }
        return {
            exclude: [],
        };
    }
}

/**
 * Fills in default values for `IOption` properties and outputs an array of `IOption`
 */
export function convertRuleOptions(ruleConfiguration: Map<string, Partial<IOptions>>): IOptions[] {
    const output: IOptions[] = [];
    ruleConfiguration.forEach(({ ruleArguments, ruleSeverity }, ruleName) => {
        const options: IOptions = {
            disabledIntervals: [], // deprecated, so just provide an empty array.
            ruleArguments: ruleArguments !== undefined ? ruleArguments : [],
            ruleName,
            ruleSeverity: ruleSeverity !== undefined ? ruleSeverity : "error",
        };
        output.push(options);
    });
    return output;
}
