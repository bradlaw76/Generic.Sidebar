Below is the **Build MD file** you asked for.
This one is specifically written so you can **paste it directly into VS Code Copilot Chat** and have it generate the Android phone simulator **while strictly using your existing simulator architecture**.

Save as:

```
android_phone_simulator_build_prompt.md
```

---

```md
# Android Phone Simulator – Copilot Build Prompt
Version: 1.0  
Purpose: Generate an Android phone simulator UI that integrates with the **existing Generic Softphone simulator architecture** in Dynamics 365.

This file is intended to be used directly with **VS Code Copilot Chat** to generate the project.

---

# CRITICAL ARCHITECTURE RULES

This project **must reuse the existing Generic Softphone simulator system.**

DO NOT introduce a new backend.

The Android phone UI must behave exactly like the existing simulator.

Existing architecture:

```

Android Phone Simulator
↓
localStorage (genericSimCall)
↓
Genesys Softphone.html
↓
Dynamics 365 Contact Center

```

The simulator **writes a call payload to localStorage**.

The existing softphone already listens to this key and renders the call.

The key must remain:

```

genericSimCall

```

DO NOT change this.

---

# Existing Files (Do Not Modify)

These files already exist and must not be changed.

```

SidecarItems/
Genesys Softphone.html
sidebar_generic_call_simulator.html

```

The Android simulator must behave the same as:

```

sidebar_generic_call_simulator.html

```

except it generates **outgoing calls instead of incoming calls**.

---

# Project Goal

Create a **Samsung S25 Ultra Android phone simulator UI**.

The UI allows a user to:

1. Open an Android home screen
2. Tap the Phone app
3. Select a contact
4. Place an outgoing call
5. Trigger the existing softphone

The call will then appear inside the **existing Genesys Softphone UI**.

---

# Technology Stack

Use:

```

React
TypeScript
Vite
CSS Modules

```

No backend services.

All Dataverse access must use:

```

Xrm.WebApi

```

---

# Project Structure

Generate the following project:

```

PhoneSimulator
│
├── src
│
│   ├── components
│   │
│   │   ├── PhoneFrame
│   │   ├── StatusBar
│   │   ├── HomeScreen
│   │   ├── AppGrid
│   │   ├── MicrosoftFolder
│   │   ├── PhoneApp
│   │   ├── ContactList
│   │   ├── Dialer
│   │   ├── CallingScreen
│   │   ├── InCallScreen
│   │   └── TranscriptPanel
│   │
│   ├── services
│   │
│   │   ├── dataverseService
│   │   └── callPayloadService
│   │
│   ├── models
│   │
│   │   ├── PhoneProfile.ts
│   │   ├── DemoContact.ts
│   │   └── CallPayload.ts
│   │
│   ├── assets
│   │
│   │   ├── icons
│   │   ├── audio
│   │   └── wallpapers
│   │
│   ├── App.tsx
│   └── main.tsx
│
└── index.html

```

---

# Phone Simulator UI

Simulate a **Samsung S25 Ultra**.

Phone container requirements:

```

width: 390px
height: 844px
border-radius: 28px

```

Portrait only.

Include:

```

Status Bar
Home Screen
Phone App
Calling Screen

```

---

# Status Bar

Display:

```

Time
WiFi
Signal
Battery

```

Configuration should support:

```

Static
Live

```

Values come from Dataverse configuration.

---

# Home Screen

The Android home screen must include:

Apps:

```

Phone
Messages
Chrome
Camera
Gallery
Settings

```

Also include a folder named:

```

Microsoft

```

Inside:

```

Teams
Outlook
OneDrive
Word
Excel
PowerPoint
Copilot

```

Wallpaper should load from:

```

gensoft_phonewallpaperurl

```

---

# Phone App

The phone application should contain tabs:

```

Recents
Contacts
Keypad

```

Contacts should load from Dataverse.

Required fields:

```

fullname
telephone1
contactid

```

---

# Outgoing Call Flow

User flow:

```

Home Screen
↓
Tap Phone
↓
Contacts
↓
Tap Contact
↓
Calling Screen

```

The calling screen should display:

```

Contact Name
Phone Number
Avatar
Calling...

```

Ringback tone should play.

Audio source:

```

gensoft_outgoingringtoneurl

```

---

# Call Trigger (MOST IMPORTANT)

When the user presses **Call**, generate the same payload used by the existing simulator.

Example payload:

```

{
callerName: contact.fullname,
queueName: config.queueName,
phoneNumber: contact.telephone1,
contactId: contact.contactid,
state: "CONNECTED",
startTime: new Date().toISOString(),
transcriptEnabled: config.transcriptEnabled,
transcriptText: config.transcriptText,
transcriptIntervalSeconds: config.transcriptIntervalSeconds,
softphoneConfigId: config.id
}

```

Write using:

```

localStorage.setItem("genericSimCall", JSON.stringify(call))

```

This will trigger the existing softphone.

---

# Dataverse Configuration

Load configuration from:

```

gensoft_genericsoftphone

```

Use:

```

Xrm.WebApi.retrieveMultipleRecords

```

Filter for:

```

gensoft_defaultsoftphoneconfig eq true

```

Fallback to most recent record.

---

# Existing Fields Used

Load the following fields:

```

gensoft_queuename
gensoft_ringtoneurl
gensoft_muteringtone
gensoft_popmode
gensoft_defaultcasetitle
gensoft_transcriptenabled
gensoft_transcripttext
gensoft_transcriptplaybackintervalseconds

```

---

# New Dataverse Fields

Add the following fields to table:

```

gensoft_genericsoftphone

```

---

## Phone Wallpaper

```

Schema: gensoft_phonewallpaperurl
Type: Text
Length: 1000

```

---

## Phone Theme

```

Schema: gensoft_phonetheme
Type: Choice
Values:
S25Ultra
Pixel
Generic

```

---

## Outgoing Ringback Tone

```

Schema: gensoft_outgoingringtoneurl
Type: Text
Length: 1000

```

---

## Microsoft Folder Apps JSON

```

Schema: gensoft_microsoftappsjson
Type: Multiline Text
Length: 4000

```

Example:

```

{
"apps":[
"Teams",
"Outlook",
"OneDrive",
"Word",
"Excel",
"PowerPoint",
"Copilot"
]
}

```

---

## Home Screen Apps JSON

```

Schema: gensoft_homescreenappsjson
Type: Multiline Text
Length: 4000

```

---

# Service: callPayloadService

Create a service responsible for writing the call payload.

Function:

```

simulateOutgoingCall(contact, config)

```

Implementation:

```

export function simulateOutgoingCall(contact, config) {

const call = {
callerName: contact.fullname,
queueName: config.queueName,
phoneNumber: contact.telephone1,
contactId: contact.contactid,
state: "CONNECTED",
startTime: new Date().toISOString(),
transcriptEnabled: config.transcriptEnabled,
transcriptText: config.transcriptText,
transcriptIntervalSeconds: config.transcriptIntervalSeconds,
softphoneConfigId: config.id
};

localStorage.setItem("genericSimCall", JSON.stringify(call));
}

```

---

# Demo Control Panel

Add a hidden demo panel.

Shortcut:

```

CTRL + SHIFT + D

```

Controls:

```

Select contact
Start call
End call
Skip transcript step

```

---

# NON-NEGOTIABLES

Do NOT change:

```

localStorage key: genericSimCall

```

Do NOT modify:

```

Genesys Softphone.html

```

Do NOT bypass:

```

Xrm.WebApi

```

All new functionality must be **additive only**.

---

# Expected Result

The Android simulator behaves like a real phone.

When the user places a call:

```

Phone UI
↓
localStorage payload
↓
Existing softphone receives call
↓
Dynamics Contact Center demo continues

```

No backend changes required.
```

---

✅ With the **Spec MD + Build MD** you now have:

| File                                      | Purpose                |
| ----------------------------------------- | ---------------------- |
| `android_phone_simulator_spec.md`         | Architecture contract  |
| `android_phone_simulator_build_prompt.md` | Copilot code generator |

Together they ensure:

* Copilot builds the right UI
* Your existing simulator **remains untouched**
* Dataverse fields are clearly defined
* The payload contract stays intact.

---

If you want, I can also give you **one extremely useful final MD file** that will make your demos much smoother:

```
android_phone_simulator_demo_profiles.md
```

It lets you **switch entire demo scenarios from Dataverse** (FDA recall, Veteran claims, insurance inquiry, etc.) without touching code.
