import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { formatDayLong } from "@/lib/dates";
import { PageContainer } from "@/components/app/page-container";
import { getUserContext } from "@/lib/user";

// '오늘' (home). Full screen is built in stage 4.
export default function TodayPage() {
  return (
    <PageContainer>
    <Suspense fallback={<div className="h-16" />}>
      <TodayHeader />
    </Suspense>
    </PageContainer>
  );
}

async function TodayHeader() {
  const { today } = await getUserContext();
  return <PageHeader title="오늘" description={formatDayLong(today)} />;
}
