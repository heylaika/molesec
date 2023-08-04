import Box from "@mui/material/Box";
import React from "react";

type FilePickerProps = {
  folder?: boolean;
  multiple?: boolean;
  select: (files: FileList) => Promise<void> | void;
  children: (openFilePicker: () => void) => React.ReactNode;
};

/** An invisible input that opens a file picker for user to select local files. */
export const LocalFilePicker = ({
  select,
  folder = false,
  multiple = false,
  children,
}: FilePickerProps) => {
  const props = folder ? { webkitdirectory: "", directory: "" } : { multiple };
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const openFilePicker = React.useCallback(() => {
    if (inputRef.current) inputRef.current.click();
  }, []);

  const selectFiles = () => {
    if (inputRef.current?.files) {
      select(inputRef.current.files);
      // Reset the input so that the input can be reused.
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <Box
        component="input"
        sx={{ display: "none" }}
        type="file"
        {...props}
        onChange={selectFiles}
        ref={inputRef}
      />
      {children(openFilePicker)}
    </>
  );
};
