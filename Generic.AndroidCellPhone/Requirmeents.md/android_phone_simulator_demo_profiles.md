Below is the **requested demo profiles file**.
This lets you control **entire demo scenarios from Dataverse or JSON** so your Android phone simulator and the existing softphone can instantly switch between demos.

Save as:

```
android_phone_simulator_demo_profiles.md
```

---

```md
# Android Phone Simulator – Demo Profiles
Version: 1.0  
Purpose: Define configurable demo scenarios for the Android Phone Simulator and Generic Softphone.

These profiles allow switching between demo stories without changing code.

The phone simulator loads a **Demo Profile** and automatically populates:

- Contact being called
- Transcript content
- Queue name
- Case creation behavior
- Call scenario

Profiles may be stored in:

1. Dataverse (recommended)
2. JSON configuration
3. Local demo mode

---

# Demo Profile Concept

A demo profile represents a **complete call scenario**.

Example:

```

FDA Safety Recall Inquiry

```

Selecting the profile configures:

```

Caller Name
Phone Number
Transcript
Queue
Case Creation
Call Flow

```

---

# Recommended Storage Design

Store profiles in Dataverse.

Table:

```

gensoft_demo_profile

```

---

# Dataverse Table Design

Table Name

```

gensoft_demo_profile

```

Purpose

Stores preconfigured demo scenarios for the Android simulator.

---

## Field: Profile Name

Field Title

```

Profile Name

```

Schema

```

gensoft_profilename

```

Type

```

Text

```

Length

```

200

```

---

## Field: Description

Field Title

```

Description

```

Schema

```

gensoft_description

```

Type

```

Multiline Text

```

Length

```

2000

```

---

## Field: Contact Name

Schema

```

gensoft_contactname

```

Type

```

Text

```

Length

```

200

```

---

## Field: Phone Number

Schema

```

gensoft_phonenumber

```

Type

```

Text

```

Length

```

50

```

---

## Field: Contact Lookup

Schema

```

gensoft_contactid

```

Type

```

Lookup → Contact

```

---

## Field: Queue Name

Schema

```

gensoft_queuename

```

Type

```

Text

```

Length

```

200

```

---

## Field: Transcript

Schema

```

gensoft_transcript

```

Type

```

Multiline Text

```

Length

```

Unlimited

```

---

## Field: Transcript Interval

Schema

```

gensoft_transcriptinterval

```

Type

```

Whole Number

```

Default

```

3

```

---

## Field: Create Case

Schema

```

gensoft_createcase

```

Type

```

Yes/No

```

Purpose

Determines whether the simulator creates a case.

---

## Field: Case Title

Schema

```

gensoft_casetitle

```

Type

```

Text

```

Length

```

200

```

---

## Field: Default Profile

Schema

```

gensoft_defaultprofile

```

Type

```

Yes/No

```

Purpose

Automatically loads the default demo.

---

# Example Demo Profiles

---

# Profile 1 – FDA Safety Recall

Profile Name

```

FDA Recall Inquiry

```

Queue

```

FDA Safety Information

```

Contact

```

Jamie Carter

```

Phone

```

888-463-6332

```

Case Title

```

Robitussin Recall Inquiry

```

Transcript

```

Customer: hi - i have this robitussin cough medicine. i saw something about a recall.

Agent: Active recalls have been issued for certain Robitussin Honey CF Max products due to microbial contamination.

Customer: mine is the childrens version.

Agent: A recall was issued for certain lots of Children’s Robitussin Honey Cough and Chest Congestion DM due to incorrect dosing cups.

Customer: my dosing cup is missing the marks. can i still use the medicine?

Agent: If your dosing cup is missing the markings, do not use it to measure the medication. Please contact the manufacturer for a replacement or consult a pharmacist for safe dosing instructions.

```

---

# Profile 2 – Veteran Benefits Inquiry

Profile Name

```

Veteran Benefits Inquiry

```

Queue

```

VA Benefits Assistance

```

Contact

```

Robert Martinez

```

Phone

```

800-827-1000

```

Case Title

```

VA Claim Status Inquiry

```

Transcript

```

Customer: hello i am checking the status of my disability claim.

Agent: I can help with that. May I confirm your name and date of birth?

Customer: yes it is robert martinez.

Agent: Thank you. I see your claim is currently in evidence review.

Customer: how long will that take?

Agent: Evidence review typically takes several weeks depending on documentation received.

```

---

# Profile 3 – Insurance Coverage Question

Profile Name

```

Insurance Coverage Inquiry

```

Queue

```

Coverage Support

```

Contact

```

Sarah Johnson

```

Phone

```

877-555-0199

```

Case Title

```

Insurance Coverage Verification

```

Transcript

```

Customer: hi i want to confirm if my medication is covered.

Agent: I can help with that. Can you provide the medication name?

Customer: it is robaxin.

Agent: Let me check your policy. Yes, that medication is covered under your plan.

```

---

# Android Simulator Integration

The Android phone simulator should load the selected demo profile.

Example flow:

```

Select Demo Profile
↓
Load Dataverse record
↓
Populate phone UI
↓
Generate call payload
↓
Write to localStorage

```

---

# Payload Generation

When a call is placed, convert the demo profile into the payload.

Example:

```

const call = {
callerName: profile.contactName,
queueName: profile.queueName,
phoneNumber: profile.phoneNumber,
contactId: profile.contactId,
state: "CONNECTED",
startTime: new Date().toISOString(),

transcriptEnabled: true,
transcriptText: profile.transcript,
transcriptIntervalSeconds: profile.transcriptInterval,

popMode: profile.createCase ? 687940001 : 687940000,
defaultCaseTitle: profile.caseTitle,
softphoneConfigId: config.id
};

localStorage.setItem("genericSimCall", JSON.stringify(call));

```

---

# Demo Control Panel

The Android simulator should include a hidden demo panel.

Shortcut

```

CTRL + SHIFT + D

```

Panel Options

```

Select Demo Profile
Start Call
Reset Call
Skip Transcript
End Call

```

---

# Result

Demo profiles allow switching entire demo scenarios instantly.

Example:

```

FDA Recall Demo
↓
Veteran Claim Demo
↓
Insurance Coverage Demo

```

All without changing code.

This makes the Android phone simulator ideal for:

```

Live demos
Engineering reviews
Conference presentations
Customer walkthroughs

```

---

# Future Enhancements

Future profiles could include:

```

Incoming calls
Multiple participants
Transfer scenarios
Agent escalation
SMS interaction
AI agent scenarios

```

The architecture supports these expansions.
```

---

## Why this will help your demo

With this file you can now:

* switch scenarios **without touching code**
* drive the **Android phone, transcript, and softphone behavior**
* keep everything **Dataverse-driven**

So your demo becomes:

```
Select Profile
↓
Make Call
↓
Softphone receives call
↓
Transcript plays
↓
Case opens
```

---

If you'd like, I can also show you **one small architectural improvement** that would make your Android simulator **10× easier to control in demos** and eliminate most manual configuration.
