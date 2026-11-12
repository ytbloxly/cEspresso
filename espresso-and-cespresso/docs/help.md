# Espresso and cEspresso Help

This reference describes the syntax shown in the extension's example programs.
Use Ctrl+click (Cmd+click on macOS) on a supported keyword or built-in name to
jump to its topic. Use the play button in the editor title or run
**Espresso: Run Espresso File** from the Command Palette to execute the active
file. Output appears in the **Espresso** output panel; use the stop button or
**Espresso: Stop Espresso File** to stop a running program.

## Variables and types

Espresso uses `var` for dynamically typed variables and also supports `ver`.
The examples describe `ver` as having a temporal dead zone. cEspresso uses
explicit types (`string`, `int`, `double`, `char`, `bool`) and supports optional
values with `?`. Both examples use `true`, `false`, and `nil`.

## Expressions and operators

Both languages show arithmetic, comparisons, assignment shortcuts, and the pipe
operator `|>`. Espresso uses the words `and`, `or`, and `not`; cEspresso also
supports the symbolic forms `&&`, `||`, and `!`.

## Conditions

`if` starts a condition, `elseif` adds another condition, and `else` handles the
remaining case. A colon starts the indented body.

## Loops

`for` repeats work. Espresso's example iterates over `range(start, end)`;
cEspresso's example uses an initializer, condition, and increment in a counted
loop. `while` repeats while its condition is true.

## Functions and flow control

`fn` declares a function and `return` provides its result. Function parameters
can have default values. `break`, `continue`, and `pass` are shown as control
statements in the examples.

## Output, input, and waiting

`print(value)` writes output. Espresso uses `input(prompt)` for input, while
cEspresso uses `io.prompt(prompt)`. `wait(seconds)` appears in the examples to
pause execution.

## Strings and interpolation

Single-quoted and double-quoted strings are shown, along with backtick strings
and `$"..."` interpolated strings. Use `{expression}` to insert a value.

## Collections

Square brackets create arrays/lists, parentheses create tuples, and braces
create sets in the examples. cEspresso prefixes collection declarations with
type information such as `list2D: int`.

## String methods

The examples demonstrate `upper`, `lower`, `split`, `trim`, `replace`, `repeat`,
`at`, `slice`, `substring`, and `substr`. They can also be chained with `|>`.

## Comments

`#` begins a line comment. `#/` begins a block comment and `/#` ends it.
