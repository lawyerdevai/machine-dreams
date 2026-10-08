export type WeekStats = {
  fills: number;       // number of Pixel Market fills
  volumeEth: number;   // total ETH moved
  churn: number;       // listings opened + cancelled
  wallets: number;     // unique wallets (buyers + sellers)
  volatility: number;  // 0..1, (high - low) / average of daily candles
};

/** A scene plays for one week. It is written at the start of the week from the PREVIOUS week's totals (`basis`),
 *  then replayed all week with that week's own numbers so far. `daily[i]` = cumulative numbers at the end of day i+1. */
export type WeekRecord = {
  weekKey: string;           // Monday of the week the scene plays in, UTC, "YYYY-MM-DD"
  scene: string;             // the scene file Claude wrote (public behind an optional link)
  sha256: string;            // hash of `scene`; publish this at mint
  title: string;
  model: string;
  createdAt: string;
  published: boolean;
  genesis?: boolean;         // true for the launch week: no earlier week existed, so the theme is the absence of data
  basis?: WeekStats | null;  // last week's totals, the theme the scene was written from (null in genesis)
  daily?: WeekStats[];       // filled in when the week closes
  stats?: WeekStats;         // legacy field from the first version; ignored when `daily` exists
};
