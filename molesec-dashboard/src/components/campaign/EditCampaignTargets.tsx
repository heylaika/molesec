import { CampaignTarget } from "@/util/campaign";
import { isEmail } from "@/util/string";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import React from "react";

export type TargetTableProps = {
  targets: CampaignTarget[];
  onChange: (targets: CampaignTarget[]) => void;
};

export default function EditCampaignTargets({
  targets: initialTargets,
  onChange,
}: TargetTableProps) {
  const targets = React.useMemo(() => {
    const lastTargetHasEmail = isEmail(
      initialTargets[initialTargets.length - 1]?.email
    );

    if (lastTargetHasEmail || initialTargets.length === 0) {
      return [
        ...initialTargets,
        { called_name: "", email: "", social_links: [""] },
      ];
    } else {
      return initialTargets;
    }
  }, [initialTargets]);

  const updateTarget = <K extends keyof CampaignTarget>(
    index: number,
    key: K,
    value: CampaignTarget[K]
  ) => {
    const newTargets = [...targets];
    newTargets[index][key] = value;

    onChange(newTargets);
  };

  const removeTarget = (index: number) => {
    const newTargets = [...targets];
    newTargets.splice(index, 1);

    onChange(newTargets);
  };

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell colSpan={2}>LinkedIn (optional)</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {targets.map((target, index) => (
            <TableRow key={index}>
              <TableCell>
                <StealthField
                  fullWidth
                  value={target.called_name}
                  type="text"
                  placeholder="Enter name…"
                  onChange={(event) =>
                    updateTarget(index, "called_name", event.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <StealthField
                  fullWidth
                  value={target.email}
                  error={!isEmail(target.email)}
                  type="email"
                  placeholder="Enter email…"
                  onChange={(event) =>
                    updateTarget(index, "email", event.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <StealthField
                  fullWidth
                  value={target.social_links[0]}
                  type="url"
                  placeholder="LinkedIn URL"
                  onChange={(event) =>
                    updateTarget(index, "social_links", [event.target.value])
                  }
                />
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={() => removeTarget(index)}
                  disabled={index === targets.length - 1}
                >
                  <DeleteOutlined />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const StealthField = styled(InputBase)({
  input: { padding: 0, margin: 0 },
});
