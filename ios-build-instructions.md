# iOS App Build Instructions for HabitBuilder

## Prerequisites
- macOS computer with Xcode 15+ installed
- Apple Developer Account ($99/year) - https://developer.apple.com/programs
- Node.js 18+ installed on your Mac

## Step 1: Set Up Apple Developer Account
1. Go to https://developer.apple.com/programs and enroll
2. Once approved, sign in to https://appstoreconnect.apple.com
3. Create a new App:
   - Platform: iOS
   - Name: HabitBuilder
   - Bundle ID: pro.habitbuilder.app
   - SKU: habitbuilder-pro
   - Primary Language: English (U.S.)

## Step 2: Set Up In-App Purchases in App Store Connect
1. Go to your app in App Store Connect
2. Navigate to "Subscriptions" tab
3. Create a Subscription Group called "HabitBuilder Pro"
4. Add these subscription products:

| Reference Name | Product ID | Price | Duration |
|---------------|-----------|-------|----------|
| Pro Monthly | pro_monthly | $6.99 | 1 Month |
| Pro Annual | pro_annual | $59.99 | 1 Year |
| Premium Monthly | premium_monthly | $14.99 | 1 Month |
| Premium Annual | premium_annual | $119.99 | 1 Year |

Note: Apple takes 15-30% commission. Prices adjusted accordingly.

5. Get your App-Specific Shared Secret:
   - App Store Connect > Your App > In-App Purchases > App-Specific Shared Secret
   - Save this as APPLE_SHARED_SECRET in your environment variables

## Step 3: Clone and Build on Mac

```bash
# Clone the project to your Mac
git clone <your-repo-url> habitbuilder
cd habitbuilder

# Install dependencies
npm install

# Build the web app
npm run build

# Initialize iOS platform
npx cap add ios

# Sync web assets to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Step 4: Configure Xcode Project
1. In Xcode, select the project in the navigator
2. Under "Signing & Capabilities":
   - Select your Team (your Apple Developer account)
   - Bundle Identifier: pro.habitbuilder.app
   - Enable "In-App Purchase" capability
3. Under "General":
   - Display Name: HabitBuilder
   - Deployment Target: iOS 16.0
   - Device: iPhone (Universal if desired)

## Step 5: App Store Listing Requirements
Prepare these assets for App Store Connect:

### Required Screenshots (PNG or JPEG)
- iPhone 6.7" (1290 x 2796px) - iPhone 15 Pro Max
- iPhone 6.5" (1284 x 2778px) - iPhone 14 Plus
- iPhone 5.5" (1242 x 2208px) - iPhone 8 Plus

You need at least 3 screenshots per device size showing:
1. Landing/dashboard screen
2. Habit tracking in action
3. AI coaching or guided session

### App Icon
- 1024x1024px PNG, no transparency, no rounded corners
- Apple automatically adds rounded corners

### Required Information
- **App Name**: HabitBuilder (or "HabitBuilder - AI Habit Coach")
- **Subtitle**: "Build Better Habits with AI" (max 30 chars)
- **Category**: Health & Fitness (primary), Productivity (secondary)
- **Description**: (see below)
- **Keywords**: habit tracker, habit building, AI coach, daily habits, goal setting, habit stacking, productivity, wellness, self improvement, routine (max 100 chars total)
- **Privacy Policy URL**: https://habitbuilder.pro/privacy
- **Support URL**: https://habitbuilder.pro/about
- **Age Rating**: 4+
- **Price**: Free (with in-app purchases)

### Suggested App Description
```
Build lasting habits with AI-powered coaching. HabitBuilder creates personalized action plans tailored to your goals, then guides you through daily sessions with timers, notes, and progress tracking.

FEATURES:
- AI Coaching Interview: Answer questions about your goals, and AI creates a custom action plan
- Guided Sessions: Step-by-step walkthroughs with built-in timers and note-taking
- Streaks & Achievements: Stay motivated with streak tracking and milestone rewards
- XP & Leveling: Earn experience points and level up as you build consistency
- Progress Analytics: Track your journey with charts and insights
- Community Forum: Connect with others on their habit-building journey

FREE FEATURES:
- 1 habit with AI-generated action plan
- 3 guided sessions per week
- Template library access

PRO ($6.99/month):
- Unlimited habits and sessions
- AI coaching insights and summaries
- Streak tracking and achievements
- Weekly progress reports

PREMIUM ($14.99/month):
- Everything in Pro
- AI Coach Chat for real-time guidance
- Advanced analytics with data export
- Habit stacking and voice notes
- Accountability partners
- Community forum access

Start your habit-building journey today with a free trial!
```

## Step 6: Submit for Review
1. In App Store Connect, fill in all required fields
2. Upload your build from Xcode (Product > Archive > Distribute App)
3. Submit for review
4. Apple typically reviews within 1-3 business days

## Common Rejection Reasons to Avoid
- App crashes on launch
- Broken links or missing privacy policy
- Not using Apple's in-app purchase for digital subscriptions
- Misleading screenshots or descriptions
- Login issues (Replit Auth needs to work via web view)

## Environment Variables Needed
Add APPLE_SHARED_SECRET to your server environment for receipt validation.
