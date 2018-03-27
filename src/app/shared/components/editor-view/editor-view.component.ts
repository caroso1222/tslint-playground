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

  /**
   * Stream of code updation events
   */
  private codeUpdate$: Subject<string> = new Subject();

  ngOnInit() {
    this.code = this.initialCode;
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
  }

  /**
   * Method called from Monaco when there's a code update
   * @param code - new code
   */
  onCodeUpdate(code: string) {
    // console.log('sdf');
    // this.codeUpdate$.next(code);
    this.codeUpdate.next(code);
  }

}
