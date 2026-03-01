# iOS App Store Submission Guide — HabitBuilder

This is your complete step-by-step guide to get HabitBuilder published on the App Store. Follow each section in order.

---

## Before You Start — What You Need

- [x] Apple Developer Account ($99/year) — paid and active
- [x] iMac 2017 with Xcode 15.2 installed
- [x] HabitBuilder project downloaded to your Mac (from Replit ZIP)
- [x] The iOS project already set up (`npx cap add ios` and `pod install` completed)

---

## PART 1: App Store Connect Setup

### Step 1: Create Your App Listing

1. Open **Safari** and go to: https://appstoreconnect.apple.com
2. Sign in with your Apple Developer account
3. Click **My Apps** (the blue icon)
4. Click the **+** button in the top left → **New App**
5. Fill in these fields:

| Field | What to Enter |
|-------|---------------|
| Platform | **iOS** (check the box) |
| Name | **HabitBuilder - AI Habit Coach** |
| Primary Language | **English (U.S.)** |
| Bundle ID | **pro.habitbuilder.app** |
| SKU | **habitbuilder-pro** |
| User Access | **Full Access** |

6. Click **Create**

### Step 2: Set Up In-App Purchase Subscriptions

1. In your app page, click **Subscriptions** in the left sidebar
2. Click **Create a Subscription Group** → name it: **HabitBuilder Plans**
3. Click **Create** next to the group, then add each subscription one at a time:

**Subscription 1: Pro Monthly**
| Field | Value |
|-------|-------|
| Reference Name | Pro Monthly |
| Product ID | `pro_monthly` |
| Subscription Duration | 1 Month |
| Price | $6.99 (Tier 5) |
| Display Name | HabitBuilder Pro |
| Description | Unlimited habits, AI coaching, streak tracking, weekly reports |

**Subscription 2: Pro Annual**
| Field | Value |
|-------|-------|
| Reference Name | Pro Annual |
| Product ID | `pro_annual` |
| Subscription Duration | 1 Year |
| Price | $59.99 (Tier 37) |
| Display Name | HabitBuilder Pro (Annual) |
| Description | Unlimited habits, AI coaching, streak tracking, weekly reports. Save over 28%! |

**Subscription 3: Premium Monthly**
| Field | Value |
|-------|-------|
| Reference Name | Premium Monthly |
| Product ID | `premium_monthly` |
| Subscription Duration | 1 Month |
| Price | $14.99 (Tier 10) |
| Display Name | HabitBuilder Premium |
| Description | Everything in Pro plus Smart Planner, advanced analytics, community, mood tracking, journaling |

**Subscription 4: Premium Annual**
| Field | Value |
|-------|-------|
| Reference Name | Premium Annual |
| Product ID | `premium_annual` |
| Subscription Duration | 1 Year |
| Price | $119.99 (Tier 62) |
| Display Name | HabitBuilder Premium (Annual) |
| Description | Everything in Pro plus Smart Planner, advanced analytics, community, mood tracking, journaling. Save over 33%! |

4. For each subscription, you also need to:
   - Add at least one **Localization** (English US) with the Display Name and Description above
   - Add a **Subscription Group Localization**: Group name = "HabitBuilder Plans", custom name = "Choose Your Plan"

5. **Get Your Shared Secret** (needed for receipt validation):
   - Still in Subscriptions → click **App-Specific Shared Secret** (link near the top)
   - Click **Generate** → copy the secret
   - Go to your Replit project → Secrets → add `APPLE_SHARED_SECRET` with this value

### Step 3: Set Up Free Trial (Optional but Recommended)

For each subscription, you can add an introductory offer:
1. Click a subscription → **Introductory Offers** → **+**
2. Type: **Free Trial**
3. Duration: **3 Days** (or 7 Days)
4. This gives new subscribers a free trial before billing starts

---

## PART 2: Prepare the Xcode Project

### Step 4: Add the App Icon

1. Open **Finder** → navigate to your HabitBuilder project folder
2. Find the file: `client/public/appstore-icon-1024.png`
   - You'll need to copy this file from Replit first (download it from the Files panel)
3. Open Xcode → open the iOS project (`ios/App/App.xcworkspace`)
4. In the left sidebar, click **App** → **Assets.xcassets** → **AppIcon**
5. You'll see an empty square for the 1024x1024 icon
6. **Drag and drop** your `appstore-icon-1024.png` into the 1024x1024 slot
   - Xcode 15 uses a single 1024x1024 icon and auto-generates all other sizes
7. Make sure the icon has **no transparency** and **no alpha channel**
   - If Xcode warns about alpha, open the image in Preview → File → Export → uncheck "Alpha" → save as PNG

### Step 5: Configure Signing & Capabilities

1. In Xcode, click on the **App** project in the left sidebar
2. Select the **App** target → **Signing & Capabilities** tab
3. Check **Automatically manage signing**
4. Team: Select your Apple Developer account
5. Bundle Identifier: should already be **pro.habitbuilder.app**
6. Click **+ Capability** → search and add **In-App Purchase**
7. Under the **General** tab, verify:
   - Display Name: **HabitBuilder**
   - Version: **1.0.0**
   - Build: **1**
   - Minimum Deployments: **iOS 16.0**

### Step 6: Build and Sync the Web App

Open **Terminal** on your Mac and run these commands:

```bash
# Navigate to your project folder
cd ~/Downloads/habitbuilder   # (or wherever your project is)

# Install dependencies (if not done already)
npm install

# Build the web app for production
npm run build

# Sync the built files to the iOS project
npx cap sync ios
```

### Step 7: Archive and Upload

1. Back in **Xcode**, select the build destination at the top:
   - Click the device dropdown → select **Any iOS Device (arm64)**
   - Do NOT select a simulator
2. Go to **Product** menu → **Archive**
   - This may take 5-10 minutes
   - If you get build errors, check the error messages (common fix: clean build with Product → Clean Build Folder, then try again)
3. When the archive completes, the **Organizer** window opens automatically
4. Select your archive → click **Distribute App**
5. Choose **App Store Connect** → click **Next**
6. Choose **Upload** → click **Next**
7. Leave the default options checked → click **Next**
8. Choose **Automatically manage signing** → click **Next**
9. Click **Upload**
10. Wait for the upload to complete (may take a few minutes depending on your internet speed)

The build will appear in App Store Connect within 5-30 minutes after uploading.

---

## PART 3: Complete the App Store Listing

### Step 8: Upload Screenshots

Go back to App Store Connect → your app → **App Information**

Click on **1.0 Prepare for Submission** in the left sidebar.

**iPhone 6.7" Display Screenshots** (required — iPhone 15 Pro Max size):
Upload these files from `attached_assets/appstore-screenshots/`:
1. `iphone-01-dashboard.png` — Dashboard view
2. `iphone-02-ai-coach.png` — AI Coaching
3. `iphone-03-planner.png` — Smart Daily Planner
4. `iphone-04-progress.png` — Progress tracking
5. `iphone-05-mood.png` — Mood & Journal
6. `iphone-06-achievements.png` — Achievements

**iPhone 6.5" Display**: You can check "Use 6.7-inch Display screenshots" to reuse the same images.

**iPhone 5.5" Display**: You can also reuse the 6.7" screenshots.

**iPad Pro 12.9" (Optional but recommended)**:
1. `ipad-01-dashboard.png`
2. `ipad-02-coaching.png`
3. `ipad-03-analytics.png`

### Step 9: Fill In App Metadata

Copy and paste the following into the corresponding fields:

**Promotional Text** (can be changed anytime without a new review):
```
Build life-changing habits with your personal AI coach. Start your free trial today!
```

**Description**:
```
Build lasting habits with AI-powered coaching. HabitBuilder creates personalized action plans tailored to your goals, then guides you through daily sessions with timers, notes, and progress tracking.

FEATURES:
• AI Coaching Interview — Answer questions about your goals, and AI creates a custom action plan
• Guided Sessions — Step-by-step walkthroughs with built-in timers and note-taking
• Smart Daily Planner — AI-optimized daily schedule that adapts to your energy levels
• Streaks & Achievements — Stay motivated with streak tracking and milestone rewards
• XP & Leveling — Earn experience points and level up as you build consistency
• Progress Analytics — Track your journey with charts and insights
• Community Forum — Connect with others on their habit-building journey
• Mood & Journal — Track your wellbeing alongside your habits
• Accountability Partners — Share progress with friends for extra motivation

FREE FEATURES:
• 1 habit with AI-generated action plan
• 3 guided sessions per week
• Template library access
• Basic progress tracking

PRO ($6.99/month or $59.99/year):
• Unlimited habits and sessions
• AI coaching insights and summaries
• Streak tracking and achievements
• Weekly progress reports
• Adaptive coaching check-ins

PREMIUM ($14.99/month or $119.99/year):
• Everything in Pro
• Smart Daily Planner with AI scheduling
• Advanced analytics with trend insights
• Accountability partners
• Community forum access
• Mood tracking and journaling
• Voice-enabled coaching

Start your habit-building journey today with a free trial!
```

**Keywords** (100 character limit, comma-separated):
```
habit tracker,habits,AI coach,daily planner,goal setting,productivity,wellness,self improvement,routine
```

**Support URL**:
```
https://habitbuilder.pro/about
```

**Marketing URL** (optional):
```
https://habitbuilder.pro
```

**Privacy Policy URL**:
```
https://habitbuilder.pro/privacy
```

### Step 10: App Review Information

**Contact Information** (for Apple reviewers):
- First Name: *(your first name)*
- Last Name: *(your last name)*
- Phone: *(your phone number)*
- Email: *(your email)*

**Notes for Reviewers** (paste this):
```
HabitBuilder is a web-based app wrapped in a Capacitor WebView for native iOS distribution. 

The app requires an internet connection to function. Users sign in via Replit authentication (OpenID Connect) which opens a brief browser window for login.

To test the app:
1. Open the app — you'll see the landing page
2. Tap "Get Started" or "Sign In"
3. Create an account or sign in
4. The onboarding wizard will guide you to create your first habit
5. The AI will generate a personalized action plan
6. You can explore the dashboard, track habits, and view your progress

In-App Purchases:
- The app offers free tier functionality (1 habit, 3 sessions/week)
- Pro and Premium subscriptions unlock additional features
- A "Restore Purchases" button is available in Settings

The app uses OpenAI for AI-powered coaching (via API, no user data is stored by OpenAI).
```

### Step 11: Age Rating

Fill out the age rating questionnaire. For HabitBuilder, select:
- Violence: **None**
- Sexual Content: **None**
- Profanity: **None**
- Drugs: **None**
- Gambling: **None**
- Horror: **None**
- Mature/Suggestive: **None**
- Medical/Treatment: **None**
- Alcohol/Tobacco/Drugs: **None**
- Unrestricted Web Access: **No** (the WebView is limited to your app)

This should give you a rating of **4+**.

### Step 12: App Privacy

Apple requires you to declare what data your app collects. Go to **App Privacy** in the left sidebar.

Click **Get Started** and declare:

**Data Types Collected:**

| Category | Data Type | Purpose | Linked to User? |
|----------|-----------|---------|-----------------|
| Contact Info | Email Address | App Functionality | Yes |
| Identifiers | User ID | App Functionality | Yes |
| Usage Data | Product Interaction | Analytics | Yes |
| Health & Fitness | Health (mood data) | App Functionality | Yes |

**Data NOT Collected:**
- Location, Financial Info, Browsing History, Search History, Diagnostics, etc.

### Step 13: Set Pricing

1. In the left sidebar, click **Pricing and Availability**
2. Price: **Free** (the app itself is free; revenue comes from in-app subscriptions)
3. Availability: Select all countries you want (typically all 175)

---

## PART 4: Submit for Review

### Step 14: Final Checks

Before submitting, verify everything is in place:

- [ ] App icon uploaded in Xcode Assets.xcassets
- [ ] At least 3 iPhone screenshots uploaded in App Store Connect
- [ ] Description, keywords, and URLs filled in
- [ ] Age rating questionnaire completed
- [ ] App privacy declarations completed
- [ ] In-App Purchase subscriptions created and ready
- [ ] Build uploaded and visible in App Store Connect
- [ ] Review contact info provided

### Step 15: Select Your Build and Submit

1. In App Store Connect → your app → **1.0 Prepare for Submission**
2. Scroll down to **Build** section → click **Select a Build**
   - Choose the build you uploaded from Xcode
   - If no build appears, wait 10-30 minutes for Apple's processing
3. Scroll to the top and verify all sections show green checkmarks
4. Click **Add for Review** (top right)
5. On the next screen, click **Submit to App Review**

### What Happens Next

- Apple typically reviews apps within **24-48 hours** (sometimes faster)
- You'll receive email notifications about the review status
- If approved: choose to release immediately or on a specific date
- If rejected: Apple will tell you exactly what to fix — make the changes and resubmit

---

## Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| "No eligible build" in App Store Connect | Wait 10-30 minutes after uploading; the build needs processing |
| Archive fails in Xcode | Product → Clean Build Folder, then try Archive again |
| Signing error | Make sure "Automatically manage signing" is checked and your team is selected |
| Icon has alpha channel warning | Open icon in Preview → Export → uncheck "Alpha" → save |
| Build rejected for missing IAP | Make sure the In-App Purchase capability is added in Xcode |
| Screenshots wrong size | Use the provided screenshots; they work for all required sizes |
| "App uses non-public API" | Run `npx cap sync ios` again to ensure latest Capacitor build |

---

## Updating the App Later

When you make changes to HabitBuilder:

1. Make your changes in Replit
2. Download the updated project (or use Git)
3. On your Mac:
   ```bash
   cd ~/Downloads/habitbuilder
   npm install
   npm run build
   npx cap sync ios
   ```
4. In Xcode:
   - Increment the **Build** number (e.g., 1 → 2)
   - Optionally increment the **Version** (e.g., 1.0.0 → 1.0.1)
   - Product → Archive → Distribute App → Upload
5. In App Store Connect:
   - Select the new build
   - Add any "What's New" text
   - Submit for review

---

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| App Icon (1024x1024) | `client/public/appstore-icon-1024.png` | App Store & device icon |
| iPhone Screenshots (6) | `attached_assets/appstore-screenshots/iphone-*.png` | App Store listing |
| iPad Screenshots (3) | `attached_assets/appstore-screenshots/ipad-*.png` | App Store listing (optional) |
| This guide | `ios-appstore-submission-guide.md` | Step-by-step instructions |
| Build instructions | `ios-build-instructions.md` | Detailed build options |
