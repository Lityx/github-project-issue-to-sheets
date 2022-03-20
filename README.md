# Google Spreadsheet Synchronizer

Github Action to continuously export issues and pull requests data to a Google Spreadsheet

![Spreadsheet](https://i.imgur.com/U2t3nmo.png)

> A project initiated by [ViRGiL175](https://github.com/ViRGiL175/github-project-issue-to-sheets) with contributions from [Lityx](https://github.com/Lityx/github-project-issue-to-sheets).

## Quick Start

Create a [Github Action workflow](https://docs.github.com/en/actions/quickstart) as follow:

```yml
name: sync-issues-spreadsheet

on:
  workflow_dispatch:
  issues:
    types:
      [
        opened,
        deleted,
        transferred,
        closed,
        reopened,
        assigned,
        unassigned,
        labeled,
        unlabeled,
      ]

jobs:
  spreadsheet-sync:
    runs-on: ubuntu-latest
    name: sync-issues-spreadsheet
    steps:
      - name: sync-issues-spreadsheet
        id: spreasheet-sync
        uses: nlm-pro/spreadsheet-sync@v3
        with:
          google-api-service-account-credentials: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_DATA }}
          document-id: "<YOUR SPREADSHEET ID>"
          sheet-name: "<NAME OF THE SHEET WHEN DATA WILL BE EXPORTED>"
          mode: "issues"
```

**Don't forget to fulfill the [requirements](#requirements-step-by-step).**

## Options

| key                                      | description                               | mandatory             |
| ---------------------------------------- | ----------------------------------------- | --------------------- |
| `google-api-service-account-credentials` | Google service account credentials (JSON) | yes                   |
| `document-id`                            | ID of your Google Spreadsheet             | yes                   |
| `sheet-name`                             | name of the sheet to export to            | yes                   |
| `mode`                                   | sync mode to use                          | no (`all` by default) |

### Modes

Possible values for the `mode` option are:

- `all`: export all issues and PRs
- `issues`: export issues only (exclude pull requests)
- `milestone_issues`: only export issues associated with an active milestone

## Requirements (Step-by-step)

### 1. Enable the Google Spreadsheet API

Google provides a button for this:

![Step 1: Turn on the Google Sheets API](https://i.imgur.com/MYMe1yP.png)

Create a new API project and go to the "Credentials" section.

### 2. Create a Service Account

![manage service account](https://i.imgur.com/60JAuFo.png)

![create service account](https://i.imgur.com/Tyg7Evk.png)

Then download and save your service account credentials JSON.

More info: <https://developers.google.com/identity/protocols/oauth2/service-account#creatinganaccount>

### 3. Create a Google Spreadsheet

1. Create a new spreadsheet document with a dedicated sheet for GitHub Issues data.
2. Add the Google API Service Account email to your document with editor access.

### 4. Pass JSON Service Account credentials content as a GitHub Secret

![Secrets](https://i.imgur.com/egWxleC.png)

More info: <https://docs.github.com/en/free-pro-team@latest/actions/reference/encrypted-secrets>
