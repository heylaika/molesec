import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { blue } from "@mui/material/colors";
import Stack from "@mui/material/Stack";
import { darken } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import React from "react";

export type Palette = {
  [K in keyof typeof blue]: string;
};

export type FunnelSegmentProps = {
  max: number;
  start: number;
  end: number;
  label: string;
  icon?: React.ReactNode;
  palette: Palette;
  selected?: boolean;
  onClick?: () => void;
};

export default function FunnelSegment({
  max,
  start,
  end,
  label,
  icon,
  palette,
  selected,
  onClick,
}: FunnelSegmentProps) {
  const background = palette[50];
  const foreground = palette[200];
  const selectedBorder = palette[700];

  return (
    <Box
      component={ButtonBase}
      onClick={onClick}
      textAlign="left"
      flex="1"
      position="relative"
      overflow="hidden"
      borderRadius={1}
      style={{
        background,
        transition: "box-shadow 150ms 50ms ease-in",
        boxShadow: selected ? "0 0 0 2px " + selectedBorder : undefined,
      }}
    >
      <FunnelCurve
        startY={1 - start / max}
        endY={1 - end / max}
        foreground={foreground}
      />

      <Stack
        position="absolute"
        p="16px"
        pb="8px"
        gap={0.5}
        color={darken(palette[200], 0.7)}
        width="100%"
        height="100%"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon}
          <Typography component="div" variant="subtitle1" fontWeight={500}>
            {label}
          </Typography>
        </Stack>

        <Typography variant="h4" component="h4">
          {end}
        </Typography>

        <Typography component="div" variant="body2" mt="auto">
          {(end / max) * 100}% of targets
        </Typography>
      </Stack>
    </Box>
  );
}

export type FunnelCurveBackdropProps = {
  foreground: string;
  startY: number;
  endY: number;
};

const FunnelCurve = ({
  foreground,
  startY,
  endY,
}: FunnelCurveBackdropProps) => {
  const top = 100;

  return (
    <Box position="absolute" width="100%" height="100%" top={top} left={0}>
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={{ width: "100%", height: `calc(100% - ${top}px)` }}
      >
        <path
          fill={foreground}
          d={`M 0,${startY}` + makeCurve(startY, endY, 0.35) + "L 1,1 L 0,1Z"}
        />
      </svg>
    </Box>
  );
};

const makeCurve = (startY: number, endY: number, offs: number) =>
  `C ${offs} ${startY}, ${1 - offs} ${endY}, 1 ${endY}`;
