const vm = require("vm");

const types = new Set(["string", "int", "double", "char", "bool"]);

function replaceOutsideStrings(source, pattern, replacer) {
  let output = "";
  let plain = "";
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      output += character;
      if (character === "\\" && index + 1 < source.length) {
        output += source[++index];
      } else if (character === quote) {
        quote = "";
      }
    } else if (character === "\"" || character === "'" || character === "`") {
      output += plain.replace(pattern, replacer);
      plain = "";
      quote = character;
      output += character;
    } else {
      plain += character;
    }
  }
  return output + plain.replace(pattern, replacer);
}

function stripComments(source) {
  let inBlock = false;
  return source.split(/\r?\n/).map((line) => {
    let output = "";
    let quote = "";
    for (let index = 0; index < line.length; index += 1) {
      const current = line[index];
      const next = line[index + 1];
      if (inBlock) {
        if (current === "/" && next === "#") {
          inBlock = false;
          index += 1;
        }
        continue;
      }
      if (quote) {
        output += current;
        if (current === "\\" && index + 1 < line.length) {
          output += line[++index];
        } else if (current === quote) {
          quote = "";
        }
        continue;
      }
      if (current === "\"" || current === "'" || current === "`") {
        quote = current;
        output += current;
      } else if (current === "#" && next === "/") {
        inBlock = true;
        index += 1;
      } else if (current === "#") {
        break;
      } else {
        output += current;
      }
    }
    return output;
  }).join("\n");
}

function transformPipes(expression) {
  const parts = [];
  let start = 0;
  let quote = "";
  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
    } else if (character === "\"" || character === "'" || character === "`") {
      quote = character;
    } else if (character === "|" && expression[index + 1] === ">") {
      parts.push(expression.slice(start, index).trim());
      start = index + 2;
      index += 1;
    }
  }
  parts.push(expression.slice(start).trim());
  if (parts.length === 1) {
    return expression;
  }
  return parts.slice(1).reduce((value, operation) => {
    const method = operation.match(/^\.([A-Za-z_]\w*)\s*(\(.*\))?$/);
    if (method) {
      return `(${value}).${method[1]}${method[2] || "()"}`;
    }
    if (types.has(operation)) {
      return `__cast("${operation}", ${value})`;
    }
    return `(${value})`;
  }, parts[0]);
}

function transformCasts(expression) {
  let output = "";
  let index = 0;
  while (index < expression.length) {
    const character = expression[index];
    if (character === "\"" || character === "'" || character === "`") {
      const quote = character;
      const start = index++;
      while (index < expression.length) {
        if (expression[index] === "\\") {
          index += 2;
        } else if (expression[index++] === quote) {
          break;
        }
      }
      output += expression.slice(start, index);
      continue;
    }

    const cast = expression.slice(index).match(/^\(\s*(string|int|double|bool|char)\s*\)\s*/);
    if (!cast) {
      output += expression[index++];
      continue;
    }

    index += cast[0].length;
    const operandStart = index;
    if (expression[index] === "\"" || expression[index] === "'" || expression[index] === "`") {
      const quote = expression[index++];
      while (index < expression.length) {
        if (expression[index] === "\\") {
          index += 2;
        } else if (expression[index++] === quote) {
          break;
        }
      }
    } else if (expression[index] === "(") {
      let depth = 0;
      do {
        if (expression[index] === "(") {
          depth += 1;
        } else if (expression[index] === ")") {
          depth -= 1;
        }
        index += 1;
      } while (index < expression.length && depth > 0);
    } else {
      const identifier = expression.slice(index).match(/^[A-Za-z_]\w*/);
      const number = expression.slice(index).match(/^\d+(?:\.\d+)?/);
      if (identifier) {
        index += identifier[0].length;
        let next = index;
        while (/\s/.test(expression[next] || "")) {
          next += 1;
        }
        if (expression[next] === "(") {
          index = next;
          let depth = 0;
          let quote = "";
          do {
            const current = expression[index];
            if (quote) {
              if (current === "\\") {
                index += 2;
                continue;
              }
              if (current === quote) {
                quote = "";
              }
            } else if (current === "\"" || current === "'" || current === "`") {
              quote = current;
            } else if (current === "(") {
              depth += 1;
            } else if (current === ")") {
              depth -= 1;
            }
            index += 1;
          } while (index < expression.length && depth > 0);
        }
      } else if (number) {
        index += number[0].length;
      } else {
        output += cast[0];
        continue;
      }
    }
    output += `__cast("${cast[1]}", ${expression.slice(operandStart, index)})`;
  }
  return output;
}

function transformExpression(expression, functionNames = []) {
  let result = transformCasts(transformPipes(expression.trim()));
  const transformInterpolation = (value) => value.replace(/\{([^{}]*)\}/g, (_, expression) => `\${${expression}}`);
  result = result.replace(/`((?:\\.|[^`\\])*)`/g, (_, value) => `\`${transformInterpolation(value)}\``);
  result = result.replace(/\$"((?:\\.|[^"\\])*)"/g, (_, value) => `\`${transformInterpolation(value)}\``);
  result = replaceOutsideStrings(result, /\b(and|or|not|nil)\b/g, (token) => ({
    and: "&&", or: "||", not: "!", nil: "null"
  })[token]);
  result = replaceOutsideStrings(result, /(\b[A-Za-z_]\w*|\d+(?:\.\d+)?|\([^()]+\))\s*\/\/\s*(\b[A-Za-z_]\w*|\d+(?:\.\d+)?|\([^()]+\))/g,
    "Math.floor(($1) / ($2))");
  result = replaceOutsideStrings(result, /\b([A-Za-z_]\w*)\s*\/\/=\s*(\b[A-Za-z_]\w*|\d+(?:\.\d+)?)/g,
    " $1 = Math.floor($1 / $2)");
  result = replaceOutsideStrings(result, /\bio\.prompt\s*\(/g, "prompt(");
  result = replaceOutsideStrings(result, /\b(input|prompt|wait)\s*\(/g, "await $1(");
  for (const name of functionNames) {
    result = replaceOutsideStrings(result, new RegExp(`\\b${name}\\s*\\(`, "g"), `await ${name}(`);
  }
  return result;
}

function normalizeParameters(parameters) {
  return parameters.split(",").map((parameter) => {
    const trimmed = parameter.trim();
    const typed = trimmed.match(/^(?:(?:string|int|double|char|bool)\s+)?([A-Za-z_]\w*\??)(\s*=.*)?$/);
    return typed ? `${typed[1].replace(/\?$/, "")}${typed[2] || ""}` : trimmed;
  }).join(", ");
}

function translateLine(line, functionNames) {
  let text = line.trim();
  if (!text) {
    return "";
  }
  if (/^pass$/.test(text)) {
    return ";";
  }
  if (/^(?:break|continue|return)\b/.test(text)) {
    const returned = text.match(/^return(?:\s+(.*))?$/);
    return returned ? `return${returned[1] ? ` ${transformExpression(returned[1], functionNames)}` : ""};` : `${text};`;
  }
  if (/^(?:\+\+|--)?[A-Za-z_]\w*(?:\+\+|--)$/.test(text)) {
    return text;
  }

  const fn = text.match(/^fn\s+([A-Za-z_]\w*)\s*\((.*)\)\s*:\s*$/);
  if (fn) {
    return `async function ${fn[1]}(${normalizeParameters(fn[2])}) {`;
  }

  const cFor = text.match(/^for\s*\(\s*(?:(?:int|double|string|char|bool)\s+)?([A-Za-z_]\w*)\s*=\s*(.*?),\s*(.*?),\s*(.*?)\s*\)\s*:\s*$/);
  if (cFor) {
    return `for (var ${cFor[1]} = ${transformExpression(cFor[2], functionNames)}; ${transformExpression(cFor[3], functionNames)}; ${transformExpression(cFor[4], functionNames)}) {`;
  }

  const rangeFor = text.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)\s*:\s*$/);
  if (rangeFor) {
    return `for (var ${rangeFor[1]} of range(${transformExpression(rangeFor[2], functionNames)})) {`;
  }

  const conditional = text.match(/^(if|elseif|else|while)\b(.*):\s*$/);
  if (conditional) {
    const keyword = conditional[1] === "elseif" ? "else if" : conditional[1];
    if (keyword === "else") {
      return "else {";
    }
    return `${keyword} (${transformExpression(conditional[2], functionNames)}) {`;
  }

  const collectionDeclaration = text.match(/^(list2D|list3D|tuple2D|tuple3D|set2D|set3D)\s*:\s*(?:(?:\([^)]*\)|[A-Za-z_]\w*)\s+)?([A-Za-z_]\w*)\s*=\s*(.*)$/);
  if (collectionDeclaration) {
    let value = collectionDeclaration[3].trim();
    const set = value.match(/^\{(.*)\}$/);
    const tuple = value.match(/^\((.*,.+)\)$/);
    if (collectionDeclaration[1].startsWith("set") && set) {
      value = `new Set([${set[1]}])`;
    } else if (collectionDeclaration[1].startsWith("tuple") && tuple) {
      value = `[${tuple[1]}]`;
    }
    return `var ${collectionDeclaration[2]} = ${transformExpression(value, functionNames)};`;
  }

  const typedDeclaration = text.match(/^(string|int|double|char|bool)\s+([A-Za-z_]\w*\??)\s*=\s*(.*)$/);
  if (typedDeclaration) {
    const [, type, name, value] = typedDeclaration;
    return `var ${name.replace(/\?$/, "")} = __cast("${type}", ${transformExpression(value, functionNames)});`;
  }

  const inferredDeclaration = text.match(/^(var|ver)\s+([A-Za-z_]\w*)\s*=\s*(.*)$/);
  if (inferredDeclaration) {
    let value = inferredDeclaration[3].trim();
    const set = value.match(/^\{(.*)\}$/);
    const tuple = value.match(/^\((.*,.+)\)$/);
    if (set) {
      value = `new Set([${set[1]}])`;
    } else if (tuple) {
      value = `[${tuple[1]}]`;
    }
    return `${inferredDeclaration[1] === "ver" ? "let" : "var"} ${inferredDeclaration[2]} = ${transformExpression(value, functionNames)};`;
  }

  if (/^(if|elseif|else|for|while)\b/.test(text) && text.endsWith(":")) {
    throw new Error(`Unsupported control statement: ${text}`);
  }
  return `${transformExpression(text, functionNames).replace(/;\s*$/, "")};`;
}

function compile(source) {
  const lines = stripComments(source).split(/\r?\n/);
  const grouped = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|>") && grouped.length) {
      grouped[grouped.length - 1].text += ` ${trimmed}`;
    } else {
      grouped.push({ indent: (line.match(/^\s*/) || [""])[0].replace(/\t/g, "    ").length, text: line });
    }
  }

  const output = [];
  const blocks = [];
  const functionNames = grouped.flatMap(({ text }) => {
    const match = text.trim().match(/^fn\s+([A-Za-z_]\w*)\s*\(/);
    return match ? [match[1]] : [];
  });
  for (const line of grouped) {
    const text = line.text.trim();
    if (!text) {
      continue;
    }
    const isElse = /^(?:else|elseif)\b/.test(text);
    while (blocks.length && (blocks[blocks.length - 1].indent > line.indent
      || (blocks[blocks.length - 1].indent === line.indent && !isElse))) {
      output.push("}");
      blocks.pop();
    }
    if (isElse) {
      while (blocks.length && blocks[blocks.length - 1].indent === line.indent) {
        output.push("}");
        blocks.pop();
      }
    }
    const translated = translateLine(text, functionNames);
    if (/^(?:while|for)\s*\(/.test(translated)) {
      output.push(`${translated} __checkpoint(); await __yield();`);
    } else if (translated.startsWith("async function ")) {
      output.push(`${translated} __checkpoint(); await __yield();`);
    } else {
      output.push(translated);
    }
    if (translated.endsWith("{")) {
      blocks.push({
        indent: line.indent,
        kind: /^(?:if|else if)\b/.test(translated) ? "if" : "block"
      });
    }
  }
  while (blocks.length) {
    output.push("}");
    blocks.pop();
  }
  return output.join("\n");
}

async function run(source, options) {
  const { write, readInput, isCancelled } = options;
  let steps = 0;
  const context = {
    print: (...values) => write(`${values.map(formatValue).join(" ")}\n`),
    input: readInput,
    prompt: readInput,
    __cast: (type, value) => {
      if (value === null || value === undefined) {
        return null;
      }
      if (type === "string" || type === "char") {
        return String(value);
      }
      if (type === "int") {
        return Number.parseInt(value, 10);
      }
      if (type === "double") {
        return Number(value);
      }
      if (type === "bool") {
        return Boolean(value);
      }
      return value;
    },
    wait: async (seconds = 0) => {
      const deadline = Date.now() + Math.max(0, Number(seconds) * 1000);
      while (Date.now() < deadline) {
        if (isCancelled()) {
          throw new Error("Execution stopped.");
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(50, deadline - Date.now())));
      }
    },
    range: (start, end) => {
      if (end === undefined) {
        end = start;
        start = 0;
      }
      if (Number(end) - Number(start) > 1000000) {
        throw new Error("range() cannot create more than one million values.");
      }
      const values = [];
      for (let value = Number(start); value < Number(end); value += 1) {
        values.push(value);
      }
      return values;
    },
    __yield: () => new Promise((resolve) => setTimeout(resolve, 0)),
    __checkpoint: () => {
      steps += 1;
      if (isCancelled()) {
        throw new Error("Execution stopped.");
      }
      if (steps > 1000000) {
        throw new Error("Execution stopped after exceeding one million loop iterations.");
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(
    "String.prototype.upper = function() { return this.toUpperCase(); };"
      + "String.prototype.lower = function() { return this.toLowerCase(); };"
      + "String.prototype.at = function(index) { return this.charAt(index === undefined ? 0 : index); };",
    context
  );
  const translated = compile(source);
  await vm.runInContext(`(async () => {\n${translated}\n})()`, context, { timeout: 1000 });
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(", ")}]`;
  }
  if (Object.prototype.toString.call(value) === "[object Set]") {
    return `{${[...value].map(formatValue).join(", ")}}`;
  }
  return String(value);
}

function formatError(error) {
  const type = error && typeof error.name === "string" ? error.name : "Error";
  const message = error && typeof error.message === "string" ? error.message : String(error);
  let explanation = "The program stopped because execution raised an error.";
  let tip = "Review the message and the statement that was running, then try again.";

  if (type === "SyntaxError") {
    explanation = "The runner could not parse the statement as valid Espresso or cEspresso syntax.";
    tip = "Check indentation, colons, brackets, and whether the syntax matches the file's language.";
  } else if (type === "ReferenceError") {
    explanation = "The program used a variable or function name that is not defined in the current scope.";
    tip = "Check the spelling and make sure the name is declared before it is used.";
  } else if (type === "TypeError") {
    explanation = "An operation was attempted on a value that does not support it, such as calling a missing method or using nil.";
    tip = "Check the value and its type before using it; optional values may be nil.";
  } else if (type === "RangeError") {
    explanation = "A numeric value or operation is outside the range supported by the runtime.";
    tip = "Check the value's bounds and reduce unusually large ranges or sizes.";
  } else if (message.includes("range() cannot create more than one million values")) {
    explanation = "The requested range contains more than the runtime's one-million-value limit.";
    tip = "Use a smaller range or process the values in smaller batches.";
  } else if (message.includes("exceeding one million loop iterations")) {
    explanation = "The loop exceeded the runtime's one-million-iteration safety limit.";
    tip = "Check that the loop condition can become false, or reduce the amount of work.";
  } else if (message.startsWith("Unsupported control statement:")) {
    explanation = "This control statement form is not supported by the runner.";
    tip = "Check the language examples in the README and use a supported condition or loop form.";
  }

  return [
    "┌─ Espresso / cEspresso error ─────────────────",
    `│ Type: ${type}`,
    `│ Message: ${message}`,
    `│ What went wrong: ${explanation}`,
    `│ Tip: ${tip}`,
    "└──────────────────────────────────────────────"
  ].join("\n");
}

module.exports = { compile, formatError, run };
