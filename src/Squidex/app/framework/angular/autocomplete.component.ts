/*
 * Squidex Headless CMS
 * 
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved
 */

import * as Ng2 from '@angular/core';
import * as Ng2Forms from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

export interface AutocompleteSource {
    find(query: string): Observable<AutocompleteItem[]>;
}

export class AutocompleteItem {
    constructor(
        public readonly title: string,
        public readonly description: string,
        public readonly image: string,
        public readonly model: any
    ) {
    }
}

const KEY_ENTER = 13;
const KEY_UP = 38;
const KEY_DOWN = 40;

/* tslint:disable:no-empty */

const NOOP = () => { };

export const SQX_AUTOCOMPLETE_CONTROL_VALUE_ACCESSOR: any = {
    provide: Ng2Forms.NG_VALUE_ACCESSOR,
    useExisting: Ng2.forwardRef(() => {
        return AutocompleteComponent;
    }),
    multi: true
};

@Ng2.Component({
    selector: 'sqx-autocomplete',
    styles,
    template,
    providers: [SQX_AUTOCOMPLETE_CONTROL_VALUE_ACCESSOR]
})
export class AutocompleteComponent implements Ng2Forms.ControlValueAccessor, Ng2.OnDestroy {
    private subscription: Subscription | null = null;
    private lastQuery: string | null;
    private changeCallback: (value: any) => void = NOOP;
    private touchedCallback: () => void = NOOP;

    @Ng2.Input()
    public source: AutocompleteSource;

    @Ng2.Input()
    public inputName: string;

    public items: AutocompleteItem[] = [];
    public itemSelection = -1;

    public queryInput = new Ng2Forms.FormControl();

    constructor() {
        this.queryInput.valueChanges.delay(100).subscribe(query => this.loadItems(query));
    }

    public writeValue(value: any) {
        if (!value) {
            this.queryInput.setValue('');
        } else {
            let item: AutocompleteItem | null = null;

            if (value instanceof AutocompleteItem) {
                item = value;
            } else {
                item = this.items.find(i => i.model === value);
            }

            if (item) {
                this.queryInput.setValue(value.title || '');
            }
        }

        this.reset();
    }

    public registerOnChange(fn: any) {
        this.changeCallback = fn;
    }

    public registerOnTouched(fn: any) {
        this.touchedCallback = fn;
    }

    public ngOnDestroy() {
        this.cancelRequest();
    }

    public setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.reset();
            this.queryInput.disable();
        } else {
            this.queryInput.enable();
        }
    }

    private cancelRequest() {
        if (this.subscription != null) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    private loadItems(query: string) {
        const source = this.source;

        this.cancelRequest();

        if (!source) {
            return;
        }

        let isInvalidQuery = this.lastQuery === query || !query || query.trim() === '';

        this.lastQuery = query;

        if (isInvalidQuery) {
            this.reset();
            return;
        }

        this.lastQuery = query;

        this.subscription = source.find(query)
            .catch(error => {
                return Observable.of([]);
            })
            .subscribe(result => {
                this.reset();
                this.items = result || [];
            });
    }

    public keyDown(event: KeyboardEvent) {
        switch (event.keyCode) {
            case KEY_UP:
                this.up();

                event.stopPropagation();
                event.preventDefault();
                break;
            case KEY_DOWN:
                this.down();

                event.stopPropagation();
                event.preventDefault();
                break;
            case KEY_ENTER:
                if (this.items.length > 0) {
                    this.chooseItem();

                    event.stopPropagation();
                    event.preventDefault();
                }
                break;
        }
    }

    private reset() {
        this.items = [];
        this.itemSelection = -1;
    }

    public blur() {
        this.reset();
    }

    public up() {
        this.selectIndex(this.itemSelection - 1);
    }

    public down() {
        this.selectIndex(this.itemSelection + 1);
    }

    public chooseItem(selection: AutocompleteItem = null) {
        if (!selection) {
            selection = this.items[this.itemSelection];
        }

        if (!selection && this.items.length === 1) {
            selection = this.items[0];
        }

        if (selection) {
            try {
                this.queryInput.setValue(selection.title);
                this.changeCallback(selection);
            } finally {
                this.reset();
            }
        }
    }

    public selectIndex(selection: number) {
        if (selection < 0) {
            selection = 0;
        }

        if (selection >= this.items.length) {
            selection = this.items.length - 1;
        }

        this.itemSelection = selection;
    }
}