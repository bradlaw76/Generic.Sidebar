# Dataverse Schema — Generic Softphone Simulator

**Task for Copilot**: Create the following Dataverse tables and columns in a Power Platform environment.
All tables use the publisher prefix `gensoft_`. Do not alter any standard/OOB tables.

**Executable Script**: `specs/main/scripts/create-dataverse-schema.ps1`

---

## Current State

| Item | Status | Action |
|---|---|---|
| Table 1 `gensoft_genericsoftphone` | **Exists** (in solution) | Add 3 new columns |
| Table 2 `gensoft_demo_profile` | **New** | Create table + 7 columns, add to solution |
| Solution `GenericSoftphone` | **Exists** (v1.0.0.11, Unmanaged) | Add new table to it |
| Publisher | **Generic.Softphone** (prefix `gensoft_`) | No changes |
| Sample data (3 demo profiles) | New | Insert after schema |

---

## Overview

The Generic Softphone Simulator (AndroidCellPhone.html) reads all its configuration and demo
scenario data from Dataverse via `Xrm.WebApi`. Transcript text — the scripted conversation
replayed during a demo call — is stored as multiline text in Dataverse and streamed line-by-line
into the phone UI during a call.

Two custom tables are required. No columns need to be added to existing standard tables.

---

## Table 1: Generic Softphone Config  *(exists — add columns marked NEW)*

**Display Name**: Generic Softphone Config
**Plural Display Name**: Generic Softphone Configs
**Schema Name**: `gensoft_genericsoftphone`
**Description**: Stores the active softphone configuration. One record should be marked as the
default config (gensoft_defaultsoftphoneconfig = true). The phone simulator reads the most recent
record with this flag set to true on load.

### Columns

| Display Name | Schema Name | Data Type | Required | Description |
|---|---|---|---|---|
| Name | `gensoft_name` | Single line of text (100) | Yes | Primary column. Human-readable label for this config. |
| Queue Name | `gensoft_queuename` | Single line of text (100) | No | The call queue label shown during a call (e.g. "Support", "Sales"). |
| Default Config | `gensoft_defaultsoftphoneconfig` | Yes/No | No | Set to Yes for the config the phone loads by default. Only one record should be Yes at a time. Default: No. |
| Pop Mode | `gensoft_popmode` | Single line of text (50) | No | Controls how the sidebar pops when a call connects. Leave blank unless needed. |
| Default Case Title | `gensoft_defaultcasetitle` | Single line of text (200) | No | Pre-fills the subject when auto-creating a case on call connect. |
| Transcript Enabled | `gensoft_transcriptenabled` | Yes/No | No | Whether the transcript panel is shown during calls. Default: Yes. |
| Transcript Text | `gensoft_transcripttext` | Multiple lines of text (plain text, max 10000) | No | The scripted conversation to replay during a call. Format: blocks separated by blank lines, prefixed with "Customer: " or "Agent: ". |
| Transcript Interval (Seconds) | `gensoft_transcriptplaybackintervalseconds` | Whole number | No | How many seconds between each transcript line appearing. Default: 3. |
| Incoming Ringtone URL | `gensoft_ringtoneurl` | Single line of text (500) | No | URL to an audio file played on incoming calls. |
| Outgoing Ringtone URL | `gensoft_outgoingringtoneurl` | Single line of text (500) | No | **NEW** — URL to an audio file played on outgoing calls. Overrides ringtone URL if set. |
| Mute Ringtone | `gensoft_muteringtone` | Yes/No | No | Suppresses ringtone playback. Default: No. |
| Phone Wallpaper URL | `gensoft_phonewallpaperurl` | Single line of text (500) | No | **NEW** — URL to an image used as the phone home screen wallpaper. |
| Transcript Completed | `gensoft_transcriptcompleted` | Yes/No | No | **NEW** — Set to Yes by the softphone when transcript playback finishes. Default: No. |

### Transcript Text Format

Each conversation turn is a block separated by a blank line, prefixed with Speaker label:

  Customer: Hi, I received a hospital bill for $1,200 that I thought insurance would cover.

  Agent: Let me pull up your account. The $1,200 is your deductible portion for this plan year.

  Customer: Is there anything I can do about it?

  Agent: You can set up a payment plan. Once your deductible is met, coinsurance kicks in.

---

## Table 2: Generic Softphone Demo Profile  *(new — create from scratch)*

**Display Name**: Generic Softphone Demo Profile
**Plural Display Name**: Generic Softphone Demo Profiles
**Schema Name**: `gensoft_demo_profile`
**Description**: Each record is a named demo scenario shown in the demo control panel (CTRL+SHIFT+D).
Selecting a profile overrides the active config with scenario-specific queue, case title, and
transcript text.

### Columns

| Display Name | Schema Name | Data Type | Required | Description |
|---|---|---|---|---|
| Name | `gensoft_name` | Single line of text (100) | Yes | Primary column. Shown in the demo profile dropdown. |
| Contact Name | `gensoft_contactname` | Single line of text (100) | No | Fuzzy-matched against Contact records. If found, that Contact is pre-selected for the call. |
| Queue Name | `gensoft_queuename` | Single line of text (100) | No | Overrides the config queue name for this scenario. |
| Default Case Title | `gensoft_defaultcasetitle` | Single line of text (200) | No | Overrides the config case title for this scenario. |
| Transcript Enabled | `gensoft_transcriptenabled` | Yes/No | No | Whether transcript is shown for this scenario. Default: Yes. |
| Transcript Text | `gensoft_transcripttext` | Multiple lines of text (plain text, max 10000) | No | The scripted conversation for this demo scenario. Same format as the config table. |
| Transcript Interval (Seconds) | `gensoft_transcriptplaybackintervalseconds` | Whole number | No | Seconds between each line appearing. Overrides config interval. Default: 3. |

---

## Standard Tables — No Changes Required

The simulator reads these standard Dataverse tables using existing OOB columns only.
Do not add or modify columns on these tables.

| Table | Columns Read | Purpose |
|---|---|---|
| `contact` | `fullname`, `telephone1`, `contactid`, `entityimage_thumbnail` | Populates the contacts list in the phone app |

---

## Sample Data

Create after the tables are set up.

### Generic Softphone Config (1 record)

| Column | Value |
|---|---|
| Name | Default Softphone Config |
| Queue Name | Support |
| Default Config | Yes |
| Transcript Enabled | Yes |
| Transcript Interval (Seconds) | 3 |
| Default Case Title | Customer Inquiry |

### Generic Softphone Demo Profiles (3 records)

**FDA Safety Recall**
- Contact Name: Sarah Johnson
- Queue Name: Safety Recall
- Default Case Title: Product Safety Recall
- Transcript: Customer calls about Metformin lot 4521-B recall; agent confirms recall and arranges replacement.

**Veteran Benefits**
- Contact Name: Robert Martinez
- Queue Name: Benefits
- Default Case Title: Veterans Benefits Inquiry
- Transcript: Veteran asks about healthcare benefits post-separation Nov 2023; agent confirms VA eligibility and walks through enrollment.

**Insurance Inquiry**
- Contact Name: Jamie Carter
- Queue Name: Insurance
- Default Case Title: Insurance Coverage Question
- Transcript: Customer queries $1,200 hospital bill; agent explains deductible and offers payment plan setup.

---

## Notes for Copilot

- Publisher prefix: `gensoft_` on all schema names
- `gensoft_transcripttext` must be **plain text** multiline — not rich text or HTML
- No relationships between the two custom tables are needed
- No lookup columns to `contact` are needed (matching is done in JavaScript)
- Both tables belong in the existing unmanaged solution **GenericSoftphone** (publisher: Generic.Softphone)
- When entering Transcript Text in the maker portal, use real line breaks between turns — not literal \n characters
