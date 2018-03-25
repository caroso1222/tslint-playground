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

import { FormatterConstructor } from "./index";
import { camelize } from "./utils";
import { Formatter as ProseFormatter } from './formatters/proseFormatter';

export function findFormatter(name: string | FormatterConstructor, formattersDirectory?: string): FormatterConstructor | undefined {
    if (typeof name === "function") {
        return name;
    } else if (typeof name === "string") {
        name = name.trim();
        const camelizedName = camelize(`${name}Formatter`);

        // first check for core formatters
        let Formatter = ProseFormatter;
        if (Formatter !== undefined) {
            return Formatter;
        }

        // then check for rules within the first level of rulesDirectory
        if (formattersDirectory !== undefined) {
            Formatter = ProseFormatter;
            if (Formatter !== undefined) {
                return Formatter;
            }
        }

        // else try to resolve as module
        return undefined;
    } else {
        // If an something else is passed as a name (e.g. object)
        throw new Error(`Name of type ${typeof name} is not supported.`);
    }
}


