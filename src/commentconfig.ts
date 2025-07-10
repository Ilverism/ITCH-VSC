/* commentconfig.ts */


/**
 * Via:
 * https://stackoverflow.com/a/71538680
 * https://stackoverflow.com/users/7829241/zoom
 */


import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface CommentConfig {
    lineComment?: string;
    blockComment?: [string, string];
}

export class CommentConfigHandler {
    private readonly languageToConfigPath = new Map<string, string>();
    private readonly commentConfig = new Map<string, CommentConfig | undefined>();

    public constructor() {
        this.updateLanguagesDefinitions();
    }

    /**
        * Generate a map of language configuration file by language defined by extensions
        * External extensions can override default configurations os VSCode
        */
    public updateLanguagesDefinitions() {
        this.commentConfig.clear();

        for (const extension of vscode.extensions.all) {
            const packageJSON = extension.packageJSON as any;
            if (packageJSON.contributes && packageJSON.contributes.languages) {
                for (const language of packageJSON.contributes.languages) {
                    if (language.configuration) {
                        const configPath = path.join(extension.extensionPath, language.configuration);
                        this.languageToConfigPath.set(language.id, configPath);
                    }
                }
            }
        }
    }

    /**
        * Return the comment config for `languageCode`
        * @param languageCode The short code of the current language
        */
    public getCommentConfig(languageCode: string): CommentConfig | undefined {
        if (this.commentConfig.has(languageCode)) {
            return this.commentConfig.get(languageCode);
        }

        if (!this.languageToConfigPath.has(languageCode)) {
            return undefined;
        }

        const file = this.languageToConfigPath.get(languageCode) as string;

        const content = fs.readFileSync(file, { encoding: 'utf8' });

        try {
            // Using normal JSON because json5 behaved buggy.
            // Might need JSON5 in the future to parse language jsons with comments.
            const config = JSON.parse(content);

            this.commentConfig.set(languageCode, config.comments);
            return config.comments;
        } catch (error) {
            this.commentConfig.set(languageCode, undefined);
            return undefined;
        }
    }
}



export function getCommentTester(): {
    line?: RegExp;
    blockOpen?: string;
    blockClose?: string;
} | undefined{

    const activeEditor = vscode.window.activeTextEditor;

    //No active editor, exit
    if (!activeEditor)
        return;

    const commentConfigHandler = new CommentConfigHandler();
    const commentCfg = commentConfigHandler.getCommentConfig(activeEditor.document.languageId);

    //No comment config for the current language, exit
    if (!commentCfg)
        return;

    const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    return {
        line: commentCfg.lineComment
              ? new RegExp(`^\\s*${escapeRegex(commentCfg.lineComment)}.*`, "i")
              : undefined,
        blockOpen : commentCfg.blockComment?.[0],
        blockClose: commentCfg.blockComment?.[1],
    };

}
