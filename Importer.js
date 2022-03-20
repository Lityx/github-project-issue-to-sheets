import * as Core from "@actions/core";
import { Octokit } from "@octokit/rest";
import * as GitHub from "@actions/github";
import { google } from "googleapis";
import { createActionAuth } from "@octokit/auth-action";

export class Importer {
  static LOG_SPACING_SIZE = 2;

  static LOG_BULLET_ITEM = "·️";

  static INPUT_SERVICE_ACCOUNT_JSON = "google-api-service-account-credentials";

  static INPUT_DOCUMENT_ID = "document-id";

  static INPUT_SHEET_NAME = "sheet-name";

  static INPUT_MODE = "mode";

  /**
   * @returns {Promise<void>}
   */
  async start() {
    try {
      Core.startGroup("🚦 Checking Inputs and Initializing...");
      const serviceAccountCredentials = Core.getInput(
        Importer.INPUT_SERVICE_ACCOUNT_JSON
      );
      const documentId = Core.getInput(Importer.INPUT_DOCUMENT_ID);
      const sheetName = Core.getInput(Importer.INPUT_SHEET_NAME);
      const mode = Core.getInput(Importer.INPUT_MODE) || "all";
      Core.info(`Running mode = ${mode}`);
      if (!serviceAccountCredentials || !documentId || !sheetName) {
        throw new Error("🚨 Some Inputs missed. Please check project README.");
      }
      Core.info("Auth with GitHub Token...");
      const authGit = createActionAuth();
      const { token } = await authGit();
      Core.info(`Token: ${token}`);
      const octokit = new Octokit({
        auth: token,
      });

      Core.info("Done.");
      Core.endGroup();

      Core.startGroup("📑 Getting all Issues in repository...");
      let page = 1;
      let issuesData = [];
      let issuesPage;
      do {
        Core.info(`Getting data from Issues page ${page}...`);
        // eslint-disable-next-line no-await-in-loop
        issuesPage = await octokit.issues.listForRepo({
          owner: GitHub.context.repo.owner,
          repo: GitHub.context.repo.repo,
          state: "all",
          page,
        });
        Core.info(`There are ${issuesPage.data.length} Issues...`);
        issuesData = issuesData.concat(issuesPage.data);
        if (issuesPage.data.length) {
          Core.info("Next page...");
        }
        page += 1;
      } while (issuesPage.data.length);
      Core.info("All pages processed:");
      issuesData.forEach((value) => {
        Core.info(`${Importer.LOG_BULLET_ITEM} ${value.title}`);
      });
      Core.endGroup();

      Core.startGroup("🔓 Authenticating via Google API Service Account...");
      const auth = new google.auth.GoogleAuth({
        // Scopes can be specified either as an array or as a single, space-delimited string.
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        credentials: JSON.parse(serviceAccountCredentials),
      });
      const sheets = google.sheets({
        version: "v4",
        auth,
      });
      Core.info("Done.");
      Core.endGroup();

      Core.startGroup(`🧼 Cleaning old Sheet (${sheetName})...`);
      await sheets.spreadsheets.values.clear({
        spreadsheetId: documentId,
        range: sheetName,
      });
      Core.info("Done.");
      Core.endGroup();

      Core.startGroup("🔨 Form Issues data for Sheets format...");
      Core.info(`Count issues = ${issuesData.length}`);

      const issueSheetsData = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const value of issuesData) {
        if (
          mode === "all" ||
          (mode === "issues" && !value.pull_request) ||
          (mode === "milestone_issues" &&
            value.milestone &&
            value.milestone.state === "open" &&
            !value.pull_request)
        ) {
          const labels = value.labels.map((label) => label.name);

          const assignees = value.assignees.map((assignee) => assignee.login);

          issueSheetsData.push([
            value.number,
            value.state,
            value.pull_request ? "Pull Request" : "Issue",
            value.title,
            value.html_url,
            Object.keys(labels)
              .map((k) => labels[k])
              .join(", "),
            Object.keys(assignees)
              .map((k) => assignees[k])
              .join(", "),
            value.milestone?.title,
            value.milestone?.state,
            value.milestone?.due_on,
            value.milestone?.html_url,
            value.body,
            value.closed_at,
          ]);
        }
      }
      issueSheetsData.forEach((value) => {
        Core.info(`${Importer.LOG_BULLET_ITEM} ${JSON.stringify(value)}`);
      });
      Core.endGroup();

      Core.startGroup(`📝 Adding Issues data to Sheet (${sheetName})...`);
      Core.info("Adding header...");
      await sheets.spreadsheets.values.append({
        spreadsheetId: documentId,
        range: `${sheetName}!A1:1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          majorDimension: "ROWS",
          range: `${sheetName}!A1:1`,
          values: [
            [
              "#",
              "Status",
              "Type",
              "Title",
              "URI",
              "Labels",
              "Assignees",
              "Milestone",
              "State",
              "Deadline",
              "URI",
              "Description",
              "Closed",
            ],
          ],
        },
      });
      Core.info("Appending data...");
      Core.info(`Count appending issues = ${issueSheetsData.length}`);
      await sheets.spreadsheets.values.append({
        spreadsheetId: documentId,
        range: `${sheetName}!A1:1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          majorDimension: "ROWS",
          range: `${sheetName}!A1:1`,
          values: issueSheetsData,
        },
      });
      Core.info("Done.");
      Core.endGroup();
      Core.info("☑️ Done!");
    } catch (error) {
      Core.setFailed(JSON.stringify(error));
    }
  }
}
