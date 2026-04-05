import { registerPlugin } from '@capacitor/core';

export interface AppReviewPlugin {
  requestReview(): Promise<void>;
}

const AppReview = registerPlugin<AppReviewPlugin>('AppReview', {
  web: () => ({
    requestReview: async () => {
    },
  }),
});

export { AppReview };
