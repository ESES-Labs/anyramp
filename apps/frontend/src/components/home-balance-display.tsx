export function HomeBalanceAmount({ balance }: { balance: number | null }) {
  const value = balance ?? 0;
  const [dollars, cents] = value.toFixed(2).split(".");

  return (
    <h1 className="text-4xl font-medium tracking-tight">
      ${Number(dollars).toLocaleString("en-US")}
      <span className="text-muted-foreground">.{cents}</span>
    </h1>
  );
}

export function HomeBalanceSubtitle({
  settledCount,
  hint,
}: {
  settledCount: number;
  hint?: string;
}) {
  return (
    <p className="pt-1 text-xs text-muted-foreground">
      {hint ??
        `${settledCount} settlement${settledCount === 1 ? "" : "s"} verified on Stellar by ZK`}
    </p>
  );
}

export function HomeAssetAmount({ balance }: { balance: number | null }) {
  const value = balance ?? 0;

  return (
    <>
      <p className="font-medium">{value.toFixed(2)}</p>
      <p className="text-xs text-muted-foreground">${value.toFixed(2)}</p>
    </>
  );
}
