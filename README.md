# Espresso and cEspresso

Espresso and cEspresso are small, Python-inspired programming languages with
indentation-based blocks. This VS Code extension provides syntax highlighting,
snippets, language help, and an embedded runner for `.esp` and `.cesp` files.

Espresso uses dynamically typed variables. cEspresso adds explicit types and
typed collections. Both languages share familiar constructs such as functions,
conditions, loops, string interpolation, and pipe expressions.

## Features

- Syntax highlighting for Espresso and cEspresso
- Snippets for common statements and constructs
- Ctrl+click (Cmd+click on macOS) help links for supported language terms
- Run the active file from the editor's play button or the Command Palette
- Stop a running program from the editor or Command Palette
- Runtime errors reported with a type, message, explanation, and tip

## Install

Install the included VS Code extension package from the command line:

```sh
code --install-extension espresso-cespresso-0.0.1.vsix
```

Or in VS Code, open the Extensions view, select **...**, then **Install from
VSIX...** and choose `espresso-cespresso-0.0.1.vsix`.

## Run a program

1. Open a `.esp` or `.cesp` file.
2. Select the play button in the editor title, or open the Command Palette and
   run **Espresso: Run Espresso File**.
3. Read program output in the **Espresso** output panel.
4. To stop the program, select the stop button or run
   **Espresso: Stop Espresso File**.

The runner executes one program at a time. Input prompts appear in a VS Code
input box.

## Espresso example

```espresso
var name = (string) input("What is your name? ")

fn greet(person, greeting = "Hello"):
    return $"{greeting}, {person}!"

print(greet(name))

for i in range(1, 4):
    print(i)
```

Espresso uses `var` for dynamically typed variables and also supports `ver`.
The examples use casts such as `(int) value`, `true`, `false`, and `nil`.
Logical operators can be written as `and`, `or`, and `not`.

## cEspresso example

```cespresso
string name = io.prompt("What is your name? ")

fn greet(string person, string greeting = "Hello"):
    return $"{greeting}, {person}!"

print(greet(name))

for (int i = 1, i < 4, i++):
    print(i)
```

cEspresso uses explicit types such as `string`, `int`, `double`, `char`, and
`bool`. A `?` after a typed variable name marks it as optional. Its logical
operators support both words and symbols.

## Shared syntax

Both languages support:

- `if` / `elseif` / `else` conditionals
- `while` loops and `fn` function declarations
- `return`, `break`, `continue`, and `pass`
- Interpolated backtick strings and `$"..."` strings using `{expression}`
- Arithmetic, comparisons, assignment shortcuts, and the `|>` pipe operator
- Line comments beginning with `#` and block comments wrapped in `#/` and `/#`
- Array/list, tuple, and set literals

Espresso iterates over `range(start, end)`. cEspresso also supports counted
loops with an initializer, condition, and increment. cEspresso collection
declarations use type prefixes such as `list2D: int numbers = [1, 2, 3]`.

## Errors

When a program fails, the **Espresso** output panel shows a formatted report
with the error type and message, what went wrong, and a tip for what to check.
The report is guidance from the embedded runner; it does not replace a
language server or provide inline editor diagnostics.

## Project layout

- `Espresso/` — Espresso example program
- `cEspresso/` — cEspresso example program
- `docs/help.md` — language help topics opened from the editor
- `runtime.js` — embedded program runner
- `syntaxes/` — syntax-highlighting grammars
- `snippets/` — editor snippets

## Current scope

The extension implements the syntax and built-ins supported by its embedded
runner. It is an early language implementation; some methods and constructs
shown in examples may not yet be implemented by the runtime. There is no
separate compiler, package manager, or language server included.
