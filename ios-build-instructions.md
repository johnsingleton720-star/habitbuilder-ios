# iOS App Build Instructions for HabitBuilder

## What You Need Before Starting

1. **Apple Developer Account** ($99/year) — https://developer.apple.com/programs
2. **A way to run Xcode** — you need one of these three options (detailed below):
   - Option A: MacinCloud (rent a Mac remotely)
   - Option B: Codemagic CI/CD (automated cloud builds)
   - Option C: A physical Mac with Xcode 15+

---

## Step 1: Set Up Your Apple Developer Account

1. Go to https://developer.apple.com/programs and enroll ($99/year)
2. Wait for approval (usually 24-48 hours)
3. Once approved, sign in to https://appstoreconnect.apple.com
4. Create a new App:
   - Platform: **iOS**
   - Name: **HabitBuilder**
   - Bundle ID: **pro.habitbuilder.app**
   - SKU: **habitbuilder-pro**
   - Primary Language: **English (U.S.)**

## Step 2: Set Up In-App Purchases in App Store Connect

1. Go to your app in App Store Connect
2. Navigate to the **Subscriptions** tab
3. Create a Subscription Group called **HabitBuilder Pro**
4. Add these subscription products:

| Reference Name   | Product ID       | Price   | Duration |
|-----------------|-----------------|---------|----------|
| Pro Monthly     | pro_monthly     | $6.99   | 1 Month  |
| Pro Annual      | pro_annual      | $59.99  | 1 Year   |
| Premium Monthly | premium_monthly | $14.99  | 1 Month  |
| Premium Annual  | premium_annual  | $119.99 | 1 Year   |

5. Get your **App-Specific Shared Secret**:
   - App Store Connect → Your App → In-App Purchases → App-Specific Shared Secret
   - Save this — you'll need to add it as the `APPLE_SHARED_SECRET` environment variable in your Replit project

## Step 3: Create Certificates and Provisioning Profiles

Before building, you need Apple signing credentials:

1. **Create a Distribution Certificate:**
   - Go to https://developer.apple.com/account/resources/certificates
   - Click the **+** button → choose **Apple Distribution**
   - Follow the steps (you'll need to create a Certificate Signing Request — the cloud Mac or Codemagic handles this for you)

2. **Create an App ID:**
   - Go to https://developer.apple.com/account/resources/identifiers
   - Click **+** → choose **App IDs** → **App**
   - Bundle ID: **pro.habitbuilder.app** (Explicit)
   - Enable **In-App Purchase** capability

3. **Create a Provisioning Profile:**
   - Go to https://developer.apple.com/account/resources/profiles
   - Click **+** → choose **App Store Connect**
   - Select your App ID and Distribution Certificate
   - Download the profile

---

## Build Option A: MacinCloud (Easiest Without a Mac)

MacinCloud lets you rent a Mac remotely that you access from any computer via a remote desktop app.

### Getting Started

1. Go to https://www.macincloud.com
2. Sign up for a **Pay-As-You-Go** or **Fixed Plan** (starts around $20-30/month)
   - Choose a plan that includes **Xcode** pre-installed
   - Select a recent macOS version (Sonoma or later)
3. After signup, you'll get login credentials for remote access
4. Download **Microsoft Remote Desktop** (free, works on Windows/Mac/Linux) or use their browser-based access

### Building Your App

Once connected to your cloud Mac:

```bash
# 1. Open Terminal on the Mac

# 2. Clone your project (push your code to GitHub first, or use Replit's Git integration)
git clone https://github.com/YOUR-USERNAME/habitbuilder.git
cd habitbuilder

# 3. Install Node.js if not already installed
# (MacinCloud usually has it, but check with: node --version)
# If needed: brew install node

# 4. Install project dependencies
npm install

# 5. Build the web app
npm run build

# 6. Add the iOS platform
npx cap add ios

# 7. Sync web assets to the iOS project
npx cap sync ios

# 8. Open in Xcode
npx cap open ios
```

### In Xcode

1. Select the **App** project in the left sidebar
2. Under **Signing & Capabilities**:
   - Select your Team (your Apple Developer account)
   - Bundle Identifier should be: **pro.habitbuilder.app**
   - Click **+ Capability** and add **In-App Purchase**
3. Under **General**:
   - Display Name: **HabitBuilder**
   - Deployment Target: **iOS 16.0**
   - Devices: **iPhone**
4. **Add the App Icon:**
   - In the left sidebar, open **Assets.xcassets** → **AppIcon**
   - Drag in your 1024x1024 PNG icon (no transparency, no rounded corners — Apple adds those automatically)

### Archive and Upload

1. In Xcode, set the build target to **Any iOS Device (arm64)** (not a simulator)
2. Go to **Product** → **Archive**
3. Wait for the build to complete
4. In the Archives window, click **Distribute App**
5. Choose **App Store Connect** → **Upload**
6. Follow the prompts to sign and upload
7. The build will appear in App Store Connect within a few minutes

---

## Build Option B: Codemagic CI/CD (Automated)

Codemagic is a cloud build service that can automatically build, sign, and upload your iOS app. Great for ongoing updates.

### Getting Started

1. Go to https://codemagic.io and sign up (free tier includes 500 build minutes/month)
2. Push your code to GitHub, GitLab, or Bitbucket
3. Connect your repository to Codemagic

### Configure the Build

1. In Codemagic, add your app and choose **Capacitor/Ionic** as the project type

2. **Code Signing Setup:**
   - Go to your app settings → **Code signing**
   - Upload your Apple Distribution Certificate (.p12 file) and password
   - Upload your Provisioning Profile
   - Or use **Automatic code signing** — enter your Apple ID and app-specific password, and Codemagic handles certificates for you

3. **Build Configuration** (codemagic.yaml in your project root):

```yaml
workflows:
  ios-release:
    name: iOS App Store Release
    max_build_duration: 60
    instance_type: mac_mini_m2
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: pro.habitbuilder.app
      node: 18
    scripts:
      - name: Install dependencies
        script: npm install
      - name: Build web app
        script: npm run build
      - name: Add iOS platform
        script: npx cap add ios || true
      - name: Sync Capacitor
        script: npx cap sync ios
      - name: Set up code signing
        script: xcode-project use-profiles
      - name: Build IPA
        script: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/ipa \
            -exportOptionsPlist exportOptions.plist
    artifacts:
      - ios/App/build/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
```

4. **App Store Connect Integration:**
   - In Codemagic settings, connect your App Store Connect account
   - This lets Codemagic automatically upload builds to TestFlight

5. **Trigger a build** — click "Start new build" or push to your main branch

---

## Build Option C: Using a Physical Mac

If you have access to a Mac with macOS Sonoma+ and Xcode 15+:

```bash
# Clone the project to your Mac
git clone https://github.com/YOUR-USERNAME/habitbuilder.git
cd habitbuilder

# Install dependencies
npm install

# Build the web app
npm run build

# Add and sync iOS platform
npx cap add ios
npx cap sync ios

# Open in Xcode
npx cap open ios
```

Then follow the same Xcode steps as in Option A above.

---

## Step 4: Prepare Your App Store Listing

In App Store Connect, fill in these details for your app:

### Required Screenshots (PNG or JPEG)
You need at least 3 screenshots per required device size:
- **iPhone 6.7"** (1290 x 2796px) — iPhone 15 Pro Max
- **iPhone 6.5"** (1284 x 2778px) — iPhone 14 Plus
- **iPhone 5.5"** (1242 x 2208px) — iPhone 8 Plus

Suggested screenshots showing:
1. Dashboard / habit tracking overview
2. AI coaching or guided session in action
3. Progress analytics or achievements

Tip: You can take screenshots from the iOS Simulator in Xcode, or use a mockup tool like shots.so or mockuphone.com to create professional-looking screenshots.

### App Icon
- 1024x1024px PNG, no transparency, no rounded corners
- Apple automatically applies the rounded corner mask

### Required Metadata

| Field | Value |
|-------|-------|
| **App Name** | HabitBuilder - AI Habit Coach |
| **Subtitle** | Build Better Habits with AI |
| **Category** | Health & Fitness (primary), Productivity (secondary) |
| **Keywords** | habit tracker, habit building, AI coach, daily habits, goal setting, habit stacking, productivity, wellness, self improvement, routine |
| **Privacy Policy URL** | https://habitbuilder.pro/privacy |
| **Support URL** | https://habitbuilder.pro/about |
| **Age Rating** | 4+ |
| **Price** | Free (with in-app purchases) |

### App Description

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

FREE FEATURES:
• 1 habit with AI-generated action plan
• 3 guided sessions per week
• Template library access

PRO ($6.99/month or $59.99/year):
• Unlimited habits and sessions
• AI coaching insights and summaries
• Streak tracking and achievements
• Weekly progress reports

PREMIUM ($14.99/month or $119.99/year):
• Everything in Pro
• Smart Daily Planner with AI scheduling
• Advanced analytics with trend insights
• Accountability partners
• Community forum access
• Mood tracking and journaling

Start your habit-building journey today with a free trial!
```

## Step 5: Submit for Review

1. In App Store Connect, make sure all required fields are filled in
2. Select your uploaded build (from Xcode or Codemagic)
3. Answer the export compliance questions (select "No" for encryption if you only use HTTPS)
4. Click **Submit for Review**
5. Apple typically reviews within 1-3 business days

## Common Rejection Reasons to Avoid

| Issue | How to Prevent |
|-------|---------------|
| App crashes on launch | Test thoroughly in Simulator and on a real device |
| Broken links | Make sure privacy policy and support URLs work |
| Not using Apple IAP | Digital subscriptions MUST use Apple's in-app purchase (already set up) |
| Misleading screenshots | Screenshots must show actual app content |
| Login issues | Test that Replit Auth works in the WebView |
| Missing restore button | Include a "Restore Purchases" button (already implemented in Paywall) |
| Incomplete metadata | Fill in ALL required fields in App Store Connect |

## After Approval

Once Apple approves your app:
1. Choose a release date (or release immediately)
2. Your app will be live on the App Store!
3. For updates: repeat the build and upload process with an incremented version number

## Updating the App

For future updates:
1. Make your changes in Replit
2. Increment the version in Xcode (or codemagic.yaml)
3. Build and upload again using your chosen method
4. Submit the new version for review

## Environment Variables

Make sure `APPLE_SHARED_SECRET` is set in your Replit project's environment variables for receipt validation.
