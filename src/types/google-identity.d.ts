// Google Identity Services (GIS) — Type declarations
// Docs: https://developers.google.com/identity/gsi/web/reference/js-reference

export {};

interface GoogleCredentialResponse {
  credential: string;          // JWT ID token from Google
  select_by: string;
  clientId?: string;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
  locale?: string;
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  ux_mode?: 'popup' | 'redirect';
  nonce?: string;
}

interface GoogleAccountsId {
  initialize: (config: GoogleInitConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
  prompt: (momentListener?: (notification: PromptMomentNotification) => void) => void;
  disableAutoSelect: () => void;
  revoke: (hint: string, callback: () => void) => void;
  cancel: () => void;
}

interface PromptMomentNotification {
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getMomentType: () => string;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}
