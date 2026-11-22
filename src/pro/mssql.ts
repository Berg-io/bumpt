const MESSAGE = "Microsoft SQL Server requires bum.pt Professional (https://bum.pt).";

export function createMssqlAdapter(_url: string): unknown {
  throw new Error(MESSAGE);
}

export async function loadMssqlAdapter(_url: string): Promise<unknown> {
  throw new Error(MESSAGE);
}
