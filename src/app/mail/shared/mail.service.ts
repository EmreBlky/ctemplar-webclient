// Angular
import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Helpers
import { apiHeaders, apiUrl } from '../../shared/config';

// Models
import { Message } from './mail';

// Rxjs
import { Observable } from 'rxjs/Observable';
import { map, tap } from 'rxjs/operators';

// Services
import { SharedService } from '../../shared/shared.service';

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////


@Injectable()
export class MailService {
  reload: EventEmitter<boolean> = new EventEmitter();
  composing: EventEmitter<any> = new EventEmitter();
  messages: Message[];
  message: Message;
  inbox: Message[];
  sent: Message[];
  archive: Message[];
  draft: Message[];
  spam: Message[];
  starred: Message[];
  trash: Message[];

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
  ) {}
  deleteMessage(id: string): Observable<Message> {
    const url = `${apiUrl}mails/messages/?id__in=${id}`;
    return this.http.delete<Message>(url, apiHeaders());
  }

  postMessage(body): Observable<Message> {
    const url = `${apiUrl}mails/messages/`;
    return this.http.post<Message>(url, body, apiHeaders())
    .pipe(
      tap(_ => this.fetch()),
    );
  }

  getMessages(limit: number = 1000, offset: number = 0): Observable<Message[]> {
    const url = `${apiUrl}mails/messages/?limit=${limit}&offset=${offset}`;
    return this.http.get<Message[]>(url, apiHeaders())
      .pipe(
        map(data => data['results']),
        tap(data => {
          this.messages = data;
        }));
  }

  patchMessage(id: any, body: object): Observable<Message> {
    const url = `${apiUrl}mails/messages/?id__in=${id}`;
    return this.http.patch<Message>(url, body, apiHeaders());
  }

  cache() {
    this.getMessages().subscribe(_ => this.sharedService.isMailReady.emit(true));
  }

  clear() {
    this.message = undefined;
    this.messages = [];
    this.refresh();
  }

  detail(id: number) {
    this.refresh();
    this.message = this.messages.find(item => item.id === id);
    if (!this.message.read) {
      this.patchMessage(this.message.id, {'read': true}).subscribe(_ => this.message.read = true);
    }
    return this.message;
  }

  fetch() {
    this.getMessages()
      .subscribe(_ => {
        this.reload.emit(true);
      });
  }

  folder(folder: string) {
    if (folder === 'inbox') {
      return this.inbox;
    }
    if (folder === 'sent') {
      return this.sent;
    }
    if (folder === 'archive') {
      return this.archive;
    }
    if (folder === 'draft') {
      return this.draft;
    }
    if (folder === 'spam') {
      return this.spam;
    }
    if (folder === 'starred') {
      return this.starred;
    }
    if (folder === 'trash') {
      return this.trash;
    }
  }

  list(folder: string, page: number = 1, limit: number = 1000) {
    this.refresh();
    const end = (page === NaN) ? limit : limit * page;
    const start = end - limit;
    return this.folder(folder).slice(start, end);
  }

  move(messages: Message[], folder: string) {
    let in_folder: string;
    let deletes: string;
    const ids = messages.map((message) => message.id);
    deletes = ids.join(',');
    if (ids.length > 0) {
      in_folder = messages[0].folder;
      if (['trash', 'spam', 'draft', 'sent'].includes(in_folder) && folder === 'trash') {
        this.deleteMessage(deletes)
          .subscribe( () => {
            this.fetch();
          });
      } else {
        this.patchMessage(deletes, {'folder': folder})
          .subscribe(() => {
            this.fetch();
          });
      }
    } else {
      console.log('Message Selection Error');
    }
  }

  refresh() {
    this.inbox = this.messages.filter(item => item.folder === 'inbox');
    this.sent = this.messages.filter(item => item.folder === 'sent');
    this.archive = this.messages.filter(item => item.folder === 'archive');
    this.draft = this.messages.filter(item => item.folder === 'draft');
    this.spam = this.messages.filter(item => item.folder === 'spam');
    this.starred = this.messages.filter(item => item.starred === true);
    this.trash = this.messages.filter(item => item.folder === 'trash');
  }

  star(message: Message) {
    this.patchMessage(message.id, {'starred': !message.starred})
      .subscribe(data => {
        message.starred = !message.starred;
        this.reload.emit(true);
      });
  }
}
