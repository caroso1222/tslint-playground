import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { EditorViewComponent } from './shared/components/editor-view/editor-view.component';


@NgModule({
  declarations: [
    AppComponent,
    EditorViewComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
