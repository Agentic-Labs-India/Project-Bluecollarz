import { Suspense } from "react";
import { CandidateMedicalScheduler } from "@/components/candidate/medical/medical-scheduler";
import { MedicalPageSkeleton } from "@/components/layout/page-skeleton";

export default function CandidateMedicalPage() {
  return (
    <Suspense fallback={<MedicalPageSkeleton />}>
      <CandidateMedicalScheduler />
    </Suspense>
  );
}
