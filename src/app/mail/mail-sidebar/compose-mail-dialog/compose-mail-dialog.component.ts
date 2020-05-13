import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Mail } from '../../../store/models';
import { ComposeMailComponent } from '../compose-mail/compose-mail.component';
import { KeyboardShortcutsComponent, ShortcutInput } from 'ng-keyboard-shortcuts';
import { getComposeMailDialogShortcuts } from '../../../store/services';
import { AppState, MailAction } from '../../../store/datatypes';
import { Store } from '@ngrx/store';
import { SetIsComposerPopUp } from '../../../store/actions';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-compose-mail-dialog',
  templateUrl: './compose-mail-dialog.component.html',
  styleUrls: ['./compose-mail-dialog.component.scss', './../mail-sidebar.component.scss']
})
export class ComposeMailDialogComponent implements OnInit, AfterViewInit {
  @Input() public isComposeVisible: boolean;
  @Input() public receivers: string[];
  @Input() public draft: Mail;
  @Input() action: MailAction;
  @Input() parentId: number;
  @Input() content: string;
  @Input() messageHistory: string;

  @Input() public isFullScreen: boolean;

  @Output() public hide = new EventEmitter<boolean>();
  @Output() public minimize = new EventEmitter<boolean>();
  @Output() public fullScreen = new EventEmitter<boolean>();
  @Output() public closeComposer = new EventEmitter<boolean>();

  @ViewChild(ComposeMailComponent) composeMail: ComposeMailComponent;
  shortcuts: ShortcutInput[] = [];
  @ViewChild('input') input: ElementRef;
  @ViewChild(KeyboardShortcutsComponent) private keyboard: KeyboardShortcutsComponent;


  isMinimized: boolean;
  private confirmModalRef: NgbModalRef;
  mailSubject = '';
  isPopupClosed: boolean;

  constructor(private modalService: NgbModal,
              private cdr: ChangeDetectorRef,
              private store: Store<AppState>) {
  }

  ngOnInit(): void {
    if (this.draft) {
      this.mailSubject = this.draft.subject;
    }
    this.store.select(state => state).pipe(untilDestroyed(this))
      .subscribe((appState: AppState) => {
        this.isPopupClosed = appState.mail.isComposerPopUp;
        if (this.isPopupClosed !== undefined && !this.isPopupClosed && this.action === MailAction.REPLY) {
          this.saveInDrafts();
        }
      });
  }

  ngAfterViewInit(): void {
    this.shortcuts = getComposeMailDialogShortcuts(this);

    if (this.mailSubject && this.action) {
      if (this.action === MailAction.REPLY) {
        this.mailSubject = 'Reply: ' + this.mailSubject;
      }
    }
    this.cdr.detectChanges();

  }

  onClose() {
    if (this.action === MailAction.REPLY) {
      setTimeout(res => {
        this.store.dispatch(new SetIsComposerPopUp(
          false
        ));
      }, 2000);
    }
    if (this.composeMail.hasData()) {
      this.saveInDrafts();
    } else if (this.composeMail.draftMail) {
      this.discardEmail();
    }
  }

  subjectChanged($event) {
    this.mailSubject = $event;
  }

  saveInDrafts() {
    this.composeMail.saveInDrafts();
  }

  discardEmail() {
    this.composeMail.discardEmail();
  }

  onHide() {
    this.hideMailComposeDialog();
  }

  toggleMinimized() {
    this.isMinimized = !this.isMinimized;
    this.minimize.emit(this.isMinimized);
    if (this.isFullScreen) {
      this.isFullScreen = false;
    }
  }

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    this.fullScreen.emit(this.isFullScreen);
    if (this.isMinimized) {
      this.isMinimized = false;
    }
  }

  private hideMailComposeDialog() {
    if (this.confirmModalRef) {
      this.confirmModalRef.dismiss();
    }
    this.hide.emit(true);
  }

}
