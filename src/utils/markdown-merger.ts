export async function mergeMarkdownFiles(files: string[]) {
  const content = await Promise.all(files.map(file => Bun.file(file).text()));
  return content.join("\n\n");
}
