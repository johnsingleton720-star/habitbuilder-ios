# HabitBuilder.pro - Android App Build Instructions

## Overview
This is a Trusted Web Activity (TWA) Android app that wraps the HabitBuilder.pro website into a native Android app. Users will see the exact same website, but it runs fullscreen without a browser address bar — it looks and feels like a native app.

## Prerequisites
1. **Android Studio** - Download free from https://developer.android.com/studio
2. **Google Play Developer Account** - You already have this ($25 one-time fee)

## Step-by-Step: Building the APK

### Step 1: Download the project
Download the entire `twa-project` folder from Replit to your computer.
- In Replit, right-click the `twa-project` folder and select "Download as ZIP"
- Extract it to a folder on your computer

### Step 2: Open in Android Studio
1. Open Android Studio
2. Click "Open" and select the `twa-project` folder
3. Android Studio will download the required SDKs automatically (this may take a few minutes the first time)
4. Wait for the Gradle sync to complete (you'll see a progress bar at the bottom)

### Step 3: Build the signed AAB (for Play Store)
1. In Android Studio, go to **Build > Generate Signed Bundle / APK**
2. Select **Android App Bundle** and click Next
3. For Key Store Path: click "Choose existing" and select `habitbuilder-keystore.jks` from the twa-project folder
4. Enter the passwords:
   - Key store password: `habitbuilder123`
   - Key alias: `habitbuilder`  
   - Key password: `habitbuilder123`
5. Click Next
6. Select **release** as the build variant
7. Click **Create**
8. The AAB file will be created in `app/build/outputs/bundle/release/app-release.aab`

### Step 4: Build an APK (for testing on your device)
1. In Android Studio, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. The APK will be at `app/build/outputs/apk/release/app-release.apk`
3. Transfer this file to your Android phone and install it to test

## Uploading to Google Play

### Step 1: Go to Google Play Console
Visit https://play.google.com/console

### Step 2: Create a new app
1. Click "Create app"
2. App name: **HabitBuilder - AI Habit Coach**
3. Default language: English
4. App type: App
5. Free or paid: Free (revenue comes from in-app subscriptions)
6. Accept the declarations and click "Create app"

### Step 3: Set up the store listing
Fill in the following:

**Short description (80 chars max):**
Build lasting habits with AI coaching, mood tracking & personalized plans.

**Full description (4000 chars max):**
HabitBuilder.pro is your personal AI-powered habit coach. Whether you want to exercise more, read daily, meditate, or build any positive habit — HabitBuilder creates a personalized action plan designed specifically for you.

How it works:
1. Tell us the habit you want to build
2. Our AI coach interviews you to understand your lifestyle, goals, and challenges
3. You receive a customized daily, weekly, and monthly action plan
4. Follow guided sessions with timers and notes
5. Track your progress with streaks, mood tracking, and analytics

Key Features:
- AI-Powered Coaching: Get personalized advice and action plans based on behavioral psychology
- Conversational AI Chat: Talk to your AI coach anytime for motivation and guidance
- Guided Sessions: Step-by-step sessions with timers to keep you on track
- Mood Tracking: Log your mood daily and see how habits affect your wellbeing
- Habit Stacking: Link habits together for compound growth
- Streak Tracking: Stay motivated with visual streaks and achievements
- Smart Resources: AI-curated articles, books, and courses relevant to your habits
- Progress Analytics: Beautiful charts showing your improvement over time
- Accountability Partners: Share progress with friends (Premium)
- Community Forum: Connect with other habit builders (Pro & Premium)
- Dark Mode: Easy on the eyes, day or night

Subscription Plans:
- Free: 1 habit with basic AI coaching
- Pro ($6/month): Unlimited habits, advanced analytics, community access
- Premium ($15/month): Everything in Pro plus accountability partners, full community features, and advanced AI insights

Limited-Time Founding Member Annual Plans Available!

Start building better habits today — your future self will thank you.

**Screenshots:** Take screenshots from your phone after testing the app (5-8 screenshots recommended)

**App icon:** Use the 512x512 icon from `client/public/icon-512.png`

### Step 4: Upload the AAB
1. Go to "Production" in the left sidebar
2. Click "Create new release"
3. Upload the `app-release.aab` file
4. Add release notes: "Initial release of HabitBuilder - AI Habit Coach"
5. Click "Review release" then "Start rollout to Production"

### Step 5: Content rating
Complete the content rating questionnaire (your app has no violent/sexual content, so it should receive an "Everyone" rating)

### Step 6: Pricing & distribution
Select "Free" and choose the countries you want to distribute to

## Internal Testing (Recommended First)
Before publishing publicly:
1. Go to "Testing > Internal testing" in the left sidebar
2. Create an internal testing track
3. Upload the AAB there first
4. Add your email as a tester
5. You'll get a link to install the app on your phone
6. Test thoroughly before promoting to Production

## Important Notes

### Keystore Security
The `habitbuilder-keystore.jks` file and its passwords are critical:
- **BACK UP** the keystore file — if you lose it, you can never update your app on Google Play
- Store the passwords somewhere safe
- Consider changing the passwords to something more secure before publishing
- The password in this file (`habitbuilder123`) should be changed for production use

### Digital Asset Links
The website has been configured to serve a Digital Asset Links file at:
`https://habitbuilder.pro/.well-known/assetlinks.json`

This tells Android that the app is authorized to display the website in fullscreen mode (without the browser bar). This has already been set up — no action needed from you.

### Updating the App
When you update the website (habitbuilder.pro), the changes appear automatically in the app — no need to rebuild or update on Google Play. You only need to rebuild if you change app settings like the icon, name, or colors.

### Version Updates
When you do need to publish an update to Google Play:
1. In `app/build.gradle`, increment `versionCode` (e.g., from 1 to 2) and update `versionName`
2. Rebuild the AAB
3. Upload the new AAB to Google Play Console

## App Details
- Package name: `pro.habitbuilder.app`
- Website: https://habitbuilder.pro
- Theme color: #059669 (emerald green)
- Background: #f0fdf4 (light mint)
