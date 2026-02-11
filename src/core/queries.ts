import type { SignatureEntry } from "./extractor.ts";
import { parseSource } from "./tree-sitter.ts";

// Map display language -> tree-sitter grammar key
function toGrammarKey(language: string): string | null {
  switch (language) {
    case "typescript": return "typescript";
    case "tsx": return "tsx";
    case "javascript": return "javascript";
    case "python": return "python";
    case "go": return "go";
    case "rust": return "rust";
    case "java": return "java";
    case "csharp": return "c_sharp";
    case "ruby": return "ruby";
    case "php": return "php";
    default: return null;
  }
}

function nodeText(content: string, node: any): string {
  return content.slice(node.startIndex, node.endIndex);
}

// Slice from start to body start (stripping impl), or full text if no body
function sigSlice(content: string, start: number, node: any, bodyField = "body"): string {
  const end = node.childForFieldName(bodyField)?.startIndex ?? node.endIndex;
  return content.slice(start, end).trim();
}

function guessIdentifier(content: string, node: any): string | null {
  const candidates = [
    "identifier", "name", "type_identifier", "field_identifier",
    "constant", "method_name", "scoped_identifier"
  ];
  for (const child of node.namedChildren ?? []) {
    if (candidates.includes(child.type)) {
      return nodeText(content, child);
    }
  }
  const txt = nodeText(content, node);
  const m = txt.match(/[A-Za-z_][A-Za-z0-9_]*/);
  return m ? m[0] : null;
}

// ── TS/JS extraction ──────────────────────────────────────────────

function extractTSJS(content: string, root: any, language: string): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  for (const node of root.namedChildren) {
    const line = (node.startPosition?.row ?? 0) + 1;

    // export_statement wraps declarations or is a standalone re-export
    if (node.type === "export_statement") {
      const decl = node.childForFieldName("declaration") ?? namedChildByTypes(node, [
        "function_declaration", "class_declaration", "interface_declaration",
        "type_alias_declaration", "enum_declaration", "lexical_declaration",
        "abstract_class_declaration",
      ]);

      if (!decl) {
        // Standalone re-export: export { ... } from "...", export * from "..."
        entries.push({
          kind: "const",
          name: guessReExportName(content, node),
          signature: nodeText(content, node).replace(/;$/, "").trim(),
          exported: true,
          line,
        });
        continue;
      }

      // Delegate to declaration handler with exported=true
      const sub = extractDeclaration(content, decl, language, true, node);
      if (sub.length > 0) {
        entries.push(...sub);
      }
      continue;
    }

    // Non-exported top-level declarations
    const sub = extractDeclaration(content, node, language, false, null);
    if (sub.length > 0) {
      entries.push(...sub);
    }
  }

  return entries;
}

function extractDeclaration(
  content: string, node: any, language: string,
  exported: boolean, exportNode: any | null
): SignatureEntry[] {
  const line = (node.startPosition?.row ?? 0) + 1;
  const startIdx = exportNode ? exportNode.startIndex : node.startIndex;

  switch (node.type) {
    case "function_declaration": {
      const name = guessIdentifier(content, node) || "<anonymous>";
      return [{ kind: "function", name, signature: sigSlice(content, startIdx, node), exported, line }];
    }

    case "class_declaration":
    case "abstract_class_declaration": {
      const name = guessIdentifier(content, node) || "<anonymous>";
      return [extractClassSig(content, node, name, exported, line, startIdx)];
    }

    case "interface_declaration": {
      const name = guessIdentifier(content, node) || "<anonymous>";
      // Include full body — interface members are type-only
      const sig = content.slice(startIdx, node.endIndex).trim();
      return [{ kind: "interface", name, signature: sig, exported, line }];
    }

    case "type_alias_declaration": {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const sig = content.slice(startIdx, node.endIndex).replace(/;$/, "").trim();
      return [{ kind: "type", name, signature: sig, exported, line }];
    }

    case "enum_declaration": {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const sig = content.slice(startIdx, node.endIndex).trim();
      return [{ kind: "enum", name, signature: sig, exported, line }];
    }

    case "lexical_declaration": {
      return extractLexicalDecl(content, node, exported, line, startIdx);
    }

    default:
      return [];
  }
}

function extractLexicalDecl(
  content: string, node: any,
  exported: boolean, line: number, startIdx: number
): SignatureEntry[] {
  const entries: SignatureEntry[] = [];
  for (const child of node.namedChildren) {
    if (child.type !== "variable_declarator") continue;
    const name = guessIdentifier(content, child) || "<anonymous>";
    const value = child.childForFieldName("value");

    if (value && (value.type === "arrow_function" || value.type === "function")) {
      // Arrow function or function expression: slice to body
      entries.push({ kind: "function", name, signature: sigSlice(content, startIdx, value), exported, line });
    } else {
      // Regular const — keep declaration without value
      const type = child.childForFieldName("type");
      if (type && exported) {
        const sig = content.slice(startIdx, type.endIndex).trim();
        entries.push({ kind: "const", name, signature: sig, exported, line });
      } else if (exported) {
        // No type annotation — just show the const name
        const sig = (value ? content.slice(startIdx, value.startIndex).replace(/=$/, "") : content.slice(startIdx, child.endIndex)).trim();
        entries.push({ kind: "const", name, signature: sig, exported, line });
      }
    }
  }
  return entries;
}

function extractClassSig(
  content: string, node: any, name: string,
  exported: boolean, line: number, startIdx: number
): SignatureEntry {
  const body = node.childForFieldName("body");
  let header = (body ? content.slice(startIdx, body.startIndex) : content.slice(startIdx, node.endIndex)).trim();
  if (!header.endsWith("{")) header += " {";

  const members: string[] = [];
  for (const member of body?.namedChildren ?? []) {
    if (member.type === "comment") continue;

    if (member.type === "method_definition") {
      members.push("  " + sigSlice(content, member.startIndex, member));
    } else if (
      member.type === "public_field_definition" ||
      member.type === "property_declaration" ||
      member.type === "abstract_method_signature"
    ) {
      members.push("  " + nodeText(content, member).replace(/;$/, "").trim());
    }
  }

  const sig = members.length > 0 ? header + "\n" + members.join("\n") + "\n}" : header + " }";
  return { kind: "class", name, signature: sig, exported, line };
}

function guessReExportName(content: string, node: any): string {
  const text = nodeText(content, node);
  const fromMatch = text.match(/from\s+["']([^"']+)["']/);
  return fromMatch ? `re-export from ${fromMatch[1]}` : "re-export";
}

function namedChildByTypes(node: any, types: string[]): any | null {
  for (const child of node.namedChildren ?? []) {
    if (types.includes(child.type)) return child;
  }
  return null;
}

// ── Python extraction ─────────────────────────────────────────────

function extractPython(content: string, root: any): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  for (const node of root.namedChildren) {
    const actual = node.type === "decorated_definition" ? (namedChildByTypes(node, ["function_definition", "class_definition"]) ?? node) : node;
    const startIdx = node.startIndex; // include decorators
    const line = (node.startPosition?.row ?? 0) + 1;

    if (actual.type === "function_definition") {
      const name = guessIdentifier(content, actual) || "<anonymous>";
      const sig = sigSlice(content, startIdx, actual).replace(/:$/, "").trim();
      entries.push({ kind: "function", name, signature: sig + ":", exported: true, line });
    } else if (actual.type === "class_definition") {
      const name = guessIdentifier(content, actual) || "<anonymous>";
      const body = actual.childForFieldName("body");
      let header = sigSlice(content, startIdx, actual).replace(/:$/, "").trim();
      header += ":";

      // Extract method signatures from class body
      const methods: string[] = [];
      if (body) {
        for (const member of body.namedChildren ?? []) {
          const memberActual = member.type === "decorated_definition" ? (namedChildByTypes(member, ["function_definition"]) ?? member) : member;
          if (memberActual.type === "function_definition") {
            const mName = guessIdentifier(content, memberActual) || "<anonymous>";
            const mSig = sigSlice(content, member.startIndex, memberActual).replace(/:$/, "").trim();
            methods.push("  " + mSig);
          }
        }
      }

      const sig = methods.length > 0 ? header + "\n" + methods.join("\n") : header;
      entries.push({ kind: "class", name, signature: sig, exported: true, line });
    }
  }

  return entries;
}

// ── Go extraction ─────────────────────────────────────────────────

function extractGo(content: string, root: any): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  for (const node of root.namedChildren) {
    const line = (node.startPosition?.row ?? 0) + 1;

    if (node.type === "function_declaration" || node.type === "method_declaration") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      entries.push({ kind: "function", name, signature: sigSlice(content, node.startIndex, node), exported: true, line });
    } else if (node.type === "type_declaration") {
      // type_declaration contains type_spec children
      for (const spec of node.namedChildren) {
        if (spec.type !== "type_spec") continue;
        const name = guessIdentifier(content, spec) || "<anonymous>";
        const typeNode = spec.childForFieldName("type");
        if (!typeNode) continue;

        if (typeNode.type === "struct_type") {
          const fieldList = typeNode.childForFieldName("body") ??
            namedChildByTypes(typeNode, ["field_declaration_list"]);
          // Include struct with fields
          const sig = content.slice(node.startIndex, typeNode.endIndex).trim();
          entries.push({ kind: "class", name, signature: sig, exported: true, line });
        } else if (typeNode.type === "interface_type") {
          const sig = content.slice(node.startIndex, typeNode.endIndex).trim();
          entries.push({ kind: "interface", name, signature: sig, exported: true, line });
        } else {
          // Type alias
          const sig = content.slice(node.startIndex, node.endIndex).trim();
          entries.push({ kind: "type", name, signature: sig, exported: true, line });
        }
      }
    }
  }

  return entries;
}

// ── Rust extraction ───────────────────────────────────────────────

function extractRust(content: string, root: any): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  for (const node of root.namedChildren) {
    const line = (node.startPosition?.row ?? 0) + 1;

    if (node.type === "function_item") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      entries.push({ kind: "function", name, signature: sigSlice(content, node.startIndex, node), exported: true, line });
    } else if (node.type === "struct_item") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const sig = nodeText(content, node);
      entries.push({ kind: "class", name, signature: sig, exported: true, line });
    } else if (node.type === "enum_item") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const sig = nodeText(content, node);
      entries.push({ kind: "enum", name, signature: sig, exported: true, line });
    } else if (node.type === "trait_item") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const sig = nodeText(content, node);
      entries.push({ kind: "interface", name, signature: sig, exported: true, line });
    } else if (node.type === "impl_item") {
      // Extract method signatures from impl blocks
      const body = node.childForFieldName("body");
      if (body) {
        for (const member of body.namedChildren ?? []) {
          if (member.type === "function_item") {
            const mName = guessIdentifier(content, member) || "<anonymous>";
            const mLine = (member.startPosition?.row ?? 0) + 1;
            entries.push({ kind: "function", name: mName, signature: sigSlice(content, member.startIndex, member), exported: true, line: mLine });
          }
        }
      }
    } else if (node.type === "type_item") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const sig = nodeText(content, node);
      entries.push({ kind: "type", name, signature: sig, exported: true, line });
    }
  }

  return entries;
}

// ── Java extraction ───────────────────────────────────────────────

function extractJava(content: string, root: any): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  for (const node of root.namedChildren) {
    if (node.type === "class_declaration" || node.type === "interface_declaration" || node.type === "enum_declaration") {
      extractJavaClass(content, node, entries);
    }
  }

  return entries;
}

function extractJavaClass(content: string, node: any, entries: SignatureEntry[]): void {
  const line = (node.startPosition?.row ?? 0) + 1;
  const name = guessIdentifier(content, node) || "<anonymous>";
  const kind = node.type === "interface_declaration" ? "interface" as const : node.type === "enum_declaration" ? "enum" as const : "class" as const;

  if (kind === "enum") {
    entries.push({ kind, name, signature: nodeText(content, node), exported: true, line });
    return;
  }

  const body = node.childForFieldName("body");
  let header = (body ? content.slice(node.startIndex, body.startIndex) : nodeText(content, node)).trim();
  if (!header.endsWith("{")) header += " {";

  const members: string[] = [];
  for (const member of body?.namedChildren ?? []) {
    if (member.type === "method_declaration" || member.type === "constructor_declaration") {
      members.push("  " + sigSlice(content, member.startIndex, member));
    } else if (member.type === "field_declaration") {
      members.push("  " + nodeText(content, member).replace(/;$/, "").trim());
    }
  }

  const sig = members.length > 0 ? header + "\n" + members.join("\n") + "\n}" : header + " }";
  entries.push({ kind, name, signature: sig, exported: true, line });
}

// ── C# extraction ─────────────────────────────────────────────────

function extractCSharp(content: string, root: any): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  function walk(node: any): void {
    for (const child of node.namedChildren ?? []) {
      const line = (child.startPosition?.row ?? 0) + 1;

      if (child.type === "class_declaration" || child.type === "struct_declaration" ||
          child.type === "interface_declaration" || child.type === "enum_declaration") {
        const name = guessIdentifier(content, child) || "<anonymous>";
        const kind = child.type === "interface_declaration" ? "interface" as const : child.type === "enum_declaration" ? "enum" as const : "class" as const;
        if (kind === "enum") { entries.push({ kind, name, signature: nodeText(content, child), exported: true, line }); continue; }

        const body = child.childForFieldName("body") ?? namedChildByTypes(child, ["declaration_list"]);
        let header = (body ? content.slice(child.startIndex, body.startIndex) : nodeText(content, child)).trim();
        if (!header.endsWith("{")) header += " {";

        const members: string[] = [];
        for (const member of body?.namedChildren ?? []) {
          if (member.type === "method_declaration" || member.type === "constructor_declaration") {
            members.push("  " + sigSlice(content, member.startIndex, member));
          } else if (member.type === "field_declaration" || member.type === "property_declaration") {
            members.push("  " + nodeText(content, member).replace(/;$/, "").trim());
          }
        }

        const sig = members.length > 0 ? header + "\n" + members.join("\n") + "\n}" : header + " }";
        entries.push({ kind, name, signature: sig, exported: true, line });
      } else if (child.type === "namespace_declaration" || child.type === "declaration_list") {
        walk(child); // recurse into namespaces and their declaration lists
      }
    }
  }

  walk(root);
  return entries;
}

// ── Ruby extraction ───────────────────────────────────────────────

function extractRuby(content: string, root: any): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  for (const node of root.namedChildren) {
    const line = (node.startPosition?.row ?? 0) + 1;

    if (node.type === "method" || node.type === "singleton_method") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      entries.push({ kind: "function", name, signature: sigSlice(content, node.startIndex, node), exported: true, line });
    } else if (node.type === "class") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const body = node.childForFieldName("body") ?? namedChildByTypes(node, ["body_statement"]);
      let header = (body ? content.slice(node.startIndex, body.startIndex) : nodeText(content, node).split("\n")[0]!).trim();

      const methods: string[] = [];
      if (body) {
        for (const member of body.namedChildren ?? []) {
          if (member.type === "method" || member.type === "singleton_method") {
            methods.push("  " + sigSlice(content, member.startIndex, member));
          }
        }
      }

      const sig = methods.length > 0 ? header + "\n" + methods.join("\n") + "\nend" : header + "\nend";
      entries.push({ kind: "class", name, signature: sig, exported: true, line });
    } else if (node.type === "module") {
      const name = guessIdentifier(content, node) || "<anonymous>";
      const body = node.childForFieldName("body") ?? namedChildByTypes(node, ["body_statement"]);
      const header = (body ? content.slice(node.startIndex, body.startIndex) : nodeText(content, node).split("\n")[0]!).trim();
      entries.push({ kind: "class", name, signature: header + "\nend", exported: true, line });
    }
  }

  return entries;
}

// ── PHP extraction ────────────────────────────────────────────────

function extractPHP(content: string, root: any): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  function walk(node: any): void {
    for (const child of node.namedChildren ?? []) {
      const line = (child.startPosition?.row ?? 0) + 1;

      if (child.type === "function_definition") {
        const name = guessIdentifier(content, child) || "<anonymous>";
        entries.push({ kind: "function", name, signature: sigSlice(content, child.startIndex, child), exported: true, line });
      } else if (child.type === "class_declaration" || child.type === "interface_declaration" || child.type === "enum_declaration") {
        const name = guessIdentifier(content, child) || "<anonymous>";
        const kind = child.type === "interface_declaration" ? "interface" as const : child.type === "enum_declaration" ? "enum" as const : "class" as const;

        const body = child.childForFieldName("body") ?? namedChildByTypes(child, ["declaration_list"]);
        let header = (body ? content.slice(child.startIndex, body.startIndex) : nodeText(content, child)).trim();
        if (!header.endsWith("{")) header += " {";

        const members: string[] = [];
        for (const member of body?.namedChildren ?? []) {
          if (member.type === "method_declaration") {
            members.push("  " + sigSlice(content, member.startIndex, member));
          } else if (member.type === "property_declaration") {
            members.push("  " + nodeText(content, member).replace(/;$/, "").trim());
          }
        }

        const sig = members.length > 0 ? header + "\n" + members.join("\n") + "\n}" : header + " }";
        entries.push({ kind, name, signature: sig, exported: true, line });
      } else if (child.type === "program" || child.type === "namespace_definition" || child.type === "compound_statement") {
        walk(child);
      }
    }
  }

  walk(root);
  return entries;
}

// ── Main entry point ──────────────────────────────────────────────

export async function extractWithTreeSitter(content: string, language: string): Promise<SignatureEntry[] | null> {
  const g = toGrammarKey(language);
  if (!g) return null;
  const tree = await parseSource(content, g as any);
  if (!tree) return null;

  const root = tree.rootNode;

  switch (language) {
    case "typescript":
    case "tsx":
    case "javascript":
      return extractTSJS(content, root, language);
    case "python":
      return extractPython(content, root);
    case "go":
      return extractGo(content, root);
    case "rust":
      return extractRust(content, root);
    case "java":
      return extractJava(content, root);
    case "csharp":
      return extractCSharp(content, root);
    case "ruby":
      return extractRuby(content, root);
    case "php":
      return extractPHP(content, root);
    default:
      return null;
  }
}

// Test-only exports
export const __queries_test = {
  toGrammarKey,
  guessIdentifier,
};
