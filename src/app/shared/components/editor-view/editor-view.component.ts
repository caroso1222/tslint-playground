import { Subject } from 'rxjs/Subject';
import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  Input
} from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-editor-view',
  templateUrl: './editor-view.component.html',
  styleUrls: ['./editor-view.component.scss']
})
export class EditorViewComponent implements OnInit {

  /**
   * Options for the Monaco editor
   */
  editorOptions = {
    theme: 'vs-dark',
    language: 'typescript',
    minimap: { enabled: false }
  };



  /**
   * Reference to the Monaco editor instance
   */
  editor;

  /**
   * A list of code decorations applied to Monaco. Mainly used to
   * highlight code.
   */
  decorations = [];

  /**
   * Source code rendered inside Monaco
   */
  code: string;

  /**
   * Event emitted when there's a code update inside the Monaco editor
   */
  @Output()
  codeUpdate: EventEmitter<string> = new EventEmitter();

  /**
   * Code to render in component init
   */
  @Input()
  initialCode: string;

  @Input()
  markers: LintMarker[] = [];

  model;

  monaco = (window as any).monaco;

  /**
   * Stream of code updation events
   */
  private codeUpdate$: Subject<string> = new Subject();

  ngOnInit() {
    this.code = this.initialCode;
    this.model = {
      value: this.initialCode,
      language: 'typescript',
      uri: 'foo.ts'
    };
    this.codeUpdate$
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(code => {
        this.codeUpdate.next(code);
      });
  }

  /**
   * Callback fired when Monaco is initialized
   * @param editor - editor instance
   */
  onEditorInit(editor: any) {
    this.editor = editor;

    // Disabled semantic and syntax validations in Monaco
    (window as any).monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true
    });
    setTimeout(() => {
      this.renderMarkers();
    }, 2000);
  }

  /**
   * Method called from Monaco when there's a code update
   * @param code - new code
   */
  onCodeUpdate(code: string) {
    // this.codeUpdate$.next(code);
    this.codeUpdate.next(code);
  }

  renderMarkers() {
    (window as any).monaco.editor.setModelMarkers(this.editor.getModel('foo.ts'), '$model1', [{
      severity: (window as any).monaco.Severity.Error,
      startLineNumber: 1,
      startColumn: 0,
      endLineNumber: 1,
      endColumn: 10,
      message: `Calls to 'console.error' are not allowed.`
    }, {
      severity: (window as any).monaco.Severity.Error,
      startLineNumber: 2,
      startColumn: 3,
      endLineNumber: 2,
      endColumn: 15,
      message: 'msg'
    }]);
  }

}

export interface LintMarker {
  start: number;
  end: number;
  message: string;
}
