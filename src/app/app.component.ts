import { Component, OnInit } from '@angular/core';
import { Linter } from "./shared/tslint/Linter";
import * as JSON from "circular-json";
import { RuleFailure, LintResult } from "tslint";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';
  rules = `{
    "rules": {
      "arrow-return-shorthand": true,
      "callable-types": true,
      "class-name": true,
      "comment-format": [
        true,
        "check-space"
      ],
      "curly": true,
      "deprecation": {
        "severity": "warn"
      },
      "eofline": true,
      "forin": true,
      "import-blacklist": [
        true,
        "rxjs",
        "rxjs/Rx"
      ],
      "import-spacing": true,
      "indent": [
        true,
        "spaces"
      ],
      "interface-over-type-literal": true,
      "label-position": true,
      "max-line-length": [
        true,
        140
      ],
      "member-access": false,
      "member-ordering": [
        true,
        {
          "order": [
            "static-field",
            "instance-field",
            "static-method",
            "instance-method"
          ]
        }
      ],
      "no-arg": true,
      "no-bitwise": true,
      "no-console": [
        true,
        "debug",
        "info",
        "time",
        "timeEnd",
        "trace"
      ],
      "no-construct": true,
      "no-debugger": true,
      "no-duplicate-super": true,
      "no-empty": false,
      "no-empty-interface": true,
      "no-eval": true,
      "no-inferrable-types": [
        true,
        "ignore-params"
      ],
      "no-misused-new": true,
      "no-non-null-assertion": false,
      "no-shadowed-variable": false,
      "no-string-literal": false,
      "no-string-throw": true,
      "no-switch-case-fall-through": true,
      "no-trailing-whitespace": true,
      "no-unnecessary-initializer": true,
      "no-unused-expression": true,
      "no-use-before-declare": true,
      "no-var-keyword": true,
      "object-literal-sort-keys": false,
      "one-line": [
        true,
        "check-open-brace",
        "check-catch",
        "check-else",
        "check-whitespace"
      ],
      "no-console": [
        true,
        "error"
      ],
      "prefer-const": false,
      "quotemark": false,
      "radix": true,
      "semicolon": [
        true,
        "always"
      ],
      "triple-equals": [
        true,
        "allow-null-check"
      ],
      "typedef-whitespace": [
        true,
        {
          "call-signature": "nospace",
          "index-signature": "nospace",
          "parameter": "nospace",
          "property-declaration": "nospace",
          "variable-declaration": "nospace"
        }
      ],
      "unified-signatures": true,
      "variable-name": false,
      "whitespace": [
        true,
        "check-branch",
        "check-decl",
        "check-operator",
        "check-separator",
        "check-type"
      ],
      "directive-selector": [
        true,
        "attribute",
        "app",
        "camelCase"
      ],
      "component-selector": [
        true,
        "element",
        "app",
        "kebab-case"
      ],
      "no-output-on-prefix": true,
      "use-input-property-decorator": true,
      "use-output-property-decorator": true,
      "use-host-property-decorator": true,
      "no-input-rename": true,
      "no-output-rename": true,
      "use-life-cycle-interface": true,
      "use-pipe-transform-interface": true,
      "component-class-suffix": true,
      "directive-class-suffix": true,
      "no-any": {
        "severity": "warning"
      }
    }
  }
  `;

  code = `console.error('asdf');`;

  ngOnInit() {
    const linter = new Linter({ fix: false });

  }

  // onKeyup(text: any) {
  //   console.log(text);
  //   localStorage.setItem("source", text);
  //   const _Linter = new Linter({ fix: false });
  //   _Linter.lint("TSLintPlayground.ts", localStorage.getItem("source"));
  //   const failures = this.getFailures(_Linter.getResult());
  //   console.log(failures);
  // }

  // getFailures(result: LintResult): string {
  //   return result.failures.length === 0
  //       ? "(No errors)"
  //       : JSON.stringify(result.failures[0].getFailure());
  // }
}

//  https://github.com/palantir/tslint/issues/1001#issuecomment-353804158
