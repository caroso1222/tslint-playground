import { Component } from '@angular/core';
import Linter, { FILE_NAME } from "../app/shared/Linter";
import * as JSON from "circular-json";
import { RuleFailure, LintResult } from "tslint";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';

  onKeyup(text) {
    console.log(text);

    localStorage.setItem("source", text);
    const _Linter = new Linter({ fix: false });
    _Linter.lint("TSLintPlayground.ts", localStorage.getItem("source"));
    const failures = this.getFailures(_Linter.getResult());
    console.log(failures);
  }

  getFailures(result: LintResult): string {
    return result.failures.length === 0
        ? "(No errors)"
        : JSON.stringify(result.failures[0].getFailure());
  }
}

//  https://github.com/palantir/tslint/issues/1001#issuecomment-353804158
