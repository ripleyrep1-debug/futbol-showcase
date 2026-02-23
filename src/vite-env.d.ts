/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    "api-sports-widget": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        "data-type"?: string;
        "data-key"?: string;
        "data-sport"?: string;
        "data-lang"?: string;
        "data-theme"?: string;
        "data-show-logos"?: string;
        "data-show-errors"?: string;
        "data-timezone"?: string;
        "data-date"?: string;
        "data-league"?: string;
        "data-season"?: string;
        "data-country"?: string;
        "data-refresh"?: string;
        "data-show-toolbar"?: string;
        "data-tab"?: string;
        "data-games-style"?: string;
        "data-target-game"?: string;
        "data-target-standings"?: string;
        "data-target-team"?: string;
        "data-target-player"?: string;
        "data-target-league"?: string;
        "data-standings"?: string;
        "data-game-id"?: string;
        "data-game-tab"?: string;
        "data-team-id"?: string;
        "data-team-tab"?: string;
        "data-team-statistics"?: string;
        "data-team-squad"?: string;
        "data-player-id"?: string;
        "data-player-statistics"?: string;
        "data-player-trophies"?: string;
        "data-player-injuries"?: string;
        "data-h2h"?: string;
        "data-custom-lang"?: string;
        "data-logo-url"?: string;
        "data-favorite"?: string;
      },
      HTMLElement
    >;
  }
}
