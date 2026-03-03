import FlowClient from "@/app/flow/[flowId]/flow-client";

export default async function FlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  return <FlowClient flowId={flowId} />;
}
