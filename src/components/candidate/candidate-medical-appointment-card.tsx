import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { Button } from "@/components/ui/button";
import { formatMedicalDateTime } from "@/lib/medical/time";
import type { CandidateMedicalAppointment } from "@/lib/medical/types";

export function CandidateMedicalAppointmentCard({
  appointment,
}: {
  appointment: CandidateMedicalAppointment;
}) {
  const { center } = appointment;

  return (
    <div className="bg-primary relative w-full overflow-hidden border border-white/15 px-5 py-4">
      <PrimaryDither seed={`medical-${appointment.id}`} opacity={0.85} />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-white">
          <p className="text-xs font-medium tracking-wide text-white/75 uppercase">
            Medical test
          </p>
          <p className="mt-1 truncate text-sm font-semibold">
            {formatMedicalDateTime(appointment.scheduledAt)} IST · {center.name}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <a
              href={center.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Directions
              <ArrowUpRightIcon className="size-3.5" />
            </a>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link
              href={`/candidate/medical?jobId=${encodeURIComponent(appointment.jobId)}`}
            >
              Reschedule
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
