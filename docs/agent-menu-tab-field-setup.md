# Agent Menu Tab Field Setup

**Purpose:** Create the single optional administration field that selects which sidebar tab hosts the linked-agent menu.

## Field definition

| Property | Value |
| --- | --- |
| Table | Generic Sidebar Configuration (`sidebar_genericsidebar`) |
| Display name | Agent Menu Tab |
| Logical name | `sidebar_agentmenutab` |
| Type | Choice |
| Required | No |
| Default | None |
| Description | Optional tab slot (1-4) where linked agents render in the sidebar. |

Create this field only when the environment uses linked **Generic Sidebar Agent** rows and needs their picker to appear in a selected sidebar tab. It is not needed for a sidebar that only uses direct panel embeds.

## Create the field in Power Apps

1. Open [Power Apps](https://make.powerapps.com) and select the target Dataverse environment.
2. Open the unmanaged solution that owns Generic Sidebar.
3. Open **Tables**, then open **Generic Sidebar Configuration** (`sidebar_genericsidebar`).
4. Select **Columns**, then select **New column**.
5. Set the column properties:
   - **Display name:** `Agent Menu Tab`
   - **Name / logical name:** `sidebar_agentmenutab`
   - **Data type:** `Choice`
   - **Required:** `Optional`
   - **Description:** `Optional tab slot (1-4) where linked agents render in the sidebar.`
6. Add these local choice values:

| Label | Value |
| --- | --- |
| None | `100000000` |
| Tab 1 | `100000001` |
| Tab 2 | `100000002` |
| Tab 3 | `100000003` |
| Tab 4 | `100000004` |

1. Save the column and publish all customizations.
2. Add **Agent Menu Tab** to the Generic Sidebar Configuration main form if it is not already shown.
3. Save and publish that form.

## Use the field in the admin app

1. Open the **Generic Sidebar Configuration** table in the model-driven admin app.
2. Open the configuration record that is marked as the shared default (`sidebar_default = Yes`).
3. Confirm the configuration has at least one related **Generic Sidebar Agent** row that is both active (`sidebar_isactive = Yes`) and in active Dataverse state.
4. Set **Agent Menu Tab** to the tab where the picker should appear.
5. Save the configuration record.
6. Open any packaged `* Generic.Sidebar` form and confirm the selected tab renders the linked-agent menu.

## Expected behavior

- **None** or blank: existing panel embeds remain unchanged.
- **Tab 1** through **Tab 4** with active linked agents: the selected tab renders the linked-agent picker.
- Selected tab with no active linked agents: the configured panel embed remains available.

## Rollback

Set **Agent Menu Tab** back to **None**, save the configuration record, and reopen the packaged form. The sidebar returns to its configured panel embed behavior without requiring a form or solution change.
