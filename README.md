# shfmt WASM Formatter

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/MufanQiu.shell-format-wasm?style=flat-square&label=marketplace)](https://marketplace.visualstudio.com/items?itemName=MufanQiu.shell-format-wasm)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/MufanQiu.shell-format-wasm?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=MufanQiu.shell-format-wasm)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)

A VSCode formatter that runs [mvdan/sh]'s `shfmt` directly as WebAssembly (via [sh-syntax]) — no binary download, no platform-specific shfmt release fetched at activation time.

> **Background.** The older [foxundermoon.shell-format][upstream] extension downloads a platform-specific `shfmt` binary on first run, which is brittle on ARM64 Windows, dev-containers, and restricted networks. Its 7.2.8 release also ships broken ([issue #396][bug]). This extension takes a different approach: bundle the same formatter as a single cross-platform WASM blob, so it just works the first time.

## Install

From VSCode: search **Shell Format (WASM)** in the Extensions view, or:

```
code --install-extension MufanQiu.shell-format-wasm
```

## Supported file types

| language    | extension                | description           |
| ----------- | ------------------------ | --------------------- |
| shellscript | `.sh` `.bash`            | shell scripts         |
| dockerfile  | `Dockerfile`             | Dockerfiles           |
| ignore      | `.gitignore` `.dockerignore` | ignore files      |
| properties  | `.properties`            | Java properties files |
| jvmoptions  | `.vmoptions` `jvm.options` | JVM options         |
| hosts       | `/etc/hosts`             | hosts file            |
| bats        | `.bats`                  | Bats test files       |

## Usage

- <kbd>shift</kbd>+<kbd>option</kbd>+<kbd>f</kbd> (macOS) / <kbd>shift</kbd>+<kbd>alt</kbd>+<kbd>f</kbd> (Win/Linux), or
- <kbd>shift</kbd>+<kbd>cmd</kbd>+<kbd>p</kbd> → **Format Document**

If VSCode asks which formatter to use, pick **Shell Format (WASM)** and click _Configure Default_.

## Configuration

| setting                       | type    | default                                    | description |
| ----------------------------- | ------- | ------------------------------------------ | ----------- |
| `shellformat.flag`            | string  | `null`                                     | Formatter flags, shfmt-compatible. E.g. `-p -bn -ci -i 2`. See [shfmt flags][shfmt-flags]. |
| `shellformat.effectLanguages` | array   | all supported                              | Which languages this extension should format. |
| `shellformat.useEditorConfig` | boolean | `false`                                    | Read formatting options from `.editorconfig`. |

Supported flags (mapped to [sh-syntax] printer options):

| flag | effect |
| ---- | ------ |
| `-p` | POSIX mode |
| `-ln=<variant>` | Language variant: `bash`, `posix`/`sh`, `mksh`, `bats` |
| `-i=<n>` | Indent width (`0` = tabs) |
| `-bn` | Binary operators on next line |
| `-ci` | Indent switch cases |
| `-sr` | Space after redirects |
| `-kp` | Keep column-aligned padding |
| `-fn` | Function `{` on next line |
| `-mn` | Minify |

## Differences vs. upstream

| | foxundermoon.shell-format | MufanQiu.shell-format-wasm |
| --- | --- | --- |
| `shfmt` binary | downloads from GitHub releases on activation | **not needed**, WASM in-process |
| Works on first install | broken in 7.2.8 due to missing `one_ini_bg.wasm` | ✓ |
| Windows ARM64 | no binary released upstream | ✓ |
| `shellformat.path` | points at external `shfmt` binary | removed (no longer relevant) |
| Flags / EditorConfig | ✓ | ✓ |

## Credits

- [mvdan/sh][mvdan/sh] — the shell parser and formatter, MIT.
- [sh-syntax] — WASM bindings of the above, MIT.
- [foxundermoon/vs-shell-format][upstream] — original VSCode extension this fork is based on, MIT.

## License

MIT. See [LICENSE](./LICENSE).

[mvdan/sh]: https://github.com/mvdan/sh
[sh-syntax]: https://github.com/un-ts/sh-syntax
[upstream]: https://github.com/foxundermoon/vs-shell-format
[bug]: https://github.com/foxundermoon/vs-shell-format/issues/396
[shfmt-flags]: https://github.com/mvdan/sh/blob/master/cmd/shfmt/shfmt.1.scd
