# Change Log

## 0.1.1 — 2026-04-22

- Sharper, super-sampled logo with precisely aligned traffic-light dots.

## 0.1.0 — 2026-04-22

First release of **shfmt for IDE** as its own extension.

- Ships `shfmt` (mvdan/sh) compiled to WebAssembly via [sh-syntax](https://github.com/un-ts/sh-syntax); no external binary is fetched or spawned.
- Registered as a document formatter for `shellscript` and `bats`.
- Settings: `shfmtIde.flag`, `shfmtIde.effectLanguages`, `shfmtIde.useEditorConfig`.
- Maps shfmt-style flags (`-p`, `-ln=<variant>`, `-i`, `-bn`, `-ci`, `-sr`, `-kp`, `-fn`, `-mn`) to sh-syntax printer options.
- Optional `.editorconfig` integration (`indent_style`, `indent_size`, `shell_variant`, `binary_next_line`, `switch_case_indent`, `space_redirects`, `keep_padding`, `function_next_line`).
