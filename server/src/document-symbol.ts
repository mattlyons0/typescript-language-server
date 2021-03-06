/*
 * Copyright (C) 2017, 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as lsp from 'vscode-languageserver';
import * as tsp from 'typescript/lib/protocol';
import { asRange, toSymbolKind, Range, toPosition } from "./protocol-translation";
import { ScriptElementKind } from './tsp-command-types';

export function collectDocumentSymbols(parent: tsp.NavigationTree, symbols: lsp.DocumentSymbol[]): boolean {
    let shouldInclude = shouldInclueEntry(parent);

    for (const span of parent.spans) {
        const range = asRange(span);
        const children = [];
        if (parent.childItems) {
            for (const child of parent.childItems) {
                if (child.spans.some(span => !!Range.intersection(range, asRange(span)))) {
                    const includedChild = collectDocumentSymbols(child, children);
                    shouldInclude = shouldInclude || includedChild;
                }
            }
        }
        if (shouldInclude) {
            symbols.push({
                name: parent.text,
                detail: '',
                kind: toSymbolKind(parent.kind),
                range,
                selectionRange: range,
                children
            });
        }
    }

    return shouldInclude;
}

export function collectSymbolInformations(uri: string, current: tsp.NavigationTree, symbols: lsp.SymbolInformation[], containerName?: string): boolean {
    let shouldInclude = shouldInclueEntry(current);
    const name = current.text;
    for (const span of current.spans) {
        const range = asRange(span);
        const children = [];
        if (current.childItems) {
            for (const child of current.childItems) {
                if (child.spans.some(span => !!Range.intersection(range, asRange(span)))) {
                    const includedChild = collectSymbolInformations(uri, child, children, name);
                    shouldInclude = shouldInclude || includedChild;
                }
            }
        }
        if (shouldInclude) {
            symbols.push({
                name,
                kind: toSymbolKind(current.kind),
                location: {
                    uri,
                    range
                },
                containerName
            });
            symbols.push(...children);
        }
    }

    return shouldInclude;
}

export function shouldInclueEntry(item: tsp.NavigationTree | tsp.NavigationBarItem): boolean {
    if (item.kind === ScriptElementKind.alias) {
        return false;
    }
    return !!(item.text && item.text !== '<function>' && item.text !== '<class>');
}