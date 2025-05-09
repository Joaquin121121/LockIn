# Lock In Timer

A productivity timer application built with React that helps you stay focused and manage your time effectively.

![Lock In Timer](screenshot.png)

## Features

- Three timer modes:
  - **Lock In**: Main focus timer (default 90 minutes)
  - **Small Break**: Short rest period (default 20 minutes)
  - **Long Break**: Extended rest period (default 45 minutes)
- Color-coded interface that changes based on the active timer mode
- **Overtime mode** allowing the timer to continue tracking time after completion
- **Partial completion** support for tracking incomplete focus sessions
- Customizable timer durations
- Report view with calendar display showing daily productivity
- **Statistics dashboard** showing focus patterns and productivity insights
- Sound notifications:
  - Sound when timer completes
  - Sound when starting a Lock In session
- **Cross-device syncing** with Firebase Firestore

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- Firebase account (for data syncing)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/lockin-timer.git
cd lockin-timer
```

2. Install dependencies

```bash
npm install
```

3. Configure Firebase (see [Firebase Setup](#firebase-setup) section below)

4. Start the development server

```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Firebase Setup

To enable data syncing across devices, you need to set up a Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup steps
3. Once your project is created, click on the web icon (</>) to add a web app to your project
4. Register your app with a nickname (e.g., "Lock In Timer")
5. Copy the firebaseConfig object that's provided
6. Open `src/firebase.ts` in the project and replace the placeholder config with your own:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

7. Enable Firestore Database:

   - In the Firebase Console, click on "Firestore Database" in the left sidebar
   - Click "Create database"
   - Choose "Start in production mode" and select a database location close to you
   - Click "Enable"

8. Set up Firestore rules to allow read and write without authentication:
   - Go to the "Rules" tab in Firestore
   - Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note**: These rules allow anyone to read and write to your database. This is fine for personal use, but not for a multi-user application with sensitive data.

## Usage

1. Select a timer mode: Lock In, Small Break, or Long Break
2. Press the START button to begin the timer (a sound will play when starting Lock In mode)
3. The timer will countdown to zero and play a notification sound when complete
4. For Lock In timers, you have several options:
   - Let the timer continue running in overtime mode to track additional work time
   - Press COMPLETE at any time to save the session (including partial completions)
   - Press RESET to discard the timer and start over
5. View your productivity report by clicking the "Report" button
6. Analyze your focus patterns by clicking the "Get Stats" button
7. Customize timer durations by clicking the "Setting" button

## Overtime Feature

The overtime feature allows you to continue working past the set timer duration:

- When a Lock In timer reaches zero, it will:
  - Play the completion sound
  - Change to overtime mode (indicated by yellow timer display)
  - Continue counting (showing negative time)
  - Track overtime separately from regular time
- To complete a session with overtime:
  - Click the COMPLETE button that appears when in overtime mode
  - The session will be saved with both the regular duration and overtime recorded
- In statistics and reports:
  - Overtime is highlighted in calendar views
  - Statistics show both regular time and overtime
  - Special overtime analysis shows days with most overtime
  - Visual indicators in charts show the proportion of overtime

## Partial Completion Feature

The partial completion feature allows you to track sessions you don't complete fully:

- When you start a timer but stop before it reaches zero:
  - The COMPLETE button becomes available
  - Pressing it will save only the time you actually spent, not the full timer duration
  - A partial completion indicator shows how much time you've used
- This is useful for:
  - When you need to stop work earlier than planned
  - Recording accurate time usage even for incomplete sessions
  - Maintaining honest productivity metrics
- In statistics and reports:
  - Partial sessions are counted toward your total time
  - All reports reflect the actual time spent, not the planned time

## Data Structure

The app uses Firebase Firestore with the following data structure:

### Collections

1. **settings**

   - Contains timer configuration data
   - Document ID: `timer_settings`
   - Fields:
     - `Lock In`: duration in seconds
     - `Small Break`: duration in seconds
     - `Long Break`: duration in seconds

2. **sessions**
   - Contains each completed focus session
   - Auto-generated document IDs
   - Fields:
     - `date`: string (YYYY-MM-DD format)
     - `type`: string (timer type)
     - `duration`: number (seconds)
     - `overtime`: number (seconds beyond the set timer)
     - `isPartialCompletion`: boolean (indicates if session was completed early)
     - `completed`: boolean
     - `timestamp`: Firestore timestamp

## Statistics Feature

The Stats dashboard provides insights into your productivity patterns:

- **Time Period Selection**: View data for the last week, last two weeks, or last month
- **Total Focus Time**: See how much time you've spent focusing (including overtime)
- **Overtime Analysis**: Special section showing how much overtime you've worked
- **Average Daily Focus**: Understand your typical daily focus time
- **Day Analysis**: Discover your most and least productive days of the week
- **Daily Breakdown**: Visualize your productivity patterns across different days

## Customization

### Timer Settings

You can adjust the duration of each timer mode in the Settings panel:

1. Click the "Setting" button in the top right
2. Change the values for each timer type
3. Click "Save" to apply your changes (settings sync across devices)

Default timer durations:

- Lock In: 90 minutes
- Small Break: 20 minutes
- Long Break: 45 minutes

### Timer Sounds

To customize the timer sounds:

1. Replace the files in the `public/sounds/` directory:
   - `timer-complete.mp3`: Played when a timer completes
   - `lock-in.mp3`: Played when starting a Lock In timer session
2. Make sure the files are in MP3 format and named exactly as specified

## Building for Production

To create a production build:

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Technologies Used

- React
- TypeScript
- CSS
- Firebase/Firestore (for cross-device data syncing)
- date-fns (for date handling and calculations)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the Pomodoro Technique by Francesco Cirillo
- Design inspired by modern productivity applications
