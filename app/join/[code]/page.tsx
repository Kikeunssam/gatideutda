import { StudentRoom } from "@/components/student-room";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return <StudentRoom code={(await params).code.toUpperCase()} />;
}
