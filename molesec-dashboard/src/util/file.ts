/** Convert FileList to File[]. */
export const toFileArray = (files: FileList | File[]) => Array.from(files);

/** Returns true if the File is a folder. */
export const isFolder = (file: File) =>
  // Derive folder to upload the file to if webkitRelativePath includes a slash
  // (means the file was uploaded as a folder through drag or folder file selection)
  file.webkitRelativePath !== undefined &&
  file.webkitRelativePath.includes("/");

/** Asserts that the given files only contains one file, and the file is not a folder. */
export function assertHasSingleFile(
  files: FileList | File[]
): asserts files is [File] {
  const fileArray = toFileArray(files);
  const file = fileArray[0];

  if (fileArray.length > 1) throw new Error("Selected more than one file.");
  if (isFolder(file)) throw new Error("Selected a folder.");
}

export const formatFileSize = (bytes: number, decimals: number = 0) => {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(decimals) + "GB";
  if (bytes > 1e6) return (bytes / 1e6).toFixed(decimals) + "MB";
  if (bytes > 1e3) return (bytes / 1e3).toFixed(decimals) + "KB";
  else return bytes + "B";
};
