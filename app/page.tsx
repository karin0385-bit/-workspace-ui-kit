import { Workspace } from "@/components/workspace/Workspace";
import businessTypesData from "@/data/business-types.json";
import workspaceData from "@/data/workspace.json";
import { z } from "zod";
import { businessTypeSchema } from "@/lib/schema";

export default function Page() {
  const btResult = z.array(businessTypeSchema).safeParse(businessTypesData);

  if (!btResult.success) {
    throw new Error(
      `business-types.json の形式が正しくありません: ${btResult.error.issues[0]?.message}`,
    );
  }

  return (
    <Workspace
      businessTypes={btResult.data}
      workspaceName={workspaceData.name}
    />
  );
}
