import ReportClient from "./ReportClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ReportClient id={id} />;
}