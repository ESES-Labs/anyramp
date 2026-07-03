import { useRouterState } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";

function PageHeaderSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="px-5 pt-2">
      {lines >= 2 && <Skeleton className="h-9 w-40 rounded-lg bg-surface-muted" />}
      <Skeleton className={`h-4 rounded-md bg-surface-muted ${lines >= 2 ? "mt-2 w-full max-w-xs" : "w-48"}`} />
    </div>
  );
}

function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Skeleton
      className={`rounded-3xl bg-surface-muted ring-1 ring-black/5 ${className}`}
    />
  );
}

function ListRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl bg-surface-muted" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-md bg-surface-muted" />
          <Skeleton className="h-3 w-20 rounded-md bg-surface-muted" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="ml-auto h-4 w-16 rounded-md bg-surface-muted" />
        <Skeleton className="ml-auto h-3 w-12 rounded-md bg-surface-muted" />
      </div>
    </div>
  );
}

export function AppPageSkeleton() {
  return (
    <>
      <section className="px-5 pb-6 pt-4">
        <Skeleton className="h-4 w-32 rounded-md bg-surface-muted" />
        <Skeleton className="mt-3 h-10 w-48 rounded-lg bg-surface-muted" />
        <Skeleton className="mt-2 h-3 w-56 rounded-md bg-surface-muted" />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-full bg-surface-muted" />
          <Skeleton className="h-10 flex-1 rounded-full bg-surface-muted" />
        </div>
      </section>
      <section className="px-4">
        <CardSkeleton className="h-64 w-full" />
      </section>
      <section className="mt-10 px-5">
        <Skeleton className="mb-4 h-4 w-24 rounded-md bg-surface-muted" />
        <ul className="space-y-2">
          <ListRowSkeleton />
          <ListRowSkeleton />
        </ul>
      </section>
    </>
  );
}

export function EarnPageSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="mt-6 px-4">
        <div className="rounded-3xl bg-surface p-5 ring-1 ring-black/5">
          <Skeleton className="h-3 w-24 rounded-md bg-surface-muted" />
          <Skeleton className="mt-3 h-9 w-36 rounded-lg bg-surface-muted" />
          <Skeleton className="mt-2 h-4 w-28 rounded-md bg-surface-muted" />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Skeleton className="h-10 rounded-md bg-surface-muted" />
            <Skeleton className="h-10 rounded-md bg-surface-muted" />
          </div>
        </div>
      </section>
      <section className="mt-8 px-5">
        <Skeleton className="h-16 w-full rounded-3xl bg-surface-muted" />
      </section>
      <section className="mt-8 px-5 pb-6">
        <Skeleton className="mb-4 h-4 w-28 rounded-md bg-surface-muted" />
        <ul className="space-y-2">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </ul>
      </section>
    </>
  );
}

export function FormFlowSkeleton() {
  return (
    <>
      <div className="px-5 pt-2">
        <Skeleton className="h-4 w-16 rounded-md bg-surface-muted" />
        <Skeleton className="mt-4 h-9 w-52 rounded-lg bg-surface-muted" />
        <Skeleton className="mt-2 h-4 w-full max-w-sm rounded-md bg-surface-muted" />
      </div>
      <div className="mt-6 px-5">
        <Skeleton className="h-10 w-full rounded-full bg-surface-muted" />
      </div>
      <section className="mt-6 px-4">
        <CardSkeleton className="h-52 w-full" />
      </section>
      <section className="mt-6 px-4">
        <Skeleton className="mb-3 h-4 w-20 rounded-md bg-surface-muted" />
        <CardSkeleton className="h-28 w-full" />
      </section>
      <section className="mt-6 px-4">
        <Skeleton className="mb-3 h-4 w-28 rounded-md bg-surface-muted" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full bg-surface-muted" />
          ))}
        </div>
      </section>
      <section className="mt-8 px-5 pb-6">
        <Skeleton className="h-12 w-full rounded-full bg-surface-muted" />
      </section>
    </>
  );
}

export function ListPageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mt-5 px-4">
        <Skeleton className="h-10 w-full rounded-full bg-surface-muted" />
      </div>
      <section className="mt-6 px-4 pb-6">
        <ul className="space-y-2">
          {Array.from({ length: rows }, (_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </ul>
      </section>
    </>
  );
}

export function SettingsPageSkeleton() {
  return (
    <>
      <PageHeaderSkeleton lines={1} />
      <section className="mt-6 px-4 space-y-6 pb-6">
        {[1, 2, 3].map((group) => (
          <div key={group}>
            <Skeleton className="mb-3 h-3 w-20 rounded-md bg-surface-muted" />
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-2xl bg-surface-muted" />
              <Skeleton className="h-14 w-full rounded-2xl bg-surface-muted" />
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg bg-surface-muted" />
          <Skeleton className="h-10 w-24 rounded-full bg-surface-muted" />
        </div>
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-full max-w-lg rounded-xl bg-surface-muted" />
          <Skeleton className="mx-auto h-5 w-full max-w-md rounded-md bg-surface-muted" />
          <Skeleton className="mx-auto mt-4 h-12 w-40 rounded-full bg-surface-muted" />
        </div>
        <Skeleton className="mx-auto h-72 w-full max-w-3xl rounded-3xl bg-surface-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl bg-surface-muted" />
          <Skeleton className="h-32 rounded-2xl bg-surface-muted" />
          <Skeleton className="h-32 rounded-2xl bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}

export function RoutePending() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  switch (pathname) {
    case "/app":
      return <AppPageSkeleton />;
    case "/earn":
      return <EarnPageSkeleton />;
    case "/earn/add-liquidity":
      return <FormFlowSkeleton />;
    case "/ramp":
      return <FormFlowSkeleton />;
    case "/transfer":
      return <FormFlowSkeleton />;
    case "/history":
      return <ListPageSkeleton rows={5} />;
    case "/security":
      return <SettingsPageSkeleton />;
    case "/settings":
      return <SettingsPageSkeleton />;
    case "/":
      return <LandingPageSkeleton />;
    default:
      return <AppPageSkeleton />;
  }
}
