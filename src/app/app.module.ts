import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { EditorViewComponent } from './shared/components/editor-view/editor-view.component';
import { CommonModule } from '@angular/common';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { FormsModule } from '@angular/forms';
import { JsonEditorComponent } from './shared/components/json-editor/json-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    EditorViewComponent,
    JsonEditorComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    MonacoEditorModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
