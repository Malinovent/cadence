// Browser-only: saves text as a file via a temporary object URL and <a download>.
export const downloadText = (text: string, filename: string, type = "application/json"): void => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
