import Stack, { StackProps } from "@mui/material/Stack";
import React from "react";

const Scrollable = React.forwardRef<HTMLDivElement, StackProps>(
  function Scrollable(props: StackProps, ref) {
    return (
      <Stack
        ref={ref}
        alignItems="center"
        {...props}
        className="Scrollable"
        flex="1"
        overflow="auto"
        maxHeight="100%"
      />
    );
  }
);

export default Scrollable;
