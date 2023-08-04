import { blue } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";

// https://qwtel.com/posts/software/the-monospaced-system-ui-css-font-stack/
export const MONOSPACE_FONT = `ui-monospace,
  Menlo, Monaco,
  "Cascadia Mono", "Segoe UI Mono",
  "Roboto Mono",
  "Oxygen Mono",
  "Ubuntu Monospace",
  "Source Code Pro",
  "Fira Mono",
  "Droid Sans Mono",
  "Courier New", monospace`;

export const theme = createTheme({
  typography: {
    fontFamily: "Poppins, Inter, Roboto, sans-serif",
  },
  palette: {
    primary: {
      main: "#32156F",
      light: "#5D4296",
      dark: "#1B0B3D",
    },
    secondary: {
      main: "#C7ADFF",
      light: "#D6C3FF",
      dark: "#B08BFF",
    },
  },
  components: {
    MuiListItem: {
      styleOverrides: {
        root: {
          color: "inherit",
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          ".MuiPaper-root": { minWidth: "auto" },
          ".MuiSnackbarContent-action .MuiButtonBase-root": {
            color: blue[200],
          },
        },
      },
      defaultProps: {
        anchorOrigin: { vertical: "bottom", horizontal: "center" },
      },
    },
    MuiList: {
      styleOverrides: {
        padding: {
          ".MuiListItemButton-root": {
            borderRadius: "8px",
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          textTransform: "none",
          fontSize: "18px",
        },
        colorDefault: {
          backgroundColor: "#C7ADFF",
          color: "#32156F",
        },
      },
    },
  },
});
