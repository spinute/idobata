import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getAuthenticatedOctokit } from "../github/client.js";
import { findOrCreateDraftPr } from "../github/utils.js"; // findOrCreateDraftPr をインポート
import config from "../config.js";
import logger from "../logger.js";

export const updatePrSchema = z.object({
    branchName: z.string().min(1),
    description: z.string(), // 空の説明も許可
});

export type UpdatePrInput = z.infer<typeof updatePrSchema>;

export async function handleUpdatePrDescription(params: UpdatePrInput): Promise<CallToolResult> {
    const { branchName, description } = params;
    const owner = config.GITHUB_TARGET_OWNER;
    const repo = config.GITHUB_TARGET_REPO;
    // head format は utils 内で処理されるためここでは不要

    logger.info({ owner, repo, branchName }, `Handling update_pr_description request`);

    try {
        const octokit = await getAuthenticatedOctokit();

        // 1. PRを検索または作成
        // 新規作成時のデフォルトタイトル（必要に応じて変更可能）
        const defaultPrTitle = `WIP: Changes for ${branchName}`;
        // findOrCreateDraftPr は description を新規作成時の body として使用する
        const prInfo = await findOrCreateDraftPr(octokit, branchName, defaultPrTitle, description);
        const pull_number = prInfo.number;
        const prHtmlUrl = prInfo.html_url; // PRのURLを取得

        // 2. PRの説明文を更新
        logger.info(`Updating description for PR #${pull_number}`);
        const { data: updatedPr } = await octokit.rest.pulls.update({
            owner,
            repo,
            pull_number,
            body: description,
        });

        // findOrCreateDraftPr で作成された場合、description は既に設定されているが、
        // 既存PRの場合に更新が必要なため、常に update を呼び出す (冪等性のため問題ない)
        logger.info(`Successfully ensured PR #${pull_number} exists and updated description. URL: ${prHtmlUrl}`);

        return {
            content: [{
                type: "text",
                text: `Successfully updated pull request description. View PR: ${prHtmlUrl}` // 取得したURLを使用
            }]
        };

    } catch (error: any) {
        logger.error({ error, params }, `Error processing update_pr_description for branch ${branchName}`);
        const errorMessage = error.message || 'Unknown error';
        const status = error.status ? ` (Status: ${error.status})` : '';
        return {
            isError: true,
            content: [{
                type: "text",
                text: `Error updating PR description for branch ${branchName}: ${errorMessage}${status}`
            }]
        };
    }
}