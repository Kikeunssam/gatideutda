import { TeacherRoom } from "@/components/teacher-room";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return <TeacherRoom code={(await params).code.toUpperCase()} />;
}
