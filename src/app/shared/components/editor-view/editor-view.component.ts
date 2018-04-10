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
   * A cache used to store the number of characters per line of code.
   * It has the following form:
   * A = [1, 4, 6, 24, 1, 16], where A[i] represents the number of characters
   * in line i.
   */
  cachedLinesLength = [];

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
  set markers(markers: LintMarker[]) {
    this._markers = markers;
    this.renderMarkers(markers);
  }
  get markers(): LintMarker[]  {
    return this._markers;
  }
  private _markers: LintMarker[] = [];

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
      // this.renderMarkers();
    }, 2000);
  }

  /**
   * Method called from Monaco when there's a code update
   * @param code - new code
   */
  onCodeUpdate(code: string) {
    // this.codeUpdate$.next(code);
    this.cacheLines(code);
    this.codeUpdate.next(code);
  }

  renderMarkers(markers: LintMarker[]) {
    const monacoMarkers = markers.map(marker => {
      const [initRow, initCol] = this.getLineCol(marker.start);
      const [endRow, endCol] = this.getLineCol(marker.end);
      return {
        severity: (window as any).monaco.Severity.Error,
        startLineNumber: initRow,
        startColumn: initCol,
        endLineNumber: endRow,
        endColumn: endCol,
        message: marker.message
      };
    });
    const monaco = (window as any).monaco;
    if (monaco) {
      monaco.editor
        .setModelMarkers(this.editor.getModel('foo.ts'), '$model1', monacoMarkers);
    }
  }

  /**
   * Returns the (row, col) tuple "coordinate" of a given absolute code
   * position. The absolute position is often obtained from the particular
   * AST node that should be visualized in the code.
   * @param pos - the absolute position within the code snippet
   */
  getLineCol(pos: number): [number, number] {
    for (let i = 0; i < this.cachedLinesLength.length; i++) {
      if (this.cachedLinesLength[i] > pos) {
        return [i + 1, pos + 1];
      }
      pos -= this.cachedLinesLength[i];
    }
    return [0, 0];
  }

  /**
   * Updates the lines length cache.
   * @param code - Monaco code
   */
  cacheLines(code: string) {
    this.cachedLinesLength = code.split('\n').map(l => l.length + 1);
  }

}

export interface LintMarker {
  start: number;
  end: number;
  message: string;
}
