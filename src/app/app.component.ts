import { Component, OnInit } from '@angular/core';
import { Linter, RuleFailure, LintResult, IRule } from "./shared/tslint";
import { parseConfigFile } from './shared/tslint/configuration';
import * as JSON from "circular-json";
import { stripComments } from 'tslint/lib/utils';
import { LintMarker } from '@app/shared/components/editor-view/editor-view.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'app';
  _rules = `{
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


  rules = `{
    "rules": {
      "class-name": true,
      "curly": true,
      "no-sparse-arrays": true,
      "forin": false,
      "no-console": [
        true,
        "error",
        "warn"
      ]
    }
  }
  `;

  failures: string[] = [];

  parsedRules: any;

  code =
`console.error('asdf');
console.warn('sdfg');
for (let key in someObject) {
  let b = someObject[key];
}
for (let key in someObject) {
  if (someObject.hasOwnProperty(key)) {
      let a = someObject[key];
  }
}`;

  initialCode = '';

  linter: Linter;

  lintMarkers: LintMarker[] = [];

  ngOnInit() {
    this.linter = new Linter({ fix: false });
    this.lint();

    this.initialCode =
`import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent implements OnInit {
  name = 'Angular 5';

  ngOnInit() {
    let a = 2;
    if (a < 10) {
      this.sendData(a);
      window.alert();
    }
  }
}
`;
  }

  onCodeUpdate(code: string) {
    this.code = code;
    this.lint();
  }

  buildMap(obj) {
    let map = new Map();
    Object.keys(obj).forEach(key => {
        map.set(key, obj[key]);
    });
    return map;
  }

  load() {
    import('./shared/tslint/coreRules').then(module => {
      module.rules.forEach(rule => {
        this.linter.registerRule(rule.Rule as any);
      });
      this.lint();
    });
  }

  lint() {
    const rules = parseConfigFile(JSON.parse(stripComments(this.rules)));
    this.linter.lint('_.ts', this.code, rules);
    const lintResult = this.linter.getResult();
    this.lintMarkers = this.linter.getResult().failures.map(f => ({
      start: f.getStartPosition().getPosition(),
      end: f.getEndPosition().getPosition(),
      message: JSON.stringify(f.getFailure())
    }));
    this.failures = this.getFailures(lintResult);
  }

  // onKeyup(text: any) {
  //   console.log(text);
  //   localStorage.setItem("source", text);
  //   const _Linter = new Linter({ fix: false });
  //   _Linter.lint("TSLintPlayground.ts", localStorage.getItem("source"));
  //   const failures = this.getFailures(_Linter.getResult());
  //   console.log(failures);
  // }

  getFailures(result: LintResult): string[] {
    return result.failures.length === 0
        ? ['(No errors)']
        : this.parseFailures(result.failures);
  }

  parseFailures(failures: RuleFailure[]): string[] {
    return failures.map(f => (
      '[' +
      f.getStartPosition().getPosition() + ', ' +
      f.getEndPosition().getPosition() + '] ' +
      JSON.stringify(f.getFailure())
    ));
  }
}

//  https://github.com/palantir/tslint/issues/1001#issuecomment-353804158
