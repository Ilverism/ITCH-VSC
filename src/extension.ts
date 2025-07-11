// extension.ts


/**
 * -- Inline Tag Context Hider - VSC --
 * 
 * A Visual Studio Code extension to
 * collapse inline tags in the code
 * editor.
 * 
 * By default, only tags whose content
 * appears on a single line will be
 * collapsed, but this behavior can be
 * toggled to allow multiline tags.
 * 
 * This extension was created with the
 * intent of making content more 
 * human-readable by hiding extraneous
 * content when not being edited.
 * Specifically, it was made for a
 * visual novel engine that uses HTML,
 * and this extension allows inline
 * styling tags to be hidden
 * automatically.
 * 
 * Happy folding!
 */


/* Imports */
import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { getCommentTester } from './commentconfig';
import { pathToFileURL } from 'node:url';
import { Fold } from './fold';


/* Initialize Variables */
let enabled = true;
let allowMultiline = false;
let allowCommentFolds = false;
let configLoading: Promise<void> | null = null;


/**
 * Get the path to the user configuration file.
 *
 * Checks for the existence of a configuration file
 * in the `.itch-vsc` folder of the currently open
 * workspace.
 */
function getUserConfigPath(): string|undefined {
        
    const ws = vscode.workspace.workspaceFolders?.[0];

    //No workspace open -> undefined
    if (!ws)
        return;

    //Search for the config file in the .itch-vsc folder
    const tryFiles = ['foldconfig.mjs']
        .map(f => path.join(ws.uri.fsPath, '.itch-vsc', f))
        .find(p => fs.existsSync(p));

    return tryFiles;

}


/**
 * Load the user configuration file and apply the defined folds.
 *
 * Reads the user-defined fold configuration file,
 * clears existing decorations, and applies new
 * decorations based on the patterns defined in the
 * configuration.
 */

async function loadUserConfig() {

    //Prevent multiple concurrent loads
    if (configLoading)
        return configLoading;

    configLoading = (async () => {

        const cfg = getUserConfigPath();

        //Failed to find a config file, exit
        if (!cfg)
            return;

        //Clear previous decorations
        (global as any).Fold = Fold;
        Fold.clearFolds();

        //Nuke CJS cache to always reload fresh
        delete require.cache[require.resolve(cfg)];

        const asUrl = pathToFileURL(cfg).href + `?v=${Date.now()}`;

        try {

            //Dynamic import for ES-modules
            await import(asUrl); 

        } catch (e) {

            vscode.window.showErrorMessage(`ITCH-VSC: error loading fold config - ${(e as Error).message}`);
        }

    })().finally(() => configLoading = null);

    return configLoading;
    
}


/**
 * This is the main entry point for the extension.
 * It sets up event listeners and commands.
 * 
 * @param context The extension context provided by VS Code.
 */
export async function activate(context: vscode.ExtensionContext) {

    //Get the user configuration file
    await loadUserConfig();

    //Watch for saves / new file / delete
    const watcher = vscode.workspace.createFileSystemWatcher('**/.itch-vsc/foldconfig.{mjs}');
    watcher.onDidChange(loadUserConfig);
    watcher.onDidCreate(loadUserConfig);
    watcher.onDidDelete(loadUserConfig);
    context.subscriptions.push(watcher);

    //Config Generation
    context.subscriptions.push(
        vscode.commands.registerCommand('inlineTagContextHider.createConfig', async () => {

            const ws = vscode.workspace.workspaceFolders?.[0];

            //Workspace not open, show error
            if (!ws)
                return vscode.window.showErrorMessage('Please open a folder first...');

            //Create resources/foldconfig.template file
            const cfgUri = vscode.Uri.joinPath(ws.uri, '.itch-vsc', 'foldconfig.mjs');
            await vscode.workspace.fs.createDirectory(cfgUri.with({ path: cfgUri.path.replace(/\/[^/]+$/, '') }));
            const tplUri = vscode.Uri.joinPath(context.extensionUri, 'resources', 'foldconfig.template');
            const template = await vscode.workspace.fs.readFile(tplUri);
            await vscode.workspace.fs.writeFile(cfgUri, template);

            //Create resources/foldexamples.html file
            const exUri = vscode.Uri.joinPath(ws.uri, '.itch-vsc', 'foldexamples.html');
            const exTemplate = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'resources', 'foldexamples.template'));
            await vscode.workspace.fs.writeFile(exUri, exTemplate);

            vscode.window.showInformationMessage('Created .itch-vsc/foldconfig.mjs - edit it and save to reload Folds.');
        })
    );


    //React to file edits & editor changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(ev => {

            //Extension is enabled, document is active, apply decorations
            if (enabled && vscode.window.activeTextEditor?.document === ev.document)
                applyDecorations(vscode.window.activeTextEditor);

        }),
        vscode.window.onDidChangeTextEditorSelection(ev => {

            //Extension is enabled, text editor is active, apply decorations
            if (enabled && vscode.window.activeTextEditor === ev.textEditor)
                applyDecorations(ev.textEditor);

        }),
        vscode.window.onDidChangeActiveTextEditor(ed => {

            //Extension is enabled, apply decorations, otherwise clear them
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);
            
        }),
    );

    //COMMAND -- Toggle extension on/off
    context.subscriptions.push(
        vscode.commands.registerCommand('inlineTagContextHider.toggle', () => {

            //Toggle the enabled state
            enabled = !enabled;

            //Apply/Clear decorations based on the new state
            const ed = vscode.window.activeTextEditor;
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);
            
        })
    );

    //COMMAND -- Toggle multiline support
    context.subscriptions.push(
        vscode.commands.registerCommand('inlineTagContextHider.toggleMultiline', () => {

            //Toggle the allowMultiline state
            allowMultiline = !allowMultiline;

            //Apply/Clear decorations based on the current state
            const ed = vscode.window.activeTextEditor;
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);

        })
    );

    //COMMAND -- Toggle comment folds
    context.subscriptions.push(
        vscode.commands.registerCommand('inlineTagContextHider.toggleCommentFolds', () => {

            //Toggle the allowCommentFolds state
            allowCommentFolds = !allowCommentFolds;

            //Apply/Clear decorations based on the current state
            const ed = vscode.window.activeTextEditor;
            if (ed)
                enabled ? applyDecorations(ed) : clearDecorations(ed);
            
        })
    );

    //Initial pass
    if (vscode.window.activeTextEditor)
        applyDecorations(vscode.window.activeTextEditor);

}


/**
 * This function is called when the extension is deactivated.
 * It clears all decorations from the active text editor.
 */
export function deactivate() {

    clearDecorations(vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors[0]);
    
}


/**
 * Clear all decorations from the active text editor.
 * @param ed The active text editor to clear decorations from.
 */
function clearDecorations(ed: vscode.TextEditor) {

    for (const fold of Fold.foldsList) {
        ed.setDecorations(fold.tagDecoration, []);
        ed.setDecorations(fold.innerDecoration, []);
    }

}


/**
 * Apply decorations to the active text editor based on the defined fold patterns.
 * 
 * It scans the document text for patterns defined in the Fold class and
 * applies decorations accordingly.
 * 
 * @param editor The active text editor to apply decorations to.
 */
function applyDecorations(editor: vscode.TextEditor) {

    const docText = editor.document.getText();
    const selections = editor.selections;

    const commentTester = (allowCommentFolds ? undefined : getCommentTester());

    //Run every fold regex against the document text
    for (const fold of Fold.foldsList) {

        const tagRanges: vscode.Range[] = [];
        const innerRanges: vscode.Range[] = [];

        //Reset regex state before each full-file scan
        fold.regex.lastIndex = 0;
        let m: RegExpExecArray | null;

        while ((m = fold.regex.exec(docText))) {

            const fullStart = m.index;
            const fullEnd = fullStart + m[0].length;

            //Comment tester is defined, apply test
            if (commentTester) {

                const { line, blockOpen, blockClose } = commentTester;
                const startLine = editor.document.positionAt(fullStart).line;
                const ln = editor.document.lineAt(startLine).text;

                //Got single-line comment, skip
                if (line?.test(ln))
                    continue;

                //Got open-block comment...
                if (blockOpen && blockClose) {

                    const beforeStart = docText.slice(0, fullStart);
                    const openIdx  = beforeStart.lastIndexOf(blockOpen);
                    const closeIdx = beforeStart.lastIndexOf(blockClose);

                    //...Still inside a block comment, skip
                    if (openIdx > -1 && openIdx > closeIdx)
                        continue;
                    
                }

            }

            const openText = m[1];              //<-- First capture group
            const closeText = m[m.length - 1];  //<-- Last capture group

            const openStartIdx = fullStart;
            const openEndIdx = (openStartIdx + openText.length);
            const closeStartIdx = (fullEnd - closeText.length);

            const openRange = new vscode.Range(
                editor.document.positionAt(openStartIdx),
                editor.document.positionAt(openEndIdx)
            );
            const closeRange = new vscode.Range(
                editor.document.positionAt(closeStartIdx),
                editor.document.positionAt(fullEnd)
            );

            

            const blockRange = new vscode.Range(openRange.start, closeRange.end);

            //Multiline not allowed, skip multiline blocks
            if (!allowMultiline && blockRange.start.line !== blockRange.end.line)
                continue;


            //Editing this block, skip it
            const isBeingEdited = selections.some(sel => sel.intersection(blockRange));
            if (isBeingEdited)
                continue;


            //Add the ranges to the arrays
            tagRanges.push(openRange, closeRange);
            innerRanges.push(blockRange);

        }

        //Apply the decorations
        editor.setDecorations(fold.tagDecoration, tagRanges);
        editor.setDecorations(fold.innerDecoration, innerRanges);

    }
    
}