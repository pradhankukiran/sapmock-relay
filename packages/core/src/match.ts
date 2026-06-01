import type { ContractSpec, RouteMatch } from "./types.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePath(pattern: string): { regex: RegExp; names: string[] } {
  const names: string[] = [];
  const source = pattern
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) {
        names.push(part.slice(1));
        return "([^/]+)";
      }
      return escapeRegex(part);
    })
    .join("/");

  return { regex: new RegExp(`^${source}$`), names };
}

export function matchContract(contracts: ContractSpec[], method: string, path: string): RouteMatch | undefined {
  const normalizedMethod = method.toUpperCase();
  for (const contract of contracts) {
    if (contract.method !== normalizedMethod) continue;
    const compiled = compilePath(contract.path);
    const match = compiled.regex.exec(path);
    if (!match) continue;

    const params = Object.fromEntries(compiled.names.map((name, index) => [name, decodeURIComponent(match[index + 1] ?? "")]));
    return { contract, params };
  }

  return undefined;
}

