"use client";

import { LaptopIcon, MonitorIcon, TabletIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shown on phone-sized viewports: AI interviews require screen share that
 * phones don't support reliably, so we ask candidates to switch devices.
 */
export function InterviewDeviceGate({ onClose }: { onClose: () => void }) {
  return (
    <div className="bg-background fixed inset-0 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md ring-foreground/15">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">
                Switch to a larger device
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                AI interviews can&apos;t run on phones. Please continue on a
                tablet, laptop, or PC for security and recording guidelines.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            This interview needs camera, microphone, and full screen share.
            Phone browsers don&apos;t support that reliably, so sessions must
            be completed on a larger screen.
          </p>

          <ul className="space-y-2.5">
            {[
              { icon: TabletIcon, label: "Tablet" },
              { icon: LaptopIcon, label: "Laptop" },
              { icon: MonitorIcon, label: "PC / desktop" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="text-foreground flex items-center gap-2.5 text-sm font-medium"
              >
                <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="border-t py-4">
          <Button type="button" className="w-full" size="lg" onClick={onClose}>
            Got it
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
