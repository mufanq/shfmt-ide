import * as vscode from 'vscode';
import { print, LangVariant, type ShPrintOptions } from 'sh-syntax';
import { getEdits } from '../src/diffUtils';

import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  DiagnosticCollection,
  TextDocument,
  Position,
  FormattingOptions,
  TextEdit,
} from 'vscode';
import * as editorconfig from 'editorconfig';

export const configurationPrefix = 'shfmtIde';

export enum ConfigItemName {
  Flag = 'flag',
  EffectLanguages = 'effectLanguages',
  UseEditorConfig = 'useEditorConfig',
}

interface ParsedFlags {
  indent?: number;
  binaryNextLine?: boolean;
  switchCaseIndent?: boolean;
  spaceRedirects?: boolean;
  keepPadding?: boolean;
  functionNextLine?: boolean;
  minify?: boolean;
  variant?: LangVariant;
}

// Map a "flag string" as accepted by shfmt (e.g. "-p -bn -ci -i 2") to sh-syntax options.
function parseShfmtFlags(flag: string): ParsedFlags {
  const out: ParsedFlags = {};
  if (!flag) return out;
  const tokens = flag.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // Support both "-i=2" and "-i 2".
    const [key, inlineVal] = t.split('=');
    const next = () => inlineVal ?? tokens[++i];
    switch (key) {
      case '-p':
        out.variant = LangVariant.LangPOSIX;
        break;
      case '-ln': {
        const v = next();
        out.variant = mapLangName(v);
        break;
      }
      case '-i': {
        const n = Number.parseInt(next(), 10);
        if (!Number.isNaN(n)) out.indent = n;
        break;
      }
      case '-bn':
        out.binaryNextLine = true;
        break;
      case '-ci':
        out.switchCaseIndent = true;
        break;
      case '-sr':
        out.spaceRedirects = true;
        break;
      case '-kp':
        out.keepPadding = true;
        break;
      case '-fn':
        out.functionNextLine = true;
        break;
      case '-mn':
        out.minify = true;
        break;
    }
  }
  return out;
}

function mapLangName(name: string): LangVariant | undefined {
  switch (name) {
    case 'bash':
      return LangVariant.LangBash;
    case 'posix':
    case 'sh':
      return LangVariant.LangPOSIX;
    case 'mksh':
      return LangVariant.LangMirBSDKorn;
    case 'bats':
      return LangVariant.LangBats;
    default:
      return undefined;
  }
}

export class Formatter {
  diagnosticCollection: DiagnosticCollection;

  constructor(
    public context: vscode.ExtensionContext,
    public output: vscode.OutputChannel
  ) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('shfmt-ide');
  }

  public formatDocument(document: TextDocument, options?: FormattingOptions): Thenable<TextEdit[]> {
    const start = new Position(0, 0);
    const end = new vscode.Position(
      document.lineCount - 1,
      document.lineAt(document.lineCount - 1).text.length
    );
    const range = new vscode.Range(start, end);
    const content = document.getText(range);
    return this.formatDocumentWithContent(content, document, range, options);
  }

  public async formatDocumentWithContent(
    content: string,
    document: TextDocument,
    range: Range,
    options?: vscode.FormattingOptions
  ): Promise<vscode.TextEdit[]> {
    const settings = vscode.workspace.getConfiguration(configurationPrefix);
    const flag: string = getSettings('flag') || '';

    let printOpts: ShPrintOptions = {
      originalText: content,
      filepath: document.fileName,
    };

    if (/\.bats$/.test(document.fileName)) {
      printOpts.variant = LangVariant.LangBats;
    }

    if (settings.get<boolean>(ConfigItemName.UseEditorConfig)) {
      const edcfgOptions = editorconfig.parseSync(document.fileName);
      this.output.appendLine(
        `EditorConfig for "${document.fileName}": ${JSON.stringify(edcfgOptions)}`
      );

      if (edcfgOptions.indent_style === 'tab') {
        printOpts.indent = 0;
      } else if (edcfgOptions.indent_style === 'space') {
        if (typeof edcfgOptions.indent_size === 'number') {
          printOpts.indent = edcfgOptions.indent_size;
        }
      }
      const variant = edcfgOptions['shell_variant'];
      if (typeof variant === 'string') {
        const v = mapLangName(variant);
        if (v !== undefined) printOpts.variant = v;
      }
      if (edcfgOptions['binary_next_line']) printOpts.binaryNextLine = true;
      if (edcfgOptions['switch_case_indent']) printOpts.switchCaseIndent = true;
      if (edcfgOptions['space_redirects']) printOpts.spaceRedirects = true;
      if (edcfgOptions['keep_padding']) printOpts.keepPadding = true;
      if (edcfgOptions['function_next_line']) printOpts.functionNextLine = true;

      if (flag) {
        this.output.appendLine('shfmt flags ignored because EditorConfig mode is enabled.');
      }
    } else if (flag) {
      if (flag.includes('-w')) {
        const errMsg = 'Incompatible flag specified in shellformat.flag: -w';
        vscode.window.showWarningMessage(errMsg);
        throw new Error(errMsg);
      }
      const parsed = parseShfmtFlags(flag);
      printOpts = { ...printOpts, ...parsed };
    }

    if (printOpts.indent === undefined && options?.insertSpaces) {
      printOpts.indent = options.tabSize;
    }

    this.output.appendLine(`Effective sh-syntax options: ${JSON.stringify(printOpts)}`);

    let result: string;
    try {
      result = await print(content, printOpts);
    } catch (e: any) {
      const errMsg = typeof e?.message === 'string' ? e.message : String(e);
      const errLoc = /^(\d+):(\d+):/.exec(errMsg);
      if (errLoc) {
        const line = Math.max(0, parseInt(errLoc[1], 10) - 1);
        const column = Math.max(0, parseInt(errLoc[2], 10) - 1);
        const diag: Diagnostic = {
          range: new vscode.Range(new Position(line, column), new Position(line, column)),
          message: errMsg,
          severity: DiagnosticSeverity.Error,
        };
        this.diagnosticCollection.delete(document.uri);
        this.diagnosticCollection.set(document.uri, [diag]);
      }
      throw new Error(errMsg);
    }

    this.diagnosticCollection.delete(document.uri);

    if (result === content) {
      return [];
    }
    const textEdits: TextEdit[] = [];
    const filePatch = getEdits(document.fileName, content, result);
    filePatch.edits.forEach((edit) => {
      textEdits.push(edit.apply());
    });
    return textEdits;
  }
}

export class ShellDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
  private settings: vscode.WorkspaceConfiguration;

  constructor(
    public formatter: Formatter,
    settings?: vscode.WorkspaceConfiguration
  ) {
    if (settings === undefined) {
      this.settings = vscode.workspace.getConfiguration(configurationPrefix);
    } else {
      this.settings = settings;
    }
  }

  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): Thenable<vscode.TextEdit[]> {
    return this.formatter.formatDocument(document, options);
  }
}

export function getSettings(key: string) {
  const settings = vscode.workspace.getConfiguration(configurationPrefix);
  return key !== undefined ? (settings as any)[key] : null;
}
