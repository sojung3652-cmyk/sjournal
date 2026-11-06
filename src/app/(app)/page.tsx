import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { formatDayLong } from "@/lib/dates";
import { getUserContext } from "@/lib/user";

// '오늘' (home). Full screen is built in stage 4.
export default function TodayPage() {
  return (
    <Suspense fallback={<div className="h-16" />}>
      <TodayHeader />
    </Suspense>
  );
}

async function TodayHeader() {
  const { today } = await getUserContext();
  return <PageHeader title="오늘" description={formatDayLong(today)} />;
}
