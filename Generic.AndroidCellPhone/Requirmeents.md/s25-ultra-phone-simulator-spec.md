Yes — after reviewing the two files you uploaded, the **current MD prompt I gave earlier does *not yet clearly enforce reuse of the existing simulator architecture***. Your system already has a defined contract:

* **Storage key:** `genericSimCall`
* **Simulator writer:** `sidebar_generic_call_simulator.html`
* **Softphone reader/UI:** `Genesys Softphone.html`
* **Config source:** `gensoft_genericsoftphone` Dataverse table
* **Auth model:** `Xrm.WebApi`
* **Integration mechanism:** **localStorage event + shared payload**

That architecture must **not change**. Your phone UI must **write to the same payload structure** used today. The simulator currently triggers calls by writing a JSON payload with `state: "RINGING"` into localStorage under the key `genericSimCall` .
The Genesys softphone listens for this value and renders the call UI accordingly .

So the Android phone simulator must **act exactly like the existing simulator**, except the state will start as **OUTGOING** instead of **RINGING**.

Below is the **corrected MD spec** you should use.

---

# Updated MD File

Save as:

```
android_phone_simulator_spec.md
```

---

```md
# Android Phone Simulator – Architecture Spec
Version: 1.1  
Author: Bradley Law  
Purpose: Android device UI that uses the **existing Generic Softphone simulator architecture**

---

# Critical Architecture Rule

The Android phone simulator **must reuse the existing simulator architecture.**

DO NOT introduce a new backend.

The phone UI must interact with the system exactly the same way the current simulator does.

### Existing mechanism

Simulator writes to:

```

localStorage key = genericSimCall

```

Softphone listens to that key and renders the call.

---

# Existing Simulator Architecture

Current system components:

| Component | Responsibility |
|---|---|
Generic Call Simulator | Creates simulated call payload |
Genesys Softphone | Renders call UI |
Dataverse table `gensoft_genericsoftphone` | Stores configuration |
Xrm.WebApi | Retrieves configuration |
localStorage `genericSimCall` | Event transport |

The call simulator writes the call payload with:

```

state: RINGING

```

to simulate an incoming call.

The Android simulator must instead write:

```

state: OUTGOING

```

or optionally:

```

state: CONNECTED

```

depending on the demo scenario.

---

# Required Payload Format

The new phone simulator must generate **the same payload format** currently used by the Generic Call Simulator.

Example payload:

```

{
callerName: "FDA Safety Info Assistant",
queueName: "Safety Recall",
phoneNumber: "888-463-6332",
contactId: "GUID",
state: "CONNECTED",
startTime: "2026-03-05T16:10:00Z",
ringtoneUrl: "",
muteRingtone: false,
popMode: 687940001,
defaultCaseTitle: "Safety Recall Inquiry",
transcriptEnabled: true,
transcriptText: "...",
transcriptIntervalSeconds: 3,
softphoneConfigId: "GUID"
}

```

Write using:

```

localStorage.setItem("genericSimCall", JSON.stringify(call))

```

---

# Android Phone Simulator Behavior

The Android simulator is **only a UI wrapper**.

It does NOT replace the existing simulator.

Instead it triggers calls using the same mechanism.

### Flow

```

Home Screen
↓
User taps Phone App
↓
Contacts
↓
User selects contact
↓
Phone simulator writes payload to localStorage
↓
Genesys softphone detects change
↓
Existing softphone renders call

```

---

# Phone UI Requirements

Device style:

```

Samsung S25 Ultra

```

Required screens:

| Screen | Purpose |
|---|---|
Home screen | Android launcher |
Phone app | Dialer + contacts |
Calling screen | Outgoing call |
In-call screen | Transcript and controls |

---

# Dataverse Configuration

The Android simulator must **reuse the existing table**

```

gensoft_genericsoftphone

```

used by the call simulator.

The simulator already retrieves the record where:

```

gensoft_defaultsoftphoneconfig = true

```

---

# Existing Fields Used

The Android phone must load the following fields from Dataverse.

| Field | Purpose |
|---|---|
gensoft_queuename | Queue label |
gensoft_ringtoneurl | Audio file |
gensoft_muteringtone | Mute option |
gensoft_popmode | Screen pop behavior |
gensoft_defaultcasetitle | Case creation title |
gensoft_transcriptenabled | Enable transcript |
gensoft_transcripttext | Transcript content |
gensoft_transcriptplaybackintervalseconds | Playback speed |

---

# New Dataverse Fields Required

The Android simulator introduces a few additional configuration options.

These must be **added to the same table**:

```

gensoft_genericsoftphone

```

---

## Phone Wallpaper

Field Title

```

Phone Wallpaper URL

```

Description

Android home screen background image.

Type

```

Text

```

Length

```

1000

```

Schema

```

gensoft_phonewallpaperurl

```

---

## Phone Device Theme

Field Title

```

Phone Device Theme

```

Description

Defines Android skin style.

Type

```

Choice

```

Values

```

S25Ultra
Pixel
Generic

```

Schema

```

gensoft_phonetheme

```

---

## Outgoing Ringback Tone

Field Title

```

Outgoing Ringback Tone

```

Description

Audio played while dialing.

Type

```

Text / URL

```

Schema

```

gensoft_outgoingringtoneurl

```

---

## Microsoft Folder Apps

Field Title

```

Microsoft Folder Apps

```

Description

JSON configuration defining apps inside the Microsoft folder.

Type

```

Multiline Text

```

Length

```

4000

```

Schema

```

gensoft_microsoftappsjson

```

Example

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

## Android Home Screen Apps

Field Title

```

Home Screen Apps

```

Description

Defines Android launcher layout.

Type

```

Multiline Text

```

Schema

```

gensoft_homescreenappsjson

```

---

# Code Integration Pattern

The Android simulator must reuse the same logic as the existing simulator:

```

Xrm.WebApi.retrieveMultipleRecords("gensoft_genericsoftphone")

```

Then generate the payload and write it to:

```

localStorage.genericSimCall

```

---

# Example Function

```

function simulateOutgoingCall(contact) {

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

# Important Non-Negotiables

Do NOT change:

```

localStorage key: genericSimCall

```

Do NOT bypass:

```

Xrm.WebApi

```

Do NOT modify:

```

Genesys Softphone payload contract

```

All new functionality must be **additive only**.

---

# Result

This Android simulator becomes:

```

Phone UI
↓
Existing Simulator Payload
↓
Genesys Softphone
↓
Dynamics Contact Center

```

No backend changes required.
```

---

## Key correction from your previous prompt

Your earlier prompt **incorrectly implied a new simulator service**.

That would break your architecture.

Your system already has a **clean event bus**:

```
Simulator → localStorage → Softphone
```

The Android UI should simply become **another simulator writer**.

---

## One improvement I strongly recommend (small but powerful)

Add **one more field** to Dataverse:

```
gensoft_callmode
```

Choice:

```
Incoming
Outgoing
```

This lets you toggle between:

* current simulator behavior
* Android phone outgoing behavior

without touching code.

---

If you want, I can also produce the **next MD file**:

**“Android Phone Simulator – Full Copilot Build Prompt (Architecture Locked to Existing Simulator)”**

That version ensures Copilot **does not accidentally invent a new backend** and will generate code that plugs directly into your current system.
